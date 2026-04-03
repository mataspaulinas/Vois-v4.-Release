from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass

from app.schemas.domain import DiagnosticFinding, EngineReportOutput, PlanTaskOutput
from app.schemas.ontology import BlockDefinition, OntologyBundle
from app.services.ontology import OntologyRepository


class EngineService:
    def __init__(self, ontology_repository: OntologyRepository):
        self.ontology_repository = ontology_repository

    def run(
        self,
        selected_signal_ids: list[str],
        management_hours_available: float,
        weekly_effort_budget: float,
        signal_states: dict[str, dict] | None = None,
        assessment_type: str = "full_diagnostic",
        vertical: str | None = None,
        version: str | None = None,
        ontology_id: str | None = None,
    ) -> dict:
        if ontology_id:
            bundle = self.ontology_repository.load_bundle_for_identity(ontology_id, version)
        elif vertical:
            bundle = self.ontology_repository.load_bundle(vertical, version)
        else:
            raise ValueError("EngineService.run requires ontology_id or vertical")
        signal_map = {signal.id: signal for signal in bundle.signals}
        failure_mode_map = {item.id: item for item in bundle.failure_modes}
        response_pattern_map = {item.id: item for item in bundle.response_patterns}
        block_map = {item.id: item for item in bundle.blocks}
        tool_map = {item.id: item for item in bundle.tools}

        selected_from_state = [
            signal_id
            for signal_id, state in (signal_states or {}).items()
            if state.get("active")
        ]
        raw_signal_ids = selected_signal_ids or selected_from_state
        normalized_signal_ids = [signal_id for signal_id in dict.fromkeys(raw_signal_ids) if signal_id in signal_map]
        failure_scores = self._score_failure_modes(bundle, normalized_signal_ids)
        response_scores = self._score_response_patterns(bundle, failure_scores)
        block_scores = self._score_blocks(bundle, response_scores)

        chosen_block_ids = self._select_blocks(block_scores, block_map, weekly_effort_budget)
        ordered_blocks = self._topological_sort_blocks(chosen_block_ids, block_map)
        ordered_block_ids = [block.id for block in ordered_blocks]
        total_effort = sum(block.effort_hours for block in ordered_blocks)
        load_classification = self._classify_load(total_effort, management_hours_available, weekly_effort_budget)
        assessment_profile = _assessment_profile(assessment_type)

        plan_tasks = [
            PlanTaskOutput(
                block_id=block.id,
                title=block.name,
                rationale=self._build_rationale(block, response_scores, bundle),
                effort_hours=block.effort_hours,
                dependencies=[dependency for dependency in block.dependencies if dependency in ordered_block_ids],
                trace=self._build_trace(block, normalized_signal_ids, failure_scores, response_scores, bundle),
                sub_actions=self._build_sub_actions(block, tool_map),
                deliverables=self._build_deliverables(block, tool_map),
            )
            for block in ordered_blocks
        ]

        diagnostic_spine = [
            f"Assessment mode: {assessment_profile.label}. {assessment_profile.spine_focus}",
            f"Signals active: {', '.join(signal_map[signal_id].name for signal_id in normalized_signal_ids) or 'none'}",
            "Failure modes prioritized: "
            + ", ".join(item.name for item in self._top_findings(failure_scores, failure_mode_map, 4)),
            "Response patterns activated: "
            + ", ".join(item.name for item in self._top_findings(response_scores, response_pattern_map, 4)),
            f"Plan load classified as {load_classification} against a weekly budget of {weekly_effort_budget:.1f}h.",
        ]

        report = EngineReportOutput(
            assessment_type=assessment_profile.key,
            assessment_type_label=assessment_profile.label,
            summary=(
                assessment_profile.summary_template.format(
                    active_signal_count=len(normalized_signal_ids),
                    load_classification=load_classification,
                )
            ),
            diagnostic_spine=diagnostic_spine,
            investigation_threads=list(assessment_profile.investigation_threads),
            verification_briefs=list(assessment_profile.verification_briefs),
        )

        return {
            "assessment_type": assessment_profile.key,
            "assessment_type_label": assessment_profile.label,
            "ontology_version": bundle.meta.version,
            "load_classification": load_classification,
            "active_signals": self._top_findings(
                {signal_id: 1.0 for signal_id in normalized_signal_ids}, signal_map, len(normalized_signal_ids)
            ),
            "failure_modes": self._top_findings(failure_scores, failure_mode_map, 5),
            "response_patterns": self._top_findings(response_scores, response_pattern_map, 5),
            "plan_tasks": plan_tasks,
            "report": report,
        }


@dataclass(frozen=True)
class AssessmentProfile:
    key: str
    label: str
    plan_title: str
    spine_focus: str
    summary_template: str
    investigation_threads: tuple[str, ...]
    verification_briefs: tuple[str, ...]


_ASSESSMENT_PROFILES: dict[str, AssessmentProfile] = {
    "full_diagnostic": AssessmentProfile(
        key="full_diagnostic",
        label="Full Diagnostic",
        plan_title="Operational reset plan",
        spine_focus="Use broad scope and establish the full operating picture before narrowing.",
        summary_template=(
            "This full diagnostic synthesizes the broad operating picture, activates the most coherent intervention "
            "set, and classifies the resulting load as {load_classification} across {active_signal_count} active signals."
        ),
        investigation_threads=(
            "Validate service handoff clarity during the busiest hour of service.",
            "Confirm whether pre-shift communication is happening consistently across the week.",
            "Check whether training is documented or still dependent on verbal memory.",
        ),
        verification_briefs=(
            "Observe one live service and compare role handoffs against the mapped workflow.",
            "Review one week of guest complaints against void, comp, and ticket-delay patterns.",
            "Confirm every selected intervention has a named owner before launch.",
        ),
    ),
    "follow_up": AssessmentProfile(
        key="follow_up",
        label="Follow-up",
        plan_title="Follow-up correction plan",
        spine_focus="Stay comparative: highlight what improved, what regressed, and what remains stuck.",
        summary_template=(
            "This follow-up report compares current evidence against the prior operating posture, keeping attention on "
            "what moved, what stalled, and where the remaining correction load is {load_classification}."
        ),
        investigation_threads=(
            "Check whether previously flagged breakdowns actually improved in live service.",
            "Identify which prior interventions were actioned, delayed, or abandoned.",
            "Separate genuinely new concerns from unresolved legacy friction.",
        ),
        verification_briefs=(
            "Review the last plan against current observations and mark each intervention as improved, unchanged, or worsened.",
            "Ask frontline staff which changes helped in practice and which stayed cosmetic.",
            "Confirm any newly surfaced issue is not just a restatement of an unresolved prior signal.",
        ),
    ),
    "incident": AssessmentProfile(
        key="incident",
        label="Incident",
        plan_title="Incident response plan",
        spine_focus="Stay tightly focused on the incident and the root-cause chain it exposed.",
        summary_template=(
            "This incident-focused report isolates the most relevant operational failures triggered by the event and "
            "frames the response as a prevention protocol with a {load_classification} correction load."
        ),
        investigation_threads=(
            "Reconstruct the incident timeline from trigger to containment.",
            "Identify the operational control that should have prevented the event but failed.",
            "Check whether the incident reflects a one-off lapse or a repeating systemic vulnerability.",
        ),
        verification_briefs=(
            "Confirm the immediate containment response was sufficient and documented.",
            "Verify the preventive correction closes the same failure path before the next similar event.",
            "Review whether customer, staff, compliance, or reputation impact needs separate follow-through.",
        ),
    ),
    "preopening_gate": AssessmentProfile(
        key="preopening_gate",
        label="Pre-opening Gate",
        plan_title="Opening readiness plan",
        spine_focus="Treat the report as a readiness gate: blockers and warnings matter more than broad optimization.",
        summary_template=(
            "This pre-opening gate evaluates whether the venue is ready to launch, reopen, or soft-open, with a "
            "{load_classification} correction load across the current blockers and warnings."
        ),
        investigation_threads=(
            "Identify any blocker that would make opening unsafe, non-compliant, or operationally unstable.",
            "Check whether staffing, stock, and equipment readiness are sufficient for day-one service.",
            "Separate true launch blockers from lower-stakes improvements that can wait until after opening.",
        ),
        verification_briefs=(
            "Confirm every critical compliance, safety, and equipment check has evidence behind it.",
            "Verify all day-one roles are assigned and trained to the required standard.",
            "Do not downgrade blockers just to preserve a launch date.",
        ),
    ),
    "weekly_pulse": AssessmentProfile(
        key="weekly_pulse",
        label="Weekly Pulse",
        plan_title="Weekly pulse action plan",
        spine_focus="Keep the report lean and current: trends, watch-items, and immediate weekly actions.",
        summary_template=(
            "This weekly pulse condenses the most relevant operating signals into a light-touch readout, keeping the "
            "current action load at {load_classification} while tracking the week’s main pressure points."
        ),
        investigation_threads=(
            "Check whether this week’s issues represent noise, drift, or an early warning of a deeper pattern.",
            "Identify which wins or losses changed the operating picture most materially this week.",
            "Keep the watch-list short enough to act on immediately.",
        ),
        verification_briefs=(
            "Cross-check the pulse against complaints, staffing changes, and any notable weekly metrics.",
            "Confirm the surfaced watch-items are the ones that actually deserve action this week.",
            "Escalate into a fuller diagnostic if the pulse reveals broader instability.",
        ),
    ),
}


def _assessment_profile(assessment_type: str | None) -> AssessmentProfile:
    return _ASSESSMENT_PROFILES.get((assessment_type or "full_diagnostic").strip().lower(), _ASSESSMENT_PROFILES["full_diagnostic"])

    def _score_failure_modes(self, bundle: OntologyBundle, signal_ids: list[str]) -> dict[str, float]:
        scores: dict[str, float] = defaultdict(float)
        for item in bundle.signal_failure_map:
            if item.signal_id in signal_ids:
                scores[item.failure_mode_id] += item.weight
        return dict(sorted(scores.items(), key=lambda entry: entry[1], reverse=True))

    def _score_response_patterns(self, bundle: OntologyBundle, failure_scores: dict[str, float]) -> dict[str, float]:
        scores: dict[str, float] = defaultdict(float)
        for item in bundle.failure_pattern_map:
            if item.failure_mode_id in failure_scores:
                scores[item.response_pattern_id] += failure_scores[item.failure_mode_id] * item.weight
        return dict(sorted(scores.items(), key=lambda entry: entry[1], reverse=True))

    def _score_blocks(self, bundle: OntologyBundle, response_scores: dict[str, float]) -> dict[str, float]:
        scores: dict[str, float] = defaultdict(float)
        for item in bundle.pattern_block_map:
            if item.response_pattern_id in response_scores:
                scores[item.block_id] += response_scores[item.response_pattern_id] * item.weight
        return dict(sorted(scores.items(), key=lambda entry: entry[1], reverse=True))

    def _select_blocks(
        self,
        block_scores: dict[str, float],
        block_map: dict[str, BlockDefinition],
        weekly_effort_budget: float,
    ) -> set[str]:
        selected: set[str] = set()
        running_effort = 0.0

        for block_id in block_scores:
            candidate_ids = self._closure_for_block(block_id, block_map)
            additional_ids = candidate_ids - selected
            additional_effort = sum(block_map[item].effort_hours for item in additional_ids)

            if running_effort + additional_effort > max(weekly_effort_budget, 1.0) and selected:
                continue
            selected.update(candidate_ids)
            running_effort += additional_effort

        return selected

    def _closure_for_block(self, block_id: str, block_map: dict[str, BlockDefinition]) -> set[str]:
        selected = {block_id}
        stack = [block_id]
        while stack:
            current = stack.pop()
            for dependency in block_map[current].dependencies:
                if dependency not in selected:
                    selected.add(dependency)
                    stack.append(dependency)
        return selected

    def _topological_sort_blocks(
        self, selected_block_ids: set[str], block_map: dict[str, BlockDefinition]
    ) -> list[BlockDefinition]:
        adjacency: dict[str, set[str]] = {block_id: set() for block_id in selected_block_ids}
        indegree: dict[str, int] = {block_id: 0 for block_id in selected_block_ids}

        for block_id in selected_block_ids:
            for dependency in block_map[block_id].dependencies:
                if dependency in selected_block_ids:
                    adjacency[dependency].add(block_id)
                    indegree[block_id] += 1

        queue = deque(sorted([block_id for block_id, count in indegree.items() if count == 0]))
        ordered: list[str] = []

        while queue:
            current = queue.popleft()
            ordered.append(current)
            for child in sorted(adjacency[current]):
                indegree[child] -= 1
                if indegree[child] == 0:
                    queue.append(child)

        if len(ordered) != len(selected_block_ids):
            raise ValueError("Cycle detected in block dependencies")

        return [block_map[block_id] for block_id in ordered]

    def _classify_load(
        self, total_effort: float, management_hours_available: float, weekly_effort_budget: float
    ) -> str:
        effective_budget = min(management_hours_available, weekly_effort_budget)
        if total_effort <= effective_budget * 0.5:
            return "light"
        if total_effort <= effective_budget:
            return "moderate"
        if total_effort <= effective_budget * 1.5:
            return "heavy"
        return "overloaded"

    def _top_findings(self, scores: dict[str, float], entity_map: dict[str, object], limit: int) -> list[DiagnosticFinding]:
        findings: list[DiagnosticFinding] = []
        for entity_id, score in list(scores.items())[:limit]:
            entity = entity_map[entity_id]
            findings.append(DiagnosticFinding(id=entity_id, name=entity.name, score=round(score, 2)))
        return findings

    def _build_rationale(self, block: BlockDefinition, response_scores: dict[str, float], bundle: OntologyBundle) -> str:
        response_pattern_map = {item.id: item for item in bundle.response_patterns}
        active_patterns = [
            response_pattern_map[pattern_id].name
            for pattern_id in block.response_pattern_ids
            if pattern_id in response_scores
        ]
        if not active_patterns:
            return "Selected as a dependency required to keep the intervention sequence executable."
        return "Activated by response patterns: " + ", ".join(active_patterns)

    def _build_trace(
        self,
        block: BlockDefinition,
        normalized_signal_ids: list[str],
        failure_scores: dict[str, float],
        response_scores: dict[str, float],
        bundle: OntologyBundle,
    ) -> dict[str, object]:
        response_pattern_map = {item.id: item for item in bundle.response_patterns}
        relevant_patterns = [
            {"id": pattern_id, "name": response_pattern_map[pattern_id].name}
            for pattern_id in block.response_pattern_ids
            if pattern_id in response_scores
        ]
        relevant_failure_mode_ids = [
            item.failure_mode_id
            for item in bundle.failure_pattern_map
            if item.response_pattern_id in {pattern["id"] for pattern in relevant_patterns}
            and item.failure_mode_id in failure_scores
        ]
        failure_mode_map = {item.id: item for item in bundle.failure_modes}

        return {
            "signal_ids": normalized_signal_ids,
            "failure_modes": [
                {"id": failure_mode_id, "name": failure_mode_map[failure_mode_id].name}
                for failure_mode_id in dict.fromkeys(relevant_failure_mode_ids)
            ],
            "response_patterns": relevant_patterns,
        }

    def _build_sub_actions(self, block: BlockDefinition, tool_map: dict[str, object]) -> list[str]:
        linked_tools = [tool_map[tool_id].name for tool_id in block.tool_ids if tool_id in tool_map]
        actions = [
            f"Assign an owner and implementation window for {block.name.lower()}.",
            f"Adapt the linked toolset for venue use: {', '.join(linked_tools) if linked_tools else 'no linked tools yet'}.",
            "Run the first live cycle, capture observations, and confirm whether the intervention fits capacity."
        ]
        return actions

    def _build_deliverables(self, block: BlockDefinition, tool_map: dict[str, object]) -> list[str]:
        linked_tools = [tool_map[tool_id].name for tool_id in block.tool_ids if tool_id in tool_map]
        deliverables = [
            f"{block.name} documented and approved for the venue.",
            "Owner, cadence, and follow-up rule recorded in the operational plan."
        ]
        if linked_tools:
            deliverables.append(f"Venue-ready tool pack prepared: {', '.join(linked_tools)}.")
        return deliverables
