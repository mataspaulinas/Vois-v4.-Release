from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_thread_access, require_venue_access
from app.db.session import get_db
from app.services.auth import AuthenticatedActor
from app.schemas.ai import ProactiveGreetingRequest, ProactiveGreetingResponse
from app.schemas.copilot import CopilotMessageCreateRequest, CopilotThreadDetail, CopilotThreadSummary
from app.services.ai_runtime import AIRuntimePolicyError, ai_invocation_payload, get_ai_runtime_service_for_actor
from app.services.audit import record_audit_entry
from app.services.copilot import get_copilot_thread_detail, list_copilot_threads, send_copilot_message


router = APIRouter()


@router.get("/threads", response_model=list[CopilotThreadSummary])
def list_threads(
    venue_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
) -> list[CopilotThreadSummary]:
    try:
        if venue_id is not None:
            require_venue_access(db, venue_id=venue_id, user=current_user)
        return list_copilot_threads(db, venue_id, current_user=current_user)
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
        return get_copilot_thread_detail(db, thread_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


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
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Owner setup is required before portfolio copilot is available.",
        )
    try:
        response = get_ai_runtime_service_for_actor(current_user.role).proactive_greeting(
            db=db,
            organization_id=current_user.organization_id,
            venue_id=payload.venue_id if payload is not None else None,
        )
    except AIRuntimePolicyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    record_audit_entry(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        entity_type="ai_invocation",
        entity_id=(payload.venue_id if payload is not None and payload.venue_id else current_user.organization_id),
        action="proactive_greeting",
        payload=ai_invocation_payload(
            function=response.function,
            provider=response.provider,
            model=response.model,
            prompt_version=response.prompt_version,
            organization_id=current_user.organization_id,
            venue_id=payload.venue_id if payload is not None else None,
            evidence_refs=[reference.label for reference in response.references],
        ),
    )
    db.commit()
    return response
