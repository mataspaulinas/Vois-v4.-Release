from __future__ import annotations

import base64
import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.domain import CopilotThread, FileAsset, User, Venue
from app.schemas.copilot import CopilotAttachment
from app.schemas.files import FileAssetRead, FileAssetRegisterRequest
from app.services.audit import record_audit_entry

_TEXT_ATTACHMENT_EXTENSIONS = {
    ".csv",
    ".json",
    ".log",
    ".md",
    ".markdown",
    ".ndjson",
    ".text",
    ".txt",
    ".yaml",
    ".yml",
}
_IMAGE_ATTACHMENT_EXTENSIONS = {
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".webp",
}
_TEXT_ATTACHMENT_CONTENT_TYPES = {
    "application/csv",
    "application/json",
    "application/ld+json",
    "application/x-ndjson",
    "application/x-yaml",
    "application/yaml",
    "application/xml",
    "text/csv",
    "text/markdown",
    "text/plain",
    "text/xml",
}
_IMAGE_ATTACHMENT_CONTENT_TYPES = {
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
}
_ATTACHMENT_EXCERPT_MAX_BYTES = 8_192
_ATTACHMENT_EXCERPT_MAX_LINES = 12
_ATTACHMENT_EXCERPT_MAX_CHARS = 1_200
_VISION_ATTACHMENT_MAX_BYTES = 4_000_000


@dataclass
class CopilotAttachmentBrief:
    file_asset_id: str | None
    file_name: str
    content_type: str | None
    content_url: str | None
    briefing_mode: str
    excerpt: str | None = None
    vision_input_url: str | None = None


class LocalFileStorage:
    def __init__(self, root: Path):
        self.root = root

    def persist_bytes(
        self,
        *,
        organization_id: str,
        venue_id: str | None,
        file_asset_id: str,
        file_name: str,
        content: bytes,
    ) -> tuple[str, int, str]:
        safe_name = _safe_file_name(file_name)
        parts = [organization_id]
        if venue_id is not None:
            parts.append(venue_id)
        parts.extend([file_asset_id, safe_name])
        relative_path = Path(*parts)
        target_path = self.root / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        digest = hashlib.sha256(content).hexdigest()
        return relative_path.as_posix(), len(content), digest

    def resolve_path(self, storage_key: str) -> Path:
        return self.root / Path(storage_key)


def get_local_file_storage() -> LocalFileStorage:
    return LocalFileStorage(get_settings().local_upload_root)


def register_file_asset(
    db: Session,
    *,
    payload: FileAssetRegisterRequest,
    current_user: User,
) -> FileAsset:
    if not payload.source_url and not payload.content_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either source_url or content_base64 must be provided",
        )

    venue = db.get(Venue, payload.venue_id) if payload.venue_id else None
    organization_id = venue.organization_id if venue is not None else current_user.organization_id

    file_asset = FileAsset(
        organization_id=organization_id,
        venue_id=payload.venue_id,
        created_by=current_user.id,
        file_name=payload.file_name,
        content_type=payload.content_type,
    )
    db.add(file_asset)
    db.flush()

    if payload.content_base64:
        content = _decode_base64_payload(payload.content_base64)
        storage_key, size_bytes, digest = get_local_file_storage().persist_bytes(
            organization_id=organization_id,
            venue_id=payload.venue_id,
            file_asset_id=file_asset.id,
            file_name=payload.file_name,
            content=content,
        )
        file_asset.storage_backend = "local"
        file_asset.ingest_mode = "uploaded_content"
        file_asset.storage_key = storage_key
        file_asset.size_bytes = size_bytes
        file_asset.sha256 = digest
    else:
        file_asset.storage_backend = "reference"
        file_asset.ingest_mode = "external_reference"
        file_asset.source_url = payload.source_url

    record_audit_entry(
        db,
        organization_id=file_asset.organization_id,
        actor_user_id=current_user.id,
        entity_type="file_asset",
        entity_id=file_asset.id,
        action="registered",
        payload={
            "venue_id": file_asset.venue_id,
            "file_name": file_asset.file_name,
            "storage_backend": file_asset.storage_backend,
            "ingest_mode": file_asset.ingest_mode,
        },
    )
    db.commit()
    db.refresh(file_asset)
    from app.services.file_analysis import ensure_file_asset_analysis

    ensure_file_asset_analysis(db, file_asset=file_asset, created_by=current_user.id)
    db.refresh(file_asset)
    return file_asset


def list_file_assets(
    db: Session,
    *,
    current_user: User,
    venue_id: str | None = None,
) -> list[FileAsset]:
    query = select(FileAsset).where(FileAsset.organization_id == current_user.organization_id)
    if venue_id is not None:
        query = query.where(FileAsset.venue_id == venue_id)
    return list(db.scalars(query.order_by(FileAsset.created_at.desc())).all())


def get_file_asset(db: Session, *, file_asset_id: str, current_user: User) -> FileAsset:
    file_asset = db.get(FileAsset, file_asset_id)
    if file_asset is None or file_asset.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File asset not found")
    return file_asset


def resolve_file_asset_path(file_asset: FileAsset) -> Path:
    if not file_asset.storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content is not stored locally")
    path = get_local_file_storage().resolve_path(file_asset.storage_key)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file content is missing")
    return path


def materialize_copilot_attachments(
    db: Session,
    *,
    thread: CopilotThread,
    attachments: list[CopilotAttachment],
    current_user: User,
) -> tuple[list[CopilotAttachment], list[dict[str, object]]]:
    normalized_attachments: list[CopilotAttachment] = []
    references: list[dict[str, object]] = []

    for attachment in attachments:
        if attachment.file_asset_id:
            file_asset = get_file_asset(db, file_asset_id=attachment.file_asset_id, current_user=current_user)
        else:
            payload = FileAssetRegisterRequest(
                venue_id=thread.venue_id,
                file_name=attachment.file_name,
                content_type=attachment.content_type,
                source_url=attachment.url,
                content_base64=attachment.content_base64,
            )
            file_asset = register_file_asset(db, payload=payload, current_user=current_user)

        content_url = _content_url(file_asset) if file_asset.storage_key else file_asset.source_url
        normalized_attachments.append(
            CopilotAttachment(
                file_asset_id=file_asset.id,
                file_name=file_asset.file_name,
                content_type=file_asset.content_type,
                url=content_url,
            )
        )
        brief = _build_attachment_brief(file_asset=file_asset, content_url=content_url)
        payload = {
            "content_type": file_asset.content_type,
            "content_url": content_url,
            "storage_backend": file_asset.storage_backend,
            "ingest_mode": file_asset.ingest_mode,
            "briefing_mode": brief.briefing_mode,
        }
        if brief.excerpt:
            payload["excerpt_preview"] = brief.excerpt[:280]
        if brief.vision_input_url:
            payload["vision_ready"] = True
        references.append(
            {
                "type": "file_asset",
                "label": file_asset.file_name,
                "id": file_asset.id,
                "payload": payload,
            }
        )

    return normalized_attachments, references


def build_copilot_attachment_briefs(
    db: Session,
    *,
    organization_id: str,
    attachments: list[CopilotAttachment],
) -> list[CopilotAttachmentBrief]:
    briefs: list[CopilotAttachmentBrief] = []
    for attachment in attachments:
        file_asset = None
        if attachment.file_asset_id:
            candidate = db.get(FileAsset, attachment.file_asset_id)
            if candidate is not None and candidate.organization_id == organization_id:
                file_asset = candidate

        if file_asset is not None:
            content_url = attachment.url or (_content_url(file_asset) if file_asset.storage_key else file_asset.source_url)
            briefs.append(_build_attachment_brief(file_asset=file_asset, content_url=content_url))
            continue

        briefs.append(
            CopilotAttachmentBrief(
                file_asset_id=attachment.file_asset_id,
                file_name=attachment.file_name,
                content_type=attachment.content_type,
                content_url=attachment.url,
                briefing_mode="metadata_only",
            )
        )

    return briefs


def serialize_file_asset(file_asset: FileAsset) -> FileAssetRead:
    return FileAssetRead(
        id=file_asset.id,
        organization_id=file_asset.organization_id,
        venue_id=file_asset.venue_id,
        created_by=file_asset.created_by,
        file_name=file_asset.file_name,
        content_type=file_asset.content_type,
        storage_backend=file_asset.storage_backend,
        ingest_mode=file_asset.ingest_mode,
        storage_key=file_asset.storage_key,
        source_url=file_asset.source_url,
        size_bytes=file_asset.size_bytes,
        sha256=file_asset.sha256,
        content_url=_content_url(file_asset) if file_asset.storage_key else file_asset.source_url,
        created_at=file_asset.created_at,
    )


def _decode_base64_payload(payload: str) -> bytes:
    encoded = payload.split(",", 1)[1] if payload.startswith("data:") and "," in payload else payload
    try:
        return base64.b64decode(encoded)
    except Exception as exc:  # pragma: no cover - defensive branch
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 payload") from exc


def _safe_file_name(file_name: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "-", file_name).strip("-")
    return sanitized or f"file-{uuid4().hex[:8]}"


def _content_url(file_asset: FileAsset) -> str:
    return f"{get_settings().api_v1_prefix}/files/{file_asset.id}/content"


def _build_attachment_brief(*, file_asset: FileAsset, content_url: str | None) -> CopilotAttachmentBrief:
    excerpt = _local_text_excerpt(file_asset)
    vision_input_url = _local_image_data_url(file_asset)
    if vision_input_url:
        briefing_mode = "image_input"
    elif excerpt:
        briefing_mode = "text_excerpt"
    else:
        briefing_mode = "metadata_only"
    return CopilotAttachmentBrief(
        file_asset_id=file_asset.id,
        file_name=file_asset.file_name,
        content_type=file_asset.content_type,
        content_url=content_url,
        briefing_mode=briefing_mode,
        excerpt=excerpt,
        vision_input_url=vision_input_url,
    )


def _local_text_excerpt(file_asset: FileAsset) -> str | None:
    if file_asset.storage_backend != "local" or not file_asset.storage_key:
        return None
    if not _supports_text_excerpt(file_asset.file_name, file_asset.content_type):
        return None

    raw_bytes = resolve_file_asset_path(file_asset).read_bytes()[:_ATTACHMENT_EXCERPT_MAX_BYTES]
    if not raw_bytes:
        return None

    decoded = raw_bytes.decode("utf-8", errors="replace").replace("\ufeff", "")
    decoded = decoded.replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
    lines: list[str] = []
    for raw_line in decoded.split("\n"):
        line = re.sub(r"\s+", " ", raw_line).strip()
        if not line:
            continue
        lines.append(line)
        if len(lines) >= _ATTACHMENT_EXCERPT_MAX_LINES:
            break

    if not lines:
        return None

    excerpt = "\n".join(lines)
    return excerpt[:_ATTACHMENT_EXCERPT_MAX_CHARS]


def _supports_text_excerpt(file_name: str, content_type: str | None) -> bool:
    normalized_type = (content_type or "").strip().lower()
    if normalized_type.startswith("text/") or normalized_type in _TEXT_ATTACHMENT_CONTENT_TYPES:
        return True
    if normalized_type.endswith("+json"):
        return True
    return Path(file_name).suffix.lower() in _TEXT_ATTACHMENT_EXTENSIONS


def _local_image_data_url(file_asset: FileAsset) -> str | None:
    if file_asset.storage_backend != "local" or not file_asset.storage_key:
        return None
    if not _supports_image_input(file_asset.file_name, file_asset.content_type):
        return None

    image_bytes = resolve_file_asset_path(file_asset).read_bytes()
    if not image_bytes or len(image_bytes) > _VISION_ATTACHMENT_MAX_BYTES:
        return None

    content_type = (file_asset.content_type or "").strip().lower() or _infer_image_content_type(file_asset.file_name)
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{content_type};base64,{encoded}"


def _supports_image_input(file_name: str, content_type: str | None) -> bool:
    normalized_type = (content_type or "").strip().lower()
    if normalized_type in _IMAGE_ATTACHMENT_CONTENT_TYPES:
        return True
    return Path(file_name).suffix.lower() in _IMAGE_ATTACHMENT_EXTENSIONS


def _infer_image_content_type(file_name: str) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".png":
        return "image/png"
    if suffix in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if suffix == ".webp":
        return "image/webp"
    if suffix == ".gif":
        return "image/gif"
    return "image/png"
