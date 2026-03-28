from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class AIFunction(StrEnum):
    SIGNAL_INTAKE = "signal_intake"
    VENUE_COPILOT = "venue_copilot"
    PORTFOLIO_COPILOT = "portfolio_copilot"
    PROACTIVE_GREETING = "proactive_greeting"
    REPORT_GENERATION = "report_generation"
    SIGNAL_UPDATE_SUGGESTION = "signal_update_suggestion"
    ONTOLOGY_EVOLUTION = "ontology_evolution"


class AIRiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AIOutputMode(StrEnum):
    STRUCTURED_JSON = "structured_json"
    NARRATIVE_MARKDOWN = "narrative_markdown"
    CONVERSATIONAL = "conversational"
    JSON_EMBEDDED_MARKDOWN = "json_embedded_markdown"


class AIContextSource(StrEnum):
    RAW_TEXT_INPUT = "raw_text_input"
    SIGNAL_LIBRARY = "signal_library"
    ONTOLOGY = "ontology"
    VENUE_STATE = "venue_state"
    PORTFOLIO_STATE = "portfolio_state"
    BLOCK_LIBRARY = "block_library"
    TOOL_LIBRARY = "tool_library"
    KNOWLEDGE_BASE = "knowledge_base"
    THREAD_HISTORY = "thread_history"
    FILE_UPLOADS = "file_uploads"
    SIGNAL_STATE = "signal_state"
    PLAN_STATE = "plan_state"
    EXECUTION_HISTORY = "execution_history"
    OUTCOME_HISTORY = "outcome_history"


class AIConfidenceBand(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AIFunctionContract(BaseModel):
    function: AIFunction
    purpose: str
    risk_level: AIRiskLevel
    output_mode: AIOutputMode
    context_sources: list[AIContextSource] = Field(default_factory=list)
    allows_state_mutation: bool = False
    requires_user_confirmation: bool = True
    requires_structured_output: bool = False
    must_carry_evidence: bool = True
    must_be_audited: bool = True
    system_prompt_version: str
    allowed_actions: list[str] = Field(default_factory=list)
    prohibited_actions: list[str] = Field(default_factory=list)


class AIInvocationAudit(BaseModel):
    function: AIFunction
    provider: str
    model: str
    prompt_version: str
    invoked_at: datetime
    organization_id: str | None = None
    venue_id: str | None = None
    thread_id: str | None = None
    ontology_version: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    confidence: AIConfidenceBand | None = None
    mutation_summary: dict[str, object] = Field(default_factory=dict)
    user_confirmation_required: bool = False
    user_confirmation_status: str | None = None


class AIAttachment(BaseModel):
    file_name: str
    content_type: str | None = None
    url: str | None = None


class AIReference(BaseModel):
    type: str
    label: str
    id: str | None = None
    payload: dict[str, object] | None = None


class AISignalUpdateItem(BaseModel):
    signal_id: str
    signal_name: str | None = None
    notes: str
    confidence: AIConfidenceBand = AIConfidenceBand.MEDIUM


class AISignalUpdateSuggestion(BaseModel):
    add: list[AISignalUpdateItem] = Field(default_factory=list)
    remove: list[str] = Field(default_factory=list)


class ProactiveGreetingRequest(BaseModel):
    venue_id: str | None = None


class ProactiveGreetingResponse(BaseModel):
    function: AIFunction = AIFunction.PROACTIVE_GREETING
    provider: str
    model: str
    prompt_version: str
    content: str
    references: list[AIReference] = Field(default_factory=list)


class EnhancedReportResponse(BaseModel):
    function: AIFunction = AIFunction.REPORT_GENERATION
    engine_run_id: str
    provider: str
    model: str
    prompt_version: str
    markdown: str
    references: list[AIReference] = Field(default_factory=list)
