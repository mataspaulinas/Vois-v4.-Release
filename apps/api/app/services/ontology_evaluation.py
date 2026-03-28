from __future__ import annotations

from datetime import datetime, UTC

from app.schemas.ontology import (
    OntologyEvaluationCheckResult,
    OntologyEvaluationPack,
    OntologyEvaluationPackResult,
    OntologyEvaluationPackSummary,
    OntologyEvaluationScenario,
    OntologyEvaluationScenarioResult,
)
from app.services.engine import EngineService
from app.services.ontology import OntologyRepository, get_ontology_repository


class OntologyEvaluationService:
    def __init__(self, repository: OntologyRepository):
        self.repository = repository
        self.engine = EngineService(repository)

    def list_packs(self, vertical: str) -> list[OntologyEvaluationPackSummary]:
        return self.repository.list_evaluation_packs(vertical)

    def load_pack(self, vertical: str, pack_id: str) -> OntologyEvaluationPack:
        return self.repository.load_evaluation_pack(vertical, pack_id)

    def run_pack(self, vertical: str, pack_id: str) -> OntologyEvaluationPackResult:
        pack = self.load_pack(vertical=vertical, pack_id=pack_id)
        results = [self._run_scenario(pack, scenario) for scenario in pack.scenarios]
        passed_scenarios = sum(1 for result in results if result.passed)
        scenario_count = len(results)
        return OntologyEvaluationPackResult(
            pack_id=pack.meta.pack_id,
            title=pack.meta.title,
            ontology_id=pack.meta.ontology_id,
            ontology_version=pack.meta.ontology_version,
            generated_at=datetime.now(UTC),
            scenario_count=scenario_count,
            passed_scenarios=passed_scenarios,
            failed_scenarios=scenario_count - passed_scenarios,
            pass_rate=(passed_scenarios / scenario_count) if scenario_count else 0.0,
            results=results,
        )

    def _run_scenario(
        self,
        pack: OntologyEvaluationPack,
        scenario: OntologyEvaluationScenario,
    ) -> OntologyEvaluationScenarioResult:
        mount = self.repository.resolver.resolve_compat(
            pack.meta.ontology_id,
            pack.meta.ontology_version,
            allow_invalid=True,
            require_runtime=False,
        )
        output = self.engine.run(
            selected_signal_ids=scenario.input.selected_signal_ids,
            management_hours_available=scenario.input.management_hours_available,
            weekly_effort_budget=scenario.input.weekly_effort_budget,
            signal_states=scenario.input.signal_states,
            ontology_id=mount.ontology_id,
            version=mount.version,
        )

        actual_top_failure_mode_ids = [item.id for item in output["failure_modes"]]
        actual_top_response_pattern_ids = [item.id for item in output["response_patterns"]]
        actual_block_ids = [task.block_id for task in output["plan_tasks"]]
        actual_load_classification = output["load_classification"]
        actual_plan_task_count = len(output["plan_tasks"])
        checks: list[OntologyEvaluationCheckResult] = []

        if scenario.expectations.top_failure_mode_ids:
            expected = scenario.expectations.top_failure_mode_ids
            actual = actual_top_failure_mode_ids[: len(expected)]
            checks.append(
                OntologyEvaluationCheckResult(
                    key="top_failure_mode_ids",
                    passed=actual == expected,
                    expected=expected,
                    actual=actual,
                    detail="Checks whether the leading failure-mode hypothesis order matches the scenario expectation.",
                )
            )

        if scenario.expectations.top_response_pattern_ids:
            expected = scenario.expectations.top_response_pattern_ids
            actual = actual_top_response_pattern_ids[: len(expected)]
            checks.append(
                OntologyEvaluationCheckResult(
                    key="top_response_pattern_ids",
                    passed=actual == expected,
                    expected=expected,
                    actual=actual,
                    detail="Checks whether the leading response-pattern order matches the scenario expectation.",
                )
            )

        if scenario.expectations.required_block_ids:
            missing = [block_id for block_id in scenario.expectations.required_block_ids if block_id not in actual_block_ids]
            checks.append(
                OntologyEvaluationCheckResult(
                    key="required_block_ids",
                    passed=not missing,
                    expected=scenario.expectations.required_block_ids,
                    actual=actual_block_ids,
                    detail="Required intervention blocks must appear in the sequenced plan.",
                )
            )

        if scenario.expectations.forbidden_block_ids:
            unexpected = [block_id for block_id in scenario.expectations.forbidden_block_ids if block_id in actual_block_ids]
            checks.append(
                OntologyEvaluationCheckResult(
                    key="forbidden_block_ids",
                    passed=not unexpected,
                    expected=scenario.expectations.forbidden_block_ids,
                    actual=actual_block_ids,
                    detail="Forbidden intervention blocks must stay out of the sequenced plan for this scenario.",
                )
            )

        if scenario.expectations.expected_load_classification is not None:
            checks.append(
                OntologyEvaluationCheckResult(
                    key="expected_load_classification",
                    passed=actual_load_classification == scenario.expectations.expected_load_classification,
                    expected=scenario.expectations.expected_load_classification,
                    actual=actual_load_classification,
                    detail="Checks whether the engine classified the plan load as expected for the scenario capacity.",
                )
            )

        if scenario.expectations.min_plan_task_count is not None:
            checks.append(
                OntologyEvaluationCheckResult(
                    key="min_plan_task_count",
                    passed=actual_plan_task_count >= scenario.expectations.min_plan_task_count,
                    expected=scenario.expectations.min_plan_task_count,
                    actual=actual_plan_task_count,
                    detail="Checks whether the plan includes at least the minimum expected number of tasks.",
                )
            )

        if scenario.expectations.max_plan_task_count is not None:
            checks.append(
                OntologyEvaluationCheckResult(
                    key="max_plan_task_count",
                    passed=actual_plan_task_count <= scenario.expectations.max_plan_task_count,
                    expected=scenario.expectations.max_plan_task_count,
                    actual=actual_plan_task_count,
                    detail="Checks whether the plan stays within the maximum expected task count.",
                )
            )

        passed_count = sum(1 for check in checks if check.passed)
        check_count = len(checks)
        return OntologyEvaluationScenarioResult(
            scenario_id=scenario.id,
            scenario_name=scenario.name,
            passed=all(check.passed for check in checks) if checks else True,
            score=(passed_count / check_count) if check_count else 1.0,
            top_failure_mode_ids=actual_top_failure_mode_ids,
            top_response_pattern_ids=actual_top_response_pattern_ids,
            plan_block_ids=actual_block_ids,
            load_classification=actual_load_classification,
            plan_task_count=actual_plan_task_count,
            checks=checks,
        )


def get_ontology_evaluation_service(repository: OntologyRepository | None = None) -> OntologyEvaluationService:
    return OntologyEvaluationService(repository or get_ontology_repository())
