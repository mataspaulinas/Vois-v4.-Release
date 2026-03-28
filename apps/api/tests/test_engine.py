from app.services.engine import EngineService
from app.services.ontology import get_ontology_repository


def test_engine_generates_capacity_aware_plan():
    service = EngineService(get_ontology_repository())
    result = service.run(
        selected_signal_ids=["sig_service_delay", "sig_staff_confusion", "sig_guest_complaints"],
        management_hours_available=8,
        weekly_effort_budget=7,
        ontology_id="restaurant-legacy",
        version="v8",
    )

    assert result["load_classification"] in {"moderate", "heavy"}
    assert len(result["plan_tasks"]) >= 1
    assert result["plan_tasks"][0].block_id == "blk_map_service_steps"
    assert result["plan_tasks"][0].sub_actions
    assert result["plan_tasks"][0].deliverables
    assert "response_patterns" in result["plan_tasks"][0].trace


def test_engine_adds_dependencies_before_ordering():
    service = EngineService(get_ontology_repository())
    result = service.run(
        selected_signal_ids=["sig_guest_complaints", "sig_shift_brief_missing"],
        management_hours_available=8,
        weekly_effort_budget=10,
        ontology_id="restaurant-legacy",
        version="v8",
    )

    block_ids = [task.block_id for task in result["plan_tasks"]]
    assert "blk_install_pre_shift_brief" in block_ids
    assert block_ids.index("blk_install_pre_shift_brief") <= block_ids.index("blk_void_review_huddle")
