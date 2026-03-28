from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import AuditEntry, User
from app.schemas.domain import AuditEntryRead


def list_audit_entries(
    db: Session,
    *,
    organization_id: str | None = None,
    entity_type: str | None = None,
    limit: int = 25,
) -> list[AuditEntryRead]:
    query = select(AuditEntry)
    if organization_id is not None:
        query = query.where(AuditEntry.organization_id == organization_id)
    if entity_type is not None:
        query = query.where(AuditEntry.entity_type == entity_type)

    entries = list(
        db.scalars(
            query.order_by(AuditEntry.created_at.desc()).limit(limit)
        ).all()
    )
    actor_ids = [entry.actor_user_id for entry in entries if entry.actor_user_id]
    users = (
        list(db.scalars(select(User).where(User.id.in_(actor_ids))).all())
        if actor_ids
        else []
    )
    actor_names = {user.id: user.full_name for user in users}

    return [
        AuditEntryRead(
            id=entry.id,
            organization_id=entry.organization_id,
            actor_user_id=entry.actor_user_id,
            actor_name=actor_names.get(entry.actor_user_id) if entry.actor_user_id else None,
            entity_type=entry.entity_type,
            entity_id=entry.entity_id,
            action=entry.action,
            payload=entry.payload,
            created_at=entry.created_at,
        )
        for entry in entries
    ]
