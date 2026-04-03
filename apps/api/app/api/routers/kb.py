"""Knowledge base reading state and article API."""

import json
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.models.domain import KBReadingState, utc_now
from app.services.auth import AuthenticatedActor

KB_ARTICLES_DIR = Path(__file__).resolve().parent.parent.parent / "kb_articles"

CATEGORY_LABELS = {
    "failure-autopsy": "Failure Autopsies",
    "domain-landscape": "Domain Landscapes",
    "playbook": "Playbooks",
    "signal-story": "Signal Stories",
}

DOMAIN_LABELS = {
    "operations": "Operations",
    "leadership": "Leadership",
    "guest-experience": "Guest Experience",
    "safety": "Safety & Compliance",
    "talent": "Talent & People",
    "financial": "Financial",
}


def _load_all_articles() -> list[dict[str, Any]]:
    """Load all KB article JSON files from disk."""
    articles: list[dict[str, Any]] = []
    if not KB_ARTICLES_DIR.is_dir():
        return articles
    for path in sorted(KB_ARTICLES_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            articles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return articles

router = APIRouter(tags=["kb"])


class KBReadingStatePayload(BaseModel):
    bookmarked_ids: list[str] = []
    read_ids: list[str] = []
    notes: dict[str, str] = {}
    struggles: list[str] = []


class KBReadingStateResponse(BaseModel):
    bookmarked_ids: list[str]
    read_ids: list[str]
    notes: dict[str, str]
    struggles: list[str]


@router.get("/reading-state", response_model=KBReadingStateResponse)
def get_reading_state(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> KBReadingStateResponse:
    state = db.get(KBReadingState, current_user.id)
    if state is None:
        return KBReadingStateResponse(bookmarked_ids=[], read_ids=[], notes={}, struggles=[])
    return KBReadingStateResponse(
        bookmarked_ids=state.bookmarked_ids or [],
        read_ids=state.read_ids or [],
        notes=state.notes or {},
        struggles=state.struggles or [],
    )


@router.put("/reading-state", response_model=KBReadingStateResponse)
def save_reading_state(
    payload: KBReadingStatePayload,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> KBReadingStateResponse:
    state = db.get(KBReadingState, current_user.id)
    if state is None:
        state = KBReadingState(user_id=current_user.id)
        db.add(state)
    state.bookmarked_ids = payload.bookmarked_ids
    state.read_ids = payload.read_ids
    state.notes = payload.notes
    state.struggles = payload.struggles
    state.updated_at = utc_now()
    db.commit()
    db.refresh(state)
    return KBReadingStateResponse(
        bookmarked_ids=state.bookmarked_ids or [],
        read_ids=state.read_ids or [],
        notes=state.notes or {},
        struggles=state.struggles or [],
    )


# ── Article endpoints ──────────────────────────────────────────────────────


@router.get("/articles")
def list_articles(
    category: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return all KB articles (metadata only, no sections/body)."""
    articles = _load_all_articles()
    result = []
    for article in articles:
        art_status = article.get("status", "published")
        if status and art_status != status:
            continue
        if not status and art_status != "published":
            continue
        if category and article.get("category") != category:
            continue
        if domain and article.get("domain") != domain:
            continue
        lite = {k: v for k, v in article.items() if k not in ("sections", "legacyBuilder")}
        result.append(lite)
    return result


@router.get("/articles/{slug}")
def get_article(
    slug: str,
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> dict[str, Any]:
    """Return a single KB article by slug (full content)."""
    path = KB_ARTICLES_DIR / f"{slug}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Article '{slug}' not found")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/categories")
def list_categories(
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return KB categories with article counts."""
    articles = _load_all_articles()
    counts: dict[str, int] = {}
    for article in articles:
        if article.get("status", "published") != "published":
            continue
        cat = article.get("category", "")
        counts[cat] = counts.get(cat, 0) + 1
    return [
        {"slug": slug, "label": CATEGORY_LABELS.get(slug, slug), "count": count}
        for slug, count in sorted(counts.items())
    ]


@router.get("/domains")
def list_domains(
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Return KB domains with article counts."""
    articles = _load_all_articles()
    counts: dict[str, int] = {}
    for article in articles:
        if article.get("status", "published") != "published":
            continue
        dom = article.get("domain", "")
        counts[dom] = counts.get(dom, 0) + 1
    return [
        {"slug": slug, "label": DOMAIN_LABELS.get(slug, slug), "count": count}
        for slug, count in sorted(counts.items())
    ]
