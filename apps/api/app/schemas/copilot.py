from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.domain import (
    CopilotAuthorRole,
    CopilotContextKind,
    CopilotThreadVisibility,
    ThreadScope,
)

CopilotRenderMode = Literal[
    "conversation",
    "reasoning_summary",
    "known_missing_risks",
    "recommended_next_move",
    "draft_artifact",
    "compare_insight",
    "apply_ready_suggestion",
]

CopilotActionMode = Literal["save", "suggest", "draft", "apply"]
CopilotActionType = Literal[
    "save_note",
    "apply_to_assessment",
    "create_diagnosis_note",
    "create_plan_suggestion",
    "create_task_suggestion",
    "create_escalation_draft",
    "create_follow_up_list",
    "save_compare_insight",
]


class CopilotReference(BaseModel):
    type: str
    label: str
    id: str | None = None
    payload: dict[str, object] | None = None


class CopilotAttachment(BaseModel):
    file_asset_id: str | None = None
    file_name: str
    content_type: str | None = None
    url: str | None = None
    content_base64: str | None = None


class CopilotProvenanceRead(BaseModel):
    kind: Literal["direct_evidence", "inferred_context", "recalled_memory"]
    label: str
    detail: str | None = None


class CopilotMessageRead(BaseModel):
    id: str
    thread_id: str
    created_by: str | None = None
    author_role: CopilotAuthorRole
    source_mode: str
    content: str
    references: list[CopilotReference] = Field(default_factory=list)
    attachments: list[CopilotAttachment] = Field(default_factory=list)
    render_mode: CopilotRenderMode = "conversation"
    provenance: list[CopilotProvenanceRead] = Field(default_factory=list)
    action_intents: list[CopilotActionType] = Field(default_factory=list)
    created_at: datetime


class CopilotThreadParticipantStateRead(BaseModel):
    user_id: str
    last_read_at: datetime | None = None
    joined_at: datetime


class CopilotThreadSummary(BaseModel):
    id: str
    organization_id: str
    venue_id: str | None = None
    owner_user_id: str | None = None
    title: str
    scope: ThreadScope
    visibility: CopilotThreadVisibility
    context_kind: CopilotContextKind
    context_id: str | None = None
    pinned: bool = False
    kind_label: str
    thread_type: str
    context_label: str
    linked_artifact_type: str | None = None
    linked_artifact_id: str | None = None
    last_message_preview: str | None = None
    archived: bool
    archived_at: datetime | None = None
    deleted_at: datetime | None = None
    message_count: int = 0
    unread_count: int = 0
    applied_action_count: int = 0
    latest_applied_action_at: datetime | None = None
    related_thread_reason: str | None = None
    latest_message_at: datetime | None = None
    last_activity_at: datetime | None = None
    created_at: datetime


class CopilotThreadDetail(CopilotThreadSummary):
    messages: list[CopilotMessageRead] = Field(default_factory=list)
    participant_state: CopilotThreadParticipantStateRead | None = None


class CopilotThreadCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    visibility: Literal["shared", "private"] = "shared"
    venue_id: str | None = None
    scope: Literal["global", "venue", "task", "help_request"] = "venue"
    context_kind: Literal["portfolio", "venue", "assessment", "plan", "help_request", "report", "general"] = "general"
    context_id: str | None = None
    initial_message: str | None = None


class CopilotThreadUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    pinned: bool | None = None
    archived: bool | None = None


class CopilotThreadBranchRequest(BaseModel):
    message_id: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    visibility: Literal["shared", "private"] | None = None


class CopilotPlanSuggestionCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    rationale: str = Field(min_length=1)
    message_id: str | None = None


class CopilotThreadContextReference(BaseModel):
    type: str
    id: str | None = None
    label: str
    payload: dict[str, object] = Field(default_factory=dict)


class CopilotThreadContextRead(BaseModel):
    thread_id: str
    visibility: CopilotThreadVisibility
    memory_scope: str
    memory_scope_label: str
    context_label: str
    provenance_summary: list[CopilotProvenanceRead] = Field(default_factory=list)
    context_references: list[CopilotThreadContextReference] = Field(default_factory=list)
    related_threads: list[CopilotThreadSummary] = Field(default_factory=list)
    files: list[CopilotThreadContextReference] = Field(default_factory=list)


class CopilotActionRecordRead(BaseModel):
    id: str
    thread_id: str
    source_message_id: str | None = None
    action_type: CopilotActionType
    mode: CopilotActionMode
    title: str
    summary: str | None = None
    target_artifact_type: str | None = None
    target_artifact_id: str | None = None
    actor_user_id: str | None = None
    actor_name: str | None = None
    created_at: datetime
    payload: dict[str, object] = Field(default_factory=dict)


class CopilotAssessmentSignalMutation(BaseModel):
    signal_id: str
    notes: str | None = None
    confidence: str | None = None


class CopilotActionPreviewRequest(BaseModel):
    action_type: CopilotActionType
    message_id: str | None = None
    task_id: str | None = None
    severity: str | None = None
    due_at: datetime | None = None
    signal_additions: list[CopilotAssessmentSignalMutation] = Field(default_factory=list)
    signal_removals: list[str] = Field(default_factory=list)


class CopilotActionPreviewRead(BaseModel):
    action_type: CopilotActionType
    mode: CopilotActionMode
    source_message_id: str | None = None
    title: str
    summary: str
    target_artifact_type: str | None = None
    fields: dict[str, object] = Field(default_factory=dict)
    required_permissions: list[str] = Field(default_factory=list)
    side_effect_summary: list[str] = Field(default_factory=list)
    warning: str | None = None


class CopilotActionCommitRead(BaseModel):
    action: CopilotActionRecordRead
    receipt_title: str
    receipt_summary: str
    target_artifact_type: str | None = None
    target_artifact_id: str | None = None
    payload: dict[str, object] = Field(default_factory=dict)


class CopilotSearchHit(BaseModel):
    type: str
    id: str
    thread_id: str | None = None
    title: str
    excerpt: str | None = None
    context_label: str | None = None
    visibility: CopilotThreadVisibility | None = None
    archived: bool = False
    created_at: datetime | None = None
    payload: dict[str, object] = Field(default_factory=dict)


class CopilotSearchResponse(BaseModel):
    query: str
    threads: list[CopilotSearchHit] = Field(default_factory=list)
    messages: list[CopilotSearchHit] = Field(default_factory=list)
    files: list[CopilotSearchHit] = Field(default_factory=list)
    context_objects: list[CopilotSearchHit] = Field(default_factory=list)


class CopilotMessageCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    created_by: str | None = None
    attachments: list[CopilotAttachment] = Field(default_factory=list)
    quoted_message_id: str | None = None
