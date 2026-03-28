# Adapter Authoring Brief

- Vertical: `restaurant`
- Bundle version: `v2`
- Adapter: `restaurant` `v1`
- Core version: `v1`

## Core Coverage

### Service Modules
- `intake_and_demand` (Intake and demand shaping): uncovered, count=0
- `promise_and_expectations` (Promise and expectation setting): covered, count=2
- `capacity_and_deployment` (Capacity and deployment): covered, count=2
- `readiness_and_setup` (Readiness and setup): covered, count=4
- `live_execution` (Live execution): covered, count=4
- `handoffs_and_coordination` (Handoffs and coordination): covered, count=1
- `quality_and_standards` (Quality and standards): uncovered, count=0
- `recovery_and_exception_handling` (Recovery and exception handling): covered, count=1
- `leadership_and_management_rhythm` (Leadership and management rhythm): covered, count=2
- `commercial_and_control_loops` (Commercial and control loops): covered, count=4
- `learning_and_improvement` (Learning and improvement): uncovered, count=0

### Failure Families
- `demand_capacity_mismatch` (Demand-capacity mismatch): covered, count=2
- `readiness_failure` (Readiness failure): covered, count=2
- `role_clarity_failure` (Role clarity failure): uncovered, count=0
- `handoff_failure` (Handoff failure): covered, count=3
- `standards_drift` (Standards drift): covered, count=1
- `capability_gap` (Capability gap): covered, count=1
- `leadership_rhythm_failure` (Leadership rhythm failure): covered, count=2
- `control_loop_failure` (Control-loop failure): covered, count=3
- `tool_or_resource_friction` (Tool or resource friction): uncovered, count=0
- `exception_recovery_failure` (Exception recovery failure): uncovered, count=0
- `accountability_failure` (Accountability failure): uncovered, count=0
- `learning_failure` (Learning failure): uncovered, count=0

### Response Logics
- `stabilize_visibility` (Stabilize visibility): covered, count=1
- `align_roles_and_coverage` (Align roles and coverage): covered, count=2
- `strengthen_handoffs` (Strengthen handoffs): covered, count=2
- `install_operating_rhythm` (Install operating rhythm): covered, count=3
- `tighten_control_loops` (Tighten control loops): covered, count=2
- `build_capability` (Build capability): covered, count=1
- `reduce_operational_complexity` (Reduce operational complexity): uncovered, count=0

## Contract Checklists

### Signals
- `id`
- `name`
- `description`
- `domain`
- `module`
- `indicator_type`
- `evidence_types`
- `source_types`
- `temporal_behavior`
- `likely_co_signals`
- `adapter_aliases`
- `owner`
- `source_ref`
- `status`

### Blocks
- `id`
- `name`
- `description`
- `effort_hours`
- `dependencies`
- `tool_ids`
- `response_pattern_ids`
- `entry_conditions`
- `contraindications`
- `owner_role`
- `expected_time_to_effect_days`
- `proof_of_completion`
- `successor_block_ids`
- `service_module_ids`
- `failure_family_ids`
- `owner`
- `source_ref`
- `status`

### Tools
- `id`
- `name`
- `description`
- `category`
- `format`
- `usage_moment`
- `expected_output`
- `adaptation_variables`
- `block_ids`
- `owner`
- `source_ref`
- `status`

## Governance Warning Counts

- `warnings`: 10
- `block_contract_gaps`: 120
- `tool_contract_gaps`: 80
