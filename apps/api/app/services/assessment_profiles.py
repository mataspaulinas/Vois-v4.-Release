from __future__ import annotations

from dataclasses import dataclass


VALID_TRIAGE_INTENSITIES = {"focused", "balanced", "thorough"}


@dataclass(frozen=True)
class AssessmentRuntimeProfile:
    key: str
    label: str
    plan_title: str
    default_triage_enabled: bool
    default_triage_intensity: str | None
    triage_locked: bool = False


_ASSESSMENT_PROFILES: dict[str, AssessmentRuntimeProfile] = {
    "full_diagnostic": AssessmentRuntimeProfile(
        key="full_diagnostic",
        label="Full Diagnostic",
        plan_title="Operational reset plan",
        default_triage_enabled=False,
        default_triage_intensity="balanced",
    ),
    "follow_up": AssessmentRuntimeProfile(
        key="follow_up",
        label="Follow-up",
        plan_title="Follow-up correction plan",
        default_triage_enabled=True,
        default_triage_intensity="focused",
    ),
    "incident": AssessmentRuntimeProfile(
        key="incident",
        label="Incident",
        plan_title="Incident response plan",
        default_triage_enabled=True,
        default_triage_intensity="focused",
        triage_locked=True,
    ),
    "preopening_gate": AssessmentRuntimeProfile(
        key="preopening_gate",
        label="Pre-opening Gate",
        plan_title="Opening readiness plan",
        default_triage_enabled=False,
        default_triage_intensity=None,
        triage_locked=True,
    ),
    "weekly_pulse": AssessmentRuntimeProfile(
        key="weekly_pulse",
        label="Weekly Pulse",
        plan_title="Weekly pulse action plan",
        default_triage_enabled=True,
        default_triage_intensity="focused",
    ),
}

_ASSESSMENT_TYPE_ALIASES = {
    "follow-up": "follow_up",
    "pre-opening_gate": "preopening_gate",
    "pre-opening-gate": "preopening_gate",
    "pre_opening_gate": "preopening_gate",
    "weekly-pulse": "weekly_pulse",
}


def canonical_assessment_type(value: str | None) -> str:
    raw_value = (value or "full_diagnostic").strip().lower()
    if raw_value in _ASSESSMENT_TYPE_ALIASES:
        return _ASSESSMENT_TYPE_ALIASES[raw_value]
    normalized = raw_value.replace("-", "_").replace(" ", "_")
    return normalized if normalized in _ASSESSMENT_PROFILES else "full_diagnostic"


def assessment_profile_for(value: str | None) -> AssessmentRuntimeProfile:
    return _ASSESSMENT_PROFILES[canonical_assessment_type(value)]


def normalize_assessment_triage(
    assessment_type: str | None,
    triage_enabled: bool | None,
    triage_intensity: str | None,
) -> tuple[bool, str | None]:
    profile = assessment_profile_for(assessment_type)
    if profile.triage_locked:
        return profile.default_triage_enabled, profile.default_triage_intensity

    normalized_enabled = profile.default_triage_enabled if triage_enabled is None else bool(triage_enabled)
    if triage_intensity in VALID_TRIAGE_INTENSITIES:
        normalized_intensity = triage_intensity
    else:
        normalized_intensity = profile.default_triage_intensity

    if not normalized_enabled and normalized_intensity is None:
        normalized_intensity = profile.default_triage_intensity

    return normalized_enabled, normalized_intensity
