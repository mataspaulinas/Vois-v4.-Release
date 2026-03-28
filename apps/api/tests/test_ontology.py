from app.services.ontology import get_ontology_repository
from app.services.ontology_evaluation import get_ontology_evaluation_service


def test_ontology_audit_is_clean():
    repository = get_ontology_repository()
    assert repository.audit("restaurant") == []


def test_signal_cascade_returns_expected_chain():
    repository = get_ontology_repository()
    cascade = repository.signal_cascade("sig_service_delay", "restaurant")

    assert cascade.signal.id == "sig_service_delay"
    assert any(item.id == "fm_undefined_workflow" for item in cascade.failure_modes)
    assert any(item.id == "rp_service_flow_reset" for item in cascade.response_patterns)
    assert any(item.id == "blk_map_service_steps" for item in cascade.blocks)


def test_alignment_summary_classifies_restaurant_bundle_against_core():
    repository = get_ontology_repository()
    alignment = repository.alignment_summary(vertical="restaurant")

    assert alignment.adapter_id == "restaurant"
    assert alignment.core_version == "v2"
    assert alignment.bundle_version == "v8"
    assert alignment.counts == {
        "signals": 64,
        "failure_modes": 20,
        "response_patterns": 17,
    }
    assert alignment.unclassified_signal_ids == []
    assert alignment.unclassified_failure_mode_ids == []
    assert alignment.unclassified_response_pattern_ids == []
    assert alignment.service_module_counts["team_capability_and_training"] >= 1
    assert alignment.service_module_counts["learning_and_improvement"] >= 1
    assert alignment.service_module_counts["tools_and_asset_reliability"] >= 1
    assert alignment.failure_family_counts["exception_recovery_failure"] >= 1
    assert alignment.response_logic_counts["verify_and_learn"] >= 1


def test_governance_summary_is_contract_clean_without_structural_errors():
    repository = get_ontology_repository()
    governance = repository.governance_summary(vertical="restaurant")

    assert governance.adapter_id == "restaurant"
    assert governance.core_version == "v2"
    assert governance.errors == []
    assert governance.warnings == []
    assert governance.block_dependency_cycles == []
    assert governance.alignment_gaps == {
        "signals": [],
        "failure_modes": [],
        "response_patterns": [],
    }
    assert all(not ids for ids in governance.block_contract_gaps.values())
    assert all(not ids for ids in governance.tool_contract_gaps.values())


def test_authoring_brief_reports_core_coverage_and_contract_checklists():
    repository = get_ontology_repository()
    brief = repository.authoring_brief(vertical="restaurant")

    assert brief.adapter_id == "restaurant"
    assert brief.core_version == "v2"
    assert all(item.is_covered for item in brief.service_module_coverage)
    assert all(item.is_covered for item in brief.failure_family_coverage)
    assert all(item.is_covered for item in brief.response_logic_coverage)
    assert brief.governance_warning_counts == {
        "warnings": 0,
        "block_contract_gaps": 0,
        "tool_contract_gaps": 0,
    }
    assert "service_module_ids" in brief.block_contract_fields
    assert "format" in brief.tool_contract_fields


def test_core_v2_contains_expanded_module_failure_and_response_canons():
    repository = get_ontology_repository()
    core = repository.load_core_bundle("v2")

    assert any(item.id == "team_capability_and_training" for item in core.service_modules)
    assert any(item.id == "tools_and_asset_reliability" for item in core.service_modules)
    assert any(item.id == "expectation_setting_failure" for item in core.failure_families)
    assert any(item.id == "workflow_design_failure" for item in core.failure_families)
    assert any(item.id == "verify_and_learn" for item in core.response_logics)
    assert any(item.id == "restore_readiness" for item in core.response_logics)
    assert len(core.signal_archetypes) == 39
    assert len(core.signal_failure_hypotheses) == 78
    assert len(core.failure_response_hypotheses) == 33
    valid_module_ids = {item.id for item in core.service_modules}
    valid_failure_family_ids = {item.id for item in core.failure_families}
    valid_signal_ids = {item.id for item in core.signal_archetypes}
    valid_response_logic_ids = {item.id for item in core.response_logics}
    assert all(item.module_id in valid_module_ids for item in core.signal_archetypes)
    assert all(
        failure_family_id in valid_failure_family_ids
        for item in core.signal_archetypes
        for failure_family_id in item.likely_failure_family_ids
    )
    assert all(item.signal_id in valid_signal_ids for item in core.signal_failure_hypotheses)
    assert all(item.failure_family_id in valid_failure_family_ids for item in core.signal_failure_hypotheses)
    assert all(0 < item.weight <= 1 for item in core.signal_failure_hypotheses)
    assert all(item.failure_family_id in valid_failure_family_ids for item in core.failure_response_hypotheses)
    assert all(item.response_logic_id in valid_response_logic_ids for item in core.failure_response_hypotheses)
    assert all(0 < item.weight <= 1 for item in core.failure_response_hypotheses)


def test_contract_enrichment_batch_infers_block_and_tool_links():
    repository = get_ontology_repository()
    batch = repository.contract_enrichment_batch(vertical="restaurant")

    block_update = next(item for item in batch.blocks if item.id == "blk_map_service_steps")
    assert "live_execution" in block_update.service_module_ids
    assert "workflow_design_failure" in block_update.failure_family_ids

    assert not any(item.id == "tool_service_observation_sheet" for item in batch.tools)


def test_restaurant_evaluation_pack_covers_core_operating_breakdowns_and_passes():
    service = get_ontology_evaluation_service()

    pack = service.load_pack(vertical="restaurant", pack_id="restaurant-core-scenarios-v1")
    scenario_ids = {scenario.id for scenario in pack.scenarios}
    assert len(pack.scenarios) == 16
    assert {
        "scn_opening_readiness_drift",
        "scn_prep_system_breakdown",
        "scn_manager_absence_under_peak_load",
        "scn_standards_drift_without_learning_loop",
        "scn_rush_absorption_breakdown",
        "scn_training_transfer_failure",
        "scn_live_tool_outage",
        "scn_offer_expectation_misalignment",
        "scn_control_loop_closure_failure",
        "scn_defensive_recovery_under_absent_manager",
        "scn_unexplained_loss_control_drift",
    }.issubset(scenario_ids)

    result = service.run_pack(vertical="restaurant", pack_id="restaurant-core-scenarios-v1")
    assert result.scenario_count == 16
    assert result.failed_scenarios == 0
    assert result.pass_rate == 1.0
