from __future__ import annotations

from collections import defaultdict

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.ai_contracts import get_ai_contract_registry
from app.models.domain import (
    AuthRole,
    CopilotAuthorRole,
    CopilotMessage,
    CopilotThread,
    FileAsset,
    HelpRequest,
    ThreadScope,
    User,
    Venue,
)
from app.schemas.copilot import (
    CopilotAttachment,
    CopilotMessageRead,
    CopilotReference,
    CopilotThreadDetail,
    CopilotThreadSummary,
)
from app.services.audit import record_audit_entry
from app.services.ai_runtime import get_ai_runtime_service_for_actor
from app.services.auth import AuthenticatedActor
from app.services.file_analysis import ensure_file_asset_analysis
from app.services.file_assets import materialize_copilot_attachments


def list_copilot_threads(
    db: Session,
    venue_id: str | None = None,
    current_user: AuthenticatedActor | None = None,
) -> list[CopilotThreadSummary]:
    threads = _load_threads(db, venue_id, current_user=current_user)
    return _serialize_thread_summaries(db, threads)


def get_copilot_thread_detail(db: Session, thread_id: str) -> CopilotThreadDetail:
    thread = db.get(CopilotThread, thread_id)
    if thread is None:
        raise LookupError("Copilot thread not found")

    messages = _load_thread_messages(db, [thread.id]).get(thread.id, [])
    summary = _serialize_thread_summary(thread, messages)
    return CopilotThreadDetail(
        **summary.model_dump(),
        messages=[_serialize_message(message) for message in messages],
    )


def send_copilot_message(
    db: Session,
    *,
    thread_id: str,
    content: str,
    attachments: list[CopilotAttachment] | None = None,
    created_by: str | None = None,
    actor_role: AuthRole | None = None,
) -> CopilotThreadDetail:
    thread = db.get(CopilotThread, thread_id)
    if thread is None:
        raise LookupError("Copilot thread not found")
    if thread.archived:
        raise ValueError("Archived threads cannot accept new messages")

    actor = db.get(User, created_by) if created_by else db.scalar(select(User).order_by(User.created_at.asc()))
    normalized_attachments: list[CopilotAttachment] = []
    attachment_references: list[dict[str, object]] = []
    if attachments and actor is not None:
        normalized_attachments, attachment_references = materialize_copilot_attachments(
            db,
            thread=thread,
            attachments=attachments,
            current_user=actor,
        )
        for attachment in normalized_attachments:
            if not attachment.file_asset_id:
                continue
            file_asset = db.get(FileAsset, attachment.file_asset_id)
            if file_asset is None or file_asset.organization_id != thread.organization_id:
                continue
            ensure_file_asset_analysis(db, file_asset=file_asset, created_by=actor.id)

    user_message = CopilotMessage(
        thread_id=thread.id,
        created_by=created_by,
        author_role=CopilotAuthorRole.USER,
        source_mode="manual_input",
        content=content.strip(),
        references=attachment_references,
        attachments=[attachment.model_dump() for attachment in normalized_attachments or attachments or []],
    )
    db.add(user_message)
    db.flush()
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=created_by,
        entity_type="copilot_message",
        entity_id=user_message.id,
        action="created",
        payload={"thread_id": thread.id, "author_role": user_message.author_role.value, "source_mode": user_message.source_mode},
    )

    assistant_payload = get_ai_runtime_service_for_actor(actor_role or AuthRole.DEVELOPER).generate_copilot_reply(
        db=db,
        thread=thread,
        prompt=user_message.content,
        attachments=normalized_attachments or attachments or [],
    )
    assistant_message = CopilotMessage(
        thread_id=thread.id,
        author_role=CopilotAuthorRole.ASSISTANT,
        source_mode=assistant_payload.source_mode,
        content=assistant_payload.content,
        references=assistant_payload.references,
        attachments=[],
    )
    db.add(assistant_message)
    db.flush()

    contract = get_ai_contract_registry()[assistant_payload.function]
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=created_by,
        entity_type="copilot_message",
        entity_id=assistant_message.id,
        action="generated",
        payload={
            "thread_id": thread.id,
            "author_role": assistant_message.author_role.value,
            "source_mode": assistant_message.source_mode,
            "function": contract.function.value,
            "prompt_version": contract.system_prompt_version,
            "provider": assistant_payload.provider,
            "model": assistant_payload.model,
            "requires_user_confirmation": contract.requires_user_confirmation,
            "references": assistant_payload.references,
        },
    )

    db.commit()
    return get_copilot_thread_detail(db, thread.id)


def _load_threads(
    db: Session,
    venue_id: str | None = None,
    current_user: AuthenticatedActor | None = None,
) -> list[CopilotThread]:
    query = select(CopilotThread).where(CopilotThread.archived.is_(False))
    if venue_id is not None:
        venue = db.get(Venue, venue_id)
        if venue is None:
            raise LookupError("Venue not found")
        query = query.where(CopilotThread.organization_id == venue.organization_id)
        query = query.where(or_(CopilotThread.venue_id.is_(None), CopilotThread.venue_id == venue_id))
    elif current_user is not None:
        if current_user.organization_id is None:
            return []
        query = query.where(CopilotThread.organization_id == current_user.organization_id)

    threads = list(db.scalars(query.order_by(CopilotThread.created_at.asc())).all())
    if current_user is not None and current_user.role == AuthRole.BARISTA:
        allowed_help_thread_ids = set(
            db.scalars(
                select(HelpRequest.linked_thread_id).where(
                    HelpRequest.requester_user_id == current_user.id,
                    HelpRequest.linked_thread_id.is_not(None),
                )
            ).all()
        )
        threads = [
            thread
            for thread in threads
            if thread.scope != ThreadScope.HELP_REQUEST or thread.id in allowed_help_thread_ids
        ]
    messages_by_thread = _load_thread_messages(db, [thread.id for thread in threads])
    return sorted(
        threads,
        key=lambda thread: (
            messages_by_thread[thread.id][-1].created_at if messages_by_thread[thread.id] else thread.created_at,
            thread.created_at,
        ),
        reverse=True,
    )


def _load_thread_messages(db: Session, thread_ids: list[str]) -> dict[str, list[CopilotMessage]]:
    if not thread_ids:
        return defaultdict(list)

    messages = list(
        db.scalars(
            select(CopilotMessage)
            .where(CopilotMessage.thread_id.in_(thread_ids))
            .order_by(CopilotMessage.created_at.asc())
        ).all()
    )
    grouped: dict[str, list[CopilotMessage]] = defaultdict(list)
    for message in messages:
        grouped[message.thread_id].append(message)
    return grouped


def _serialize_thread_summaries(db: Session, threads: list[CopilotThread]) -> list[CopilotThreadSummary]:
    messages_by_thread = _load_thread_messages(db, [thread.id for thread in threads])
    return [_serialize_thread_summary(thread, messages_by_thread.get(thread.id, [])) for thread in threads]


def _serialize_thread_summary(thread: CopilotThread, messages: list[CopilotMessage]) -> CopilotThreadSummary:
    latest_message_at = messages[-1].created_at if messages else None
    return CopilotThreadSummary(
        id=thread.id,
        organization_id=thread.organization_id,
        venue_id=thread.venue_id,
        title=thread.title,
        scope=thread.scope,
        archived=thread.archived,
        message_count=len(messages),
        latest_message_at=latest_message_at,
        created_at=thread.created_at,
    )


def _serialize_message(message: CopilotMessage) -> CopilotMessageRead:
    return CopilotMessageRead(
        id=message.id,
        thread_id=message.thread_id,
        created_by=message.created_by,
        author_role=message.author_role,
        source_mode=message.source_mode,
        content=message.content,
        references=[CopilotReference.model_validate(reference) for reference in message.references],
        attachments=[CopilotAttachment.model_validate(attachment) for attachment in (message.attachments or [])],
        created_at=message.created_at,
    )
