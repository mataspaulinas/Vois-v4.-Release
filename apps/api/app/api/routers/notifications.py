"""
Notifications API — push subscription and in-app notification management.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, get_db
from app.models.domain import NotificationEvent, User, utc_now
from app.services.auth import AuthenticatedActor
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


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
    limit: int = Query(default=20, le=100),
):
    """List recent notifications for the current user."""
    events = list(
        db.scalars(
            select(NotificationEvent)
            .where(NotificationEvent.user_id == current_user.id)
            .order_by(NotificationEvent.created_at.desc())
            .limit(limit)
        ).all()
    )
    return [
        {
            "id": event.id,
            "title": event.title,
            "body": event.body,
            "channel": event.channel.value if event.channel else "in_app",
            "level": event.level.value if event.level else "info",
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "read_at": event.read_at.isoformat() if event.read_at else None,
            "created_at": event.created_at.isoformat() if event.created_at else None,
        }
        for event in events
    ]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
):
    """Return the count of unread notifications for the current user."""
    count = db.scalar(
        select(func.count(NotificationEvent.id))
        .where(NotificationEvent.user_id == current_user.id)
        .where(NotificationEvent.read_at.is_(None))
    ) or 0
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedActor = Depends(get_current_user),
):
    """Mark a notification as read."""
    event = db.get(NotificationEvent, notification_id)
    if event is None or event.user_id != current_user.id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if event.read_at is None:
        event.read_at = utc_now()
        db.commit()
    return {"id": event.id, "read_at": event.read_at.isoformat()}
