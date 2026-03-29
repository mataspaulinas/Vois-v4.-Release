"""Knowledge base reading state API."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.models.domain import KBReadingState, utc_now
from app.services.auth import AuthenticatedActor

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
