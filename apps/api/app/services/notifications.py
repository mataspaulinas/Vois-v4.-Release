"""
Push notification service.

Manages Web Push subscriptions and notification dispatch.
Uses the Web Push protocol (VAPID) for browser notifications.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import Base, NotificationChannel, NotificationEvent, NotificationLevel
from sqlalchemy import Column, String, Text, DateTime

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Subscription storage ───
# Using a lightweight model for push subscriptions.
# In production this would have its own Alembic migration.

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: str = Column(String(36), primary_key=True)
    user_id: str = Column(String(36), nullable=False, index=True)
    endpoint: str = Column(Text, nullable=False)
    p256dh_key: str = Column(Text, nullable=False)
    auth_key: str = Column(Text, nullable=False)
    created_at: datetime = Column(DateTime(timezone=True), default=_utc_now)


# ─── Subscription management ───


def save_push_subscription(
    db: Session,
    *,
    user_id: str,
    endpoint: str,
    p256dh_key: str,
    auth_key: str,
) -> dict:
    """Store or update a push subscription for a user."""
    import uuid

    existing = db.scalars(
        select(PushSubscription)
        .where(PushSubscription.user_id == user_id)
        .where(PushSubscription.endpoint == endpoint)
    ).first()

    if existing:
        existing.p256dh_key = p256dh_key
        existing.auth_key = auth_key
        db.commit()
        return {"status": "updated", "subscription_id": existing.id}

    sub = PushSubscription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        endpoint=endpoint,
        p256dh_key=p256dh_key,
        auth_key=auth_key,
        created_at=_utc_now(),
    )
    db.add(sub)
    db.commit()
    return {"status": "created", "subscription_id": sub.id}


def remove_push_subscription(db: Session, *, user_id: str, endpoint: str) -> dict:
    """Remove a push subscription."""
    existing = db.scalars(
        select(PushSubscription)
        .where(PushSubscription.user_id == user_id)
        .where(PushSubscription.endpoint == endpoint)
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed"}

    return {"status": "not_found"}


def get_user_subscriptions(db: Session, *, user_id: str) -> list[PushSubscription]:
    """Get all push subscriptions for a user."""
    return list(db.scalars(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    ).all())


# ─── Notification dispatch ───


def dispatch_notification(
    db: Session,
    *,
    user_id: str,
    title: str,
    body: str,
    url: str | None = None,
    tag: str | None = None,
) -> list[dict]:
    """
    Queue a notification for delivery to all of a user's subscriptions.

    In production, this would use pywebpush with VAPID keys.
    For now, it logs the notification and returns the payload.
    """
    subscriptions = get_user_subscriptions(db, user_id=user_id)

    payload = {
        "title": title,
        "body": body,
        "url": url,
        "tag": tag,
        "timestamp": _utc_now().isoformat(),
    }

    results = []
    for sub in subscriptions:
        event = NotificationEvent(
            user_id=user_id,
            channel=NotificationChannel.WEB_PUSH,
            level=NotificationLevel.INFO,
            title=title,
            body=body,
            entity_type="push_subscription",
            entity_id=sub.id,
            sent_at=_utc_now(),
        )
        db.add(event)
        # In production: pywebpush.webpush(subscription_info={...}, data=json.dumps(payload), vapid_private_key=...)
        logger.info(
            "Push notification queued for user=%s endpoint=%s title=%s",
            user_id,
            sub.endpoint[:50],
            title,
        )
        results.append({
            "subscription_id": sub.id,
            "endpoint": sub.endpoint,
            "status": "queued",
            "payload": payload,
        })

    if results:
        db.commit()

    return results


def dispatch_venue_notification(
    db: Session,
    *,
    venue_id: str,
    title: str,
    body: str,
    url: str | None = None,
) -> int:
    """
    Send a notification to all users with subscriptions.
    In production, this would filter by venue assignment.
    Returns number of notifications queued.
    """
    all_subs = db.scalars(select(PushSubscription)).all()
    count = 0
    for sub in all_subs:
        logger.info(
            "Venue notification queued: venue=%s user=%s title=%s",
            venue_id,
            sub.user_id,
            title,
        )
        count += 1
    return count
