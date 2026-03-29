from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.domain import (
    AuthRole,
    CommentVisibility,
    EscalationSeverity,
    EscalationStatus,
    FollowUpStatus,
    HelpRequestStatus,
    PlanStatus,
    ProgressEntryType,
    Role,
    TaskStatus,
    ThreadScope,
    VenueOntologyBindingStatus,
    VenueStatus,
)
from app.schemas.ontology import OntologyMountSummary


class VenueOntologyBindingWrite(BaseModel):
    ontology_id: str
    ontology_version: str


class VenueCreate(BaseModel):
    organization_id: str
    name: str
    slug: str
    ontology_binding: VenueOntologyBindingWrite
    initial_manager_user_id: str | None = None
    status: VenueStatus = VenueStatus.ACTIVE
    concept: str | None = None
    location: str | None = None
    size_note: str | None = None
    capacity_profile: dict[str, object] = Field(default_factory=dict)


class VenueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    slug: str
    status: VenueStatus
    concept: str | None = None
    location: str | None = None
    size_note: str | None = None
    capacity_profile: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class VenueOntologyBindingRead(BaseModel):
    venue_id: str
    ontology_id: str
    ontology_version: str
    binding_status: VenueOntologyBindingStatus
    bound_at: datetime
    bound_by: str | None = None
    mount: OntologyMountSummary | None = None


class OrganizationMembershipRead(BaseModel):
    id: str
    organization_id: str
    user_id: str
    role_claim: AuthRole
    is_active: bool
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


class VenueAccessAssignmentRead(BaseModel):
    id: str
    organization_id: str
    venue_id: str
    user_id: str
    is_active: bool
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


class OwnerSetupStateRead(BaseModel):
    requires_owner_claim: bool = False
    organization_claimed: bool = False
    accessible_venue_ids: list[str] = Field(default_factory=list)
    active_membership_count: int = 0
    current_membership: OrganizationMembershipRead | None = None
    status_message: str | None = None


class SetupVenueCreate(BaseModel):
    name: str
    slug: str
    ontology_binding: VenueOntologyBindingWrite
    concept: str | None = None
    location: str | None = None
    size_note: str | None = None
    capacity_profile: dict[str, object] = Field(default_factory=dict)


class OwnerClaimRequest(BaseModel):
    organization_name: str = Field(min_length=1)
    organization_slug: str = Field(min_length=1)
    region: str = "europe"
    data_residency: str = "eu-central"
    first_venue: SetupVenueCreate | None = None


class OrganizationMemberRead(BaseModel):
    id: str
    user_id: str
    organization_id: str
    email: str
    full_name: str
    firebase_uid: str | None = None
    role: AuthRole
    active: bool
    membership: OrganizationMembershipRead
    venue_access: list[VenueAccessAssignmentRead] = Field(default_factory=list)


class OrganizationMemberCreateRequest(BaseModel):
    email: str = Field(min_length=3)
    full_name: str = Field(min_length=1)
    role: AuthRole
    venue_ids: list[str] = Field(default_factory=list)


class OrganizationMemberUpdateRequest(BaseModel):
    full_name: str | None = None
    role: AuthRole | None = None
    active: bool | None = None


class OrganizationMemberVenueAccessWrite(BaseModel):
    venue_ids: list[str] = Field(default_factory=list)


class ProvisionedLoginPacket(BaseModel):
    email: str
    temporary_password: str
    reset_required: bool = True
    firebase_uid: str | None = None


class OrganizationMemberProvisionResponse(BaseModel):
    member: OrganizationMemberRead
    login_packet: ProvisionedLoginPacket


class AssessmentSignalStateInput(BaseModel):
    active: bool = True
    notes: str | None = None
    confidence: str | None = None
    value: object | None = None


class AssessmentRunRequest(BaseModel):
    venue_id: str
    created_by: str | None = None
    notes: str | None = None
    assessment_type: str = "full_diagnostic"
    assessment_date: str | None = None
    selected_signal_ids: list[str] = Field(default_factory=list)
    signal_states: dict[str, AssessmentSignalStateInput] = Field(default_factory=dict)
    raw_input_text: str | None = None
    raw_intake_payload: dict[str, object] = Field(default_factory=dict)
    venue_context_json: dict[str, object] = Field(default_factory=dict)
    management_hours_available: float = Field(default=8.0, ge=0)
    weekly_effort_budget: float = Field(default=8.0, ge=0)


class AssessmentCreateRequest(BaseModel):
    venue_id: str
    created_by: str | None = None
    notes: str | None = None
    assessment_type: str = "full_diagnostic"
    assessment_date: str | None = None
    selected_signal_ids: list[str] = Field(default_factory=list)
    signal_states: dict[str, AssessmentSignalStateInput] = Field(default_factory=dict)
    raw_input_text: str | None = None
    raw_intake_payload: dict[str, object] = Field(default_factory=dict)
    venue_context_json: dict[str, object] = Field(default_factory=dict)
    management_hours_available: float = Field(default=8.0, ge=0)
    weekly_effort_budget: float = Field(default=8.0, ge=0)


class AssessmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    venue_id: str
    created_by: str | None = None
    notes: str | None = None
    assessment_type: str = "full_diagnostic"
    assessment_date: str | None = None
    selected_signal_ids: list[str]
    signal_states: dict[str, AssessmentSignalStateInput]
    raw_input_text: str | None = None
    raw_intake_payload: dict[str, object] = Field(default_factory=dict)
    venue_context_json: dict[str, object] = Field(default_factory=dict)
    ontology_id: str
    ontology_version: str
    core_canon_version: str
    adapter_id: str
    manifest_digest: str
    management_hours_available: float
    weekly_effort_budget: float
    created_at: datetime


class AssessmentHistoryItem(BaseModel):
    id: str
    created_at: datetime
    notes: str | None = None
    selected_signal_count: int
    active_signal_names: list[str] = Field(default_factory=list)
    engine_run_id: str | None = None
    plan_load_classification: str | None = None
    plan_task_count: int = 0
    ontology_id: str | None = None
    ontology_version: str | None = None


class AssessmentExecutionRequest(BaseModel):
    pass


class AssessmentSignalMutation(BaseModel):
    signal_id: str
    notes: str | None = None
    confidence: str | None = None


class AssessmentSignalUpdateRequest(BaseModel):
    add: list[AssessmentSignalMutation] = Field(default_factory=list)
    remove: list[str] = Field(default_factory=list)
    source: str = "manual_review"


class DiagnosticFinding(BaseModel):
    id: str
    name: str
    score: float


class PlanTaskOutput(BaseModel):
    block_id: str
    title: str
    rationale: str
    effort_hours: float
    dependencies: list[str]
    trace: dict[str, object]
    sub_actions: list[str]
    deliverables: list[str]
    status: TaskStatus = TaskStatus.NOT_STARTED


class SubActionItem(BaseModel):
    text: str
    completed: bool = False


class DeliverableItem(BaseModel):
    name: str
    completed: bool = False


class PlanTaskRead(BaseModel):
    id: str
    plan_id: str
    block_id: str
    title: str
    status: TaskStatus
    order_index: int
    effort_hours: float
    rationale: str
    notes: str | None = None
    dependencies: list[str]
    trace: dict[str, object]
    sub_actions: list[SubActionItem]
    deliverables: list[DeliverableItem]
    created_at: datetime


class PlanRead(BaseModel):
    id: str
    engine_run_id: str
    venue_id: str
    title: str
    summary: str
    total_effort_hours: float
    status: PlanStatus
    ontology_id: str
    ontology_version: str
    core_canon_version: str
    adapter_id: str
    manifest_digest: str
    created_at: datetime
    load_classification: str | None = None
    tasks: list[PlanTaskRead] = Field(default_factory=list)


class PlanExecutionTaskState(BaseModel):
    task_id: str
    title: str
    status: TaskStatus
    blocking_dependency_ids: list[str] = Field(default_factory=list)


class PlanExecutionSummary(BaseModel):
    plan_id: str
    venue_id: str
    completion_percentage: float
    counts_by_status: dict[str, int]
    next_executable_tasks: list[PlanExecutionTaskState] = Field(default_factory=list)
    blocked_tasks: list[PlanExecutionTaskState] = Field(default_factory=list)


class PlanTaskStatusUpdateRequest(BaseModel):
    status: TaskStatus


class PlanTaskUpdateRequest(BaseModel):
    status: TaskStatus | None = None
    notes: str | None = None
    assigned_to: str | None = None
    priority: str | None = None
    due_at: datetime | None = None
    sub_action_completions: list[bool] | None = None
    deliverable_completions: list[bool] | None = None


class PlanUpdateRequest(BaseModel):
    status: PlanStatus | None = None
    title: str | None = None
    summary: str | None = None


class EngineReportOutput(BaseModel):
    summary: str
    diagnostic_spine: list[str]
    investigation_threads: list[str]
    verification_briefs: list[str]


class EngineRunOutput(BaseModel):
    engine_run_id: str
    assessment_id: str
    venue_id: str
    plan_id: str
    ontology_version: str
    ontology_id: str
    core_canon_version: str
    adapter_id: str
    manifest_digest: str
    load_classification: str
    active_signals: list[DiagnosticFinding]
    failure_modes: list[DiagnosticFinding]
    response_patterns: list[DiagnosticFinding]
    plan_tasks: list[PlanTaskOutput]
    report: EngineReportOutput


class PersistedEngineRunRead(BaseModel):
    engine_run_id: str
    assessment_id: str
    venue_id: str
    plan_id: str | None = None
    ontology_version: str
    ontology_id: str
    core_canon_version: str
    adapter_id: str
    manifest_digest: str
    load_classification: str
    summary: str
    diagnostic_spine: list[str] = Field(default_factory=list)
    investigation_threads: list[str] = Field(default_factory=list)
    verification_briefs: list[str] = Field(default_factory=list)
    active_signal_names: list[str] = Field(default_factory=list)
    plan_task_count: int = 0
    created_at: datetime


class PersistedEngineRunDetailRead(PersistedEngineRunRead):
    normalized_signals: list[dict[str, object]] = Field(default_factory=list)
    diagnostic_snapshot: dict[str, object] = Field(default_factory=dict)
    plan_snapshot: dict[str, object] = Field(default_factory=dict)
    report_markdown: str | None = None
    report_type: str | None = None
    ai_trace: dict[str, object] = Field(default_factory=dict)


class BootstrapOrganization(BaseModel):
    id: str
    name: str
    slug: str
    data_residency: str


class BootstrapUser(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    venue_id: str | None = None


class BootstrapThread(BaseModel):
    id: str
    title: str
    scope: ThreadScope
    archived: bool


class BootstrapResponse(BaseModel):
    organization: BootstrapOrganization | None = None
    current_user: BootstrapUser
    setup_state: OwnerSetupStateRead
    requires_owner_claim: bool = False
    organization_claimed: bool = False
    venues: list[VenueRead]
    ontology_mounts: list[OntologyMountSummary] = Field(default_factory=list)
    venue_ontology_bindings: list[VenueOntologyBindingRead] = Field(default_factory=list)
    copilot_threads: list[BootstrapThread]
    readiness: dict[str, str]
    configuration_issues: list[str] = Field(default_factory=list)


class PortfolioTotals(BaseModel):
    venues: int = 0
    assessments: int = 0
    engine_runs: int = 0
    active_plans: int = 0
    ready_tasks: int = 0
    blocked_tasks: int = 0
    progress_entries: int = 0


class PortfolioAttentionBucket(BaseModel):
    attention_level: str
    count: int


class PortfolioActivityItem(BaseModel):
    venue_id: str
    venue_name: str
    summary: str
    status: str
    created_at: datetime


class PortfolioVenuePulse(BaseModel):
    venue_id: str
    venue_name: str
    status: VenueStatus
    concept: str | None = None
    location: str | None = None
    latest_assessment_at: datetime | None = None
    latest_engine_run_at: datetime | None = None
    latest_plan_title: str | None = None
    plan_load_classification: str | None = None
    latest_signal_count: int = 0
    latest_plan_task_count: int = 0
    completion_percentage: float = 0.0
    ready_task_count: int = 0
    blocked_task_count: int = 0
    progress_entry_count: int = 0
    latest_progress_summary: str | None = None
    latest_activity_at: datetime | None = None
    suggested_view: str
    attention_level: str
    next_step_label: str


class PortfolioSummaryResponse(BaseModel):
    generated_at: datetime
    organization_id: str
    resume_venue_id: str | None = None
    resume_reason: str | None = None
    totals: PortfolioTotals
    attention_breakdown: list[PortfolioAttentionBucket] = Field(default_factory=list)
    portfolio_notes: list[str] = Field(default_factory=list)
    venue_pulses: list[PortfolioVenuePulse] = Field(default_factory=list)
    recent_activity: list[PortfolioActivityItem] = Field(default_factory=list)


class ProgressEntryCreateRequest(BaseModel):
    venue_id: str
    created_by: str | None = None
    entry_type: ProgressEntryType = ProgressEntryType.UPDATE
    summary: str = Field(min_length=1)
    detail: str | None = None
    status: VenueStatus = VenueStatus.ACTIVE


class ProgressEntryRead(BaseModel):
    id: str
    venue_id: str
    created_by: str | None = None
    entry_type: ProgressEntryType = ProgressEntryType.UPDATE
    summary: str
    detail: str | None = None
    status: VenueStatus
    created_at: datetime


class HelpRequestCreateRequest(BaseModel):
    venue_id: str
    title: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    channel: str = "pocket"


class HelpRequestUpdateRequest(BaseModel):
    status: HelpRequestStatus


class HelpRequestRead(BaseModel):
    id: str
    venue_id: str
    requester_user_id: str | None = None
    channel: str
    title: str
    prompt: str
    status: HelpRequestStatus
    linked_thread_id: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class IntegrationEventCreateRequest(BaseModel):
    venue_id: str
    provider: str = Field(min_length=2)
    event_type: str = Field(min_length=2)
    external_event_id: str | None = None
    source_entity_id: str | None = None
    ingest_mode: str = "manual_push"
    payload: dict[str, object] = Field(default_factory=dict)
    occurred_at: datetime | None = None


class IntegrationEventStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=2)
    normalized_signal_ids: list[str] = Field(default_factory=list)
    error_message: str | None = None


class IntegrationEventRead(BaseModel):
    id: str
    organization_id: str
    venue_id: str
    provider: str
    event_type: str
    external_event_id: str | None = None
    source_entity_id: str | None = None
    ingest_mode: str
    status: str
    payload: dict[str, object] = Field(default_factory=dict)
    normalized_signal_ids: list[str] = Field(default_factory=list)
    attempt_count: int
    last_attempted_at: datetime | None = None
    next_retry_at: datetime | None = None
    occurred_at: datetime | None = None
    error_message: str | None = None
    processed_at: datetime | None = None
    created_at: datetime


class IntegrationConnectorRead(BaseModel):
    provider: str
    display_name: str
    status: str
    ingest_modes: list[str] = Field(default_factory=list)
    supported_event_types: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class LightspeedConnectorEventRequest(BaseModel):
    venue_id: str
    event_id: str = Field(min_length=2)
    event_type: str = Field(min_length=2)
    occurred_at: datetime | None = None
    location_id: str | None = None
    source_entity_id: str | None = None
    payload: dict[str, object] = Field(default_factory=dict)


class SumUpConnectorEventRequest(BaseModel):
    venue_id: str
    event_id: str = Field(min_length=2)
    event_type: str = Field(min_length=2)
    occurred_at: datetime | None = None
    terminal_id: str | None = None
    source_entity_id: str | None = None
    payload: dict[str, object] = Field(default_factory=dict)


class TrivecConnectorEventRequest(BaseModel):
    venue_id: str
    event_id: str = Field(min_length=2)
    event_type: str = Field(min_length=2)
    occurred_at: datetime | None = None
    terminal_id: str | None = None
    source_entity_id: str | None = None
    payload: dict[str, object] = Field(default_factory=dict)


class IntegrationSummaryBucket(BaseModel):
    key: str
    count: int


class IntegrationProviderPressureRead(BaseModel):
    provider: str
    total_events: int
    failure_like_count: int
    retryable_count: int
    overdue_retry_count: int
    stale_event_count: int
    latest_event_at: datetime | None = None


class IntegrationHealthSummaryRead(BaseModel):
    generated_at: datetime
    organization_id: str
    venue_id: str | None = None
    total_events: int
    retryable_event_count: int
    overdue_retry_count: int
    stale_event_count: int
    counts_by_status: list[IntegrationSummaryBucket] = Field(default_factory=list)
    counts_by_provider: list[IntegrationSummaryBucket] = Field(default_factory=list)
    provider_pressure: list[IntegrationProviderPressureRead] = Field(default_factory=list)
    latest_failure_events: list[IntegrationEventRead] = Field(default_factory=list)


class AuditEntryRead(BaseModel):
    id: str
    organization_id: str | None = None
    actor_user_id: str | None = None
    actor_name: str | None = None
    entity_type: str
    entity_id: str
    action: str
    payload: dict[str, object] = Field(default_factory=dict)
    created_at: datetime


class OrganizationExportSummaryRead(BaseModel):
    generated_at: datetime
    organization_id: str
    organization_name: str
    entity_counts: dict[str, int] = Field(default_factory=dict)
    includes_file_content: bool = False
    export_ready: bool = True
    notes: list[str] = Field(default_factory=list)


class OrganizationDeleteReadinessRead(BaseModel):
    generated_at: datetime
    organization_id: str
    organization_name: str
    entity_counts: dict[str, int] = Field(default_factory=dict)
    delete_supported: bool = False
    delete_ready: bool = False
    active_session_count: int = 0
    active_integration_event_count: int = 0
    blocking_conditions: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class OrganizationBackupReadinessRead(BaseModel):
    generated_at: datetime
    organization_id: str
    organization_name: str
    entity_counts: dict[str, int] = Field(default_factory=dict)
    automated_backup_supported: bool = False
    backup_ready: bool = False
    snapshot_export_ready: bool = False
    restore_supported: bool = False
    file_binary_backup_ready: bool = False
    file_asset_count: int = 0
    retryable_integration_event_count: int = 0
    upload_backend: str
    blocking_conditions: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class OrganizationExportBundleRead(BaseModel):
    generated_at: datetime
    organization_id: str
    organization_slug: str
    format_version: str
    entity_counts: dict[str, int] = Field(default_factory=dict)
    data: dict[str, object] = Field(default_factory=dict)


# ─── ECL (Execution Control Layer) schemas ───


class FollowUpCreateRequest(BaseModel):
    venue_id: str
    task_id: str
    assigned_to: str | None = None
    title: str = Field(min_length=1)
    due_at: datetime
    notes: str | None = None


class FollowUpRead(BaseModel):
    id: str
    venue_id: str
    task_id: str
    assigned_to: str | None
    created_by: str | None
    title: str
    status: FollowUpStatus
    due_at: datetime
    acknowledged_at: datetime | None
    completed_at: datetime | None
    escalated_at: datetime | None
    notes: str | None
    created_at: datetime
    is_overdue: bool = False


class FollowUpUpdateRequest(BaseModel):
    status: FollowUpStatus | None = None
    notes: str | None = None


class EscalationCreateRequest(BaseModel):
    venue_id: str
    follow_up_id: str | None = None
    task_id: str | None = None
    escalated_to: str | None = None
    severity: EscalationSeverity = EscalationSeverity.MEDIUM
    reason: str = Field(min_length=1)


class EscalationRead(BaseModel):
    id: str
    venue_id: str
    follow_up_id: str | None
    task_id: str | None
    created_by: str | None
    escalated_to: str | None
    severity: EscalationSeverity
    status: EscalationStatus
    reason: str
    resolved_at: datetime | None
    resolution_notes: str | None
    created_at: datetime


class EscalationResolveRequest(BaseModel):
    resolution_notes: str = Field(min_length=1)


class EvidenceCreateRequest(BaseModel):
    venue_id: str
    task_id: str | None = None
    follow_up_id: str | None = None
    title: str = Field(min_length=1)
    description: str | None = None
    evidence_type: str = "observation"
    file_asset_id: str | None = None


class EvidenceRead(BaseModel):
    id: str
    venue_id: str
    task_id: str | None
    follow_up_id: str | None
    created_by: str | None
    title: str
    description: str | None
    evidence_type: str
    file_asset_id: str | None
    created_at: datetime


class TaskCommentCreateRequest(BaseModel):
    venue_id: str
    body: str = Field(min_length=1)
    visibility: CommentVisibility = CommentVisibility.INTERNAL


class TaskCommentRead(BaseModel):
    id: str
    task_id: str
    venue_id: str
    author_user_id: str | None = None
    author_name: str | None = None
    body: str
    visibility: CommentVisibility
    created_at: datetime


class NextActionItem(BaseModel):
    action_type: str
    entity_id: str
    title: str
    priority: int
    context: str
    due_at: datetime | None = None
    venue_id: str
