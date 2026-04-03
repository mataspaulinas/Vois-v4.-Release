from __future__ import annotations

import json
import re

from app.schemas.intake import IntakePreviewResponse, IntakeSignalMatch
from app.services.ontology import OntologyRepository


class IntakeService:
    def __init__(self, repository: OntologyRepository):
        self.repository = repository

    def preview(
        self,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse:
        mount = self.repository.load_mount(ontology_id, version, allow_invalid=False, require_runtime=False)
        bundle = self.repository.load_bundle_for_identity(mount.ontology_id, mount.version)
        signal_keywords = _load_signal_keywords(mount.intake_keywords_path)
        resolved_version = bundle.meta.version
        normalized_text = raw_text.strip()
        lowered_text = normalized_text.lower()
        snippets = _extract_snippets(normalized_text)
        signal_map = {signal.id: signal for signal in bundle.signals}

        matches: list[IntakeSignalMatch] = []
        matched_snippets: set[str] = set()

        for signal_id, keywords in signal_keywords.items():
            signal = signal_map.get(signal_id)
            if signal is None:
                continue

            reasons: list[str] = []
            snippet = ""
            score = 0.0

            for keyword in keywords:
                if keyword in lowered_text:
                    reasons.append(keyword)
                    score += 0.34
                    if not snippet:
                        snippet = _best_snippet(snippets, keyword)

            if signal.name.lower() in lowered_text:
                reasons.append(signal.name.lower())
                score += 0.2
                if not snippet:
                    snippet = _best_snippet(snippets, signal.name.lower())

            if not reasons:
                continue

            snippet = snippet or snippets[0] if snippets else normalized_text
            matched_snippets.add(snippet)
            clipped_score = min(round(score, 2), 0.99)
            matches.append(
                IntakeSignalMatch(
                    signal_id=signal.id,
                    signal_name=signal.name,
                    confidence=_confidence_label(clipped_score),
                    score=clipped_score,
                    evidence_snippet=snippet,
                    match_reasons=sorted(set(reasons)),
                )
            )

        matches.sort(key=lambda item: (-item.score, item.signal_id))
        unmapped_observations = [
            snippet for snippet in snippets if len(snippet.split()) >= 4 and snippet not in matched_snippets
        ][:3]

        return IntakePreviewResponse(
            ontology_id=mount.ontology_id,
            ontology_version=resolved_version,
            detected_signals=matches,
            unmapped_observations=unmapped_observations,
        )


def _load_signal_keywords(path) -> dict[str, list[str]]:
    if path is None or not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {
        signal_id: [str(keyword) for keyword in keywords]
        for signal_id, keywords in payload.items()
        if isinstance(keywords, list)
    }


def _extract_snippets(raw_text: str) -> list[str]:
    parts = re.split(r"[\n\r]+|(?<=[.!?])\s+", raw_text)
    snippets = [part.strip(" -\t") for part in parts if part.strip()]
    return snippets[:20]


def _best_snippet(snippets: list[str], keyword: str) -> str:
    keyword_lower = keyword.lower()
    for snippet in snippets:
        if keyword_lower in snippet.lower():
            return snippet
    return snippets[0] if snippets else ""


def _confidence_label(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"
