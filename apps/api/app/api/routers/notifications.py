"""
Notifications API — push subscription management.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.models.domain import User
from app.services.notifications import (
    save_push_subscription,
    remove_push_subscription,
)

router = APIRouter(tags=["notifications"])


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str


@router.post("/subscribe")
def subscribe_push(
    body: PushSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a Web Push subscription for the current user."""
    return save_push_subscription(
        db,
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh_key=body.p256dh_key,
        auth_key=body.auth_key,
    )


@router.post("/unsubscribe")
def unsubscribe_push(
    body: PushSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a Web Push subscription for the current user."""
    return remove_push_subscription(
        db,
        user_id=current_user.id,
        endpoint=body.endpoint,
    )
