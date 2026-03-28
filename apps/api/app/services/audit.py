from sqlalchemy.orm import Session

from app.models.domain import AuditEntry


def record_audit_entry(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    organization_id: str | None = None,
    actor_user_id: str | None = None,
    payload: dict[str, object] | None = None,
) -> AuditEntry:
    entry = AuditEntry(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        payload=payload or {},
    )
    db.add(entry)
    return entry
