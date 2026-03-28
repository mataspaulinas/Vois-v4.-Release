from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_organization_id_access
from app.db.session import get_db
from app.models.domain import User
from app.schemas.domain import AuditEntryRead
from app.services.audit_history import list_audit_entries


router = APIRouter()


@router.get("", response_model=list[AuditEntryRead])
def get_audit_entries(
    organization_id: str | None = None,
    entity_type: str | None = None,
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditEntryRead]:
    resolved_organization_id = organization_id or current_user.organization_id
    require_organization_id_access(current_user, resolved_organization_id)
    return list_audit_entries(db, organization_id=resolved_organization_id, entity_type=entity_type, limit=limit)
