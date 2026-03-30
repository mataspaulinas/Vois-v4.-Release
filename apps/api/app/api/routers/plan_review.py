"""Plan review AI — reviews a draft plan before activation."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..dependencies import get_db, get_current_user
from ...services.ai_runtime import get_ai_runtime_service
from ...models.domain import Plan
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/v1", tags=["plan-review"])


class PlanReviewRequest(BaseModel):
    plan_id: str


class PlanReviewItem(BaseModel):
    severity: str  # "warning" | "info" | "suggestion"
    title: str
    detail: str


class PlanReviewResponse(BaseModel):
    plan_id: str
    items: list[PlanReviewItem]
    summary: str


@router.post("/plan-review", response_model=PlanReviewResponse)
async def review_plan(req: PlanReviewRequest, db: Session = Depends(get_db)):
    """AI reviews a draft plan and returns warnings/suggestions."""
    plan = db.query(Plan).filter(Plan.id == req.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    tasks = plan.tasks if hasattr(plan, 'tasks') else []

    # Build review items deterministically first (mock-safe)
    items: list[dict] = []

    # Check for unassigned tasks
    unassigned = [t for t in tasks if not getattr(t, 'assigned_to', None)]
    if unassigned:
        items.append({
            "severity": "warning",
            "title": f"{len(unassigned)} task{'s' if len(unassigned) > 1 else ''} without assignees",
            "detail": f"Tasks without assignees: {', '.join(getattr(t, 'title', 'Unknown') for t in unassigned[:5])}. Assign owners before activation."
        })

    # Check for missing due dates
    no_dates = [t for t in tasks if not getattr(t, 'due_date', None) and not getattr(t, 'due_at', None)]
    if no_dates:
        items.append({
            "severity": "warning",
            "title": f"{len(no_dates)} task{'s' if len(no_dates) > 1 else ''} without due dates",
            "detail": "Tasks without deadlines may drift. Consider setting target dates."
        })

    # Check for dependency bottlenecks
    dep_counts: dict[str, int] = {}
    for t in tasks:
        deps = getattr(t, 'dependencies', []) or []
        for d in deps:
            dep_counts[d] = dep_counts.get(d, 0) + 1
    bottlenecks = {k: v for k, v in dep_counts.items() if v >= 3}
    if bottlenecks:
        for block_id, count in bottlenecks.items():
            items.append({
                "severity": "warning",
                "title": f"Dependency bottleneck at {block_id}",
                "detail": f"{count} tasks depend on {block_id}. If this blocks, it cascades."
            })

    # Check for high task count
    if len(tasks) > 15:
        items.append({
            "severity": "info",
            "title": f"Large plan with {len(tasks)} tasks",
            "detail": "Consider whether all tasks are necessary for this cycle. Smaller plans execute faster."
        })

    # Check for missing rationale
    no_rationale = [t for t in tasks if not getattr(t, 'rationale', None)]
    if no_rationale:
        items.append({
            "severity": "suggestion",
            "title": f"{len(no_rationale)} task{'s' if len(no_rationale) > 1 else ''} without rationale",
            "detail": "Tasks with rationale are easier for the team to understand and execute."
        })

    if not items:
        items.append({
            "severity": "info",
            "title": "Plan looks ready",
            "detail": "No structural issues detected. All tasks have assignees, dates, and rationale."
        })

    summary = f"Reviewed {len(tasks)} tasks. Found {len([i for i in items if i['severity'] == 'warning'])} warnings, {len([i for i in items if i['severity'] == 'suggestion'])} suggestions."

    return PlanReviewResponse(
        plan_id=req.plan_id,
        items=[PlanReviewItem(**i) for i in items],
        summary=summary
    )
