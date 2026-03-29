from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    CommentVisibility,
    EngineRun,
    FollowUp,
    OperationalPlan,
    PlanStatus,
    PlanTask,
    ProgressEntryType,
    ProgressEntry,
    TaskEventType,
    TaskStatus,
    Venue,
    VenueStatus,
)
from app.schemas.domain import (
    DeliverableItem,
    PlanExecutionSummary,
    PlanExecutionTaskState,
    PlanRead,
    PlanTaskRead,
    SubActionItem,
    TaskCommentRead,
)
from app.services.audit import record_audit_entry
from app.services.task_history import (
    add_task_comment,
    blocking_dependency_task_ids,
    list_task_comments,
    record_task_event,
)


class DraftPlanMutationError(ValueError):
    pass


def _latest_plan_model_for_venue(db: Session, venue_id: str) -> OperationalPlan | None:
    return db.scalar(
        select(OperationalPlan)
        .where(OperationalPlan.venue_id == venue_id)
        .order_by(OperationalPlan.created_at.desc())
    )


def _active_plan_model_for_venue(db: Session, venue_id: str) -> OperationalPlan | None:
    return db.scalar(
        select(OperationalPlan)
        .where(OperationalPlan.venue_id == venue_id)
        .where(OperationalPlan.status == PlanStatus.ACTIVE)
        .order_by(OperationalPlan.created_at.desc())
    )


def latest_plan_for_venue(db: Session, venue_id: str) -> PlanRead | None:
    plan = _latest_plan_model_for_venue(db, venue_id)
    if plan is None:
        return None
    return serialize_plan(db, plan)


def active_plan_for_venue(db: Session, venue_id: str) -> PlanRead | None:
    plan = _active_plan_model_for_venue(db, venue_id)
    if plan is None:
        return None
    return serialize_plan(db, plan)


def latest_execution_summary_for_venue(db: Session, venue_id: str) -> PlanExecutionSummary | None:
    plan = _latest_plan_model_for_venue(db, venue_id)
    if plan is None:
        return None
    return execution_summary_for_plan(db, plan)


def active_execution_summary_for_venue(db: Session, venue_id: str) -> PlanExecutionSummary | None:
    plan = _active_plan_model_for_venue(db, venue_id)
    if plan is None:
        return None
    return execution_summary_for_plan(db, plan)


def _serialize_task(task: PlanTask) -> PlanTaskRead:
    return PlanTaskRead(
        id=task.id,
        plan_id=task.plan_id,
        block_id=task.block_id,
        title=task.title,
        status=task.status,
        order_index=task.order_index,
        effort_hours=task.effort_hours,
        rationale=task.rationale,
        notes=task.notes,
        dependencies=task.dependencies,
        trace=task.trace,
        sub_actions=[
            SubActionItem(text=item.get("text", ""), completed=item.get("completed", False))
            for item in task.sub_actions
        ],
        deliverables=[
            DeliverableItem(name=item.get("name", ""), completed=item.get("completed", False))
            for item in task.deliverables
        ],
        created_at=task.created_at,
    )


def serialize_plan(db: Session, plan: OperationalPlan) -> PlanRead:
    engine_run = db.scalar(select(EngineRun).where(EngineRun.id == plan.engine_run_id))
    tasks = list(
        db.scalars(
            select(PlanTask)
            .where(PlanTask.plan_id == plan.id)
            .order_by(PlanTask.order_index.asc(), PlanTask.created_at.asc())
        ).all()
    )
    return PlanRead(
        id=plan.id,
        engine_run_id=plan.engine_run_id,
        venue_id=plan.venue_id,
        title=plan.title,
        summary=plan.summary,
        total_effort_hours=plan.total_effort_hours,
        status=plan.status,
        ontology_id=plan.ontology_id,
        ontology_version=plan.ontology_version,
        core_canon_version=plan.core_canon_version,
        adapter_id=plan.adapter_id,
        manifest_digest=plan.manifest_digest,
        created_at=plan.created_at,
        load_classification=engine_run.plan_load_classification if engine_run else None,
        tasks=[_serialize_task(task) for task in tasks],
    )


def execution_summary_for_plan(db: Session, plan: OperationalPlan) -> PlanExecutionSummary:
    tasks = _load_tasks(db, plan.id)
    counts_by_status = Counter(task.status.value for task in tasks)
    completed_count = counts_by_status.get(TaskStatus.COMPLETED.value, 0)
    total_count = len(tasks)
    next_executable_tasks: list[PlanExecutionTaskState] = []
    blocked_tasks: list[PlanExecutionTaskState] = []

    for task in tasks:
        blocking_dependency_ids = blocking_dependency_task_ids(db, task=task)
        task_state = PlanExecutionTaskState(
            task_id=task.id,
            title=task.title,
            status=task.status,
            blocking_dependency_ids=blocking_dependency_ids,
        )
        if task.status == TaskStatus.NOT_STARTED:
            if blocking_dependency_ids:
                blocked_tasks.append(task_state)
            else:
                next_executable_tasks.append(task_state)

    return PlanExecutionSummary(
        plan_id=plan.id,
        venue_id=plan.venue_id,
        completion_percentage=round((completed_count / total_count) * 100, 1) if total_count else 0.0,
        counts_by_status=dict(counts_by_status),
        next_executable_tasks=next_executable_tasks,
        blocked_tasks=blocked_tasks,
    )


def create_task_from_block(
    db: Session,
    plan_id: str,
    *,
    block_id: str,
    title: str,
    effort_hours: float = 4.0,
    assigned_to: str | None = None,
    actor_user_id: str | None = None,
) -> PlanTask:
    """Add a task to an active plan from an ontology block reference."""
    plan = db.get(OperationalPlan, plan_id)
    if plan is None:
        raise LookupError("Plan not found")
    _require_execution_plan_active(plan)
    max_order = max((t.order_index for t in db.scalars(select(PlanTask).where(PlanTask.plan_id == plan_id)).all()), default=-1)
    task = PlanTask(
        plan_id=plan_id,
        block_id=block_id,
        title=title,
        status=TaskStatus.NOT_STARTED,
        order_index=max_order + 1,
        effort_hours=effort_hours,
        rationale=f"Added manually from block {block_id}.",
        dependencies=[],
        trace={"source": "manual_add_from_block"},
        assigned_to=assigned_to,
        layer="L2",
        priority="normal",
        sub_actions=[],
        deliverables=[],
    )
    db.add(task)
    db.flush()
    record_task_event(
        db,
        task_id=task.id,
        event_type=TaskEventType.STATUS_CHANGED,
        status=TaskStatus.NOT_STARTED,
        actor_user_id=actor_user_id,
        note=f"Task created from block {block_id}.",
    )
    venue = db.get(Venue, plan.venue_id)
    record_audit_entry(
        db,
        organization_id=venue.organization_id if venue else None,
        actor_user_id=actor_user_id,
        entity_type="plan_task",
        entity_id=task.id,
        action="created_from_block",
        payload={"block_id": block_id, "plan_id": plan_id},
    )
    db.commit()
    return task


def update_task(
    db: Session,
    task_id: str,
    *,
    status: TaskStatus | None = None,
    notes: str | None = ...,  # type: ignore[assignment]  # sentinel
    assigned_to: str | None = ...,  # type: ignore[assignment]  # sentinel
    priority: str | None = ...,  # type: ignore[assignment]  # sentinel
    due_at: object = ...,  # sentinel — use object to allow None as a real value
    sub_action_completions: list[bool] | None = None,
    deliverable_completions: list[bool] | None = None,
    actor_user_id: str | None = None,
) -> PlanTask:
    task = db.get(PlanTask, task_id)
    if task is None:
        raise LookupError("Plan task not found")
    plan = db.get(OperationalPlan, task.plan_id)
    if plan is None:
        raise LookupError("Operational plan not found")
    _require_execution_plan_active(plan)

    changed = False

    if status is not None and status != task.status:
        blocking_dependency_ids = _blocking_dependency_ids(db, task)
        if status in {TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED} and blocking_dependency_ids:
            raise ValueError(
                "Task cannot move to this status until dependencies are completed: "
                + ", ".join(blocking_dependency_ids)
            )
        task.status = status
        if status == TaskStatus.IN_PROGRESS and task.started_at is None:
            task.started_at = datetime.now(timezone.utc)
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.now(timezone.utc)
        task.updated_by = actor_user_id
        venue = db.get(Venue, plan.venue_id) if plan is not None else None
        db.add(
            ProgressEntry(
                venue_id=plan.venue_id if plan else None,
                entry_type=ProgressEntryType.UPDATE,
                summary=f"Task '{task.title}' moved to {status.value.replace('_', ' ')}.",
                detail=f"Operational plan task status updated.",
                status=_progress_status_for_task(status),
            )
        )
        record_task_event(
            db,
            task_id=task.id,
            event_type=TaskEventType.STATUS_CHANGED,
            status=status,
            actor_user_id=actor_user_id,
            note=f"Task moved to {status.value}.",
            payload={"blocking_dependencies": blocking_dependency_ids},
        )
        record_audit_entry(
            db,
            organization_id=venue.organization_id if venue is not None else None,
            actor_user_id=actor_user_id,
            entity_type="plan_task",
            entity_id=task.id,
            action="status_updated",
            payload={"status": status.value},
        )
        changed = True

    if notes is not ...:
        task.notes = notes
        task.updated_by = actor_user_id
        if notes:
            record_task_event(
                db,
                task_id=task.id,
                event_type=TaskEventType.NOTE_CAPTURED,
                actor_user_id=actor_user_id,
                note=notes,
            )
        changed = True

    if assigned_to is not ...:
        task.assigned_to = assigned_to
        task.updated_by = actor_user_id
        changed = True

    if priority is not ...:
        task.priority = priority
        task.updated_by = actor_user_id
        changed = True

    if due_at is not ...:
        task.due_at = due_at
        task.updated_by = actor_user_id
        changed = True

    if sub_action_completions is not None:
        updated = []
        for i, item in enumerate(task.sub_actions):
            new_item = dict(item)
            new_item["completed"] = sub_action_completions[i] if i < len(sub_action_completions) else False
            updated.append(new_item)
        task.sub_actions = updated
        task.updated_by = actor_user_id
        record_task_event(
            db,
            task_id=task.id,
            event_type=TaskEventType.SUB_ACTION_CHECKED,
            actor_user_id=actor_user_id,
            payload={"sub_action_completions": sub_action_completions},
        )
        changed = True

    if deliverable_completions is not None:
        updated = []
        for i, item in enumerate(task.deliverables):
            new_item = dict(item)
            new_item["completed"] = deliverable_completions[i] if i < len(deliverable_completions) else False
            updated.append(new_item)
        task.deliverables = updated
        task.updated_by = actor_user_id
        record_task_event(
            db,
            task_id=task.id,
            event_type=TaskEventType.DELIVERABLE_CHECKED,
            actor_user_id=actor_user_id,
            payload={"deliverable_completions": deliverable_completions},
        )
        changed = True

    if changed:
        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)
    return task


def update_plan(
    db: Session,
    plan_id: str,
    *,
    status: PlanStatus | None = None,
    title: str | None = None,
    summary: str | None = None,
    actor_user_id: str | None = None,
) -> OperationalPlan:
    plan = db.get(OperationalPlan, plan_id)
    if plan is None:
        raise LookupError("Operational plan not found")

    changed = False

    if status is not None and status != plan.status:
        if status == PlanStatus.DRAFT and plan.status != PlanStatus.DRAFT:
            raise ValueError("Plans cannot be moved back to draft once execution truth exists")
        if status == PlanStatus.ACTIVE and plan.status == PlanStatus.ARCHIVED:
            raise ValueError("Archived plans cannot be reactivated")

        superseded_plans: list[OperationalPlan] = []
        if status == PlanStatus.ACTIVE:
            superseded_plans = list(
                db.scalars(
                    select(OperationalPlan)
                    .where(OperationalPlan.venue_id == plan.venue_id)
                    .where(OperationalPlan.status == PlanStatus.ACTIVE)
                    .where(OperationalPlan.id != plan.id)
                ).all()
            )
            for superseded in superseded_plans:
                superseded.status = PlanStatus.ARCHIVED

        plan.status = status
        venue = db.get(Venue, plan.venue_id)
        db.add(
            ProgressEntry(
                venue_id=plan.venue_id,
                entry_type=ProgressEntryType.UPDATE,
                summary=f"Operational plan '{plan.title}' moved to {status.value}.",
                detail=f"Plan status updated to {status.value}.",
                status=VenueStatus.ACTIVE if status == PlanStatus.ACTIVE else VenueStatus.MONITORING,
            )
        )
        record_audit_entry(
            db,
            organization_id=venue.organization_id if venue is not None else None,
            actor_user_id=actor_user_id,
            entity_type="operational_plan",
            entity_id=plan.id,
            action="status_updated",
            payload={"status": status.value},
        )
        for superseded in superseded_plans:
            record_audit_entry(
                db,
                organization_id=venue.organization_id if venue is not None else None,
                actor_user_id=actor_user_id,
                entity_type="operational_plan",
                entity_id=superseded.id,
                action="status_superseded",
                payload={"status": PlanStatus.ARCHIVED.value, "replaced_by_plan_id": plan.id},
            )
        changed = True

    if title is not None and title != plan.title:
        plan.title = title
        changed = True

    if summary is not None and summary != plan.summary:
        plan.summary = summary
        changed = True

    if changed:
        db.commit()
        db.refresh(plan)
    return plan


def update_task_status(db: Session, task_id: str, status: TaskStatus, actor_user_id: str | None = None) -> PlanTask:
    task = db.get(PlanTask, task_id)
    if task is None:
        raise LookupError("Plan task not found")
    plan = db.get(OperationalPlan, task.plan_id)
    if plan is None:
        raise LookupError("Operational plan not found")
    _require_execution_plan_active(plan)

    blocking_dependency_ids = _blocking_dependency_ids(db, task)
    if status in {TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED} and blocking_dependency_ids:
        raise ValueError(
            "Task cannot move to this status until dependencies are completed: "
            + ", ".join(blocking_dependency_ids)
        )

    if task.status == status:
        return task

    task.status = status
    if status == TaskStatus.IN_PROGRESS and task.started_at is None:
        task.started_at = datetime.now(timezone.utc)
    if status == TaskStatus.COMPLETED:
        task.completed_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)
    task.updated_by = actor_user_id
    venue = db.get(Venue, plan.venue_id) if plan is not None else None
    db.add(
        ProgressEntry(
            venue_id=plan.venue_id,
            entry_type=ProgressEntryType.UPDATE,
            summary=f"Task '{task.title}' moved to {status.value.replace('_', ' ')}.",
            detail=(
                f"Operational plan task status updated. "
                f"Blocking dependencies at update time: {', '.join(blocking_dependency_ids) or 'none'}."
            ),
            status=_progress_status_for_task(status),
        )
    )
    record_task_event(
        db,
        task_id=task.id,
        event_type=TaskEventType.STATUS_CHANGED,
        status=status,
        actor_user_id=actor_user_id,
        note=f"Task moved to {status.value}.",
        payload={"blocking_dependencies": blocking_dependency_ids},
    )
    record_audit_entry(
        db,
        organization_id=venue.organization_id if venue is not None else None,
        actor_user_id=actor_user_id,
        entity_type="plan_task",
        entity_id=task.id,
        action="status_updated",
        payload={
            "plan_id": plan.id if plan is not None else None,
            "venue_id": plan.venue_id if plan is not None else None,
            "status": status.value,
            "blocking_dependencies": blocking_dependency_ids,
        },
    )
    db.commit()
    db.refresh(task)
    return task


def _load_tasks(db: Session, plan_id: str) -> list[PlanTask]:
    return list(
        db.scalars(
            select(PlanTask)
            .where(PlanTask.plan_id == plan_id)
            .order_by(PlanTask.order_index.asc(), PlanTask.created_at.asc())
        ).all()
    )


def _blocking_dependency_ids(db: Session, task: PlanTask) -> list[str]:
    return blocking_dependency_task_ids(db, task=task)


def _require_execution_plan_active(plan: OperationalPlan) -> None:
    if plan.status != PlanStatus.ACTIVE:
        raise DraftPlanMutationError("Execution mutations are only allowed on active operational plans")


def _progress_status_for_task(task_status: TaskStatus):
    if task_status == TaskStatus.COMPLETED:
        return VenueStatus.MONITORING
    if task_status == TaskStatus.IN_PROGRESS:
        return VenueStatus.ACTIVE
    return VenueStatus.ACTIVE


def create_follow_up_for_task(
    db: Session,
    task_id: str,
    *,
    assigned_to: str | None = None,
    created_by: str | None = None,
    due_hours: float = 48.0,
) -> FollowUp:
    """
    Create a follow-up timer when a task moves to IN_PROGRESS.
    Default due in 48 hours. Part of the ECL follow-up timer system.
    """
    task = db.get(PlanTask, task_id)
    if task is None:
        raise LookupError("Plan task not found")

    plan = db.get(OperationalPlan, task.plan_id)
    venue_id = plan.venue_id if plan else None

    now = datetime.now(timezone.utc)
    due_at = now + timedelta(hours=due_hours)

    follow_up = FollowUp(
        venue_id=venue_id,
        task_id=task_id,
        assigned_to=assigned_to,
        created_by=created_by,
        title=f"Follow up: {task.title}",
        due_at=due_at,
        notes=f"Auto-created when task moved to in_progress. Due in {due_hours}h.",
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up


def create_task_comment_entry(
    db: Session,
    *,
    task_id: str,
    venue_id: str,
    body: str,
    actor_user_id: str | None = None,
    visibility: CommentVisibility = CommentVisibility.INTERNAL,
) -> TaskCommentRead:
    task = db.get(PlanTask, task_id)
    if task is None:
        raise LookupError("Plan task not found")
    plan = db.get(OperationalPlan, task.plan_id)
    if plan is None:
        raise LookupError("Operational plan not found")
    _require_execution_plan_active(plan)
    comment = add_task_comment(
        db,
        task_id=task_id,
        venue_id=venue_id,
        body=body,
        author_user_id=actor_user_id,
        visibility=visibility,
    )
    db.commit()
    db.refresh(comment)
    return list_task_comments(db, task_id=task_id)[-1]
