from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_roles, require_thread_access, require_venue_access
from app.db.session import get_db
from app.models.domain import AuthRole, CopilotContextKind, CopilotThreadVisibility, ThreadScope
from app.schemas.domain import PlanTaskRead
from app.services.auth import AuthenticatedActor
from app.schemas.ai import ProactiveGreetingRequest, ProactiveGreetingResponse
from app.schemas.copilot import (
    CopilotActionCommitRead,
    CopilotActionPreviewRead,
    CopilotActionPreviewRequest,
    CopilotActionRecordRead,
    CopilotMessageCreateRequest,
    CopilotPlanSuggestionCreateRequest,
    CopilotSearchResponse,
    CopilotThreadBranchRequest,
    CopilotThreadContextRead,
    CopilotThreadCreateRequest,
    CopilotThreadDetail,
    CopilotThreadSummary,
    CopilotThreadUpdateRequest,
)
from app.services.ai_runtime import AIRuntimePolicyError
from app.services.copilot import (
    branch_copilot_thread,
    commit_copilot_action,
    create_copilot_thread,
    delete_copilot_thread,
    get_copilot_thread_context,
    get_copilot_thread_detail,
    list_copilot_thread_actions,
    list_copilot_threads,
    preview_copilot_action,
    search_copilot_workspace,
    send_copilot_message,
    update_copilot_thread,
)
from app.services.plans import _serialize_task, create_task_from_copilot_suggestion


router = APIRouter()


@router.get("/threads", response_model=list[CopilotThreadSummary])
def list_threads(
    venue_id: str | None = None,
    search: str | None = None,
    visibility: CopilotThreadVisibility | None = None,
    include_archived: bool = False,
    context_kind: CopilotContextKind | None = None,
    sort: str = "recent",
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[CopilotThreadSummary]:
    try:
        if venue_id is not None:
            require_venue_access(db, venue_id=venue_id, user=current_user)
        return list_copilot_threads(
            db,
            venue_id,
            current_user=current_user,
            search=search,
            visibility=visibility,
            include_archived=include_archived,
            context_kind=context_kind,
            sort=sort,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/threads", response_model=CopilotThreadDetail, status_code=status.HTTP_201_CREATED)
def create_thread(
    payload: CopilotThreadCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotThreadDetail:
    try:
        if payload.venue_id is not None:
            require_venue_access(db, venue_id=payload.venue_id, user=current_user)
        return create_copilot_thread(
            db,
            current_user=current_user,
            title=payload.title,
            visibility=CopilotThreadVisibility(payload.visibility),
            venue_id=payload.venue_id,
            scope=ThreadScope(payload.scope),
            context_kind=CopilotContextKind(payload.context_kind),
            context_id=payload.context_id,
            initial_message=payload.initial_message,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIRuntimePolicyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/search", response_model=CopilotSearchResponse)
def search_workspace(
    query: str,
    venue_id: str | None = None,
    include_archived: bool = False,
    visibility: CopilotThreadVisibility | None = None,
    context_kind: CopilotContextKind | None = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotSearchResponse:
    try:
        if venue_id is not None:
            require_venue_access(db, venue_id=venue_id, user=current_user)
        return search_copilot_workspace(
            db,
            current_user=current_user,
            query=query,
            venue_id=venue_id,
            include_archived=include_archived,
            visibility=visibility,
            context_kind=context_kind,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/threads/{thread_id}", response_model=CopilotThreadDetail)
def get_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotThreadDetail:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return get_copilot_thread_detail(db, thread_id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/threads/{thread_id}", response_model=CopilotThreadDetail)
def patch_thread(
    thread_id: str,
    payload: CopilotThreadUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotThreadDetail:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return update_copilot_thread(
            db,
            thread_id=thread_id,
            current_user=current_user,
            title=payload.title,
            pinned=payload.pinned,
            archived=payload.archived,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> None:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        delete_copilot_thread(db, thread_id=thread_id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/threads/{thread_id}/context", response_model=CopilotThreadContextRead)
def get_thread_context(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotThreadContextRead:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return get_copilot_thread_context(db, thread_id=thread_id, current_user=current_user)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/threads/{thread_id}/actions", response_model=list[CopilotActionRecordRead])
def get_thread_actions(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[CopilotActionRecordRead]:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return list_copilot_thread_actions(db, thread_id=thread_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/threads/{thread_id}/actions/preview", response_model=CopilotActionPreviewRead)
def preview_thread_action(
    thread_id: str,
    payload: CopilotActionPreviewRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotActionPreviewRead:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return preview_copilot_action(
            db,
            thread_id=thread_id,
            payload=payload,
            current_user=current_user,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/threads/{thread_id}/actions/commit", response_model=CopilotActionCommitRead, status_code=status.HTTP_201_CREATED)
def commit_thread_action(
    thread_id: str,
    payload: CopilotActionPreviewRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotActionCommitRead:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return commit_copilot_action(
            db,
            thread_id=thread_id,
            payload=payload,
            current_user=current_user,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/threads/{thread_id}/plan-suggestion", response_model=PlanTaskRead, status_code=status.HTTP_201_CREATED)
def create_thread_plan_suggestion(
    thread_id: str,
    payload: CopilotPlanSuggestionCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(require_roles(AuthRole.OWNER, AuthRole.MANAGER)),
) -> PlanTaskRead:
    thread = require_thread_access(db, thread_id=thread_id, user=current_user)
    if thread.venue_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan suggestions require a venue-scoped copilot thread",
        )
    try:
        task = create_task_from_copilot_suggestion(
            db,
            venue_id=thread.venue_id,
            title=payload.title,
            rationale=payload.rationale,
            actor_user_id=current_user.id,
            source_thread_id=thread.id,
            source_message_id=payload.message_id,
        )
        return _serialize_task(task)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/threads/{thread_id}/branch", response_model=CopilotThreadDetail, status_code=status.HTTP_201_CREATED)
def branch_thread(
    thread_id: str,
    payload: CopilotThreadBranchRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotThreadDetail:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        visibility = CopilotThreadVisibility(payload.visibility) if payload.visibility is not None else None
        return branch_copilot_thread(
            db,
            thread_id=thread_id,
            current_user=current_user,
            message_id=payload.message_id,
            title=payload.title,
            visibility=visibility,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/threads/{thread_id}/messages", response_model=CopilotThreadDetail, status_code=status.HTTP_201_CREATED)
def post_message(
    thread_id: str,
    payload: CopilotMessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> CopilotThreadDetail:
    try:
        require_thread_access(db, thread_id=thread_id, user=current_user)
        return send_copilot_message(
            db,
            thread_id=thread_id,
            content=payload.content,
            attachments=payload.attachments,
            created_by=current_user.id,
            actor_role=current_user.role,
            quoted_message_id=payload.quoted_message_id,
            current_user=current_user,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIRuntimePolicyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/proactive", response_model=ProactiveGreetingResponse)
def proactive_message(
    payload: ProactiveGreetingRequest | None = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> ProactiveGreetingResponse:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Proactive copilot is disabled. Open a thread and ask directly.",
    )
