from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Vertical(StrEnum):
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    HOSPITALITY = "hospitality"


class VenueStatus(StrEnum):
    ACTIVE = "active"
    MONITORING = "monitoring"
    PAUSED = "paused"
    CRITICAL = "critical"
    ARCHIVED = "archived"


class AssessmentKind(StrEnum):
    FULL_DIAGNOSTIC = "full_diagnostic"
    FOLLOW_UP = "follow-up"
    WEEKLY_PULSE = "weekly_pulse"
    PREOPENING = "preopening"
    MANUAL_COMPOSITE = "manual_composite"


class ConfidenceBand(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PlanStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class TaskStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    ON_HOLD = "on_hold"
    DEFERRED = "deferred"


class DependencyKind(StrEnum):
    FINISH_TO_START = "finish_to_start"
    SOFT_PREREQUISITE = "soft_prerequisite"
    PARALLEL_SUPPORT = "parallel_support"


class TaskEventType(StrEnum):
    STATUS_CHANGED = "status_changed"
    COMMENT_ADDED = "comment_added"
    DELIVERABLE_CHECKED = "deliverable_checked"
    SUB_ACTION_CHECKED = "sub_action_checked"
    FOLLOW_UP_CREATED = "follow_up_created"
    ESCALATED = "escalated"
    NOTE_CAPTURED = "note_captured"


class CommentVisibility(StrEnum):
    INTERNAL = "internal"
    SHARED = "shared"
    OWNER = "owner"


class ProgressEntryType(StrEnum):
    NOTE = "note"
    UPDATE = "update"
    MILESTONE = "milestone"
    RISK = "risk"
    DECISION = "decision"


class ObservationType(StrEnum):
    AUDIT_NOTE = "audit_note"
    CUSTOMER_FEEDBACK = "customer_feedback"
    STAFF_FEEDBACK = "staff_feedback"
    CONSULTANT_OBSERVATION = "consultant_observation"
    OPERATIONAL_INCIDENT = "operational_incident"


class HelpRequestStatus(StrEnum):
    OPEN = "open"
    ANSWERED = "answered"
    CLOSED = "closed"


class FollowUpStatus(StrEnum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    ESCALATED = "escalated"


class EscalationSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationStatus(StrEnum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class NotificationChannel(StrEnum):
    WEB_PUSH = "web_push"
    EMAIL = "email"
    IN_APP = "in_app"
    SMS = "sms"


class NotificationLevel(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ThreadScope(StrEnum):
    GLOBAL = "global"
    VENUE = "venue"
    TASK = "task"
    HELP_REQUEST = "help_request"


class MessageAuthorRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class KnowledgeEntityKind(StrEnum):
    SIGNAL = "signal"
    FAILURE_MODE = "failure_mode"
    RESPONSE_PATTERN = "response_pattern"
    BLOCK = "block"
    TOOL = "tool"
    HELP_ARTICLE = "help_article"
    REFERENCE = "reference"


class ReportKind(StrEnum):
    DIAGNOSTIC = "diagnostic"
    AI = "ai"
    EXECUTION = "execution"


class AIFunction(StrEnum):
    SIGNAL_INTAKE = "signal_intake"
    REPORT_GENERATION = "report_generation"
    VENUE_COPILOT = "venue_copilot"
    PORTFOLIO_COPILOT = "portfolio_copilot"
    PROACTIVE_GREETING = "proactive_greeting"
    SIGNAL_UPDATE_SUGGESTION = "signal_update_suggestion"


class AIContextSource(StrEnum):
    RAW_TEXT_INPUT = "raw_text_input"
    SIGNAL_LIBRARY = "signal_library"
    ONTOLOGY = "ontology"
    VENUE_STATE = "venue_state"
    THREAD_HISTORY = "thread_history"
    FILE_UPLOADS = "file_uploads"
    PLAN_STATE = "plan_state"
    EXECUTION_HISTORY = "execution_history"


class OrganizationContract(ContractModel):
    id: str
    name: str
    slug: str
    data_residency: str


class WorkspaceContract(ContractModel):
    id: str
    organization_id: str
    name: str
    slug: str
    vertical: Vertical
    venue_ids: list[str] = Field(default_factory=list)


class VenueContextContract(ContractModel):
    venue_name: str | None = None
    venue_type: str | None = None
    team_size: int | None = None
    location: str | None = None
    stage: str | None = None
    concept: str | None = None


class VenueProjectContract(ContractModel):
    id: str
    organization_id: str | None = None
    slug: str
    name: str
    vertical: Vertical = Vertical.CAFE
    status: VenueStatus = VenueStatus.ACTIVE
    stage: str | None = None
    concept: str | None = None
    location: str | None = None
    team_size: int | None = None
    capacity_profile: dict[str, str] = Field(default_factory=dict)
    workflow_stage: str | None = None
    health_state: str | None = None
    owner_user_id: str | None = None
    primary_consultant_user_id: str | None = None
    next_review_at: date | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AssessmentSignalState(ContractModel):
    active: bool = True
    notes: str | None = None
    confidence: ConfidenceBand | None = None
    value: str | None = None


class AssessmentDraftContract(ContractModel):
    id: str | None = None
    venue_id: str
    assessment_type: AssessmentKind
    assessment_date: str | None = None
    created_by: str | None = None
    notes: str | None = None
    selected_signal_ids: list[str] = Field(default_factory=list)
    signal_states: dict[str, AssessmentSignalState] = Field(default_factory=dict)
    raw_input_text: str | None = None
    ontology_version: str | None = None
    management_hours_available: float = Field(default=8.0, ge=0)
    weekly_effort_budget: float = Field(default=8.0, ge=0)
    venue_context: VenueContextContract | None = None
    created_at: datetime | None = None


class AssessmentRunRequestContract(ContractModel):
    venue_id: str
    assessment_type: AssessmentKind
    assessment_date: str | None = None
    created_by: str | None = None
    notes: str | None = None
    selected_signal_ids: list[str] = Field(default_factory=list)
    signal_states: dict[str, AssessmentSignalState] = Field(default_factory=dict)
    raw_input_text: str | None = None
    ontology_version: str | None = None
    management_hours_available: float = Field(default=8.0, ge=0)
    weekly_effort_budget: float = Field(default=8.0, ge=0)
    venue_context: VenueContextContract | None = None
    triage_enabled: bool = False
    triage_intensity: str = "balanced"


class SignalContract(ContractModel):
    signal_id: str
    signal_name: str | None = None
    domain_id: str | None = None
    severity: str | None = None
    timestamp: str | None = None
    source_type: str | None = None
    venue_id: str | None = None
    notes: str | None = None
    description: str | None = None
    value: str | None = None
    score: float | None = None
    evidence_snippet: str | None = None
    match_reasons: list[str] = Field(default_factory=list)


class FailureModeContract(ContractModel):
    failure_mode_id: str
    title: str
    description: str
    severity: str
    score: float
    domain_id: str | None = None
    module_id: str | None = None
    signal_ids: list[str] = Field(default_factory=list)


class ResponsePatternTriggerContract(ContractModel):
    failure_mode_id: str
    fm_title: str
    fm_score: float
    link_priority: str


class ResponsePatternContract(ContractModel):
    response_pattern_id: str
    rp_name: str
    domain: str | None = None
    severity: str | None = None
    priority_score: float
    description: str | None = None
    triggering_fms: list[ResponsePatternTriggerContract] = Field(default_factory=list)
    l1_focus: str | None = None
    l2_focus: str | None = None
    l3_focus: str | None = None


class BlockActivationLevelsContract(ContractModel):
    L1: list[str] = Field(default_factory=list)
    L2: list[str] = Field(default_factory=list)
    L3: list[str] = Field(default_factory=list)


class BlockActivationContract(ContractModel):
    response_pattern_id: str
    rp_name: str
    priority_score: float | None = None
    activated_items: BlockActivationLevelsContract


class TaskDependencyContract(ContractModel):
    predecessor_task_id: str
    successor_task_id: str
    dependency_kind: DependencyKind = DependencyKind.FINISH_TO_START
    note: str | None = None


class TaskCommentContract(ContractModel):
    id: str
    task_id: str
    venue_id: str
    author_user_id: str | None = None
    author_name: str | None = None
    body: str
    visibility: CommentVisibility = CommentVisibility.INTERNAL
    created_at: datetime


class TaskEventContract(ContractModel):
    id: str
    task_id: str
    event_type: TaskEventType
    status: TaskStatus | None = None
    actor_user_id: str | None = None
    actor_name: str | None = None
    note: str | None = None
    created_at: datetime


class SubActionContract(ContractModel):
    id: str | None = None
    text: str
    completed: bool = False
    completed_at: datetime | None = None


class DeliverableItemContract(ContractModel):
    name: str
    completed: bool = False
    completed_at: datetime | None = None


class DeliverableProofContract(ContractModel):
    id: str
    task_id: str | None = None
    deliverable_name: str
    proof_kind: str
    file_asset_id: str | None = None
    source_url: str | None = None
    note: str | None = None
    created_at: datetime
    verified_at: datetime | None = None


class TaskContract(ContractModel):
    id: str
    block_id: str
    title: str
    status: TaskStatus = TaskStatus.NOT_STARTED
    order_index: int | None = None
    layer: str | None = None
    timeline_label: str | None = None
    priority: str | None = None
    effort_hours: float | None = None
    rationale: str | None = None
    description: str | None = None
    notes: str | None = None
    source_response_pattern_id: str | None = None
    source_response_pattern_name: str | None = None
    module_id: str | None = None
    dependency_ids: list[str] = Field(default_factory=list)
    depends_on_modules: list[str] = Field(default_factory=list)
    trace: dict[str, Any] = Field(default_factory=dict)
    sub_actions: list[SubActionContract] = Field(default_factory=list)
    deliverables: list[DeliverableItemContract] = Field(default_factory=list)
    comments: list[TaskCommentContract] = Field(default_factory=list)
    events: list[TaskEventContract] = Field(default_factory=list)
    assigned_to: str | None = None
    assignee_user_id: str | None = None
    assignee_name: str | None = None
    due_at: date | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    updated_at: datetime | None = None
    updated_by: str | None = None
    review_required: bool | None = None
    verification: str | None = None
    expected_output: str | None = None
    flags: list[str] = Field(default_factory=list)


class GeneratedPlanTaskContract(ContractModel):
    task_id: str
    item_id: str
    item_type: str
    title: str
    source_rp: str | None = None
    rp_name: str | None = None
    module_id: str | None = None
    timeline: str | None = None
    priority: str | None = None
    description: str | None = None
    depends_on_modules: list[str] = Field(default_factory=list)
    trace: dict[str, Any] = Field(default_factory=dict)


class GeneratedPlanContract(ContractModel):
    L1_tasks: list[GeneratedPlanTaskContract] = Field(default_factory=list)
    L2_tasks: list[GeneratedPlanTaskContract] = Field(default_factory=list)
    L3_tasks: list[GeneratedPlanTaskContract] = Field(default_factory=list)


class PlanContract(ContractModel):
    id: str
    venue_id: str
    engine_run_id: str | None = None
    title: str
    summary: str
    total_effort_hours: float | None = None
    status: PlanStatus = PlanStatus.DRAFT
    load_classification: str | None = None
    source_assessment: str | None = None
    version: int | None = None
    previous_versions: list[str] = Field(default_factory=list)
    owner_user_id: str | None = None
    reviewer_user_id: str | None = None
    approval_requested_at: datetime | None = None
    approved_at: datetime | None = None
    approved_by_user_id: str | None = None
    confidence: dict[str, Any] = Field(default_factory=dict)
    strengths: list[str] = Field(default_factory=list)
    summary_snapshot: dict[str, Any] = Field(default_factory=dict)
    dependency_notes: list[str] = Field(default_factory=list)
    tasks: list[TaskContract] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ReportContract(ContractModel):
    id: str | None = None
    engine_run_id: str | None = None
    venue_id: str
    report_kind: ReportKind
    report_type: str
    summary: str | None = None
    markdown: str
    diagnostic_spine: list[str] = Field(default_factory=list)
    investigation_threads: list[str] = Field(default_factory=list)
    verification_briefs: list[str] = Field(default_factory=list)
    created_at: datetime | None = None


class DiagnosticResultContract(ContractModel):
    engine_run_id: str | None = None
    assessment_id: str | None = None
    venue_id: str
    ontology_version: str | None = None
    load_classification: str | None = None
    normalized_signals: list[SignalContract] = Field(default_factory=list)
    failure_modes: list[FailureModeContract] = Field(default_factory=list)
    response_patterns: list[ResponsePatternContract] = Field(default_factory=list)
    block_activations: list[BlockActivationContract] = Field(default_factory=list)
    constrained_block_activations: list[BlockActivationContract] = Field(default_factory=list)
    constraint_report: dict[str, Any] = Field(default_factory=dict)
    generated_plan: GeneratedPlanContract | None = None
    plan: PlanContract | None = None
    report: ReportContract | None = None


class ProgressEntryContract(ContractModel):
    id: str
    venue_id: str
    created_by: str | None = None
    entry_type: ProgressEntryType
    summary: str
    detail: str | None = None
    status: VenueStatus = VenueStatus.ACTIVE
    created_at: datetime


class ObservationContract(ContractModel):
    id: str
    venue_id: str
    related_task_id: str | None = None
    author_user_id: str | None = None
    observation_type: ObservationType
    title: str
    detail: str
    source: str
    created_at: datetime
    evidence_file_asset_id: str | None = None


class HelpRequestContract(ContractModel):
    id: str
    venue_id: str
    requester_user_id: str | None = None
    channel: str
    title: str
    prompt: str
    status: HelpRequestStatus = HelpRequestStatus.OPEN
    linked_thread_id: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class FollowUpContract(ContractModel):
    id: str
    venue_id: str
    task_id: str
    assigned_to: str | None = None
    created_by: str | None = None
    title: str
    status: FollowUpStatus = FollowUpStatus.PENDING
    due_at: datetime
    acknowledged_at: datetime | None = None
    completed_at: datetime | None = None
    escalated_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
    is_overdue: bool = False


class EscalationContract(ContractModel):
    id: str
    venue_id: str
    follow_up_id: str | None = None
    task_id: str | None = None
    created_by: str | None = None
    escalated_to: str | None = None
    severity: EscalationSeverity = EscalationSeverity.MEDIUM
    status: EscalationStatus = EscalationStatus.OPEN
    reason: str
    resolution_notes: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class NotificationSubscriptionContract(ContractModel):
    endpoint: str
    p256dh_key: str
    auth_key: str
    user_id: str | None = None
    channel: NotificationChannel = NotificationChannel.WEB_PUSH
    created_at: datetime | None = None


class NotificationEventContract(ContractModel):
    id: str
    organization_id: str | None = None
    venue_id: str | None = None
    user_id: str
    channel: NotificationChannel
    level: NotificationLevel
    title: str
    body: str
    entity_type: str | None = None
    entity_id: str | None = None
    sent_at: datetime | None = None
    read_at: datetime | None = None
    acknowledged_at: datetime | None = None


class ChatReferenceContract(ContractModel):
    type: str
    label: str
    id: str | None = None
    payload: dict[str, Any] | None = None


class ChatAttachmentContract(ContractModel):
    file_asset_id: str | None = None
    file_name: str
    content_type: str | None = None
    url: str | None = None
    content_base64: str | None = None


class ChatMessageContract(ContractModel):
    id: str
    thread_id: str
    created_by: str | None = None
    author_role: MessageAuthorRole
    source_mode: str
    content: str
    references: list[ChatReferenceContract] = Field(default_factory=list)
    attachments: list[ChatAttachmentContract] = Field(default_factory=list)
    created_at: datetime


class ChatThreadContract(ContractModel):
    id: str
    organization_id: str | None = None
    venue_id: str | None = None
    title: str
    scope: ThreadScope
    archived: bool = False
    message_count: int = 0
    latest_message_at: datetime | None = None
    created_at: datetime
    messages: list[ChatMessageContract] = Field(default_factory=list)


class KnowledgeReferenceContract(ContractModel):
    id: str
    entity_kind: KnowledgeEntityKind
    title: str
    description: str | None = None
    source_ref: str | None = None
    linked_entity_ids: list[str] = Field(default_factory=list)
    uri: str | None = None
    updated_at: datetime | None = None


class AITraceContract(ContractModel):
    function: AIFunction
    provider: str
    model: str
    prompt_version: str
    invoked_at: datetime
    organization_id: str | None = None
    venue_id: str | None = None
    thread_id: str | None = None
    ontology_version: str | None = None
    context_sources: list[AIContextSource] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    confidence: ConfidenceBand | None = None
    mutation_summary: dict[str, Any] = Field(default_factory=dict)
    user_confirmation_required: bool = False
    user_confirmation_status: str | None = None


class AIIntakeSnapshotContract(ContractModel):
    raw_input_text: str
    raw_input_length: int | None = None
    extraction_summary: dict[str, Any] = Field(default_factory=dict)
    confidence_distribution: dict[str, int] = Field(default_factory=dict)
    unmapped_observations: list[dict[str, Any]] = Field(default_factory=list)
    active_signal_ids: list[str] = Field(default_factory=list)
    venue_context: VenueContextContract | None = None
    provider: str | None = None
    model: str | None = None
    prompt_version: str | None = None


class TaskMutationRequestContract(ContractModel):
    status: TaskStatus | None = None
    notes: str | None = None
    sub_action_completions: list[bool] | None = None
    deliverable_completions: list[bool] | None = None


class CommentCreateRequestContract(ContractModel):
    task_id: str
    venue_id: str
    body: str = Field(min_length=1)
    visibility: CommentVisibility = CommentVisibility.INTERNAL


class ProgressCreateRequestContract(ContractModel):
    venue_id: str
    entry_type: ProgressEntryType
    summary: str = Field(min_length=1)
    detail: str | None = None
    status: VenueStatus = VenueStatus.ACTIVE


class FollowUpCreateRequestContract(ContractModel):
    venue_id: str
    task_id: str
    assigned_to: str | None = None
    title: str = Field(min_length=1)
    due_at: datetime
    notes: str | None = None


class EscalationCreateRequestContract(ContractModel):
    venue_id: str
    follow_up_id: str | None = None
    task_id: str | None = None
    escalated_to: str | None = None
    severity: EscalationSeverity = EscalationSeverity.MEDIUM
    reason: str = Field(min_length=1)


class ChatMessageCreateRequestContract(ContractModel):
    content: str = Field(min_length=1)
    created_by: str | None = None
    attachments: list[ChatAttachmentContract] = Field(default_factory=list)


CONTRACT_MODELS = [
    OrganizationContract,
    WorkspaceContract,
    VenueContextContract,
    VenueProjectContract,
    AssessmentSignalState,
    AssessmentDraftContract,
    AssessmentRunRequestContract,
    SignalContract,
    FailureModeContract,
    ResponsePatternTriggerContract,
    ResponsePatternContract,
    BlockActivationLevelsContract,
    BlockActivationContract,
    TaskDependencyContract,
    TaskCommentContract,
    TaskEventContract,
    SubActionContract,
    DeliverableItemContract,
    DeliverableProofContract,
    TaskContract,
    GeneratedPlanTaskContract,
    GeneratedPlanContract,
    PlanContract,
    ReportContract,
    DiagnosticResultContract,
    ProgressEntryContract,
    ObservationContract,
    HelpRequestContract,
    FollowUpContract,
    EscalationContract,
    NotificationSubscriptionContract,
    NotificationEventContract,
    ChatReferenceContract,
    ChatAttachmentContract,
    ChatMessageContract,
    ChatThreadContract,
    KnowledgeReferenceContract,
    AITraceContract,
    AIIntakeSnapshotContract,
    TaskMutationRequestContract,
    CommentCreateRequestContract,
    ProgressCreateRequestContract,
    FollowUpCreateRequestContract,
    EscalationCreateRequestContract,
    ChatMessageCreateRequestContract,
]


CONTRACT_GLOSSARY = {
    "OrganizationContract": "Tenant-level organization owning workspaces, venues, users, and data-residency policy.",
    "WorkspaceContract": "Migration seam for a portfolio or workspace container grouping venue/project records inside one organization.",
    "VenueContextContract": "Runtime venue context passed into intake and engine runs.",
    "VenueProjectContract": "Canonical venue or project record carrying lifecycle, ownership, and operational context.",
    "AssessmentSignalState": "Manual or AI-suggested state of a single signal inside an assessment draft or run request.",
    "AssessmentDraftContract": "Persisted assessment snapshot before or after a run, including raw text and selected signals.",
    "AssessmentRunRequestContract": "Validated request payload for running the engine from saved assessment state or fresh intake.",
    "SignalContract": "Normalized signal or intake-detected signal with evidence and severity metadata.",
    "FailureModeContract": "Activated failure mode with score and contributing signal ids.",
    "ResponsePatternTriggerContract": "Link between a response pattern and the failure mode that triggered it.",
    "ResponsePatternContract": "Activated response pattern with priority and L1/L2/L3 guidance.",
    "BlockActivationLevelsContract": "Activated block ids grouped by execution layer.",
    "BlockActivationContract": "Response-pattern-to-block activation contract used by diagnostic outputs.",
    "TaskDependencyContract": "Explicit dependency edge between two tasks rather than an implicit string list.",
    "TaskCommentContract": "Human commentary attached to a task; intentionally distinct from progress, observations, and escalations.",
    "TaskEventContract": "Immutable task event log such as status changes, follow-up creation, or escalation.",
    "SubActionContract": "Checklist item nested under a task.",
    "DeliverableItemContract": "Deliverable status record nested under a task.",
    "DeliverableProofContract": "Proof artifact or evidence that a deliverable was completed or verified.",
    "TaskContract": "Operational plan task with execution state, nested checklist items, deliverables, comments, and events.",
    "GeneratedPlanTaskContract": "Legacy engine-generated task before persistence flattening or execution-state enrichment.",
    "GeneratedPlanContract": "Legacy engine-generated plan grouped by L1/L2/L3 layers; intentionally distinct from persisted plans.",
    "PlanContract": "Operational plan returned by the engine or persisted for execution work.",
    "ReportContract": "Frozen report artifact; intentionally distinct from comments, help requests, and progress entries.",
    "DiagnosticResultContract": "Complete engine response including signals, modes, patterns, activations, plan, and report.",
    "ProgressEntryContract": "Progress feed entry; intentionally keeps entry_type so milestone, note, and update are not flattened.",
    "ObservationContract": "Observed fact or field note from audit, staff, customer, or consultant input.",
    "HelpRequestContract": "Explicit request for help or explanation; intentionally distinct from general chat and task comments.",
    "FollowUpContract": "Execution-control reminder tied to a task with overdue and escalation semantics.",
    "EscalationContract": "Higher-severity execution control object used when a follow-up or task requires intervention.",
    "NotificationSubscriptionContract": "Request payload for registering a delivery endpoint such as web push.",
    "NotificationEventContract": "User-facing notification event with delivery and acknowledgement timestamps.",
    "ChatReferenceContract": "Structured reference embedded in a chat message.",
    "ChatAttachmentContract": "Attachment metadata embedded in a chat message create/read payload.",
    "ChatMessageContract": "Copilot or user message in a thread.",
    "ChatThreadContract": "Copilot thread summary/detail payload including messages.",
    "KnowledgeReferenceContract": "KB or ontology reference entity used by chat, reports, and guided workflows.",
    "AITraceContract": "Auditable record of an AI invocation including model, prompt version, and evidence refs.",
    "AIIntakeSnapshotContract": "Frozen AI-assisted intake snapshot including unmapped observations and extraction coverage notes.",
    "TaskMutationRequestContract": "Validated request payload for task status and checklist mutation.",
    "CommentCreateRequestContract": "Validated request payload for adding a task comment.",
    "ProgressCreateRequestContract": "Validated request payload for adding a typed progress entry.",
    "FollowUpCreateRequestContract": "Validated request payload for creating a follow-up reminder.",
    "EscalationCreateRequestContract": "Validated request payload for opening an escalation.",
    "ChatMessageCreateRequestContract": "Validated request payload for posting a chat message with attachments.",
}
