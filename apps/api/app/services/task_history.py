from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    CommentVisibility,
    PlanTask,
    TaskComment,
    TaskDependency,
    TaskDependencyKind,
    TaskEvent,
    TaskEventType,
    TaskStatus,
    User,
)
from app.schemas.domain import TaskCommentRead


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def record_task_event(
    db: Session,
    *,
    task_id: str,
    event_type: TaskEventType,
    status: TaskStatus | None = None,
    actor_user_id: str | None = None,
    note: str | None = None,
    payload: dict | None = None,
) -> TaskEvent:
    actor_name = None
    if actor_user_id:
        actor = db.get(User, actor_user_id)
        actor_name = actor.full_name if actor is not None else None

    event = TaskEvent(
        task_id=task_id,
        event_type=event_type,
        status=status,
        actor_user_id=actor_user_id,
        actor_name=actor_name,
        note=note,
        payload=payload or {},
    )
    db.add(event)
    return event


def add_task_comment(
    db: Session,
    *,
    task_id: str,
    venue_id: str,
    body: str,
    author_user_id: str | None = None,
    visibility: CommentVisibility = CommentVisibility.INTERNAL,
) -> TaskComment:
    author_name = None
    if author_user_id:
        actor = db.get(User, author_user_id)
        author_name = actor.full_name if actor is not None else None

    comment = TaskComment(
        task_id=task_id,
        venue_id=venue_id,
        author_user_id=author_user_id,
        author_name=author_name,
        body=body,
        visibility=visibility,
    )
    db.add(comment)
    record_task_event(
        db,
        task_id=task_id,
        event_type=TaskEventType.COMMENT_ADDED,
        actor_user_id=author_user_id,
        note=body,
        payload={"visibility": visibility.value},
    )
    return comment


def list_task_comments(db: Session, *, task_id: str) -> list[TaskCommentRead]:
    comments = list(
        db.scalars(
            select(TaskComment)
            .where(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.asc())
        ).all()
    )
    return [
        TaskCommentRead(
            id=comment.id,
            task_id=comment.task_id,
            venue_id=comment.venue_id,
            author_user_id=comment.author_user_id,
            author_name=comment.author_name,
            body=comment.body,
            visibility=comment.visibility,
            created_at=comment.created_at,
        )
        for comment in comments
    ]


def sync_task_dependencies(
    db: Session,
    *,
    plan_id: str,
    tasks: list[PlanTask],
    dependency_kind: TaskDependencyKind = TaskDependencyKind.FINISH_TO_START,
) -> list[TaskDependency]:
    block_to_task_id = {task.block_id: task.id for task in tasks}
    module_to_task_ids: dict[str, list[str]] = {}
    task_order: dict[str, int] = {}
    for task in tasks:
        task_order[task.id] = task.order_index
        if task.module_id:
            module_to_task_ids.setdefault(task.module_id, []).append(task.id)
    existing = list(db.scalars(select(TaskDependency).where(TaskDependency.plan_id == plan_id)).all())
    existing_keys = {
        (dep.predecessor_task_id, dep.successor_task_id, dep.dependency_kind.value)
        for dep in existing
    }
    created: list[TaskDependency] = []

    for task in tasks:
        for dependency in task.dependencies or []:
            predecessor_task_ids: list[str] = []
            direct_task_id = block_to_task_id.get(dependency)
            if direct_task_id is not None:
                predecessor_task_ids.append(direct_task_id)
            else:
                predecessor_task_ids.extend(
                    predecessor_task_id
                    for predecessor_task_id in module_to_task_ids.get(dependency, [])
                    if predecessor_task_id != task.id and task_order.get(predecessor_task_id, -1) < task.order_index
                )

            for predecessor_task_id in predecessor_task_ids:
                key = (predecessor_task_id, task.id, dependency_kind.value)
                if key in existing_keys:
                    continue
                edge = TaskDependency(
                    plan_id=plan_id,
                    predecessor_task_id=predecessor_task_id,
                    successor_task_id=task.id,
                    dependency_kind=dependency_kind,
                )
                db.add(edge)
                created.append(edge)
                existing_keys.add(key)
    return created


def blocking_dependency_task_ids(db: Session, *, task: PlanTask) -> list[str]:
    dependency_rows = list(
        db.scalars(
            select(TaskDependency).where(TaskDependency.successor_task_id == task.id)
        ).all()
    )
    if dependency_rows:
        predecessor_ids = [row.predecessor_task_id for row in dependency_rows]
        predecessor_tasks = {
            dep_task.id: dep_task
            for dep_task in db.scalars(select(PlanTask).where(PlanTask.id.in_(predecessor_ids))).all()
        }
        return [
            row.predecessor_task_id
            for row in dependency_rows
            if row.predecessor_task_id in predecessor_tasks
            and predecessor_tasks[row.predecessor_task_id].status != TaskStatus.COMPLETED
        ]

    if not task.dependencies:
        return []
    dependency_tasks = {
        dependency_task.id: dependency_task
        for dependency_task in db.scalars(select(PlanTask).where(PlanTask.plan_id == task.plan_id)).all()
        if dependency_task.block_id in task.dependencies or dependency_task.module_id in task.dependencies
    }
    return [
        dependency_task.id
        for dependency_task in dependency_tasks.values()
        if dependency_task.id != task.id and dependency_task.status != TaskStatus.COMPLETED
    ]
