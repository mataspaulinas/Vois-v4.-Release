from enum import StrEnum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DraftStatus(StrEnum):
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"


class OntologyEntityType(StrEnum):
    SIGNALS = "signals"
    FAILURE_MODES = "failure_modes"
    RESPONSE_PATTERNS = "response_patterns"
    BLOCKS = "blocks"
    TOOLS = "tools"


class OntologyMapType(StrEnum):
    SIGNAL_FAILURE_MAP = "signal_failure_map"
    FAILURE_PATTERN_MAP = "failure_pattern_map"
    PATTERN_BLOCK_MAP = "pattern_block_map"


class OntologyEntityBase(BaseModel):
    id: str
    name: str
    description: str
    status: str
    owner: str
    source_ref: str
    updated_at: datetime


class SignalDefinition(OntologyEntityBase):
    domain: str
    module: str
    indicator_type: str
    evidence_types: list[str] = Field(default_factory=list)
    source_types: list[str] = Field(default_factory=list)
    temporal_behavior: str | None = None
    likely_co_signals: list[str] = Field(default_factory=list)
    adapter_aliases: list[str] = Field(default_factory=list)


class FailureModeDefinition(OntologyEntityBase):
    domain: str


class ResponsePatternDefinition(OntologyEntityBase):
    focus: str


class ToolDefinition(OntologyEntityBase):
    category: str
    format: str | None = None
    usage_moment: str | None = None
    expected_output: str | None = None
    adaptation_variables: list[str] = Field(default_factory=list)
    block_ids: list[str] = Field(default_factory=list)


class BlockDefinition(OntologyEntityBase):
    effort_hours: float = Field(ge=0)
    dependencies: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    response_pattern_ids: list[str] = Field(default_factory=list)
    entry_conditions: list[str] = Field(default_factory=list)
    contraindications: list[str] = Field(default_factory=list)
    owner_role: str | None = None
    expected_time_to_effect_days: int | None = Field(default=None, ge=0)
    proof_of_completion: list[str] = Field(default_factory=list)
    successor_block_ids: list[str] = Field(default_factory=list)
    service_module_ids: list[str] = Field(default_factory=list)
    failure_family_ids: list[str] = Field(default_factory=list)


class SignalFailureMapItem(BaseModel):
    signal_id: str
    failure_mode_id: str
    weight: float


class FailurePatternMapItem(BaseModel):
    failure_mode_id: str
    response_pattern_id: str
    weight: float


class PatternBlockMapItem(BaseModel):
    response_pattern_id: str
    block_id: str
    weight: float


class OntologyMeta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    version: str
    ontology_id: str = Field(validation_alias="vertical")
    owner: str
    released_at: datetime
    recovery_sources: list[str]


class OntologyBundle(BaseModel):
    meta: OntologyMeta
    signals: list[SignalDefinition]
    failure_modes: list[FailureModeDefinition]
    response_patterns: list[ResponsePatternDefinition]
    blocks: list[BlockDefinition]
    tools: list[ToolDefinition]
    signal_failure_map: list[SignalFailureMapItem]
    failure_pattern_map: list[FailurePatternMapItem]
    pattern_block_map: list[PatternBlockMapItem]


class OntologySummary(BaseModel):
    version: str
    ontology_id: str
    counts: dict[str, int]


class OntologyMountSummary(BaseModel):
    ontology_id: str
    display_name: str
    version: str
    adapter_id: str
    core_canon_version: str
    manifest_digest: str
    status: str
    pack_kind: str
    counts: dict[str, int] = Field(default_factory=dict)
    validation: dict[str, bool] = Field(default_factory=dict)
    validation_errors: list[str] = Field(default_factory=list)


class CoreOntologyMeta(BaseModel):
    version: str
    owner: str
    released_at: datetime


class CoreServiceModuleDefinition(BaseModel):
    id: str
    name: str
    description: str


class CoreFailureFamilyDefinition(BaseModel):
    id: str
    name: str
    description: str


class CoreResponseLogicDefinition(BaseModel):
    id: str
    name: str
    description: str


class CoreSignalArchetypeDefinition(BaseModel):
    id: str
    name: str
    module_id: str
    signal_type: str
    description: str
    evidence_examples: list[str] = Field(default_factory=list)
    likely_failure_family_ids: list[str] = Field(default_factory=list)


class CoreSignalFailureHypothesisDefinition(BaseModel):
    signal_id: str
    failure_family_id: str
    weight: float
    rationale: str


class CoreFailureResponseDefinition(BaseModel):
    failure_family_id: str
    response_logic_id: str
    weight: float
    rationale: str


class CoreOntologyBundle(BaseModel):
    meta: CoreOntologyMeta
    service_modules: list[CoreServiceModuleDefinition]
    failure_families: list[CoreFailureFamilyDefinition]
    response_logics: list[CoreResponseLogicDefinition]
    signal_archetypes: list[CoreSignalArchetypeDefinition] = Field(default_factory=list)
    signal_failure_hypotheses: list[CoreSignalFailureHypothesisDefinition] = Field(default_factory=list)
    failure_response_hypotheses: list[CoreFailureResponseDefinition] = Field(default_factory=list)


class AdapterPackMeta(BaseModel):
    adapter_id: str
    display_name: str
    version: str
    owner: str
    released_at: datetime
    core_version: str
    archetypes: list[str]
    source_verticals: list[str]


class AdapterPack(BaseModel):
    meta: AdapterPackMeta
    domain_aliases: dict[str, str] = Field(default_factory=dict)
    module_aliases: dict[str, str] = Field(default_factory=dict)
    signal_module_map: dict[str, str] = Field(default_factory=dict)
    failure_family_map: dict[str, str] = Field(default_factory=dict)
    response_logic_map: dict[str, str] = Field(default_factory=dict)


class OntologyAlignmentSummary(BaseModel):
    ontology_id: str
    bundle_version: str
    adapter_id: str
    adapter_version: str
    core_version: str
    counts: dict[str, int]
    service_module_counts: dict[str, int]
    failure_family_counts: dict[str, int]
    response_logic_counts: dict[str, int]
    unclassified_signal_ids: list[str]
    unclassified_failure_mode_ids: list[str]
    unclassified_response_pattern_ids: list[str]


class OntologyGovernanceSummary(BaseModel):
    ontology_id: str
    bundle_version: str
    adapter_id: str
    adapter_version: str
    core_version: str
    errors: list[str]
    warnings: list[str]
    duplicate_entity_ids: dict[str, list[str]]
    block_dependency_cycles: list[list[str]]
    adapter_reference_errors: list[str]
    alignment_gaps: dict[str, list[str]]
    block_contract_gaps: dict[str, list[str]]
    tool_contract_gaps: dict[str, list[str]]


class CoreCoverageItem(BaseModel):
    id: str
    name: str
    covered_count: int
    is_covered: bool


class OntologyAuthoringBrief(BaseModel):
    ontology_id: str
    bundle_version: str
    adapter_id: str
    adapter_version: str
    core_version: str
    service_module_coverage: list[CoreCoverageItem]
    failure_family_coverage: list[CoreCoverageItem]
    response_logic_coverage: list[CoreCoverageItem]
    signal_contract_fields: list[str]
    block_contract_fields: list[str]
    tool_contract_fields: list[str]
    governance_warning_counts: dict[str, int]


class SignalCascade(BaseModel):
    signal: SignalDefinition
    failure_modes: list[FailureModeDefinition]
    response_patterns: list[ResponsePatternDefinition]
    blocks: list[BlockDefinition]
    tools: list[ToolDefinition]


class WorkbenchDraftUpsert(BaseModel):
    id: str
    name: str
    description: str
    owner: str
    source_ref: str
    status: DraftStatus = DraftStatus.DRAFT
    updated_at: datetime | None = None
    domain: str | None = None
    module: str | None = None
    indicator_type: str | None = None
    evidence_types: list[str] = Field(default_factory=list)
    source_types: list[str] = Field(default_factory=list)
    temporal_behavior: str | None = None
    likely_co_signals: list[str] = Field(default_factory=list)
    adapter_aliases: list[str] = Field(default_factory=list)
    focus: str | None = None
    category: str | None = None
    format: str | None = None
    usage_moment: str | None = None
    expected_output: str | None = None
    adaptation_variables: list[str] = Field(default_factory=list)
    block_ids: list[str] = Field(default_factory=list)
    effort_hours: float | None = Field(default=None, ge=0)
    dependencies: list[str] = Field(default_factory=list)
    tool_ids: list[str] = Field(default_factory=list)
    response_pattern_ids: list[str] = Field(default_factory=list)
    entry_conditions: list[str] = Field(default_factory=list)
    contraindications: list[str] = Field(default_factory=list)
    owner_role: str | None = None
    expected_time_to_effect_days: int | None = Field(default=None, ge=0)
    proof_of_completion: list[str] = Field(default_factory=list)
    successor_block_ids: list[str] = Field(default_factory=list)
    service_module_ids: list[str] = Field(default_factory=list)
    failure_family_ids: list[str] = Field(default_factory=list)


class WorkbenchDraftRecord(BaseModel):
    entity_type: OntologyEntityType
    entity: dict[str, object]


class WorkbenchOverview(BaseModel):
    counts_by_type: dict[str, int]
    counts_by_status: dict[str, int]
    counts_by_map_type: dict[str, int] = Field(default_factory=dict)
    map_counts_by_status: dict[str, int] = Field(default_factory=dict)
    published_versions: list[str]
    latest_version: str


class WorkbenchMapDraftUpsert(BaseModel):
    source_id: str
    target_id: str
    weight: float = Field(ge=0)
    owner: str
    source_ref: str
    status: DraftStatus = DraftStatus.DRAFT
    updated_at: datetime | None = None


class WorkbenchMapDraftRecord(BaseModel):
    map_type: OntologyMapType
    draft_key: str
    mapping: dict[str, object]


class DraftStatusUpdateRequest(BaseModel):
    status: DraftStatus


class PublishOntologyVersionRequest(BaseModel):
    version: str
    owner: str
    source_version: str = "v1"
    recovery_sources: list[str] = Field(default_factory=list)


class PublishOntologyVersionResponse(BaseModel):
    version: str
    ontology_id: str
    published_path: str
    counts: dict[str, int]
    promoted: dict[str, int]
    skipped: dict[str, int]
    promoted_maps: dict[str, int]
    skipped_maps: dict[str, int]


class RecoveryImportBatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ontology_id: str | None = Field(default=None, validation_alias="vertical")
    signals: list[WorkbenchDraftUpsert] = Field(default_factory=list)
    failure_modes: list[WorkbenchDraftUpsert] = Field(default_factory=list)
    response_patterns: list[WorkbenchDraftUpsert] = Field(default_factory=list)
    blocks: list[WorkbenchDraftUpsert] = Field(default_factory=list)
    tools: list[WorkbenchDraftUpsert] = Field(default_factory=list)
    signal_failure_map: list[WorkbenchMapDraftUpsert] = Field(default_factory=list)
    failure_pattern_map: list[WorkbenchMapDraftUpsert] = Field(default_factory=list)
    pattern_block_map: list[WorkbenchMapDraftUpsert] = Field(default_factory=list)


class RecoveryImportBatchResult(BaseModel):
    ontology_id: str
    entity_counts: dict[str, int]
    map_counts: dict[str, int]


class OntologyEvaluationScenarioInput(BaseModel):
    selected_signal_ids: list[str] = Field(default_factory=list)
    management_hours_available: float = Field(ge=0)
    weekly_effort_budget: float = Field(ge=0)
    signal_states: dict[str, dict[str, object]] = Field(default_factory=dict)


class OntologyEvaluationScenarioExpectation(BaseModel):
    top_failure_mode_ids: list[str] = Field(default_factory=list)
    top_response_pattern_ids: list[str] = Field(default_factory=list)
    required_block_ids: list[str] = Field(default_factory=list)
    forbidden_block_ids: list[str] = Field(default_factory=list)
    expected_load_classification: str | None = None
    min_plan_task_count: int | None = Field(default=None, ge=0)
    max_plan_task_count: int | None = Field(default=None, ge=0)


class OntologyEvaluationScenario(BaseModel):
    id: str
    name: str
    description: str
    input: OntologyEvaluationScenarioInput
    expectations: OntologyEvaluationScenarioExpectation


class OntologyEvaluationPackMeta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pack_id: str
    title: str
    ontology_id: str = Field(validation_alias="vertical")
    ontology_version: str
    owner: str
    updated_at: datetime
    description: str


class OntologyEvaluationPack(BaseModel):
    meta: OntologyEvaluationPackMeta
    scenarios: list[OntologyEvaluationScenario] = Field(default_factory=list)


class OntologyEvaluationPackSummary(BaseModel):
    pack_id: str
    title: str
    ontology_id: str
    ontology_version: str
    scenario_count: int
    updated_at: datetime
    description: str


class OntologyEvaluationCheckResult(BaseModel):
    key: str
    passed: bool
    expected: object | None = None
    actual: object | None = None
    detail: str


class OntologyEvaluationScenarioResult(BaseModel):
    scenario_id: str
    scenario_name: str
    passed: bool
    score: float = Field(ge=0, le=1)
    top_failure_mode_ids: list[str] = Field(default_factory=list)
    top_response_pattern_ids: list[str] = Field(default_factory=list)
    plan_block_ids: list[str] = Field(default_factory=list)
    load_classification: str
    plan_task_count: int = Field(ge=0)
    checks: list[OntologyEvaluationCheckResult] = Field(default_factory=list)


class OntologyEvaluationPackResult(BaseModel):
    pack_id: str
    title: str
    ontology_id: str
    ontology_version: str
    generated_at: datetime
    scenario_count: int
    passed_scenarios: int
    failed_scenarios: int
    pass_rate: float = Field(ge=0, le=1)
    results: list[OntologyEvaluationScenarioResult] = Field(default_factory=list)
