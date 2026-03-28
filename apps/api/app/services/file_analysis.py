from __future__ import annotations

import base64
import re
from collections import Counter
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.domain import FileAnalysisKind, FileAnalysisStatus, FileAsset, FileAssetAnalysis, FileAssetMemoryChunk, utc_now
from app.schemas.files import FileAssetAnalysisRead, FileAssetMemoryChunkRead
from app.services.file_assets import _infer_image_content_type, _supports_image_input, _supports_text_excerpt, resolve_file_asset_path


FILE_MEMORY_PROMPT_VERSION = "file-memory-v1"
_MAX_ANALYSIS_CHARS = 24_000
_MAX_RECALL_FILES = 3
_MAX_RECALL_CHUNKS = 2
_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "he", "her", "his", "i", "if", "in",
    "into", "is", "it", "its", "me", "my", "of", "on", "or", "our", "she", "that", "the", "their", "them",
    "they", "this", "to", "us", "we", "what", "when", "where", "which", "who", "why", "with", "you", "your",
}


@dataclass
class FileMemoryRecall:
    analysis: FileAssetAnalysis
    file_asset: FileAsset
    chunks: list[FileAssetMemoryChunk]
    score: float


def ensure_file_asset_analysis(
    db: Session,
    *,
    file_asset: FileAsset,
    created_by: str | None = None,
    force: bool = False,
) -> FileAssetAnalysis:
    analysis = db.scalar(select(FileAssetAnalysis).where(FileAssetAnalysis.file_asset_id == file_asset.id))
    if analysis is not None and analysis.status == FileAnalysisStatus.READY and not force:
        return analysis

    if analysis is None:
        analysis = FileAssetAnalysis(
            file_asset_id=file_asset.id,
            organization_id=file_asset.organization_id,
            venue_id=file_asset.venue_id,
            created_by=created_by or file_asset.created_by,
            status=FileAnalysisStatus.PENDING,
            analysis_kind=_analysis_kind_for_file(file_asset),
        )
        db.add(analysis)
        db.flush()
    else:
        analysis.status = FileAnalysisStatus.PENDING
        analysis.analysis_kind = _analysis_kind_for_file(file_asset)
        analysis.error_message = None

    try:
        result = _analyze_file_asset(file_asset)
        analysis.status = FileAnalysisStatus.READY
        analysis.analysis_kind = result["analysis_kind"]
        analysis.summary = result["summary"]
        analysis.extracted_text = result["extracted_text"]
        analysis.structured_facts = result["structured_facts"]
        analysis.keywords = result["keywords"]
        analysis.salient_quotes = result["salient_quotes"]
        analysis.ai_provider = result["ai_provider"]
        analysis.ai_model = result["ai_model"]
        analysis.prompt_version = result["prompt_version"]
        analysis.error_message = None

        existing_chunks = list(db.scalars(select(FileAssetMemoryChunk).where(FileAssetMemoryChunk.analysis_id == analysis.id)).all())
        for chunk in existing_chunks:
            db.delete(chunk)
        db.flush()

        for index, chunk_text in enumerate(result["chunks"]):
            db.add(
                FileAssetMemoryChunk(
                    analysis_id=analysis.id,
                    file_asset_id=file_asset.id,
                    organization_id=file_asset.organization_id,
                    venue_id=file_asset.venue_id,
                    chunk_index=index,
                    content=chunk_text,
                    keywords=_extract_keywords(chunk_text, limit=12),
                )
            )
        db.commit()
        db.refresh(analysis)
        return analysis
    except Exception as exc:
        analysis.status = FileAnalysisStatus.FAILED
        analysis.summary = None
        analysis.extracted_text = None
        analysis.structured_facts = {}
        analysis.keywords = []
        analysis.salient_quotes = []
        analysis.ai_provider = None
        analysis.ai_model = None
        analysis.prompt_version = FILE_MEMORY_PROMPT_VERSION
        analysis.error_message = str(exc)
        db.commit()
        db.refresh(analysis)
        return analysis


def get_file_asset_analysis(
    db: Session,
    *,
    file_asset_id: str,
    organization_id: str,
) -> FileAssetAnalysis | None:
    analysis = db.scalar(select(FileAssetAnalysis).where(FileAssetAnalysis.file_asset_id == file_asset_id))
    if analysis is None or analysis.organization_id != organization_id:
        return None
    return analysis


def serialize_file_asset_analysis(db: Session, analysis: FileAssetAnalysis) -> FileAssetAnalysisRead:
    chunks = list(
        db.scalars(
            select(FileAssetMemoryChunk)
            .where(FileAssetMemoryChunk.analysis_id == analysis.id)
            .order_by(FileAssetMemoryChunk.chunk_index.asc())
        ).all()
    )
    return FileAssetAnalysisRead(
        id=analysis.id,
        file_asset_id=analysis.file_asset_id,
        organization_id=analysis.organization_id,
        venue_id=analysis.venue_id,
        created_by=analysis.created_by,
        status=analysis.status.value,
        analysis_kind=analysis.analysis_kind.value,
        summary=analysis.summary,
        extracted_text=analysis.extracted_text,
        structured_facts=analysis.structured_facts or {},
        keywords=list(analysis.keywords or []),
        salient_quotes=list(analysis.salient_quotes or []),
        ai_provider=analysis.ai_provider,
        ai_model=analysis.ai_model,
        prompt_version=analysis.prompt_version,
        error_message=analysis.error_message,
        last_referenced_at=analysis.last_referenced_at,
        chunks=[
            FileAssetMemoryChunkRead(
                id=chunk.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                keywords=list(chunk.keywords or []),
                created_at=chunk.created_at,
            )
            for chunk in chunks
        ],
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
    )


def build_file_memory_context(
    db: Session,
    *,
    organization_id: str,
    venue_id: str | None,
    prompt: str,
    attached_file_asset_ids: list[str] | None = None,
    limit: int = _MAX_RECALL_FILES,
) -> list[FileMemoryRecall]:
    attached_ids = [item for item in (attached_file_asset_ids or []) if item]
    query = (
        select(FileAssetAnalysis, FileAsset)
        .join(FileAsset, FileAsset.id == FileAssetAnalysis.file_asset_id)
        .where(
            FileAssetAnalysis.organization_id == organization_id,
            FileAssetAnalysis.status == FileAnalysisStatus.READY,
        )
        .order_by(FileAssetAnalysis.updated_at.desc())
    )
    if venue_id is not None:
        query = query.where(or_(FileAssetAnalysis.venue_id == venue_id, FileAssetAnalysis.venue_id.is_(None)))

    analyses = list(db.execute(query).all())
    prompt_terms = set(_extract_keywords(prompt, limit=18))
    recalls: list[FileMemoryRecall] = []

    for analysis, file_asset in analyses:
        chunk_rows = list(
            db.scalars(
                select(FileAssetMemoryChunk)
                .where(FileAssetMemoryChunk.analysis_id == analysis.id)
                .order_by(FileAssetMemoryChunk.chunk_index.asc())
            ).all()
        )
        score = _score_analysis_relevance(
            analysis=analysis,
            file_asset=file_asset,
            chunks=chunk_rows,
            prompt_terms=prompt_terms,
            attached_file_asset_ids=attached_ids,
        )
        if score <= 0:
            continue
        top_chunks = _top_matching_chunks(chunk_rows, prompt_terms=prompt_terms, limit=_MAX_RECALL_CHUNKS)
        recalls.append(FileMemoryRecall(analysis=analysis, file_asset=file_asset, chunks=top_chunks, score=score))

    recalls.sort(key=lambda item: item.score, reverse=True)
    selected = recalls[:limit]
    if selected:
        for recall in selected:
            recall.analysis.last_referenced_at = utc_now()
        db.commit()
    return selected


def file_memory_prompt_context(recalls: list[FileMemoryRecall]) -> str:
    sections: list[str] = []
    for recall in recalls:
        header = f"{recall.file_asset.file_name} ({recall.analysis.analysis_kind.value})"
        parts = [header]
        if recall.analysis.summary:
            parts.append(f"Summary: {recall.analysis.summary}")
        for chunk in recall.chunks:
            parts.append(f"Memory excerpt {chunk.chunk_index + 1}: {chunk.content}")
        if recall.analysis.salient_quotes:
            parts.append(f"Salient evidence: {' | '.join(recall.analysis.salient_quotes[:2])}")
        sections.append("\n".join(parts))
    return "\n\n".join(sections)


def file_memory_references(recalls: list[FileMemoryRecall]) -> list[dict[str, object]]:
    references: list[dict[str, object]] = []
    for recall in recalls:
        payload: dict[str, object] = {
            "analysis_status": recall.analysis.status.value,
            "analysis_kind": recall.analysis.analysis_kind.value,
            "score": round(recall.score, 3),
            "summary": recall.analysis.summary,
            "content_url": f"{get_settings().api_v1_prefix}/files/{recall.file_asset.id}/content",
        }
        if recall.chunks:
            payload["memory_excerpt"] = recall.chunks[0].content[:280]
        references.append(
            {
                "type": "file_memory",
                "label": recall.file_asset.file_name,
                "id": recall.file_asset.id,
                "payload": payload,
            }
        )
    return references


def _analyze_file_asset(file_asset: FileAsset) -> dict[str, object]:
    analysis_kind = _analysis_kind_for_file(file_asset)
    summary = None
    extracted_text = None
    ai_provider = None
    ai_model = None
    salient_quotes: list[str] = []
    structured_facts: dict[str, object] = {
        "file_name": file_asset.file_name,
        "content_type": file_asset.content_type,
        "size_bytes": file_asset.size_bytes,
    }

    if analysis_kind == FileAnalysisKind.TEXT:
        extracted_text = _extract_local_text(file_asset)
        summary, ai_provider, ai_model = _summarize_text(extracted_text, file_asset=file_asset)
        salient_quotes = _extract_salient_quotes(extracted_text)
        chunks = _chunk_text(extracted_text)
        structured_facts["line_count"] = len([line for line in extracted_text.splitlines() if line.strip()])
    elif analysis_kind == FileAnalysisKind.IMAGE:
        summary, ai_provider, ai_model = _summarize_image(file_asset)
        extracted_text = None
        salient_quotes = []
        chunks = [summary] if summary else []
    elif analysis_kind == FileAnalysisKind.PDF:
        summary, ai_provider, ai_model = _summarize_pdf(file_asset)
        extracted_text = None
        salient_quotes = []
        chunks = [summary] if summary else []
    else:
        summary = f"{file_asset.file_name} is stored as a binary attachment. No richer analysis is available yet."
        chunks = [summary]

    keywords = _extract_keywords(" ".join(filter(None, [file_asset.file_name, summary, extracted_text or ""])), limit=20)
    structured_facts["chunk_count"] = len(chunks)
    return {
        "analysis_kind": analysis_kind,
        "summary": summary,
        "extracted_text": extracted_text,
        "structured_facts": structured_facts,
        "keywords": keywords,
        "salient_quotes": salient_quotes,
        "ai_provider": ai_provider,
        "ai_model": ai_model,
        "prompt_version": FILE_MEMORY_PROMPT_VERSION,
        "chunks": chunks,
    }


def _analysis_kind_for_file(file_asset: FileAsset) -> FileAnalysisKind:
    if _supports_text_excerpt(file_asset.file_name, file_asset.content_type):
        return FileAnalysisKind.TEXT
    if _supports_image_input(file_asset.file_name, file_asset.content_type):
        return FileAnalysisKind.IMAGE
    if (file_asset.content_type or "").lower() == "application/pdf" or file_asset.file_name.lower().endswith(".pdf"):
        return FileAnalysisKind.PDF
    return FileAnalysisKind.BINARY


def _extract_local_text(file_asset: FileAsset) -> str:
    if file_asset.storage_backend != "local" or not file_asset.storage_key:
        return f"{file_asset.file_name} is linked by reference only and its text content is not stored locally."
    raw_bytes = resolve_file_asset_path(file_asset).read_bytes()[:_MAX_ANALYSIS_CHARS * 2]
    text = raw_bytes.decode("utf-8", errors="replace").replace("\ufeff", "")
    text = text.replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
    return text[:_MAX_ANALYSIS_CHARS].strip() or f"{file_asset.file_name} uploaded with no readable text."


def _summarize_text(text: str, *, file_asset: FileAsset) -> tuple[str, str | None, str | None]:
    live = _summarize_with_live_ai(
        instructions=(
            "You are VOIS file memory analysis. Summarize the uploaded operational document for later recall. "
            "Name the most important observations, constraints, numbers, commitments, and operator-relevant next "
            "moves. Stay grounded in the provided file text only."
        ),
        user_content=(
            f"File name: {file_asset.file_name}\n"
            f"Content type: {file_asset.content_type or 'unknown'}\n\n"
            f"File text:\n{text}"
        ),
        max_tokens=380,
    )
    if live is not None:
        return live
    summary = text.strip().split("\n", 1)[0][:280]
    return (summary or f"{file_asset.file_name} was uploaded for operational review.", None, None)


def _summarize_image(file_asset: FileAsset) -> tuple[str, str | None, str | None]:
    if file_asset.storage_backend != "local" or not file_asset.storage_key:
        return (f"{file_asset.file_name} is an external image reference and could not be analyzed locally.", None, None)
    image_bytes = resolve_file_asset_path(file_asset).read_bytes()
    if not image_bytes:
        return (f"{file_asset.file_name} is empty.", None, None)
    live = _summarize_with_live_ai(
        instructions=(
            "You are VOIS file memory analysis. Inspect the uploaded operational image and summarize the visible "
            "evidence that matters later: objects, signage, cleanliness issues, queue/load indicators, handwritten "
            "notes, receipts, prices, timestamps, or anything operationally actionable. Be concrete."
        ),
        user_content=[
            {"type": "text", "text": f"Analyze this file for future VOIS recall: {file_asset.file_name}"},
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": _infer_image_content_type(file_asset.file_name),
                    "data": base64.b64encode(image_bytes).decode("utf-8"),
                },
            },
        ],
        max_tokens=340,
    )
    if live is not None:
        return live
    return (f"{file_asset.file_name} is stored as an image attachment for later visual review.", None, None)


def _summarize_pdf(file_asset: FileAsset) -> tuple[str, str | None, str | None]:
    if file_asset.storage_backend != "local" or not file_asset.storage_key:
        return (f"{file_asset.file_name} is an external PDF reference and could not be analyzed locally.", None, None)
    pdf_bytes = resolve_file_asset_path(file_asset).read_bytes()
    if not pdf_bytes:
        return (f"{file_asset.file_name} is empty.", None, None)
    live = _summarize_with_live_ai(
        instructions=(
            "You are VOIS file memory analysis. Read the uploaded PDF and summarize the operator-relevant facts "
            "that should be remembered later. Extract policies, procedures, timings, numbers, checklist items, and "
            "commitments that matter for execution."
        ),
        user_content=[
            {"type": "text", "text": f"Analyze this PDF for future VOIS recall: {file_asset.file_name}"},
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": base64.b64encode(pdf_bytes).decode("utf-8"),
                },
            },
        ],
        max_tokens=420,
    )
    if live is not None:
        return live
    return (f"{file_asset.file_name} is stored as a PDF attachment for later review.", None, None)


def _summarize_with_live_ai(
    *,
    instructions: str,
    user_content: object,
    max_tokens: int,
) -> tuple[str, str, str] | None:
    settings = get_settings()
    policy = settings.ai_runtime_policy()
    if policy.effective_provider != "anthropic":
        return None
    from app.services.ai_runtime import _build_anthropic_client

    client = _build_anthropic_client(settings)
    response = client.messages.create(
        model=policy.effective_model,
        system=instructions,
        messages=[{"role": "user", "content": user_content}],
        max_tokens=max_tokens,
    )
    text_blocks = [block.text for block in response.content if hasattr(block, "text")]
    text = "".join(text_blocks).strip()
    if not text:
        return None
    return text, policy.effective_provider, policy.effective_model


def _chunk_text(text: str, *, target_chars: int = 600) -> list[str]:
    cleaned_lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not cleaned_lines:
        return []
    chunks: list[str] = []
    current: list[str] = []
    current_length = 0
    for line in cleaned_lines:
        if current and current_length + len(line) + 1 > target_chars:
            chunks.append(" ".join(current)[:target_chars])
            current = []
            current_length = 0
        current.append(line)
        current_length += len(line) + 1
    if current:
        chunks.append(" ".join(current)[:target_chars])
    return chunks[:8]


def _extract_keywords(text: str, *, limit: int) -> list[str]:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9_-]{2,}", text.lower())
    counts = Counter(word for word in words if word not in _STOPWORDS)
    return [word for word, _ in counts.most_common(limit)]


def _extract_salient_quotes(text: str) -> list[str]:
    quotes: list[str] = []
    for line in text.splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip()
        if len(cleaned) < 24:
            continue
        quotes.append(cleaned[:220])
        if len(quotes) == 3:
            break
    return quotes


def _score_analysis_relevance(
    *,
    analysis: FileAssetAnalysis,
    file_asset: FileAsset,
    chunks: list[FileAssetMemoryChunk],
    prompt_terms: set[str],
    attached_file_asset_ids: list[str],
) -> float:
    score = 0.0
    if file_asset.id in attached_file_asset_ids:
        score += 10.0
    keywords = set((analysis.keywords or [])[:20])
    overlap = keywords.intersection(prompt_terms)
    score += float(len(overlap)) * 2.0
    searchable = " ".join(
        [
            file_asset.file_name.lower(),
            (analysis.summary or "").lower(),
            " ".join(chunk.content.lower() for chunk in chunks[:4]),
        ]
    )
    for term in prompt_terms:
        if term in searchable:
            score += 0.6
    return score


def _top_matching_chunks(
    chunks: list[FileAssetMemoryChunk],
    *,
    prompt_terms: set[str],
    limit: int,
) -> list[FileAssetMemoryChunk]:
    if not prompt_terms:
        return chunks[:limit]

    def rank(chunk: FileAssetMemoryChunk) -> tuple[int, int]:
        chunk_terms = set(_extract_keywords(chunk.content, limit=20))
        overlap = len(chunk_terms.intersection(prompt_terms))
        return (overlap, -chunk.chunk_index)

    return sorted(chunks, key=rank, reverse=True)[:limit]
