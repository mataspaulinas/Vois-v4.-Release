from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.core.ai_contracts import get_ai_contract_registry
from app.models.domain import (
    Assessment,
    AuthRole,
    CopilotAuthorRole,
    CopilotContextKind,
    CopilotActionRecord,
    CopilotMessage,
    CopilotThread,
    CopilotThreadParticipant,
    CopilotThreadVisibility,
    EngineRun,
    EscalationSeverity,
    FileAsset,
    HelpRequest,
    OperationalPlan,
    Organization,
    PlanStatus,
    PlanTask,
    ProgressEntry,
    ProgressEntryType,
    ThreadScope,
    User,
    Venue,
    VenueStatus,
    utc_now,
)
from app.schemas.copilot import (
    CopilotActionCommitRead,
    CopilotActionPreviewRead,
    CopilotActionPreviewRequest,
    CopilotActionRecordRead,
    CopilotAttachment,
    CopilotMessageRead,
    CopilotProvenanceRead,
    CopilotReference,
    CopilotSearchHit,
    CopilotSearchResponse,
    CopilotThreadContextRead,
    CopilotThreadContextReference,
    CopilotThreadDetail,
    CopilotThreadParticipantStateRead,
    CopilotThreadSummary,
)
from app.services.audit import record_audit_entry
from app.services.ai_runtime import get_ai_runtime_service_for_actor
from app.services.auth import AuthenticatedActor
from app.services.execution_control import create_escalation
from app.services.file_analysis import ensure_file_asset_analysis
from app.services.file_assets import materialize_copilot_attachments
from app.services.ontology import get_ontology_repository
from app.services.plans import create_task_from_copilot_suggestion


def list_copilot_threads(
    db: Session,
    venue_id: str | None = None,
    current_user: AuthenticatedActor | None = None,
    *,
    search: str | None = None,
    visibility: CopilotThreadVisibility | None = None,
    include_archived: bool = False,
    context_kind: CopilotContextKind | None = None,
    sort: str = "recent",
) -> list[CopilotThreadSummary]:
    threads = _load_threads(
        db,
        venue_id=venue_id,
        current_user=current_user,
        search=search,
        visibility=visibility,
        include_archived=include_archived,
        context_kind=context_kind,
    )
    return _serialize_thread_summaries(db, threads, current_user=current_user, sort=sort)


def get_copilot_thread_detail(
    db: Session,
    thread_id: str,
    *,
    current_user: AuthenticatedActor | None = None,
) -> CopilotThreadDetail:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")

    if current_user is not None:
        _ensure_participant_state(db, thread=thread, user_id=current_user.id, mark_read=True)

    messages = _load_thread_messages(db, [thread.id]).get(thread.id, [])
    summary = _serialize_thread_summaries(db, [thread], current_user=current_user)[0]
    participant_state = _participant_state_for_thread(db, thread_id=thread.id, user_id=current_user.id) if current_user else None
    db.commit()
    return CopilotThreadDetail(
        **summary.model_dump(),
        participant_state=participant_state,
        messages=[_serialize_message(message) for message in messages],
    )


def create_copilot_thread(
    db: Session,
    *,
    current_user: AuthenticatedActor,
    title: str,
    visibility: CopilotThreadVisibility,
    venue_id: str | None = None,
    scope: ThreadScope = ThreadScope.VENUE,
    context_kind: CopilotContextKind = CopilotContextKind.GENERAL,
    context_id: str | None = None,
    initial_message: str | None = None,
) -> CopilotThreadDetail:
    if current_user.organization_id is None:
        raise ValueError("No organization is available for this user")
    if visibility == CopilotThreadVisibility.SHARED and current_user.role == AuthRole.BARISTA:
        raise ValueError("Baristas can only create private copilot threads")
    if visibility == CopilotThreadVisibility.PRIVATE and venue_id and current_user.role == AuthRole.BARISTA:
        if venue_id not in current_user.accessible_venue_ids:
            raise ValueError("Private thread venue is not available for this user")

    thread = CopilotThread(
        organization_id=current_user.organization_id,
        venue_id=venue_id,
        owner_user_id=current_user.id if visibility == CopilotThreadVisibility.PRIVATE else None,
        title=title.strip(),
        scope=scope,
        visibility=visibility,
        context_kind=context_kind,
        context_id=context_id,
        pinned=False,
        archived=False,
        last_activity_at=utc_now(),
    )
    db.add(thread)
    db.flush()
    _ensure_participant_state(db, thread=thread, user_id=current_user.id, mark_read=True)
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=current_user.id,
        entity_type="copilot_thread",
        entity_id=thread.id,
        action="created",
        payload={
            "visibility": thread.visibility.value,
            "scope": thread.scope.value,
            "context_kind": thread.context_kind.value,
            "context_id": thread.context_id,
            "venue_id": thread.venue_id,
        },
    )
    db.commit()

    if initial_message and initial_message.strip():
        return send_copilot_message(
            db,
            thread_id=thread.id,
            content=initial_message,
            attachments=[],
            created_by=current_user.id,
            actor_role=current_user.role,
            quoted_message_id=None,
            current_user=current_user,
        )

    return get_copilot_thread_detail(db, thread.id, current_user=current_user)


def update_copilot_thread(
    db: Session,
    *,
    thread_id: str,
    current_user: AuthenticatedActor,
    title: str | None = None,
    pinned: bool | None = None,
    archived: bool | None = None,
) -> CopilotThreadDetail:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")

    _validate_thread_mutation_permissions(thread=thread, current_user=current_user, destructive=archived is True)
    if title is not None:
        thread.title = title.strip()
    if pinned is not None:
        thread.pinned = pinned
    if archived is not None:
        thread.archived = archived
        thread.archived_at = utc_now() if archived else None
    thread.last_activity_at = utc_now()
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=current_user.id,
        entity_type="copilot_thread",
        entity_id=thread.id,
        action="updated",
        payload={"title": thread.title, "pinned": thread.pinned, "archived": thread.archived},
    )
    db.commit()
    return get_copilot_thread_detail(db, thread.id, current_user=current_user)


def delete_copilot_thread(
    db: Session,
    *,
    thread_id: str,
    current_user: AuthenticatedActor,
) -> None:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")
    if thread.visibility != CopilotThreadVisibility.PRIVATE or thread.owner_user_id != current_user.id:
        raise ValueError("Only the owner can delete a private thread")
    thread.deleted_at = utc_now()
    thread.archived = True
    thread.archived_at = thread.archived_at or thread.deleted_at
    thread.last_activity_at = utc_now()
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=current_user.id,
        entity_type="copilot_thread",
        entity_id=thread.id,
        action="deleted",
        payload={"visibility": thread.visibility.value},
    )
    db.commit()


def branch_copilot_thread(
    db: Session,
    *,
    thread_id: str,
    current_user: AuthenticatedActor,
    message_id: str | None = None,
    title: str | None = None,
    visibility: CopilotThreadVisibility | None = None,
) -> CopilotThreadDetail:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")

    branch_visibility = visibility or CopilotThreadVisibility.PRIVATE
    quoted_message = None
    if message_id:
        quoted_message = db.get(CopilotMessage, message_id)
        if quoted_message is None or quoted_message.thread_id != thread.id:
            raise LookupError("Quoted message not found")

    branch_title = (title or f"{thread.title} follow-up").strip()
    detail = create_copilot_thread(
        db,
        current_user=current_user,
        title=branch_title,
        visibility=branch_visibility,
        venue_id=thread.venue_id,
        scope=thread.scope,
        context_kind=thread.context_kind,
        context_id=thread.context_id,
    )
    if quoted_message is None:
        return detail

    excerpt = _truncate_preview(quoted_message.content, limit=240) or "Quoted message"
    starter = CopilotMessage(
        thread_id=detail.id,
        created_by=current_user.id,
        author_role=CopilotAuthorRole.USER,
        source_mode="branch",
        content=f"Continue from this point:\n\n{excerpt}",
        references=[
            {
                "type": "quoted_message",
                "label": "Branched from message",
                "id": quoted_message.id,
                "payload": {"excerpt": excerpt, "source_thread_id": thread.id},
            }
        ],
        attachments=[],
    )
    db.add(starter)
    branched_thread = db.get(CopilotThread, detail.id)
    if branched_thread is not None:
        branched_thread.last_activity_at = utc_now()
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=current_user.id,
        entity_type="copilot_thread",
        entity_id=detail.id,
        action="branched",
        payload={"source_thread_id": thread.id, "source_message_id": quoted_message.id},
    )
    db.commit()
    return get_copilot_thread_detail(db, detail.id, current_user=current_user)


def get_copilot_thread_context(
    db: Session,
    *,
    thread_id: str,
    current_user: AuthenticatedActor,
) -> CopilotThreadContextRead:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")

    summary = _serialize_thread_summaries(db, [thread], current_user=current_user)[0]
    context_references = _build_context_references(db, thread=thread)
    files = _collect_file_context_references(db, thread_ids=[thread.id])
    related_threads = _related_threads_for_context(db, thread=thread, current_user=current_user)
    return CopilotThreadContextRead(
        thread_id=thread.id,
        visibility=thread.visibility,
        memory_scope="private_personal" if thread.visibility == CopilotThreadVisibility.PRIVATE else "shared_workspace",
        memory_scope_label="Private personal reasoning" if thread.visibility == CopilotThreadVisibility.PRIVATE else "Shared workspace memory",
        context_label=summary.context_label,
        provenance_summary=_build_provenance_summary(thread=thread, context_references=context_references, files=files),
        context_references=context_references,
        related_threads=related_threads,
        files=files,
    )


def list_copilot_thread_actions(
    db: Session,
    *,
    thread_id: str,
) -> list[CopilotActionRecordRead]:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")
    actions = list(
        db.scalars(
            select(CopilotActionRecord)
            .where(CopilotActionRecord.thread_id == thread_id)
            .order_by(CopilotActionRecord.created_at.desc())
        ).all()
    )
    return _serialize_action_records(db, actions)


def preview_copilot_action(
    db: Session,
    *,
    thread_id: str,
    payload: CopilotActionPreviewRequest,
    current_user: AuthenticatedActor,
) -> CopilotActionPreviewRead:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")
    source_message = _resolve_action_source_message(db, thread=thread, message_id=payload.message_id)
    return _build_action_preview(
        db,
        thread=thread,
        source_message=source_message,
        payload=payload,
        current_user=current_user,
    )


def commit_copilot_action(
    db: Session,
    *,
    thread_id: str,
    payload: CopilotActionPreviewRequest,
    current_user: AuthenticatedActor,
) -> CopilotActionCommitRead:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
    if thread is None:
        raise LookupError("Copilot thread not found")
    source_message = _resolve_action_source_message(db, thread=thread, message_id=payload.message_id)
    preview = _build_action_preview(
        db,
        thread=thread,
        source_message=source_message,
        payload=payload,
        current_user=current_user,
    )
    return _commit_action_preview(
        db,
        thread=thread,
        source_message=source_message,
        preview=preview,
        payload=payload,
        current_user=current_user,
    )


def search_copilot_workspace(
    db: Session,
    *,
    current_user: AuthenticatedActor,
    query: str,
    venue_id: str | None = None,
    include_archived: bool = False,
    visibility: CopilotThreadVisibility | None = None,
    context_kind: CopilotContextKind | None = None,
) -> CopilotSearchResponse:
    normalized_query = " ".join(query.split()).strip().lower()
    if not normalized_query:
        return CopilotSearchResponse(query=query)

    threads = _load_threads(
        db,
        venue_id=venue_id,
        current_user=current_user,
        visibility=visibility,
        include_archived=include_archived,
        context_kind=context_kind,
    )
    messages_by_thread = _load_thread_messages(db, [thread.id for thread in threads])
    thread_summaries = {summary.id: summary for summary in _serialize_thread_summaries(db, threads, current_user=current_user)}

    thread_hits: list[CopilotSearchHit] = []
    message_hits: list[CopilotSearchHit] = []
    file_hits: list[CopilotSearchHit] = []
    context_hits: list[CopilotSearchHit] = []

    for thread in threads:
        summary = thread_summaries[thread.id]
        title_match = normalized_query in summary.title.lower()
        preview_match = normalized_query in (summary.last_message_preview or "").lower()
        if title_match or preview_match:
            thread_hits.append(
                CopilotSearchHit(
                    type="thread",
                    id=thread.id,
                    title=summary.title,
                    excerpt=summary.last_message_preview,
                    context_label=summary.context_label,
                    visibility=summary.visibility,
                    archived=summary.archived,
                    created_at=summary.last_activity_at or summary.created_at,
                    payload={"scope": summary.scope.value, "kind_label": summary.kind_label},
                )
            )

        for message in messages_by_thread.get(thread.id, []):
            if normalized_query in message.content.lower():
                message_hits.append(
                    CopilotSearchHit(
                        type="message",
                        id=message.id,
                        thread_id=thread.id,
                        title=summary.title,
                        excerpt=_match_excerpt(message.content, normalized_query),
                        context_label=summary.context_label,
                        visibility=summary.visibility,
                        archived=summary.archived,
                        created_at=message.created_at,
                    )
                )
            for reference in message.references or []:
                label = str(reference.get("label") or "")
                payload = reference.get("payload") or {}
                payload_text = " ".join(str(value) for value in payload.values() if isinstance(value, (str, int, float)))
                if normalized_query in label.lower() or normalized_query in payload_text.lower():
                    target = file_hits if reference.get("type") in {"file_asset", "attachment", "file_memory"} else context_hits
                    target.append(
                        CopilotSearchHit(
                            type=str(reference.get("type") or "reference"),
                            id=str(reference.get("id") or message.id),
                            thread_id=thread.id,
                            title=label or summary.title,
                            excerpt=_truncate_preview(payload_text, limit=180),
                            context_label=summary.context_label,
                            visibility=summary.visibility,
                            archived=summary.archived,
                            created_at=message.created_at,
                            payload={"thread_title": summary.title},
                        )
                    )

    return CopilotSearchResponse(
        query=query,
        threads=_dedupe_search_hits(thread_hits),
        messages=_dedupe_search_hits(message_hits),
        files=_dedupe_search_hits(file_hits),
        context_objects=_dedupe_search_hits(context_hits),
    )


def send_copilot_message(
    db: Session,
    *,
    thread_id: str,
    content: str,
    attachments: list[CopilotAttachment] | None = None,
    created_by: str | None = None,
    actor_role: AuthRole | None = None,
    quoted_message_id: str | None = None,
    current_user: AuthenticatedActor | None = None,
) -> CopilotThreadDetail:
    thread = _load_thread(db, thread_id=thread_id, include_deleted=False)
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

    quote_references: list[dict[str, object]] = []
    effective_prompt = content.strip()
    if quoted_message_id:
        quoted_message = db.get(CopilotMessage, quoted_message_id)
        if quoted_message is None or quoted_message.thread_id != thread.id:
            raise LookupError("Quoted message not found")
        quote_excerpt = _truncate_preview(quoted_message.content, limit=400) or "Quoted message"
        quote_references.append(
            {
                "type": "quoted_message",
                "label": "Quoted message",
                "id": quoted_message.id,
                "payload": {"excerpt": quote_excerpt, "source_thread_id": thread.id},
            }
        )
        effective_prompt = f"{effective_prompt}\n\nQuoted message for context:\n{quote_excerpt}"

    user_message = CopilotMessage(
        thread_id=thread.id,
        created_by=created_by,
        author_role=CopilotAuthorRole.USER,
        source_mode="manual_input",
        content=content.strip(),
        references=[*quote_references, *attachment_references],
        attachments=[attachment.model_dump() for attachment in normalized_attachments or attachments or []],
    )
    db.add(user_message)
    db.flush()
    if actor is not None:
        _ensure_participant_state(db, thread=thread, user_id=actor.id, mark_read=True)
    thread.last_activity_at = utc_now()
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
        prompt=effective_prompt,
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
    thread.last_activity_at = utc_now()

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
    return get_copilot_thread_detail(db, thread.id, current_user=current_user)


def _load_threads(
    db: Session,
    *,
    venue_id: str | None = None,
    current_user: AuthenticatedActor | None = None,
    search: str | None = None,
    visibility: CopilotThreadVisibility | None = None,
    include_archived: bool = False,
    context_kind: CopilotContextKind | None = None,
) -> list[CopilotThread]:
    query = select(CopilotThread).where(CopilotThread.deleted_at.is_(None))
    if not include_archived:
        query = query.where(CopilotThread.archived.is_(False))
    if visibility is not None:
        query = query.where(CopilotThread.visibility == visibility)
    if context_kind is not None:
        query = query.where(CopilotThread.context_kind == context_kind)

    if venue_id is not None:
        venue = db.get(Venue, venue_id)
        if venue is None:
            raise LookupError("Venue not found")
        query = query.where(CopilotThread.organization_id == venue.organization_id)
        query = query.where(or_(CopilotThread.venue_id.is_(None), CopilotThread.venue_id == venue_id))
    elif current_user is not None:
        if not current_user.organization_ids:
            return []
        query = query.where(CopilotThread.organization_id.in_(current_user.organization_ids))

    if search:
        normalized = f"%{' '.join(search.split()).strip()}%"
        query = query.where(CopilotThread.title.ilike(normalized))

    threads = list(
        db.scalars(
            query.order_by(CopilotThread.pinned.desc(), CopilotThread.last_activity_at.desc(), CopilotThread.created_at.desc())
        ).all()
    )
    return _filter_threads_for_actor(db, threads=threads, current_user=current_user)


def _load_thread(db: Session, *, thread_id: str, include_deleted: bool) -> CopilotThread | None:
    query = select(CopilotThread).where(CopilotThread.id == thread_id)
    if not include_deleted:
        query = query.where(CopilotThread.deleted_at.is_(None))
    return db.scalar(query)


def _filter_threads_for_actor(
    db: Session,
    *,
    threads: list[CopilotThread],
    current_user: AuthenticatedActor | None,
) -> list[CopilotThread]:
    if current_user is None:
        return threads

    if current_user.role in {AuthRole.OWNER, AuthRole.DEVELOPER}:
        return [thread for thread in threads if thread.organization_id in current_user.organization_ids]

    if current_user.role == AuthRole.MANAGER:
        return [
            thread
            for thread in threads
            if (
                thread.visibility == CopilotThreadVisibility.PRIVATE and thread.owner_user_id == current_user.id
            )
            or (
                thread.visibility == CopilotThreadVisibility.SHARED
                and (
                    thread.scope == ThreadScope.GLOBAL
                    or thread.venue_id is None
                    or thread.venue_id in current_user.accessible_venue_ids
                )
            )
        ]

    if current_user.role == AuthRole.BARISTA:
        allowed_help_thread_ids = set(
            db.scalars(
                select(HelpRequest.linked_thread_id).where(
                    HelpRequest.requester_user_id == current_user.id,
                    HelpRequest.linked_thread_id.is_not(None),
                )
            ).all()
        )
        return [
            thread
            for thread in threads
            if (
                thread.visibility == CopilotThreadVisibility.PRIVATE and thread.owner_user_id == current_user.id
            )
            or (
                thread.visibility == CopilotThreadVisibility.SHARED
                and thread.scope == ThreadScope.HELP_REQUEST
                and thread.id in allowed_help_thread_ids
            )
        ]

    return []


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


def _load_action_records_for_threads(db: Session, thread_ids: list[str]) -> dict[str, list[CopilotActionRecord]]:
    if not thread_ids:
        return defaultdict(list)

    actions = list(
        db.scalars(
            select(CopilotActionRecord)
            .where(CopilotActionRecord.thread_id.in_(thread_ids))
            .order_by(CopilotActionRecord.created_at.desc())
        ).all()
    )
    grouped: dict[str, list[CopilotActionRecord]] = defaultdict(list)
    for action in actions:
        grouped[action.thread_id].append(action)
    return grouped


def _serialize_thread_summaries(
    db: Session,
    threads: list[CopilotThread],
    *,
    current_user: AuthenticatedActor | None = None,
    sort: str = "recent",
) -> list[CopilotThreadSummary]:
    messages_by_thread = _load_thread_messages(db, [thread.id for thread in threads])
    actions_by_thread = _load_action_records_for_threads(db, [thread.id for thread in threads])
    venue_ids = sorted({thread.venue_id for thread in threads if thread.venue_id})
    venue_names: dict[str, str] = {}
    if venue_ids:
        venue_names = {
            venue.id: venue.name
            for venue in db.scalars(select(Venue).where(Venue.id.in_(venue_ids))).all()
        }

    help_thread_ids = [thread.id for thread in threads if thread.scope == ThreadScope.HELP_REQUEST]
    help_request_titles: dict[str, str] = {}
    if help_thread_ids:
        help_request_titles = {
            help_request.linked_thread_id: help_request.title
            for help_request in db.scalars(
                select(HelpRequest).where(HelpRequest.linked_thread_id.in_(help_thread_ids))
            ).all()
            if help_request.linked_thread_id
        }

    participant_states = _participant_states_for_threads(
        db,
        thread_ids=[thread.id for thread in threads],
        user_id=current_user.id if current_user else None,
    )

    summaries = [
        _serialize_thread_summary(
            thread,
            messages_by_thread.get(thread.id, []),
            actions=actions_by_thread.get(thread.id, []),
            venue_name=venue_names.get(thread.venue_id) if thread.venue_id else None,
            help_request_title=help_request_titles.get(thread.id),
            participant=participant_states.get(thread.id),
        )
        for thread in threads
    ]
    if sort == "created":
        return sorted(summaries, key=lambda summary: summary.created_at, reverse=True)
    if sort == "title":
        return sorted(summaries, key=lambda summary: summary.title.lower())
    return sorted(
        summaries,
        key=lambda summary: (summary.pinned, summary.last_activity_at or summary.created_at, summary.created_at),
        reverse=True,
    )


def _serialize_thread_summary(
    thread: CopilotThread,
    messages: list[CopilotMessage],
    *,
    actions: list[CopilotActionRecord],
    venue_name: str | None = None,
    help_request_title: str | None = None,
    participant: CopilotThreadParticipant | None = None,
) -> CopilotThreadSummary:
    latest_message_at = messages[-1].created_at if messages else None
    last_activity_at = thread.last_activity_at or latest_message_at or thread.created_at
    unread_count = 0
    if participant is not None:
        unread_count = sum(
            1
            for message in messages
            if participant.last_read_at is None or _datetime_after(message.created_at, participant.last_read_at)
        )
    latest_action_at = actions[0].created_at if actions else None
    linked_artifact_type, linked_artifact_id = _linked_artifact_for_thread(thread)
    return CopilotThreadSummary(
        id=thread.id,
        organization_id=thread.organization_id,
        venue_id=thread.venue_id,
        owner_user_id=thread.owner_user_id,
        title=_thread_title(thread, venue_name=venue_name, help_request_title=help_request_title),
        scope=thread.scope,
        visibility=thread.visibility,
        context_kind=thread.context_kind,
        context_id=thread.context_id,
        pinned=thread.pinned,
        kind_label=_thread_kind_label(thread),
        thread_type=_thread_type_label(thread),
        context_label=_thread_context_label(thread, venue_name),
        linked_artifact_type=linked_artifact_type,
        linked_artifact_id=linked_artifact_id,
        last_message_preview=_last_message_preview(messages),
        archived=thread.archived,
        archived_at=thread.archived_at,
        deleted_at=thread.deleted_at,
        message_count=len(messages),
        unread_count=unread_count,
        applied_action_count=len(actions),
        latest_applied_action_at=latest_action_at,
        latest_message_at=latest_message_at,
        last_activity_at=last_activity_at,
        created_at=thread.created_at,
    )


def _serialize_message(message: CopilotMessage) -> CopilotMessageRead:
    references = [CopilotReference.model_validate(reference) for reference in message.references]
    return CopilotMessageRead(
        id=message.id,
        thread_id=message.thread_id,
        created_by=message.created_by,
        author_role=message.author_role,
        source_mode=message.source_mode,
        content=message.content,
        references=references,
        attachments=[CopilotAttachment.model_validate(attachment) for attachment in (message.attachments or [])],
        render_mode=_message_render_mode(message),
        provenance=_message_provenance(message, references=references),
        action_intents=_message_action_intents(message),
        created_at=message.created_at,
    )


def _thread_kind_label(thread: CopilotThread) -> str:
    if thread.archived:
        return "Archived"
    if thread.pinned:
        return "Pinned"
    if thread.visibility == CopilotThreadVisibility.PRIVATE:
        return "My private"
    if thread.scope == ThreadScope.GLOBAL:
        return "Current workspace"
    if thread.scope == ThreadScope.HELP_REQUEST:
        return "Shared with me"
    return "Recent shared"


def _thread_type_label(thread: CopilotThread) -> str:
    if thread.context_kind == CopilotContextKind.REPORT:
        return "diagnosis"
    if thread.context_kind == CopilotContextKind.HELP_REQUEST:
        return "help_request"
    return thread.context_kind.value


def _linked_artifact_for_thread(thread: CopilotThread) -> tuple[str | None, str | None]:
    if thread.context_kind == CopilotContextKind.REPORT:
        return ("diagnosis", thread.context_id)
    if thread.context_kind == CopilotContextKind.GENERAL:
        return (None, None)
    return (thread.context_kind.value, thread.context_id)


def _thread_context_label(thread: CopilotThread, venue_name: str | None) -> str:
    if thread.visibility == CopilotThreadVisibility.PRIVATE:
        if thread.context_kind == CopilotContextKind.PORTFOLIO:
            return "Private portfolio"
        if venue_name:
            return f"Private · {venue_name}"
        return "Private thread"
    if thread.context_kind == CopilotContextKind.PORTFOLIO:
        return "Portfolio"
    if thread.context_kind == CopilotContextKind.HELP_REQUEST:
        return venue_name or "Help request"
    return venue_name or "Workspace"


def _thread_title(
    thread: CopilotThread,
    *,
    venue_name: str | None,
    help_request_title: str | None,
) -> str:
    fallback_title = (
        help_request_title
        or (f"Help request - {venue_name}" if thread.scope == ThreadScope.HELP_REQUEST and venue_name else None)
        or ("Portfolio workspace" if thread.scope == ThreadScope.GLOBAL else None)
        or (f"{venue_name} workspace" if venue_name else None)
        or ("Private analysis" if thread.visibility == CopilotThreadVisibility.PRIVATE else None)
        or "Working thread"
    )
    title = (thread.title or "").strip()
    if not title:
        return fallback_title
    if title.lower() in {"copilot", "copilot thread", "conversation", "thread", "vois"}:
        return fallback_title
    return title


def _last_message_preview(messages: list[CopilotMessage]) -> str | None:
    if not messages:
        return None
    return _truncate_preview(messages[-1].content, limit=96)


def _truncate_preview(content: str, *, limit: int) -> str | None:
    preview = " ".join(content.split())
    if not preview:
        return None
    if len(preview) <= limit:
        return preview
    return preview[: limit - 3].rstrip() + "..."


def _ensure_participant_state(
    db: Session,
    *,
    thread: CopilotThread,
    user_id: str,
    mark_read: bool,
) -> CopilotThreadParticipant:
    participant = db.scalar(
        select(CopilotThreadParticipant).where(
            CopilotThreadParticipant.thread_id == thread.id,
            CopilotThreadParticipant.user_id == user_id,
        )
    )
    if participant is None:
        participant = CopilotThreadParticipant(
            thread_id=thread.id,
            user_id=user_id,
            last_read_at=utc_now() if mark_read else None,
        )
        db.add(participant)
        db.flush()
        return participant
    if mark_read:
        participant.last_read_at = utc_now()
    return participant


def _participant_states_for_threads(
    db: Session,
    *,
    thread_ids: list[str],
    user_id: str | None,
) -> dict[str, CopilotThreadParticipant]:
    if not user_id or not thread_ids:
        return {}
    participants = list(
        db.scalars(
            select(CopilotThreadParticipant).where(
                CopilotThreadParticipant.thread_id.in_(thread_ids),
                CopilotThreadParticipant.user_id == user_id,
            )
        ).all()
    )
    return {participant.thread_id: participant for participant in participants}


def _participant_state_for_thread(
    db: Session,
    *,
    thread_id: str,
    user_id: str,
) -> CopilotThreadParticipantStateRead | None:
    participant = db.scalar(
        select(CopilotThreadParticipant).where(
            CopilotThreadParticipant.thread_id == thread_id,
            CopilotThreadParticipant.user_id == user_id,
        )
    )
    if participant is None:
        return None
    return CopilotThreadParticipantStateRead(
        user_id=participant.user_id,
        last_read_at=participant.last_read_at,
        joined_at=participant.joined_at,
    )


def _build_context_references(db: Session, *, thread: CopilotThread) -> list[CopilotThreadContextReference]:
    references: list[CopilotThreadContextReference] = []
    organization = db.get(Organization, thread.organization_id)
    if organization is not None:
        references.append(
            CopilotThreadContextReference(
                type="organization",
                id=organization.id,
                label=organization.name,
                payload={"slug": organization.slug},
            )
        )
    if thread.venue_id:
        venue = db.get(Venue, thread.venue_id)
        if venue is not None:
            references.append(
                CopilotThreadContextReference(
                    type="venue",
                    id=venue.id,
                    label=venue.name,
                    payload={"slug": venue.slug, "status": venue.status.value},
                )
            )
        latest_assessment = db.scalar(
            select(Assessment)
            .where(Assessment.venue_id == thread.venue_id)
            .order_by(Assessment.created_at.desc())
        )
        latest_run = db.scalar(
            select(EngineRun)
            .where(EngineRun.venue_id == thread.venue_id)
            .order_by(EngineRun.created_at.desc())
        )
        current_plan = db.scalar(
            select(OperationalPlan)
            .where(OperationalPlan.venue_id == thread.venue_id)
            .order_by(
                case((OperationalPlan.status == PlanStatus.ACTIVE, 0), else_=1),
                OperationalPlan.created_at.desc(),
            )
        )
        current_plan_task_count = (
            int(db.scalar(select(func.count()).select_from(PlanTask).where(PlanTask.plan_id == current_plan.id)) or 0)
            if current_plan is not None
            else 0
        )
        existing_refs = {(reference.type, reference.id) for reference in references}
        if latest_assessment is not None and ("assessment", latest_assessment.id) not in existing_refs:
            references.append(
                CopilotThreadContextReference(
                    type="assessment",
                    id=latest_assessment.id,
                    label=f"Latest assessment · {latest_assessment.assessment_type.replace('_', ' ')}",
                    payload={
                        "created_at": latest_assessment.created_at.isoformat(),
                        "signal_count": len(latest_assessment.selected_signal_ids or []),
                    },
                )
            )
        if latest_run is not None and ("report", latest_run.id) not in existing_refs:
            references.append(
                CopilotThreadContextReference(
                    type="report",
                    id=latest_run.id,
                    label="Latest diagnosis run",
                    payload={
                        "created_at": latest_run.created_at.isoformat(),
                        "load_classification": latest_run.plan_load_classification,
                    },
                )
            )
        if current_plan is not None and ("plan", current_plan.id) not in existing_refs:
            references.append(
                CopilotThreadContextReference(
                    type="plan",
                    id=current_plan.id,
                    label=current_plan.title,
                    payload={
                        "status": current_plan.status.value,
                        "task_count": current_plan_task_count,
                    },
                )
            )
    if thread.context_kind == CopilotContextKind.ASSESSMENT and thread.context_id:
        assessment = db.get(Assessment, thread.context_id)
        if assessment is not None:
            references.append(
                CopilotThreadContextReference(
                    type="assessment",
                    id=assessment.id,
                    label=f"Assessment · {assessment.assessment_type.replace('_', ' ')}",
                    payload={"created_at": assessment.created_at.isoformat(), "signal_count": len(assessment.selected_signal_ids or [])},
                )
            )
    if thread.context_kind == CopilotContextKind.PLAN and thread.context_id:
        plan = db.get(OperationalPlan, thread.context_id)
        if plan is not None:
            plan_task_count = int(db.scalar(select(func.count()).select_from(PlanTask).where(PlanTask.plan_id == plan.id)) or 0)
            references.append(
                CopilotThreadContextReference(
                    type="plan",
                    id=plan.id,
                    label=plan.title,
                    payload={"status": plan.status.value, "task_count": plan_task_count},
                )
            )
    if thread.context_kind == CopilotContextKind.HELP_REQUEST and thread.context_id:
        help_request = db.get(HelpRequest, thread.context_id)
        if help_request is not None:
            references.append(
                CopilotThreadContextReference(
                    type="help_request",
                    id=help_request.id,
                    label=help_request.title,
                    payload={"status": help_request.status.value, "channel": help_request.channel},
                )
            )
    if thread.context_kind == CopilotContextKind.REPORT and thread.context_id:
        engine_run = db.get(EngineRun, thread.context_id)
        if engine_run is not None:
            references.append(
                CopilotThreadContextReference(
                    type="report",
                    id=engine_run.id,
                    label="Assessment report",
                    payload={
                        "created_at": engine_run.created_at.isoformat(),
                        "load_classification": engine_run.plan_load_classification,
                    },
                )
            )
    return references


def _collect_file_context_references(db: Session, *, thread_ids: list[str]) -> list[CopilotThreadContextReference]:
    messages = _load_thread_messages(db, thread_ids)
    seen: set[str] = set()
    references: list[CopilotThreadContextReference] = []
    for thread_messages in messages.values():
        for message in thread_messages:
            for reference in message.references or []:
                if reference.get("type") not in {"file_asset", "attachment", "file_memory"}:
                    continue
                ref_id = str(reference.get("id") or reference.get("label") or "")
                if not ref_id or ref_id in seen:
                    continue
                seen.add(ref_id)
                payload = reference.get("payload") or {}
                references.append(
                    CopilotThreadContextReference(
                        type=str(reference.get("type") or "file"),
                        id=str(reference.get("id")) if reference.get("id") else None,
                        label=str(reference.get("label") or payload.get("file_name") or "File"),
                        payload={key: value for key, value in payload.items() if isinstance(value, (str, int, float, bool))},
                    )
                )
                if len(references) == 8:
                    return references
    return references


def _related_threads_for_context(
    db: Session,
    *,
    thread: CopilotThread,
    current_user: AuthenticatedActor,
) -> list[CopilotThreadSummary]:
    if thread.context_kind == CopilotContextKind.GENERAL and thread.venue_id is None:
        return []
    query = select(CopilotThread).where(
        CopilotThread.id != thread.id,
        CopilotThread.organization_id == thread.organization_id,
        CopilotThread.deleted_at.is_(None),
        CopilotThread.archived.is_(False),
    )
    if thread.context_id:
        query = query.where(CopilotThread.context_kind == thread.context_kind, CopilotThread.context_id == thread.context_id)
    elif thread.venue_id:
        query = query.where(CopilotThread.venue_id == thread.venue_id)
    else:
        query = query.where(CopilotThread.context_kind == thread.context_kind)
    related = _filter_threads_for_actor(
        db,
        threads=list(
            db.scalars(query.order_by(CopilotThread.last_activity_at.desc(), CopilotThread.created_at.desc()).limit(6)).all()
        ),
        current_user=current_user,
    )
    summaries = _serialize_thread_summaries(db, related, current_user=current_user)
    reason = _related_thread_reason(thread)
    return [summary.model_copy(update={"related_thread_reason": reason}) for summary in summaries]


def _related_thread_reason(thread: CopilotThread) -> str:
    if thread.context_id:
        return f"Same {_thread_type_label(thread).replace('_', ' ')} context"
    if thread.venue_id:
        return "Same venue context"
    return "Same workspace context"


def _build_provenance_summary(
    *,
    thread: CopilotThread,
    context_references: list[CopilotThreadContextReference],
    files: list[CopilotThreadContextReference],
) -> list[CopilotProvenanceRead]:
    summary: list[CopilotProvenanceRead] = []
    if context_references:
        labels = ", ".join(reference.label for reference in context_references[:3])
        summary.append(
            CopilotProvenanceRead(
                kind="direct_evidence",
                label="Linked venue artifacts",
                detail=labels,
            )
        )
    memory_files = [reference for reference in files if reference.type == "file_memory"]
    if memory_files:
        summary.append(
            CopilotProvenanceRead(
                kind="recalled_memory",
                label="Recalled file memory",
                detail=", ".join(reference.label for reference in memory_files[:2]),
            )
        )
    summary.append(
        CopilotProvenanceRead(
            kind="inferred_context",
            label="Current thread frame",
            detail=f"{_thread_type_label(thread).replace('_', ' ')} reasoning in {thread.visibility.value} memory",
        )
    )
    return summary


def _message_render_mode(message: CopilotMessage) -> str:
    if message.author_role != CopilotAuthorRole.ASSISTANT:
        return "conversation"
    lowered = message.content.lower()
    if "compare" in lowered or "changed since" in lowered or "baseline" in lowered:
        return "compare_insight"
    if "what is known" in lowered or ("what is missing" in lowered and "risk" in lowered):
        return "known_missing_risks"
    if "recommended next move" in lowered or "next step" in lowered or "what to do now" in lowered:
        return "recommended_next_move"
    if "draft" in lowered or "charter" in lowered or "handoff" in lowered:
        return "draft_artifact"
    if _message_action_intents(message):
        return "apply_ready_suggestion"
    return "reasoning_summary"


def _message_provenance(
    message: CopilotMessage,
    *,
    references: list[CopilotReference],
) -> list[CopilotProvenanceRead]:
    if not references:
        return [
            CopilotProvenanceRead(
                kind="inferred_context",
                label="Current thread context",
                detail="No direct artifact references were attached to this answer.",
            )
        ]

    direct_labels: list[str] = []
    recalled_labels: list[str] = []
    for reference in references:
        if reference.type in {"file_memory", "copilot_memory"}:
            recalled_labels.append(reference.label)
        elif reference.type in {
            "assessment",
            "engine_run",
            "report",
            "plan",
            "plan_task",
            "progress_entry",
            "help_request",
            "file_asset",
            "attachment",
            "venue",
            "organization",
        }:
            direct_labels.append(reference.label)

    provenance: list[CopilotProvenanceRead] = []
    if direct_labels:
        provenance.append(
            CopilotProvenanceRead(
                kind="direct_evidence",
                label="Direct evidence",
                detail=", ".join(direct_labels[:4]),
            )
        )
    if recalled_labels:
        provenance.append(
            CopilotProvenanceRead(
                kind="recalled_memory",
                label="Recalled memory",
                detail=", ".join(recalled_labels[:3]),
            )
        )
    provenance.append(
        CopilotProvenanceRead(
            kind="inferred_context",
            label="Linked context inference",
            detail="The assistant combined the referenced artifacts with the current thread context.",
        )
    )
    return provenance


def _message_action_intents(message: CopilotMessage) -> list[str]:
    if message.author_role != CopilotAuthorRole.ASSISTANT:
        return []
    lowered = message.content.lower()
    intents = ["save_note"]
    if "signal" in lowered:
        intents.append("apply_to_assessment")
    if "diagnosis" in lowered or "breakdown" in lowered or "failure" in lowered:
        intents.append("create_diagnosis_note")
    if "plan" in lowered or "task" in lowered or "next move" in lowered:
        intents.extend(["create_plan_suggestion", "create_task_suggestion"])
    if "compare" in lowered or "changed" in lowered:
        intents.append("save_compare_insight")
    if "escalat" in lowered or "urgent" in lowered or "blocked" in lowered or "risk" in lowered:
        intents.append("create_escalation_draft")
    if "follow-up" in lowered or "follow up" in lowered:
        intents.append("create_follow_up_list")
    return list(dict.fromkeys(intents))


def _resolve_action_source_message(
    db: Session,
    *,
    thread: CopilotThread,
    message_id: str | None,
) -> CopilotMessage:
    messages = _load_thread_messages(db, [thread.id]).get(thread.id, [])
    if message_id:
        for message in messages:
            if message.id == message_id:
                return message
        raise LookupError("Copilot message not found in thread")
    assistant_message = next(
        (message for message in reversed(messages) if message.author_role == CopilotAuthorRole.ASSISTANT and message.content.strip()),
        None,
    )
    if assistant_message is not None:
        return assistant_message
    fallback = next((message for message in reversed(messages) if message.content.strip()), None)
    if fallback is None:
        raise ValueError("No source message is available for this thread action")
    return fallback


def _first_meaningful_line(content: str) -> str | None:
    lines = [
        line.replace("**", "").strip(" #>*-`0123456789.").strip()
        for line in content.splitlines()
        if line.strip()
    ]
    for line in lines:
        if line:
            return line[:120]
    return None


def _artifact_title(thread: CopilotThread, message: CopilotMessage, *, prefix: str | None = None) -> str:
    base = _first_meaningful_line(message.content) or thread.title or "Copilot follow-up"
    title = f"{prefix}: {base}" if prefix else base
    return title[:255]


def _artifact_body(thread: CopilotThread, message: CopilotMessage) -> str:
    return "\n".join(
        [
            f"Source thread: {thread.title or 'Untitled thread'}",
            f"Thread type: {_thread_type_label(thread)}",
            f"Visibility: {thread.visibility.value}",
            f"Captured: {_normalize_datetime(message.created_at).isoformat()}",
            "",
            message.content.strip(),
        ]
    ).strip()


def _build_action_preview(
    db: Session,
    *,
    thread: CopilotThread,
    source_message: CopilotMessage,
    payload: CopilotActionPreviewRequest,
    current_user: AuthenticatedActor,
) -> CopilotActionPreviewRead:
    venue = db.get(Venue, thread.venue_id) if thread.venue_id else None
    base_summary = _first_meaningful_line(source_message.content) or "Copilot action"
    detail_body = _artifact_body(thread, source_message)

    if payload.action_type == "save_note":
        if venue is None:
            raise ValueError("Saving a note requires a venue-scoped thread")
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="save",
            source_message_id=source_message.id,
            title=_artifact_title(thread, source_message, prefix="Venue note"),
            summary="Save the latest copilot guidance into the venue notes.",
            target_artifact_type="progress_entry",
            fields={
                "venue_id": venue.id,
                "entry_type": ProgressEntryType.NOTE.value,
                "summary": _artifact_title(thread, source_message, prefix="Copilot note"),
                "detail": detail_body,
                "status": venue.status.value,
            },
            required_permissions=["venue_access"],
            side_effect_summary=["Creates a new venue note in the execution log."],
        )

    if payload.action_type == "apply_to_assessment":
        assessment = _resolve_assessment_for_thread(db, thread=thread)
        if assessment is None:
            raise ValueError("Applying to assessment requires a saved assessment in scope")
        if not payload.signal_additions and not payload.signal_removals:
            raise ValueError("No signal changes were provided for this assessment action")
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="apply",
            source_message_id=source_message.id,
            title="Apply reviewed signal update",
            summary=f"Apply {len(payload.signal_additions)} added and {len(payload.signal_removals)} removed signals to the saved assessment.",
            target_artifact_type="assessment",
            fields={
                "assessment_id": assessment.id,
                "add": [item.model_dump(exclude_none=True) for item in payload.signal_additions],
                "remove": payload.signal_removals,
                "source": "copilot_review",
            },
            required_permissions=["owner_or_manager"],
            side_effect_summary=["Updates the saved assessment signal state."],
        )

    if payload.action_type == "create_diagnosis_note":
        if venue is None:
            raise ValueError("Diagnosis notes require a venue-scoped thread")
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="draft",
            source_message_id=source_message.id,
            title=_artifact_title(thread, source_message, prefix="Diagnosis note"),
            summary="Capture this reasoning as a diagnosis-facing note.",
            target_artifact_type="progress_entry",
            fields={
                "venue_id": venue.id,
                "entry_type": ProgressEntryType.DECISION.value,
                "summary": _artifact_title(thread, source_message, prefix="Diagnosis note"),
                "detail": detail_body,
                "status": venue.status.value,
            },
            required_permissions=["owner_or_manager"],
            side_effect_summary=["Creates a diagnosis-oriented note in venue history."],
        )

    if payload.action_type in {"create_plan_suggestion", "create_task_suggestion"}:
        if venue is None:
            raise ValueError("Plan suggestions require a venue-scoped thread")
        target_type = "plan_task"
        label = "task suggestion" if payload.action_type == "create_task_suggestion" else "plan suggestion"
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="suggest",
            source_message_id=source_message.id,
            title=_artifact_title(thread, source_message, prefix="Plan suggestion"),
            summary=f"Convert the latest thread output into a reviewed {label}.",
            target_artifact_type=target_type,
            fields={
                "venue_id": venue.id,
                "title": _artifact_title(thread, source_message),
                "rationale": detail_body,
            },
            required_permissions=["owner_or_manager", "active_plan_required"],
            side_effect_summary=["Creates a reviewed task suggestion on the active plan."],
        )

    if payload.action_type == "create_escalation_draft":
        if venue is None:
            raise ValueError("Escalation drafts require a venue-scoped thread")
        severity = (payload.severity or EscalationSeverity.MEDIUM.value).lower()
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="draft",
            source_message_id=source_message.id,
            title=_artifact_title(thread, source_message, prefix="Escalation draft"),
            summary="Turn the latest reasoning into an escalation draft for review.",
            target_artifact_type="escalation",
            fields={
                "venue_id": venue.id,
                "task_id": payload.task_id,
                "severity": severity,
                "reason": detail_body,
            },
            required_permissions=["owner_or_manager"],
            side_effect_summary=["Creates an escalation record and related risk log entry."],
        )

    if payload.action_type == "create_follow_up_list":
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="draft",
            source_message_id=source_message.id,
            title=_artifact_title(thread, source_message, prefix="Follow-up list"),
            summary="Save a follow-up list draft from this thread for later review.",
            target_artifact_type="follow_up_list",
            fields={
                "task_id": payload.task_id,
                "due_at": payload.due_at.isoformat() if payload.due_at else None,
                "body": detail_body,
            },
            required_permissions=["owner_or_manager"],
            side_effect_summary=["Stores a follow-up draft in Copilot action history only."],
            warning="This stays as a draft receipt until it is converted inside execution workflows.",
        )

    if payload.action_type == "save_compare_insight":
        if venue is None:
            raise ValueError("Compare insights require a venue-scoped thread")
        return CopilotActionPreviewRead(
            action_type=payload.action_type,
            mode="save",
            source_message_id=source_message.id,
            title=_artifact_title(thread, source_message, prefix="Compare insight"),
            summary="Save this comparison reasoning into the venue history log.",
            target_artifact_type="progress_entry",
            fields={
                "venue_id": venue.id,
                "entry_type": ProgressEntryType.DECISION.value,
                "summary": _artifact_title(thread, source_message, prefix="Compare insight"),
                "detail": detail_body,
                "status": venue.status.value,
            },
            required_permissions=["owner_or_manager"],
            side_effect_summary=["Creates a compare insight note linked to the venue timeline."],
        )

    raise ValueError(f"Unsupported copilot action type: {payload.action_type}")


def _commit_action_preview(
    db: Session,
    *,
    thread: CopilotThread,
    source_message: CopilotMessage,
    preview: CopilotActionPreviewRead,
    payload: CopilotActionPreviewRequest,
    current_user: AuthenticatedActor,
) -> CopilotActionCommitRead:
    target_artifact_type = preview.target_artifact_type
    target_artifact_id: str | None = None
    response_payload: dict[str, object] = {}

    if preview.action_type in {"create_plan_suggestion", "create_task_suggestion"}:
        _require_copilot_management_role(current_user)
        task = create_task_from_copilot_suggestion(
            db,
            venue_id=str(preview.fields["venue_id"]),
            title=str(preview.fields["title"]),
            rationale=str(preview.fields["rationale"]),
            actor_user_id=current_user.id,
            source_thread_id=thread.id,
            source_message_id=source_message.id,
        )
        target_artifact_id = task.id
        response_payload = {"title": task.title, "plan_id": task.plan_id}
    elif preview.action_type == "create_escalation_draft":
        _require_copilot_management_role(current_user)
        escalation = create_escalation(
            db,
            venue_id=str(preview.fields["venue_id"]),
            follow_up_id=None,
            task_id=preview.fields.get("task_id"),
            created_by=current_user.id,
            escalated_to=None,
            severity=EscalationSeverity(str(preview.fields["severity"])),
            reason=str(preview.fields["reason"]),
        )
        target_artifact_id = escalation.id
        response_payload = {"severity": escalation.severity.value, "status": escalation.status.value}
    elif preview.action_type == "apply_to_assessment":
        _require_copilot_management_role(current_user)
        assessment = _resolve_assessment_for_thread(db, thread=thread)
        if assessment is None:
            raise LookupError("Assessment not found")
        _apply_assessment_signal_changes(
            db,
            assessment=assessment,
            additions=payload.signal_additions,
            removals=payload.signal_removals,
            actor_user_id=current_user.id,
        )
        target_artifact_id = assessment.id
        response_payload = {
            "assessment_id": assessment.id,
            "added": [item.signal_id for item in payload.signal_additions],
            "removed": payload.signal_removals,
        }
    elif preview.action_type in {"save_note", "create_diagnosis_note", "save_compare_insight"}:
        entry = ProgressEntry(
            venue_id=str(preview.fields["venue_id"]),
            created_by=current_user.id,
            entry_type=ProgressEntryType(str(preview.fields["entry_type"])),
            summary=str(preview.fields["summary"]),
            detail=str(preview.fields["detail"]),
            status=VenueStatus(str(preview.fields["status"])),
        )
        db.add(entry)
        db.flush()
        target_artifact_id = entry.id
        venue = db.get(Venue, entry.venue_id)
        record_audit_entry(
            db,
            organization_id=venue.organization_id if venue is not None else thread.organization_id,
            actor_user_id=current_user.id,
            entity_type="progress_entry",
            entity_id=entry.id,
            action="created_from_copilot",
            payload={"thread_id": thread.id, "message_id": source_message.id, "copilot_action": preview.action_type},
        )
        db.commit()
        response_payload = {"summary": entry.summary, "entry_type": entry.entry_type.value}
    elif preview.action_type == "create_follow_up_list":
        target_artifact_type = "follow_up_list_draft"
        response_payload = {"draft_only": True, "task_id": preview.fields.get("task_id"), "due_at": preview.fields.get("due_at")}
    else:
        raise ValueError(f"Unsupported copilot action type: {preview.action_type}")

    action_record = _record_copilot_action(
        db,
        thread=thread,
        source_message=source_message,
        current_user=current_user,
        action_type=preview.action_type,
        mode=preview.mode,
        title=preview.title,
        summary=preview.summary,
        target_artifact_type=target_artifact_type,
        target_artifact_id=target_artifact_id,
        payload={**preview.fields, **response_payload},
    )
    db.commit()

    return CopilotActionCommitRead(
        action=action_record,
        receipt_title=preview.title,
        receipt_summary=preview.summary,
        target_artifact_type=target_artifact_type,
        target_artifact_id=target_artifact_id,
        payload=response_payload,
    )


def _record_copilot_action(
    db: Session,
    *,
    thread: CopilotThread,
    source_message: CopilotMessage,
    current_user: AuthenticatedActor,
    action_type: str,
    mode: str,
    title: str,
    summary: str,
    target_artifact_type: str | None,
    target_artifact_id: str | None,
    payload: dict[str, object],
) -> CopilotActionRecordRead:
    record = CopilotActionRecord(
        organization_id=thread.organization_id,
        thread_id=thread.id,
        source_message_id=source_message.id,
        actor_user_id=current_user.id,
        action_type=action_type,
        mode=mode,
        title=title,
        summary=summary,
        target_artifact_type=target_artifact_type,
        target_artifact_id=target_artifact_id,
        payload=payload,
    )
    thread.last_activity_at = utc_now()
    db.add(record)
    db.flush()
    record_audit_entry(
        db,
        organization_id=thread.organization_id,
        actor_user_id=current_user.id,
        entity_type="copilot_thread",
        entity_id=thread.id,
        action=f"copilot_{action_type}",
        payload={
            "mode": mode,
            "source_message_id": source_message.id,
            "target_artifact_type": target_artifact_type,
            "target_artifact_id": target_artifact_id,
        },
    )
    return _serialize_action_records(db, [record])[0]


def _serialize_action_records(db: Session, actions: list[CopilotActionRecord]) -> list[CopilotActionRecordRead]:
    actor_ids = sorted({action.actor_user_id for action in actions if action.actor_user_id})
    actor_names: dict[str, str] = {}
    if actor_ids:
        actor_names = {
            user.id: user.full_name
            for user in db.scalars(select(User).where(User.id.in_(actor_ids))).all()
        }
    return [
        CopilotActionRecordRead(
            id=action.id,
            thread_id=action.thread_id,
            source_message_id=action.source_message_id,
            action_type=action.action_type,
            mode=action.mode,
            title=action.title,
            summary=action.summary,
            target_artifact_type=action.target_artifact_type,
            target_artifact_id=action.target_artifact_id,
            actor_user_id=action.actor_user_id,
            actor_name=actor_names.get(action.actor_user_id) if action.actor_user_id else None,
            created_at=action.created_at,
            payload=action.payload or {},
        )
        for action in actions
    ]


def _resolve_assessment_for_thread(db: Session, *, thread: CopilotThread) -> Assessment | None:
    if thread.context_kind == CopilotContextKind.ASSESSMENT and thread.context_id:
        return db.get(Assessment, thread.context_id)
    if thread.venue_id is None:
        return None
    return db.scalar(
        select(Assessment)
        .where(Assessment.venue_id == thread.venue_id)
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )


def _apply_assessment_signal_changes(
    db: Session,
    *,
    assessment: Assessment,
    additions: list,
    removals: list[str],
    actor_user_id: str | None,
) -> None:
    venue = db.get(Venue, assessment.venue_id)
    bundle = get_ontology_repository().load_bundle_for_identity(
        assessment.ontology_id,
        assessment.ontology_version,
        allow_invalid=True,
    )
    signal_map = {signal.id: signal.name for signal in bundle.signals}
    selected_signal_ids = list(assessment.selected_signal_ids)
    signal_states = dict(assessment.signal_states or {})

    for addition in additions:
        if addition.signal_id not in signal_map:
            raise ValueError(f"Unknown signal id: {addition.signal_id}")
        if addition.signal_id not in selected_signal_ids:
            selected_signal_ids.append(addition.signal_id)
        signal_states[addition.signal_id] = {
            "active": True,
            "notes": addition.notes,
            "confidence": addition.confidence,
        }

    for signal_id in removals:
        if signal_id in selected_signal_ids:
            selected_signal_ids.remove(signal_id)
        if signal_id in signal_states:
            signal_states[signal_id] = {**signal_states[signal_id], "active": False}

    assessment.selected_signal_ids = selected_signal_ids
    assessment.signal_states = signal_states
    record_audit_entry(
        db,
        organization_id=venue.organization_id if venue is not None else None,
        actor_user_id=actor_user_id,
        entity_type="assessment",
        entity_id=assessment.id,
        action="signals_updated_from_copilot",
        payload={
            "added": [item.signal_id for item in additions],
            "removed": removals,
        },
    )
    db.commit()
    db.refresh(assessment)


def _require_copilot_management_role(current_user: AuthenticatedActor) -> None:
    if current_user.role not in {AuthRole.OWNER, AuthRole.MANAGER, AuthRole.DEVELOPER}:
        raise ValueError("This copilot action requires owner or manager access")


def _validate_thread_mutation_permissions(
    *,
    thread: CopilotThread,
    current_user: AuthenticatedActor,
    destructive: bool,
) -> None:
    if thread.visibility == CopilotThreadVisibility.PRIVATE and thread.owner_user_id != current_user.id:
        raise ValueError("Only the owner can modify a private thread")
    if current_user.role == AuthRole.BARISTA and destructive and thread.scope != ThreadScope.HELP_REQUEST:
        raise ValueError("Barista thread changes are limited to their help threads")


def _match_excerpt(content: str, query: str) -> str:
    flattened = " ".join(content.split())
    lower = flattened.lower()
    idx = lower.find(query)
    if idx < 0:
        return _truncate_preview(flattened, limit=180) or ""
    start = max(0, idx - 60)
    end = min(len(flattened), idx + len(query) + 100)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(flattened) else ""
    return f"{prefix}{flattened[start:end].strip()}{suffix}"


def _dedupe_search_hits(hits: list[CopilotSearchHit]) -> list[CopilotSearchHit]:
    deduped: dict[tuple[str, str], CopilotSearchHit] = {}
    for hit in hits:
        deduped[(hit.type, hit.id)] = hit
    return sorted(deduped.values(), key=lambda hit: hit.created_at or datetime.min, reverse=True)


def _datetime_after(left: datetime, right: datetime) -> bool:
    return _normalize_datetime(left) > _normalize_datetime(right)


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
