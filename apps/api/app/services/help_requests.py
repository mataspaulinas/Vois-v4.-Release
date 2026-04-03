from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    AuthRole,
    CopilotContextKind,
    CopilotThread,
    CopilotThreadVisibility,
    HelpRequest,
    HelpRequestStatus,
    ThreadScope,
    User,
    Venue,
    utc_now,
)
from app.schemas.domain import HelpRequestCreateRequest, HelpRequestRead, HelpRequestUpdateRequest
from app.services.audit import record_audit_entry
from app.services.copilot import send_copilot_message


def list_help_requests(
    db: Session,
    *,
    venue_id: str,
    current_user: User,
    mine_only: bool = False,
) -> list[HelpRequestRead]:
    query = select(HelpRequest).where(HelpRequest.venue_id == venue_id)
    if current_user.role == AuthRole.BARISTA or mine_only:
        query = query.where(HelpRequest.requester_user_id == current_user.id)
    items = db.scalars(query.order_by(HelpRequest.created_at.desc())).all()
    return [_serialize_help_request(item) for item in items]


def get_help_request(
    db: Session,
    *,
    help_request_id: str,
    current_user: User,
) -> HelpRequestRead:
    item = _load_help_request_for_user(db, help_request_id=help_request_id, current_user=current_user)
    return _serialize_help_request(item)


def create_help_request(
    db: Session,
    *,
    payload: HelpRequestCreateRequest,
    current_user: User,
) -> HelpRequestRead:
    venue = db.get(Venue, payload.venue_id)
    if venue is None:
        raise LookupError("Venue not found")

    thread = CopilotThread(
        organization_id=venue.organization_id,
        venue_id=venue.id,
        title=f"Help: {payload.title.strip()}",
        scope=ThreadScope.HELP_REQUEST,
        visibility=CopilotThreadVisibility.SHARED,
        context_kind=CopilotContextKind.HELP_REQUEST,
        archived=False,
        last_activity_at=utc_now(),
    )
    db.add(thread)
    db.flush()

    item = HelpRequest(
        venue_id=venue.id,
        requester_user_id=current_user.id,
        channel=payload.channel.strip() or "pocket",
        title=payload.title.strip(),
        prompt=payload.prompt.strip(),
        status=HelpRequestStatus.OPEN,
        linked_thread_id=thread.id,
    )
    db.add(item)
    db.flush()
    thread.context_id = item.id

    record_audit_entry(
        db,
        organization_id=venue.organization_id,
        actor_user_id=current_user.id,
        entity_type="help_request",
        entity_id=item.id,
        action="created",
        payload={"venue_id": venue.id, "linked_thread_id": thread.id, "channel": item.channel},
    )

    try:
        send_copilot_message(
            db,
            thread_id=thread.id,
            content=item.prompt,
            created_by=current_user.id,
            actor_role=current_user.role,
        )
    except Exception:
        db.rollback()
        raise

    return _serialize_help_request(item)


def update_help_request(
    db: Session,
    *,
    help_request_id: str,
    payload: HelpRequestUpdateRequest,
    current_user: User,
) -> HelpRequestRead:
    item = _load_help_request_for_user(db, help_request_id=help_request_id, current_user=current_user)

    previous_status = item.status
    item.status = payload.status
    item.resolved_at = datetime.now(timezone.utc) if payload.status == HelpRequestStatus.CLOSED else None

    venue = db.get(Venue, item.venue_id)
    record_audit_entry(
        db,
        organization_id=venue.organization_id if venue is not None else None,
        actor_user_id=current_user.id,
        entity_type="help_request",
        entity_id=item.id,
        action="updated",
        payload={
            "previous_status": previous_status.value,
            "status": item.status.value,
            "linked_thread_id": item.linked_thread_id,
        },
    )
    db.commit()
    db.refresh(item)
    return _serialize_help_request(item)


def _load_help_request_for_user(db: Session, *, help_request_id: str, current_user: User) -> HelpRequest:
    item = db.get(HelpRequest, help_request_id)
    if item is None:
        raise LookupError("Help request not found")
    if current_user.role == AuthRole.BARISTA and item.requester_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Help request is not available to this barista")
    return item


def _serialize_help_request(item: HelpRequest) -> HelpRequestRead:
    return HelpRequestRead(
        id=item.id,
        venue_id=item.venue_id,
        requester_user_id=item.requester_user_id,
        channel=item.channel,
        title=item.title,
        prompt=item.prompt,
        status=item.status,
        linked_thread_id=item.linked_thread_id,
        created_at=item.created_at,
        resolved_at=item.resolved_at,
    )
