from fastapi import APIRouter

from app.api.routers import (
    activity,
    ai,
    audit,
    auth,
    assessments,
    bootstrap,
    copilot,
    engine,
    execution,
    files,
    kb,
    notifications,
    people,
    pocket,
    scheduler,
    health,
    intake,
    integrations,
    organization,
    ontology,
    plans,
    portfolio,
    progress,
    setup,
    systemic_flags,
    venues,
)


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(setup.router, prefix="/setup", tags=["setup"])
api_router.include_router(ai.router, tags=["ai"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(bootstrap.router, prefix="/bootstrap", tags=["bootstrap"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(organization.router, prefix="/organization", tags=["organization"])
api_router.include_router(organization.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(venues.router, prefix="/venues", tags=["venues"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["assessments"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
api_router.include_router(intake.router, prefix="/intake", tags=["intake"])
api_router.include_router(ontology.router, prefix="/ontology", tags=["ontology"])
api_router.include_router(engine.router, prefix="/engine", tags=["engine"])
api_router.include_router(execution.router, prefix="/execution", tags=["execution"])
api_router.include_router(pocket.router, prefix="/pocket", tags=["pocket"])
api_router.include_router(people.router, prefix="/people", tags=["people"])
api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(kb.router, prefix="/kb", tags=["kb"])
api_router.include_router(activity.router, prefix="/activity", tags=["activity"])
api_router.include_router(systemic_flags.router, tags=["systemic-flags"])
