from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Role(StrEnum):
    PLATFORM_ADMIN = "platform_admin"
    ORG_ADMIN = "org_admin"
    PORTFOLIO_DIRECTOR = "portfolio_director"
    VENUE_MANAGER = "venue_manager"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"
    EMPLOYEE = "employee"


class AuthRole(StrEnum):
    OWNER = "owner"
    MANAGER = "manager"
    BARISTA = "barista"
    DEVELOPER = "developer"


class VenueStatus(StrEnum):
    ACTIVE = "active"
    MONITORING = "monitoring"
    PAUSED = "paused"
    CRITICAL = "critical"
    ARCHIVED = "archived"


class VenueOntologyBindingStatus(StrEnum):
    ACTIVE = "active"
    INVALID = "invalid"
    ARCHIVED = "archived"


class ThreadScope(StrEnum):
    GLOBAL = "global"
    VENUE = "venue"
    TASK = "task"
    HELP_REQUEST = "help_request"


class CopilotThreadVisibility(StrEnum):
    SHARED = "shared"
    PRIVATE = "private"


class CopilotContextKind(StrEnum):
    PORTFOLIO = "portfolio"
    VENUE = "venue"
    ASSESSMENT = "assessment"
    PLAN = "plan"
    HELP_REQUEST = "help_request"
    REPORT = "report"
    GENERAL = "general"


class CopilotAuthorRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class FileAnalysisStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    FAILED = "failed"


class FileAnalysisKind(StrEnum):
    TEXT = "text"
    IMAGE = "image"
    PDF = "pdf"
    BINARY = "binary"


class TaskStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    ON_HOLD = "on_hold"
    DEFERRED = "deferred"


class PlanStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class PlanReviewStatus(StrEnum):
    NONE = "none"
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class EvidenceTrustLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ProgressEntryType(StrEnum):
    NOTE = "note"
    UPDATE = "update"
    MILESTONE = "milestone"
    RISK = "risk"
    DECISION = "decision"


class TaskDependencyKind(StrEnum):
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


class NotificationChannel(StrEnum):
    WEB_PUSH = "web_push"
    EMAIL = "email"
    IN_APP = "in_app"
    SMS = "sms"


class NotificationLevel(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class HelpRequestStatus(StrEnum):
    OPEN = "open"
    ANSWERED = "answered"
    CLOSED = "closed"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    region: Mapped[str] = mapped_column(String(64), default="europe")
    data_residency: Mapped[str] = mapped_column(String(64), default="eu-central")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"), nullable=True, index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True, index=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_organization_memberships_org_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role_claim: Mapped[AuthRole] = mapped_column(Enum(AuthRole))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    status: Mapped[VenueStatus] = mapped_column(Enum(VenueStatus), default=VenueStatus.ACTIVE)
    concept: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    capacity_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class VenueAccessAssignment(Base):
    __tablename__ = "venue_access_assignments"
    __table_args__ = (
        UniqueConstraint("venue_id", "user_id", name="uq_venue_access_assignments_venue_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class WorkspaceInvite(Base):
    __tablename__ = "workspace_invites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    invited_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    accepted_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role_claim: Mapped[AuthRole] = mapped_column(Enum(AuthRole))
    venue_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class VenueOntologyBinding(Base):
    __tablename__ = "venue_ontology_bindings"

    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), primary_key=True)
    ontology_id: Mapped[str] = mapped_column(String(128), index=True)
    ontology_version: Mapped[str] = mapped_column(String(64))
    binding_status: Mapped[VenueOntologyBindingStatus] = mapped_column(
        Enum(VenueOntologyBindingStatus),
        default=VenueOntologyBindingStatus.ACTIVE,
    )
    bound_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    bound_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment_type: Mapped[str] = mapped_column(String(64), default="full_diagnostic")
    triage_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    triage_intensity: Mapped[str | None] = mapped_column(String(16), nullable=True)
    assessment_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    selected_signal_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    signal_states: Mapped[dict] = mapped_column(JSON, default=dict)
    raw_input_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_intake_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    venue_context_json: Mapped[dict] = mapped_column(JSON, default=dict)
    ontology_id: Mapped[str] = mapped_column(String(128))
    ontology_version: Mapped[str] = mapped_column(String(64))
    core_canon_version: Mapped[str] = mapped_column(String(64))
    adapter_id: Mapped[str] = mapped_column(String(128))
    manifest_digest: Mapped[str] = mapped_column(String(64))
    management_hours_available: Mapped[float] = mapped_column(Float, default=8.0)
    weekly_effort_budget: Mapped[float] = mapped_column(Float, default=8.0)
    prior_assessment_id: Mapped[str | None] = mapped_column(ForeignKey("assessments.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EngineRun(Base):
    __tablename__ = "engine_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    assessment_id: Mapped[str] = mapped_column(ForeignKey("assessments.id"), index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    ontology_version: Mapped[str] = mapped_column(String(64))
    ontology_id: Mapped[str] = mapped_column(String(128))
    core_canon_version: Mapped[str] = mapped_column(String(64))
    adapter_id: Mapped[str] = mapped_column(String(128))
    manifest_digest: Mapped[str] = mapped_column(String(64))
    plan_load_classification: Mapped[str] = mapped_column(String(64))
    report_json: Mapped[dict] = mapped_column(JSON, default=dict)
    normalized_signals_json: Mapped[list[dict]] = mapped_column(JSON, default=list)
    diagnostic_snapshot_json: Mapped[dict] = mapped_column(JSON, default=dict)
    plan_snapshot_json: Mapped[dict] = mapped_column(JSON, default=dict)
    report_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ai_trace_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class OperationalPlan(Base):
    __tablename__ = "operational_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    engine_run_id: Mapped[str] = mapped_column(ForeignKey("engine_runs.id"), index=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    total_effort_hours: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[PlanStatus] = mapped_column(Enum(PlanStatus), default=PlanStatus.DRAFT)
    ontology_id: Mapped[str] = mapped_column(String(128))
    ontology_version: Mapped[str] = mapped_column(String(64))
    core_canon_version: Mapped[str] = mapped_column(String(64))
    adapter_id: Mapped[str] = mapped_column(String(128))
    manifest_digest: Mapped[str] = mapped_column(String(64))
    snapshot_json: Mapped[dict] = mapped_column(JSON, default=dict)
    review_status: Mapped[PlanReviewStatus] = mapped_column(Enum(PlanReviewStatus), default=PlanReviewStatus.NONE)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class PlanTask(Base):
    __tablename__ = "plan_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("operational_plans.id"), index=True)
    block_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.NOT_STARTED)
    order_index: Mapped[int] = mapped_column(default=0)
    effort_hours: Mapped[float] = mapped_column(Float, default=0.0)
    rationale: Mapped[str] = mapped_column(Text)
    dependencies: Mapped[list[str]] = mapped_column(JSON, default=list)
    trace: Mapped[dict] = mapped_column(JSON, default=dict)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assignee_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    assignee_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    layer: Mapped[str | None] = mapped_column(String(16), nullable=True)
    timeline_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_response_pattern_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_response_pattern_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    module_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sub_actions: Mapped[list[dict]] = mapped_column(JSON, default=list)
    deliverables: Mapped[list[dict]] = mapped_column(JSON, default=list)
    flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_required: Mapped[bool] = mapped_column(Boolean, default=False)
    verification: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ProgressEntry(Base):
    __tablename__ = "progress_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    entry_type: Mapped[ProgressEntryType] = mapped_column(Enum(ProgressEntryType), default=ProgressEntryType.UPDATE)
    summary: Mapped[str] = mapped_column(String(255))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[VenueStatus] = mapped_column(Enum(VenueStatus), default=VenueStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class HelpRequest(Base):
    __tablename__ = "help_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    requester_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(64), default="pocket")
    title: Mapped[str] = mapped_column(String(255))
    prompt: Mapped[str] = mapped_column(Text)
    status: Mapped[HelpRequestStatus] = mapped_column(Enum(HelpRequestStatus), default=HelpRequestStatus.OPEN)
    linked_thread_id: Mapped[str | None] = mapped_column(ForeignKey("copilot_threads.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CopilotThread(Base):
    __tablename__ = "copilot_threads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True)
    owner_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    scope: Mapped[ThreadScope] = mapped_column(Enum(ThreadScope), default=ThreadScope.VENUE)
    visibility: Mapped[CopilotThreadVisibility] = mapped_column(
        Enum(CopilotThreadVisibility),
        default=CopilotThreadVisibility.SHARED,
        index=True,
    )
    context_kind: Mapped[CopilotContextKind] = mapped_column(
        Enum(CopilotContextKind),
        default=CopilotContextKind.GENERAL,
        index=True,
    )
    context_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CopilotMessage(Base):
    __tablename__ = "copilot_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    thread_id: Mapped[str] = mapped_column(ForeignKey("copilot_threads.id"), index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    author_role: Mapped[CopilotAuthorRole] = mapped_column(Enum(CopilotAuthorRole))
    source_mode: Mapped[str] = mapped_column(String(64), default="manual_input")
    content: Mapped[str] = mapped_column(Text)
    references: Mapped[list[dict]] = mapped_column(JSON, default=list)
    attachments: Mapped[list[dict]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CopilotThreadParticipant(Base):
    __tablename__ = "copilot_thread_participants"
    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_copilot_thread_participants_thread_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    thread_id: Mapped[str] = mapped_column(ForeignKey("copilot_threads.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class CopilotActionRecord(Base):
    __tablename__ = "copilot_action_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("copilot_threads.id"), index=True)
    source_message_id: Mapped[str | None] = mapped_column(ForeignKey("copilot_messages.id"), nullable=True, index=True)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action_type: Mapped[str] = mapped_column(String(64), index=True)
    mode: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_artifact_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    target_artifact_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"), nullable=True, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_mode: Mapped[str] = mapped_column(String(64), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class FileAsset(Base):
    __tablename__ = "file_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    storage_backend: Mapped[str] = mapped_column(String(64), default="reference")
    ingest_mode: Mapped[str] = mapped_column(String(64), default="external_reference")
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class FileAssetAnalysis(Base):
    __tablename__ = "file_asset_analyses"
    __table_args__ = (
        UniqueConstraint("file_asset_id", name="uq_file_asset_analyses_file_asset"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    file_asset_id: Mapped[str] = mapped_column(ForeignKey("file_assets.id"), index=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[FileAnalysisStatus] = mapped_column(Enum(FileAnalysisStatus), default=FileAnalysisStatus.PENDING)
    analysis_kind: Mapped[FileAnalysisKind] = mapped_column(Enum(FileAnalysisKind), default=FileAnalysisKind.BINARY)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_facts: Mapped[dict] = mapped_column(JSON, default=dict)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    salient_quotes: Mapped[list[str]] = mapped_column(JSON, default=list)
    ai_provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_referenced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class FileAssetMemoryChunk(Base):
    __tablename__ = "file_asset_memory_chunks"
    __table_args__ = (
        UniqueConstraint("analysis_id", "chunk_index", name="uq_file_asset_memory_chunks_analysis_chunk"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    analysis_id: Mapped[str] = mapped_column(ForeignKey("file_asset_analyses.id"), index=True)
    file_asset_id: Mapped[str] = mapped_column(ForeignKey("file_assets.id"), index=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class IntegrationEvent(Base):
    __tablename__ = "integration_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    provider: Mapped[str] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(128))
    external_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    source_entity_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ingest_mode: Mapped[str] = mapped_column(String(64), default="manual_push")
    status: Mapped[str] = mapped_column(String(64), default="received", index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    normalized_signal_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    attempt_count: Mapped[int] = mapped_column(Integer, default=1)
    last_attempted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


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


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("plan_tasks.id"), index=True)
    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[FollowUpStatus] = mapped_column(Enum(FollowUpStatus), default=FollowUpStatus.PENDING)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    follow_up_id: Mapped[str | None] = mapped_column(ForeignKey("follow_ups.id"), nullable=True, index=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("plan_tasks.id"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    escalated_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    severity: Mapped[EscalationSeverity] = mapped_column(Enum(EscalationSeverity), default=EscalationSeverity.MEDIUM)
    status: Mapped[EscalationStatus] = mapped_column(Enum(EscalationStatus), default=EscalationStatus.OPEN)
    reason: Mapped[str] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("plan_tasks.id"), nullable=True, index=True)
    follow_up_id: Mapped[str | None] = mapped_column(ForeignKey("follow_ups.id"), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_type: Mapped[str] = mapped_column(String(64), default="observation")
    file_asset_id: Mapped[str | None] = mapped_column(ForeignKey("file_assets.id"), nullable=True)
    quality_score: Mapped[int] = mapped_column(Integer, default=50)
    trust_level: Mapped[EvidenceTrustLevel] = mapped_column(Enum(EvidenceTrustLevel), default=EvidenceTrustLevel.MEDIUM)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("operational_plans.id"), index=True)
    predecessor_task_id: Mapped[str] = mapped_column(ForeignKey("plan_tasks.id"), index=True)
    successor_task_id: Mapped[str] = mapped_column(ForeignKey("plan_tasks.id"), index=True)
    dependency_kind: Mapped[TaskDependencyKind] = mapped_column(
        Enum(TaskDependencyKind), default=TaskDependencyKind.FINISH_TO_START
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TaskEvent(Base):
    __tablename__ = "task_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("plan_tasks.id"), index=True)
    event_type: Mapped[TaskEventType] = mapped_column(Enum(TaskEventType))
    status: Mapped[TaskStatus | None] = mapped_column(Enum(TaskStatus), nullable=True)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id: Mapped[str] = mapped_column(ForeignKey("plan_tasks.id"), index=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    author_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    author_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    visibility: Mapped[CommentVisibility] = mapped_column(Enum(CommentVisibility), default=CommentVisibility.INTERNAL)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DeliverableProof(Base):
    __tablename__ = "deliverable_proofs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    task_id: Mapped[str | None] = mapped_column(ForeignKey("plan_tasks.id"), nullable=True, index=True)
    evidence_id: Mapped[str | None] = mapped_column(ForeignKey("evidence.id"), nullable=True, index=True)
    file_asset_id: Mapped[str | None] = mapped_column(ForeignKey("file_assets.id"), nullable=True)
    deliverable_name: Mapped[str] = mapped_column(String(255))
    proof_kind: Mapped[str] = mapped_column(String(64), default="evidence")
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KBReadingState(Base):
    """Per-user knowledge-base reading state (bookmarks, progress, notes)."""
    __tablename__ = "kb_reading_states"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    bookmarked_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    read_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    notes: Mapped[dict] = mapped_column(JSON, default=dict)
    struggles: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class SystemicFlag(Base):
    """Flags a signal or pattern as systemically significant."""
    __tablename__ = "systemic_flags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    signal_id: Mapped[str] = mapped_column(String(64), index=True)
    signal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    flagged_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class NotificationEvent(Base):
    __tablename__ = "notification_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"), nullable=True, index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel))
    level: Mapped[NotificationLevel] = mapped_column(Enum(NotificationLevel), default=NotificationLevel.INFO)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    entity_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    organization_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(128))
    entity_id: Mapped[str] = mapped_column(String(128), index=True)
    action: Mapped[str] = mapped_column(String(128))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
