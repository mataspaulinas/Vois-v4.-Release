from pydantic import BaseModel, Field


class IntakePreviewRequest(BaseModel):
    raw_text: str = Field(min_length=1)
    venue_id: str
    assessment_type: str = "full_diagnostic"


class IntakeSignalMatch(BaseModel):
    signal_id: str
    signal_name: str
    confidence: str
    score: float
    evidence_snippet: str
    match_reasons: list[str] = Field(default_factory=list)


class QuantitativeEvidence(BaseModel):
    label: str
    value: str
    evidence_snippet: str


class VenueContextSnapshot(BaseModel):
    venue_name: str | None = None
    venue_type: str | None = None
    team_size_note: str | None = None
    stage: str | None = None


class IntakePreviewResponse(BaseModel):
    ontology_id: str
    ontology_version: str
    detected_signals: list[IntakeSignalMatch]
    unmapped_observations: list[str] = Field(default_factory=list)
    provider: str | None = None
    model: str | None = None
    prompt_version: str | None = None
    quantitative_evidence: list[QuantitativeEvidence] = Field(default_factory=list)
    venue_context: VenueContextSnapshot = Field(default_factory=VenueContextSnapshot)
