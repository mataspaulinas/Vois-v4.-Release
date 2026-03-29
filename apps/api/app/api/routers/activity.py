"""Cross-venue activity feed API."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, union_all, literal_column
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.models.domain import AuditEntry, ProgressEntry
from app.services.auth import AuthenticatedActor

router = APIRouter(tags=["activity"])


@router.get("/feed")
def activity_feed(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
    limit: int = Query(default=50, le=100),
):
    """Unified cross-venue activity feed combining progress entries and audit events."""
    venue_ids = list(current_user.accessible_venue_ids)
    if not venue_ids:
        return []

    # Progress entries (operational activity)
    progress = list(
        db.scalars(
            select(ProgressEntry)
            .where(ProgressEntry.venue_id.in_(venue_ids))
            .order_by(ProgressEntry.created_at.desc())
            .limit(limit)
        ).all()
    )

    # Audit entries (system activity)
    audit = list(
        db.scalars(
            select(AuditEntry)
            .where(AuditEntry.organization_id.in_(current_user.organization_ids))
            .order_by(AuditEntry.created_at.desc())
            .limit(limit)
        ).all()
    )

    # Merge and sort
    items = []
    for p in progress:
        items.append({
            "id": p.id,
            "type": "progress",
            "subtype": p.entry_type.value if p.entry_type else "note",
            "summary": p.summary,
            "detail": p.detail,
            "venue_id": p.venue_id,
            "actor_user_id": p.created_by,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    for a in audit:
        items.append({
            "id": a.id,
            "type": "audit",
            "subtype": a.action,
            "summary": f"{a.action} on {a.entity_type}",
            "detail": None,
            "venue_id": None,
            "actor_user_id": a.actor_user_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    items.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return items[:limit]
