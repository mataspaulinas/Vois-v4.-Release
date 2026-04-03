from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.ai_contracts import get_ai_contract_registry
from app.core.config import get_settings
from app.models.domain import (
    Assessment,
    AuthRole,
    CopilotContextKind,
    CopilotMessage,
    CopilotThread,
    EngineRun,
    OperationalPlan,
    PlanStatus,
    PlanTask,
    ProgressEntry,
    ThreadScope,
    Venue,
)
from app.schemas.ai import (
    AIConfidenceBand,
    AIFunction,
    AIReference,
    AISignalUpdateItem,
    AISignalUpdateSuggestion,
    EnhancedReportResponse,
    ProactiveGreetingResponse,
)
from app.schemas.copilot import CopilotAttachment
from app.schemas.intake import IntakePreviewResponse, QuantitativeEvidence, VenueContextSnapshot
from app.services.file_analysis import (
    build_file_memory_context,
    file_memory_prompt_context,
    file_memory_references,
)
from app.services.file_assets import CopilotAttachmentBrief, build_copilot_attachment_briefs
from app.services.intake import IntakeService
from app.services.ontology_bindings import resolve_venue_mount
from app.services.ontology import OntologyRepository, get_ontology_repository
from app.services.plans import execution_summary_for_plan
from app.services.portfolio import build_portfolio_summary


_SIGNAL_INTAKE_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "detected_signals": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "signal_id": {"type": "string"},
                    "evidence_snippet": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "score": {"type": "number"},
                    "match_reasons": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["signal_id", "evidence_snippet", "confidence", "score", "match_reasons"],
            },
        },
        "unmapped_observations": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["detected_signals", "unmapped_observations"],
}

_SIGNAL_UPDATE_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "add": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "signal_id": {"type": "string"},
                    "notes": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": ["signal_id", "notes", "confidence"],
            },
        },
        "remove": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["add", "remove"],
}


_SIGNAL_INTAKE_ASSESSMENT_CONTEXT = {
    "full_diagnostic": (
        "Full Diagnostic",
        "Use broad venue-wide scope. Surface the full operating picture rather than narrowing too early.",
    ),
    "follow_up": (
        "Follow-up",
        "Compare against previously surfaced issues. Emphasize improvement, regression, unresolved friction, and new concerns.",
    ),
    "incident": (
        "Incident",
        "Stay tightly focused on the incident. Trace the root-cause chain and the most relevant triggered signals rather than scanning broadly.",
    ),
    "preopening_gate": (
        "Pre-opening Gate",
        "Assess readiness and blockers with a pass/fail posture. Highlight risks that would make opening unsafe or premature.",
    ),
    "weekly_pulse": (
        "Weekly Pulse",
        "Stay lean and current. Surface only the most relevant status signals, trends, incidents, wins, and watch-items from the week.",
    ),
}


def _signal_intake_assessment_context(assessment_type: str | None) -> tuple[str, str]:
    key = (assessment_type or "full_diagnostic").strip().lower()
    return _SIGNAL_INTAKE_ASSESSMENT_CONTEXT.get(key, _SIGNAL_INTAKE_ASSESSMENT_CONTEXT["full_diagnostic"])


class AIRuntimePolicyError(RuntimeError):
    pass


@dataclass
class CopilotTurnResult:
    function: AIFunction
    provider: str
    model: str
    prompt_version: str
    source_mode: str
    content: str
    references: list[dict[str, object]] = field(default_factory=list)


class AIProvider(Protocol):
    provider_name: str
    model_name: str

    def signal_intake(
        self,
        *,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse: ...

    def proactive_greeting(
        self,
        *,
        db: Session,
        organization_id: str,
        venue_id: str | None = None,
    ) -> ProactiveGreetingResponse: ...

    def enhance_report(self, *, db: Session, engine_run_id: str) -> EnhancedReportResponse: ...

    def copilot_turn(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
        attachments: list[CopilotAttachment] | None = None,
    ) -> CopilotTurnResult: ...


class OpenAIResponsesClient(Protocol):
    def create(self, **kwargs: Any) -> Any: ...


class OpenAIClient(Protocol):
    responses: OpenAIResponsesClient


class MockAIProvider:
    def __init__(self, repository: OntologyRepository, *, provider_name: str = "mock", model_name: str | None = None):
        self.repository = repository
        self.provider_name = provider_name
        self.model_name = model_name or get_settings().ai_mock_model
        self.contracts = get_ai_contract_registry()
        self.intake_service = IntakeService(repository)

    def signal_intake(
        self,
        *,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse:
        contract = self.contracts[AIFunction.SIGNAL_INTAKE]
        preview = self.intake_service.preview(
            raw_text=raw_text,
            ontology_id=ontology_id,
            version=version,
            assessment_type=assessment_type,
        )
        preview.provider = self.provider_name
        preview.model = self.model_name
        preview.prompt_version = contract.system_prompt_version
        preview.quantitative_evidence = _extract_quantitative_evidence(raw_text)
        preview.venue_context = _extract_venue_context(raw_text, ontology_id=ontology_id)
        return preview

    def proactive_greeting(
        self,
        *,
        db: Session,
        organization_id: str,
        venue_id: str | None = None,
    ) -> ProactiveGreetingResponse:
        contract = self.contracts[AIFunction.PROACTIVE_GREETING]
        summary = build_portfolio_summary(db, organization_id)
        pulse = next((item for item in summary.venue_pulses if item.venue_id == venue_id), None) if venue_id else None
        hour = datetime.now().hour
        tone = "morning" if hour < 12 else "afternoon" if hour < 18 else "evening"

        if pulse is not None:
            if tone == "morning":
                content = f"Morning. {pulse.venue_name} is first up for attention: {pulse.next_step_label}"
            elif tone == "afternoon":
                content = f"{pulse.venue_name} still looks like the pressure point. {pulse.next_step_label}"
            else:
                content = f"{pulse.venue_name} is the venue I would keep an eye on before you wind down. {pulse.next_step_label}"
            references = [AIReference(type="venue", label=pulse.venue_name, id=pulse.venue_id)]
        elif summary.resume_venue_id is not None and summary.resume_reason is not None:
            resume_name = next(
                (item.venue_name for item in summary.venue_pulses if item.venue_id == summary.resume_venue_id),
                "the portfolio",
            )
            if tone == "morning":
                content = f"Morning. {resume_name} is where I would start: {summary.resume_reason}"
            elif tone == "afternoon":
                content = f"Quick pulse: {resume_name} still deserves the next look. {summary.resume_reason}"
            else:
                content = f"Before the day closes, {resume_name} is still the sharpest thread to pull. {summary.resume_reason}"
            references = [AIReference(type="venue", label=resume_name, id=summary.resume_venue_id)]
        else:
            content = "The portfolio is quiet enough to review quality, not just chase movement."
            references = []

        return ProactiveGreetingResponse(
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            content=content,
            references=references,
        )

    def enhance_report(self, *, db: Session, engine_run_id: str) -> EnhancedReportResponse:
        contract = self.contracts[AIFunction.REPORT_GENERATION]
        engine_run = db.get(EngineRun, engine_run_id)
        if engine_run is None:
            raise LookupError("Engine run not found")

        venue = db.get(Venue, engine_run.venue_id)
        assessment = db.get(Assessment, engine_run.assessment_id)
        plan = db.scalar(select(OperationalPlan).where(OperationalPlan.engine_run_id == engine_run.id))
        report_json = engine_run.report_json or {}
        signal_names = _signal_names_for_assessment(self.repository, assessment)
        key_tasks = _plan_task_titles(db, plan.id)[:3] if plan else []

        markdown = "\n".join(
            [
                f"# {venue.name if venue else 'Venue'} Diagnostic Narrative",
                "",
                f"## Readout",
                report_json.get("summary", "No deterministic report summary is available."),
                "",
                "## Diagnostic spine",
                *[f"- {line}" for line in report_json.get("diagnostic_spine", [])],
                "",
                "## Signal surface",
                f"- Active signals: {', '.join(signal_names) if signal_names else 'No active signals persisted.'}",
                f"- Load classification: {engine_run.plan_load_classification}",
                "",
                "## Likely leverage points",
                *([f"- {task}" for task in key_tasks] if key_tasks else ["- Run the plan builder so leverage points become explicit."]),
                "",
                "## Verification brief",
                *[f"- {line}" for line in report_json.get("verification_briefs", [])],
            ]
        )

        references = [
            AIReference(type="engine_run", label="Persisted engine run", id=engine_run.id),
        ]
        if venue is not None:
            references.append(AIReference(type="venue", label=venue.name, id=venue.id))
        if plan is not None:
            references.append(AIReference(type="plan", label=plan.title, id=plan.id))

        return EnhancedReportResponse(
            engine_run_id=engine_run.id,
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            markdown=markdown,
            references=references,
        )

    def copilot_turn(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
        attachments: list[CopilotAttachment] | None = None,
    ) -> CopilotTurnResult:
        function = AIFunction.PORTFOLIO_COPILOT if thread.scope == ThreadScope.GLOBAL else AIFunction.VENUE_COPILOT
        contract = self.contracts[function]

        if thread.scope == ThreadScope.GLOBAL:
            content, references = _compose_portfolio_reply(db, thread, prompt, self.repository)
        else:
            content, references = _compose_venue_reply(db, thread, prompt, self.repository)

        attachment_briefs = build_copilot_attachment_briefs(
            db,
            organization_id=thread.organization_id,
            attachments=attachments or [],
        )
        if attachment_briefs:
            references.extend(_attachment_references(attachment_briefs))
        recalled_file_memory, file_memory_refs = _build_file_memory_recall(
            db,
            thread=thread,
            prompt=prompt,
            attachments=attachment_briefs,
        )
        if file_memory_refs:
            references.extend(file_memory_refs)

        if thread.scope == ThreadScope.VENUE:
            suggestion = _build_signal_update_suggestion(
                db,
                thread,
                _signal_update_context(prompt, attachment_briefs, recalled_file_memory),
                self.repository,
            )
            if suggestion is not None and (suggestion.add or suggestion.remove):
                additions = len(suggestion.add)
                removals = len(suggestion.remove)
                content = "\n\n".join(
                    [
                        content,
                        (
                            f"Potential signal update: {additions} addition(s), {removals} removal(s). "
                            "Review before applying."
                        ),
                    ]
                )
                references.append(
                    {
                        "type": "signal_update",
                        "label": f"{additions} add / {removals} remove",
                        "payload": suggestion.model_dump(mode="json"),
                    }
                )

        attachment_note = _attachment_grounding_note(attachment_briefs)
        if attachment_note:
            content = "\n\n".join([content, attachment_note])
        if recalled_file_memory:
            content = "\n\n".join([content, f"Recalled file memory:\n{recalled_file_memory}"])

        return CopilotTurnResult(
            function=function,
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            source_mode="mock_ai_v1",
            content=content,
            references=references,
        )


class OpenAIProvider:
    def __init__(
        self,
        repository: OntologyRepository,
        *,
        model_name: str | None = None,
        client: OpenAIClient | None = None,
    ):
        self.repository = repository
        self.settings = get_settings()
        self.provider_name = "openai"
        self.model_name = model_name or self.settings.ai_model
        self.client = client or _build_openai_client(self.settings)
        self.contracts = get_ai_contract_registry()

    def signal_intake(
        self,
        *,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse:
        contract = self.contracts[AIFunction.SIGNAL_INTAKE]
        bundle = self.repository.load_bundle_for_identity(ontology_id, version)
        signal_lookup = {signal.id: signal for signal in bundle.signals}
        assessment_type_label, assessment_type_guidance = _signal_intake_assessment_context(assessment_type)
        signal_library = "\n".join(
            f"- {signal.id} | {signal.name} | {signal.module} | {signal.description}"
            for signal in bundle.signals
        )
        payload = self._create_json_response(
            schema_name="signal_intake",
            schema=_SIGNAL_INTAKE_JSON_SCHEMA,
            instructions=(
                "You are VOIS AI intake. Convert messy operational evidence into signal suggestions using only the "
                "provided signal catalog. Every detected signal must cite an exact evidence snippet from the input. "
                "Never invent signal IDs. Use varied confidence; if everything is high, you are being lazy. "
                "Put unmatched but important facts into unmapped_observations. Match the breadth and emphasis of the "
                "analysis to the assessment type guidance."
            ),
            input_payload=(
                f"Ontology: {ontology_id}\n"
                f"Ontology version: {bundle.meta.version}\n\n"
                f"Assessment type: {assessment_type_label}\n"
                f"Assessment type guidance: {assessment_type_guidance}\n\n"
                f"Signal catalog:\n{signal_library}\n\n"
                f"Raw observations:\n{raw_text}"
            ),
            metadata={
                "function": AIFunction.SIGNAL_INTAKE.value,
                "ontology_id": ontology_id,
                "ontology_version": bundle.meta.version,
                "assessment_type": assessment_type_label,
            },
            max_output_tokens=2200,
        )

        deduped: dict[str, dict[str, object]] = {}
        for item in payload.get("detected_signals", []):
            signal_id = str(item.get("signal_id", "")).strip()
            if signal_id not in signal_lookup:
                continue
            score = _normalize_score(item.get("score", 0.0))
            existing = deduped.get(signal_id)
            if existing is None or score > _normalize_score(existing.get("score", 0.0)):
                deduped[signal_id] = {
                    "signal_id": signal_id,
                    "signal_name": signal_lookup[signal_id].name,
                    "confidence": _coerce_confidence(item.get("confidence")),
                    "score": score,
                    "evidence_snippet": str(item.get("evidence_snippet", "")).strip() or signal_lookup[signal_id].description,
                    "match_reasons": [str(reason).strip() for reason in item.get("match_reasons", []) if str(reason).strip()],
                }

        detected_signals = [
            item
            for item in sorted(deduped.values(), key=lambda match: match["score"], reverse=True)
            if item["score"] > 0
        ]

        return IntakePreviewResponse(
            ontology_id=ontology_id,
            ontology_version=bundle.meta.version,
            detected_signals=detected_signals,
            unmapped_observations=[
                str(observation).strip()
                for observation in payload.get("unmapped_observations", [])
                if str(observation).strip()
            ][:8],
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            quantitative_evidence=_extract_quantitative_evidence(raw_text),
            venue_context=_extract_venue_context(raw_text, ontology_id=ontology_id),
        )

    def proactive_greeting(
        self,
        *,
        db: Session,
        organization_id: str,
        venue_id: str | None = None,
    ) -> ProactiveGreetingResponse:
        contract = self.contracts[AIFunction.PROACTIVE_GREETING]
        fallback = MockAIProvider(
            self.repository,
            provider_name=self.provider_name,
            model_name=self.model_name,
        ).proactive_greeting(db=db, organization_id=organization_id, venue_id=venue_id)
        summary = build_portfolio_summary(db, organization_id)
        tone = "morning" if datetime.now().hour < 12 else "afternoon" if datetime.now().hour < 18 else "evening"
        lines = [
            f"Tone: {tone}",
            f"Portfolio venue count: {len(summary.venue_pulses)}",
            f"Resume reason: {summary.resume_reason or 'none'}",
        ]
        for pulse in summary.venue_pulses[:4]:
            lines.append(
                f"- {pulse.venue_name}: {pulse.completion_percentage:.0f}% complete, "
                f"{pulse.ready_task_count} ready, {pulse.blocked_task_count} blocked, next step {pulse.next_step_label}"
            )

        content = self._create_text_response(
            instructions=(
                "This legacy function returns a short factual status line only. Return 1-2 plain sentences. "
                "Do not coach, flatter, or adopt a companion tone. Do not ask questions. State only what the "
                "portfolio evidence supports."
            ),
            input_payload="\n".join(lines),
            metadata={
                "function": AIFunction.PROACTIVE_GREETING.value,
                "organization_id": organization_id,
                "venue_id": venue_id or "",
            },
            fallback_text=fallback.content,
            max_output_tokens=140,
            verbosity="low",
        )

        return ProactiveGreetingResponse(
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            content=content,
            references=fallback.references,
        )

    def enhance_report(self, *, db: Session, engine_run_id: str) -> EnhancedReportResponse:
        contract = self.contracts[AIFunction.REPORT_GENERATION]
        fallback = MockAIProvider(
            self.repository,
            provider_name=self.provider_name,
            model_name=self.model_name,
        ).enhance_report(db=db, engine_run_id=engine_run_id)
        content = self._create_text_response(
            instructions=(
                "You are VOIS report generation. Write concise markdown grounded only in the supplied deterministic "
                "report scaffold. Do not alter causal claims, selected interventions, or scores. Improve clarity, "
                "group findings cleanly, and keep the chain explainable."
            ),
            input_payload=fallback.markdown,
            metadata={
                "function": AIFunction.REPORT_GENERATION.value,
                "engine_run_id": engine_run_id,
            },
            fallback_text=fallback.markdown,
            max_output_tokens=900,
            verbosity="medium",
        )

        return EnhancedReportResponse(
            engine_run_id=engine_run_id,
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            markdown=content,
            references=fallback.references,
        )

    def copilot_turn(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
        attachments: list[CopilotAttachment] | None = None,
    ) -> CopilotTurnResult:
        function = AIFunction.PORTFOLIO_COPILOT if thread.scope == ThreadScope.GLOBAL else AIFunction.VENUE_COPILOT
        contract = self.contracts[function]

        if thread.scope == ThreadScope.GLOBAL:
            scaffold, references = _compose_portfolio_reply(db, thread, prompt, self.repository)
        else:
            scaffold, references = _compose_venue_reply(db, thread, prompt, self.repository)

        attachment_briefs = build_copilot_attachment_briefs(
            db,
            organization_id=thread.organization_id,
            attachments=attachments or [],
        )
        if attachment_briefs:
            references.extend(_attachment_references(attachment_briefs))
        recalled_file_memory, file_memory_refs = _build_file_memory_recall(
            db,
            thread=thread,
            prompt=prompt,
            attachments=attachment_briefs,
        )
        if file_memory_refs:
            references.extend(file_memory_refs)

        input_sections = [
            f"User prompt:\n{prompt}",
            f"Grounded scaffold:\n{scaffold}",
            f"Recent thread history:\n{_thread_history_excerpt(db, thread.id)}",
        ]
        attachment_excerpt = _attachment_excerpt(attachment_briefs)
        if attachment_excerpt:
            input_sections.append(f"Attachments:\n{attachment_excerpt}")
        if recalled_file_memory:
            input_sections.append(f"Recalled file memory:\n{recalled_file_memory}")
        copilot_input = _build_openai_copilot_input("\n\n".join(input_sections), attachment_briefs)

        content = self._create_text_response(
            instructions=(
                "You are VOIS. Work like an operating analyst inside the current workspace. Use only the "
                "deterministic scaffold, thread history, attachments, recalled file memory, and explicit references "
                "provided here. Do not be proactive. Do not flatter. Do not coach. Do not claim hidden knowledge. "
                "If recent thread history conflicts with the current grounded scaffold, trust the grounded scaffold and "
                "correct the stale assumption explicitly. If the scaffold quotes saved assessment evidence, treat that "
                "evidence as current workspace input. "
                "Lead with the answer, then the evidence, then the next step if one is clear. If the evidence is weak "
                "or missing, say so plainly. Keep the tone concise, direct, and professional. When attachments are "
                "present, explicitly cite the visible or quoted evidence you used."
            ),
            input_payload=copilot_input,
            metadata={
                "function": function.value,
                "thread_id": thread.id,
                "venue_id": thread.venue_id or "",
            },
            fallback_text=scaffold,
            max_output_tokens=520,
            verbosity="medium",
        )

        if thread.scope == ThreadScope.VENUE:
            suggestion = self._generate_signal_update_suggestion(
                db=db,
                thread=thread,
                prompt=_signal_update_context(prompt, attachment_briefs, recalled_file_memory),
            )
            if suggestion is not None and (suggestion.add or suggestion.remove):
                additions = len(suggestion.add)
                removals = len(suggestion.remove)
                content = "\n\n".join(
                    [
                        content,
                        f"Potential signal update: {additions} addition(s), {removals} removal(s). Review before applying.",
                    ]
                )
                references.append(
                    {
                        "type": "signal_update",
                        "label": f"{additions} add / {removals} remove",
                        "payload": suggestion.model_dump(mode="json"),
                    }
                )

        return CopilotTurnResult(
            function=function,
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            source_mode="openai_live_v1",
            content=content,
            references=references,
        )

    def _generate_signal_update_suggestion(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
    ) -> AISignalUpdateSuggestion | None:
        if not thread.venue_id:
            return None

        latest_assessment = db.scalar(
            select(Assessment)
            .where(Assessment.venue_id == thread.venue_id)
            .order_by(Assessment.created_at.desc())
        )
        if latest_assessment is None:
            return None

        mount = resolve_venue_mount(db, thread.venue_id, self.repository, allow_invalid=True, require_runtime=False)
        bundle = self.repository.load_bundle_for_identity(mount.ontology_id, mount.version, allow_invalid=True)
        signal_lookup = {signal.id: signal for signal in bundle.signals}
        current_signal_ids = set(latest_assessment.selected_signal_ids)
        signal_catalog = "\n".join(
            f"- {signal.id} | {signal.name} | {signal.description}"
            for signal in bundle.signals
        )

        try:
            payload = self._create_json_response(
                schema_name="signal_update_suggestion",
                schema=_SIGNAL_UPDATE_JSON_SCHEMA,
                instructions=(
                    "Propose only signal updates that are clearly supported by the latest user message. "
                    "Use only provided signal IDs. Prefer no-op over weak inference. Remove signals only when the "
                    "message clearly indicates they are resolved or no longer present."
                ),
                input_payload=(
                    f"Current signal ids: {', '.join(sorted(current_signal_ids)) or 'none'}\n\n"
                    f"Signal catalog:\n{signal_catalog}\n\n"
                    f"Latest user message:\n{prompt}"
                ),
                metadata={
                    "function": AIFunction.SIGNAL_UPDATE_SUGGESTION.value,
                    "thread_id": thread.id,
                    "venue_id": thread.venue_id,
                },
                max_output_tokens=500,
            )
        except AIRuntimePolicyError:
            return _build_signal_update_suggestion(db, thread, prompt, self.repository)

        additions = [
            AISignalUpdateItem(
                signal_id=signal_id,
                signal_name=signal_lookup[signal_id].name,
                notes=str(item.get("notes", "")).strip() or signal_lookup[signal_id].description,
                confidence=_coerce_confidence(item.get("confidence")),
            )
            for item in payload.get("add", [])
            if (signal_id := str(item.get("signal_id", "")).strip()) in signal_lookup and signal_id not in current_signal_ids
        ]
        removals = sorted(
            signal_id
            for signal_id in {
                str(signal_id).strip()
                for signal_id in payload.get("remove", [])
                if str(signal_id).strip() in current_signal_ids
            }
        )
        if not additions and not removals:
            return None
        return AISignalUpdateSuggestion(add=additions, remove=removals)

    def _create_json_response(
        self,
        *,
        schema_name: str,
        schema: dict[str, object],
        instructions: str,
        input_payload: Any,
        metadata: dict[str, object],
        max_output_tokens: int,
    ) -> dict[str, object]:
        response = self._invoke_response(
            instructions=instructions,
            input_payload=input_payload,
            metadata=metadata,
            max_output_tokens=max_output_tokens,
            text_config={
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "schema": schema,
                    "strict": True,
                },
                "verbosity": "low",
            },
        )
        output_text = (getattr(response, "output_text", "") or "").strip()
        if not output_text:
            raise AIRuntimePolicyError(f"OpenAI {schema_name} invocation returned no structured output.")
        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise AIRuntimePolicyError(f"OpenAI {schema_name} invocation returned invalid JSON.") from exc
        if not isinstance(parsed, dict):
            raise AIRuntimePolicyError(f"OpenAI {schema_name} invocation returned a non-object payload.")
        return parsed

    def _create_text_response(
        self,
        *,
        instructions: str,
        input_payload: Any,
        metadata: dict[str, object],
        fallback_text: str,
        max_output_tokens: int,
        verbosity: str,
    ) -> str:
        response = self._invoke_response(
            instructions=instructions,
            input_payload=input_payload,
            metadata=metadata,
            max_output_tokens=max_output_tokens,
            text_config={"format": {"type": "text"}, "verbosity": verbosity},
        )
        output_text = (getattr(response, "output_text", "") or "").strip()
        return output_text or fallback_text

    def _invoke_response(
        self,
        *,
        instructions: str,
        input_payload: Any,
        metadata: dict[str, object],
        max_output_tokens: int,
        text_config: dict[str, object],
    ) -> Any:
        try:
            return self.client.responses.create(
                model=self.model_name,
                instructions=instructions,
                input=input_payload,
                text=text_config,
                metadata=_stringify_metadata(metadata),
                max_output_tokens=max_output_tokens,
                store=False,
            )
        except Exception as exc:  # pragma: no cover - network/provider error surface
            raise AIRuntimePolicyError(f"OpenAI runtime invocation failed: {exc}") from exc


class AnthropicProvider:
    def __init__(
        self,
        repository: OntologyRepository,
        *,
        model_name: str | None = None,
        client: Any | None = None,
    ):
        self.repository = repository
        self.settings = get_settings()
        self.provider_name = "anthropic"
        self.model_name = model_name or self.settings.ai_model
        self.client = client or _build_anthropic_client(self.settings)
        self.contracts = get_ai_contract_registry()

    def signal_intake(
        self,
        *,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse:
        contract = self.contracts[AIFunction.SIGNAL_INTAKE]
        bundle = self.repository.load_bundle_for_identity(ontology_id, version)
        signal_lookup = {signal.id: signal for signal in bundle.signals}
        assessment_type_label, assessment_type_guidance = _signal_intake_assessment_context(assessment_type)
        signal_library = "\n".join(
            f"- {signal.id} | {signal.name} | {signal.module} | {signal.description}"
            for signal in bundle.signals
        )
        payload = self._create_json_response(
            instructions=(
                "You are VOIS AI intake. Convert messy operational evidence into signal suggestions using only the "
                "provided signal catalog. Every detected signal must cite an exact evidence snippet from the input. "
                "Never invent signal IDs. Use varied confidence; if everything is high, you are being lazy. "
                "Put unmatched but important facts into unmapped_observations. Match the scope and emphasis to the "
                "assessment type guidance.\n\n"
                "IMPORTANT: Return a JSON object with exactly this structure:\n"
                '{"detected_signals": [{"signal_id": "sig_...", "evidence_snippet": "...", "confidence": "low|medium|high", "score": 0.0-1.0, "match_reasons": ["..."]}], "unmapped_observations": ["..."]}'
            ),
            input_payload=(
                f"Ontology: {ontology_id}\n"
                f"Ontology version: {bundle.meta.version}\n\n"
                f"Assessment type: {assessment_type_label}\n"
                f"Assessment type guidance: {assessment_type_guidance}\n\n"
                f"Signal catalog:\n{signal_library}\n\n"
                f"Raw observations:\n{raw_text}"
            ),
            json_schema=_SIGNAL_INTAKE_JSON_SCHEMA,
            max_output_tokens=2200,
        )

        import logging as _logging
        _intake_log = _logging.getLogger("app.ai.intake")
        # Normalize: Claude may return "signal_ids" (list of strings) or "detected_signals" (list of objects)
        raw_signals = payload.get("detected_signals", [])
        if not raw_signals and "signal_ids" in payload:
            # Claude returned simple ID list — wrap into expected format
            raw_signals = [
                {"signal_id": sid, "confidence": "medium", "score": 0.7, "evidence_snippet": "", "match_reasons": []}
                for sid in payload["signal_ids"]
                if isinstance(sid, str)
            ]

        deduped: dict[str, dict[str, object]] = {}
        for item in raw_signals:
            signal_id = str(item.get("signal_id", "")).strip()
            if signal_id not in signal_lookup:
                _intake_log.warning("Signal ID '%s' NOT in ontology lookup (%d signals available)", signal_id, len(signal_lookup))
                continue
            score = _normalize_score(item.get("score", 0.0))
            existing = deduped.get(signal_id)
            if existing is None or score > _normalize_score(existing.get("score", 0.0)):
                deduped[signal_id] = {
                    "signal_id": signal_id,
                    "signal_name": signal_lookup[signal_id].name,
                    "confidence": _coerce_confidence(item.get("confidence")),
                    "score": score,
                    "evidence_snippet": str(item.get("evidence_snippet", "")).strip() or signal_lookup[signal_id].description,
                    "match_reasons": [str(reason).strip() for reason in item.get("match_reasons", []) if str(reason).strip()],
                }

        detected_signals = [
            item
            for item in sorted(deduped.values(), key=lambda match: match["score"], reverse=True)
            if item["score"] > 0
        ]

        return IntakePreviewResponse(
            ontology_id=ontology_id,
            ontology_version=bundle.meta.version,
            detected_signals=detected_signals,
            unmapped_observations=[
                str(observation).strip()
                for observation in payload.get("unmapped_observations", [])
                if str(observation).strip()
            ][:8],
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            quantitative_evidence=_extract_quantitative_evidence(raw_text),
            venue_context=_extract_venue_context(raw_text, ontology_id=ontology_id),
        )

    def proactive_greeting(
        self,
        *,
        db: Session,
        organization_id: str,
        venue_id: str | None = None,
    ) -> ProactiveGreetingResponse:
        contract = self.contracts[AIFunction.PROACTIVE_GREETING]
        fallback = MockAIProvider(
            self.repository,
            provider_name=self.provider_name,
            model_name=self.model_name,
        ).proactive_greeting(db=db, organization_id=organization_id, venue_id=venue_id)
        summary = build_portfolio_summary(db, organization_id)
        tone = "morning" if datetime.now().hour < 12 else "afternoon" if datetime.now().hour < 18 else "evening"
        lines = [
            f"Tone: {tone}",
            f"Portfolio venue count: {len(summary.venue_pulses)}",
            f"Resume reason: {summary.resume_reason or 'none'}",
        ]
        for pulse in summary.venue_pulses[:4]:
            lines.append(
                f"- {pulse.venue_name}: {pulse.completion_percentage:.0f}% complete, "
                f"{pulse.ready_task_count} ready, {pulse.blocked_task_count} blocked, next step {pulse.next_step_label}"
            )

        content = self._create_text_response(
            instructions=(
                "This legacy function returns a short factual status line only. Return 1-2 plain sentences. "
                "Do not coach, flatter, or adopt a companion tone. Do not ask questions. State only what the "
                "portfolio evidence supports."
            ),
            input_payload="\n".join(lines),
            fallback_text=fallback.content,
            max_output_tokens=140,
        )

        return ProactiveGreetingResponse(
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            content=content,
            references=fallback.references,
        )

    def enhance_report(self, *, db: Session, engine_run_id: str) -> EnhancedReportResponse:
        contract = self.contracts[AIFunction.REPORT_GENERATION]
        fallback = MockAIProvider(
            self.repository,
            provider_name=self.provider_name,
            model_name=self.model_name,
        ).enhance_report(db=db, engine_run_id=engine_run_id)
        content = self._create_text_response(
            instructions=(
                "You are VOIS report generation. Write concise markdown grounded only in the supplied deterministic "
                "report scaffold. Do not alter causal claims, selected interventions, or scores. Improve clarity, "
                "group findings cleanly, and keep the chain explainable."
            ),
            input_payload=fallback.markdown,
            fallback_text=fallback.markdown,
            max_output_tokens=900,
        )

        return EnhancedReportResponse(
            engine_run_id=engine_run_id,
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            markdown=content,
            references=fallback.references,
        )

    def copilot_turn(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
        attachments: list[CopilotAttachment] | None = None,
    ) -> CopilotTurnResult:
        function = AIFunction.PORTFOLIO_COPILOT if thread.scope == ThreadScope.GLOBAL else AIFunction.VENUE_COPILOT
        contract = self.contracts[function]

        if thread.scope == ThreadScope.GLOBAL:
            scaffold, references = _compose_portfolio_reply(db, thread, prompt, self.repository)
        else:
            scaffold, references = _compose_venue_reply(db, thread, prompt, self.repository)

        attachment_briefs = build_copilot_attachment_briefs(
            db,
            organization_id=thread.organization_id,
            attachments=attachments or [],
        )
        if attachment_briefs:
            references.extend(_attachment_references(attachment_briefs))
        recalled_file_memory, file_memory_refs = _build_file_memory_recall(
            db,
            thread=thread,
            prompt=prompt,
            attachments=attachment_briefs,
        )
        if file_memory_refs:
            references.extend(file_memory_refs)

        input_sections = [
            f"User prompt:\n{prompt}",
            f"Grounded scaffold:\n{scaffold}",
            f"Recent thread history:\n{_thread_history_excerpt(db, thread.id)}",
        ]
        attachment_excerpt = _attachment_excerpt(attachment_briefs)
        if attachment_excerpt:
            input_sections.append(f"Attachments:\n{attachment_excerpt}")
        if recalled_file_memory:
            input_sections.append(f"Recalled file memory:\n{recalled_file_memory}")
        copilot_input = _build_anthropic_copilot_input("\n\n".join(input_sections), attachment_briefs)

        content = self._create_text_response(
            instructions=(
                "You are VOIS. Work like an operating analyst inside the current workspace. Use only the "
                "deterministic scaffold, thread history, attachments, recalled file memory, and explicit references "
                "provided here. Do not be proactive. Do not flatter. Do not coach. Do not claim hidden knowledge. "
                "If recent thread history conflicts with the current grounded scaffold, trust the grounded scaffold and "
                "correct the stale assumption explicitly. If the scaffold quotes saved assessment evidence, treat that "
                "evidence as current workspace input. "
                "Lead with the answer, then the evidence, then the next step if one is clear. If the evidence is weak "
                "or missing, say so plainly. Keep the tone concise, direct, and professional. When attachments are "
                "present, explicitly cite the visible or quoted evidence you used."
            ),
            input_payload=copilot_input,
            fallback_text=scaffold,
            max_output_tokens=520,
        )

        if thread.scope == ThreadScope.VENUE:
            suggestion = self._generate_signal_update_suggestion(
                db=db,
                thread=thread,
                prompt=_signal_update_context(prompt, attachment_briefs, recalled_file_memory),
            )
            if suggestion is not None and (suggestion.add or suggestion.remove):
                additions = len(suggestion.add)
                removals = len(suggestion.remove)
                content = "\n\n".join(
                    [
                        content,
                        f"Potential signal update: {additions} addition(s), {removals} removal(s). Review before applying.",
                    ]
                )
                references.append(
                    {
                        "type": "signal_update",
                        "label": f"{additions} add / {removals} remove",
                        "payload": suggestion.model_dump(mode="json"),
                    }
                )

        return CopilotTurnResult(
            function=function,
            provider=self.provider_name,
            model=self.model_name,
            prompt_version=contract.system_prompt_version,
            source_mode="anthropic_live_v1",
            content=content,
            references=references,
        )

    def _generate_signal_update_suggestion(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
    ) -> AISignalUpdateSuggestion | None:
        if not thread.venue_id:
            return None

        latest_assessment = db.scalar(
            select(Assessment)
            .where(Assessment.venue_id == thread.venue_id)
            .order_by(Assessment.created_at.desc())
        )
        if latest_assessment is None:
            return None

        mount = resolve_venue_mount(db, thread.venue_id, self.repository, allow_invalid=True, require_runtime=False)
        bundle = self.repository.load_bundle_for_identity(mount.ontology_id, mount.version, allow_invalid=True)
        signal_lookup = {signal.id: signal for signal in bundle.signals}
        current_signal_ids = set(latest_assessment.selected_signal_ids)
        signal_catalog = "\n".join(
            f"- {signal.id} | {signal.name} | {signal.description}"
            for signal in bundle.signals
        )

        try:
            payload = self._create_json_response(
                instructions=(
                    "Propose only signal updates that are clearly supported by the latest user message. "
                    "Use only provided signal IDs. Prefer no-op over weak inference. Remove signals only when the "
                    "message clearly indicates they are resolved or no longer present."
                ),
                input_payload=(
                    f"Current signal ids: {', '.join(sorted(current_signal_ids)) or 'none'}\n\n"
                    f"Signal catalog:\n{signal_catalog}\n\n"
                    f"Latest user message:\n{prompt}"
                ),
                json_schema=_SIGNAL_UPDATE_JSON_SCHEMA,
                max_output_tokens=500,
            )
        except AIRuntimePolicyError:
            return _build_signal_update_suggestion(db, thread, prompt, self.repository)

        additions = [
            AISignalUpdateItem(
                signal_id=signal_id,
                signal_name=signal_lookup[signal_id].name,
                notes=str(item.get("notes", "")).strip() or signal_lookup[signal_id].description,
                confidence=_coerce_confidence(item.get("confidence")),
            )
            for item in payload.get("add", [])
            if (signal_id := str(item.get("signal_id", "")).strip()) in signal_lookup and signal_id not in current_signal_ids
        ]
        removals = sorted(
            signal_id
            for signal_id in {
                str(signal_id).strip()
                for signal_id in payload.get("remove", [])
                if str(signal_id).strip() in current_signal_ids
            }
        )
        if not additions and not removals:
            return None
        return AISignalUpdateSuggestion(add=additions, remove=removals)

    def _create_json_response(
        self,
        *,
        instructions: str,
        input_payload: Any,
        json_schema: dict[str, object],
        max_output_tokens: int,
    ) -> dict[str, object]:
        content = self._invoke_message(
            system=instructions,
            user_content=input_payload,
            max_tokens=max_output_tokens,
            prefill='{"',
        )
        # Restore the prefill prefix
        output_text = ('{"' + content).strip()
        if not output_text:
            raise AIRuntimePolicyError("Anthropic invocation returned no structured output.")
        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError as exc:
            raise AIRuntimePolicyError(f"Anthropic invocation returned invalid JSON: {output_text[:200]}") from exc
        if not isinstance(parsed, dict):
            raise AIRuntimePolicyError("Anthropic invocation returned a non-object payload.")
        return parsed

    def _create_text_response(
        self,
        *,
        instructions: str,
        input_payload: Any,
        fallback_text: str,
        max_output_tokens: int,
    ) -> str:
        try:
            content = self._invoke_message(
                system=instructions,
                user_content=input_payload if isinstance(input_payload, (str, list)) else str(input_payload),
                max_tokens=max_output_tokens,
            )
            return content.strip() or fallback_text
        except Exception:
            return fallback_text

    def _invoke_message(
        self,
        *,
        system: str,
        user_content: Any,
        max_tokens: int,
        prefill: str | None = None,
    ) -> str:
        messages: list[dict[str, Any]] = []
        if isinstance(user_content, list):
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": str(user_content)})
        if prefill:
            messages.append({"role": "assistant", "content": prefill})
        try:
            response = self.client.messages.create(
                model=self.model_name,
                system=system,
                messages=messages,
                max_tokens=max_tokens,
            )
            text_blocks = [block.text for block in response.content if hasattr(block, "text")]
            return "".join(text_blocks)
        except Exception as exc:
            raise AIRuntimePolicyError(f"Anthropic runtime invocation failed: {exc}") from exc


class BlockedAIProvider:
    def __init__(self, message: str):
        self.provider_name = "blocked"
        self.model_name = "unavailable"
        self.message = message

    def _raise(self):
        raise AIRuntimePolicyError(self.message)

    def signal_intake(
        self,
        *,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse:
        self._raise()

    def proactive_greeting(
        self,
        *,
        db: Session,
        organization_id: str,
        venue_id: str | None = None,
    ) -> ProactiveGreetingResponse:
        self._raise()

    def enhance_report(self, *, db: Session, engine_run_id: str) -> EnhancedReportResponse:
        self._raise()

    def copilot_turn(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
        attachments: list[CopilotAttachment] | None = None,
    ) -> CopilotTurnResult:
        self._raise()


class AIRuntimeService:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    def signal_intake(
        self,
        *,
        raw_text: str,
        ontology_id: str,
        version: str | None = None,
        assessment_type: str | None = None,
    ) -> IntakePreviewResponse:
        return self.provider.signal_intake(
            raw_text=raw_text,
            ontology_id=ontology_id,
            version=version,
            assessment_type=assessment_type,
        )

    def proactive_greeting(
        self,
        *,
        db: Session,
        organization_id: str,
        venue_id: str | None = None,
    ) -> ProactiveGreetingResponse:
        return self.provider.proactive_greeting(db=db, organization_id=organization_id, venue_id=venue_id)

    def enhance_report(self, *, db: Session, engine_run_id: str) -> EnhancedReportResponse:
        return self.provider.enhance_report(db=db, engine_run_id=engine_run_id)

    def generate_copilot_reply(
        self,
        *,
        db: Session,
        thread: CopilotThread,
        prompt: str,
        attachments: list[CopilotAttachment] | None = None,
    ) -> CopilotTurnResult:
        return self.provider.copilot_turn(db=db, thread=thread, prompt=prompt, attachments=attachments or [])


def require_live_ai_for_role(role: AuthRole) -> None:
    policy = get_settings().ai_runtime_policy()
    if role == AuthRole.DEVELOPER:
        return
    if policy.effective_provider in {"mock", "blocked"} or policy.mode in {"mock", "mock_fallback", "blocked"}:
        raise AIRuntimePolicyError(
            "Live AI is not configured for real role sessions. Configure a live provider or use developer mode for mock testing."
        )


def get_ai_runtime_service_for_actor(
    role: AuthRole,
    repository: OntologyRepository | None = None,
) -> AIRuntimeService:
    resolved_repository = repository or get_ontology_repository()
    policy = get_settings().ai_runtime_policy()
    if role == AuthRole.DEVELOPER and policy.effective_provider == "blocked":
        return AIRuntimeService(
            MockAIProvider(
                resolved_repository,
                provider_name="mock",
                model_name=get_settings().ai_mock_model,
            )
        )
    require_live_ai_for_role(role)
    return get_ai_runtime_service(resolved_repository)


def get_ai_runtime_service(repository: OntologyRepository | None = None) -> AIRuntimeService:
    resolved_repository = repository or get_ontology_repository()
    settings = get_settings()
    policy = settings.ai_runtime_policy()
    if policy.effective_provider == "anthropic":
        return AIRuntimeService(
            AnthropicProvider(
                resolved_repository,
                model_name=policy.effective_model,
            )
        )
    if policy.effective_provider == "openai":
        return AIRuntimeService(
            OpenAIProvider(
                resolved_repository,
                model_name=policy.effective_model,
            )
        )
    if policy.effective_provider == "mock":
        return AIRuntimeService(
            MockAIProvider(
                resolved_repository,
                provider_name=policy.effective_provider,
                model_name=policy.effective_model,
            )
        )
    return AIRuntimeService(BlockedAIProvider(policy.note))


def _build_openai_client(settings) -> OpenAIClient:
    from openai import OpenAI

    client_kwargs: dict[str, object] = {"api_key": settings.ai_api_key}
    if settings.ai_api_base:
        client_kwargs["base_url"] = settings.ai_api_base
    return OpenAI(**client_kwargs)


def _build_anthropic_client(settings) -> Any:
    from anthropic import Anthropic

    client_kwargs: dict[str, object] = {"api_key": settings.ai_api_key}
    if settings.ai_api_base:
        client_kwargs["base_url"] = settings.ai_api_base
    return Anthropic(**client_kwargs)


def _compose_portfolio_reply(
    db: Session,
    thread: CopilotThread,
    prompt: str,
    repository: OntologyRepository,
) -> tuple[str, list[dict[str, object]]]:
    venues = list(
        db.scalars(
            select(Venue)
            .where(Venue.organization_id == thread.organization_id)
            .order_by(Venue.created_at.asc())
        ).all()
    )
    if not venues:
        return (
            "What I see: there are no venues attached to this portfolio yet.\n\n"
            "Best next move: create or connect the first venue so VOIS can ground portfolio reasoning in real execution state.",
            [],
        )

    summary = build_portfolio_summary(db, thread.organization_id)
    signal_patterns = _shared_portfolio_signal_patterns(db, venues, repository)
    block_patterns = _shared_portfolio_block_patterns(db, venues, repository)
    prompt_lower = prompt.lower()
    lines = [f"What I see: {len(venues)} venue(s) are currently tracked in this portfolio."]
    references: list[dict[str, object]] = []

    if summary.resume_venue_id:
        focus_pulse = next((pulse for pulse in summary.venue_pulses if pulse.venue_id == summary.resume_venue_id), None)
    else:
        focus_pulse = summary.venue_pulses[0] if summary.venue_pulses else None

    for pulse in summary.venue_pulses[:3]:
        references.append(_reference("venue", pulse.venue_name, pulse.venue_id))

    if focus_pulse is not None:
        lines.append(
            f"Priority venue: {focus_pulse.venue_name} is the sharpest current focus because {focus_pulse.next_step_label.lower()}"
        )

    if any(keyword in prompt_lower for keyword in ["pattern", "across", "portfolio", "repeat", "system"]):
        if signal_patterns:
            top_signal = signal_patterns[0]
            lines.append(
                f"System pattern: {top_signal['signal_name']} shows up in {top_signal['venue_count']} venue(s). "
                "When the same signal repeats across venues, treat it as a system gap rather than local noise."
            )
            references.append(_reference("signal", top_signal["signal_name"], top_signal["signal_id"]))
        else:
            lines.append(
                "System pattern: there is not enough repeated assessment evidence yet to call a reliable portfolio-wide pattern."
            )

        if block_patterns:
            top_block = block_patterns[0]
            lines.append(
                f"Transfer candidate: {top_block['block_name']} is active in {top_block['venue_count']} venue(s), "
                "so this intervention is already starting to travel."
            )
            references.append(_reference("block", top_block["block_name"], top_block["block_id"]))

        lines.append(
            "Best next move: standardize the strongest repeating fix before adding more local exceptions."
        )
        return "\n\n".join(lines), references

    if any(keyword in prompt_lower for keyword in ["blocked", "stuck", "dependency", "can't", "cannot"]):
        blocked_pulses = [pulse for pulse in summary.venue_pulses if pulse.blocked_task_count]
        if blocked_pulses:
            top_blocked = blocked_pulses[0]
            lines.append(
                f"Blocked hotspot: {top_blocked.venue_name} has {top_blocked.blocked_task_count} blocked task(s) and needs dependency clearance first."
            )
            lines.append(
                f"Best next move: clear blockers in {top_blocked.venue_name} before spreading attention wider across the portfolio."
            )
        else:
            lines.append("Blocked hotspot: there are no dependency-blocked venues right now.")
            lines.append("Best next move: advance ready work and watch for repeated pressure signals across venues.")
        return "\n\n".join(lines), references

    for pulse in summary.venue_pulses[:2]:
        lines.append(
            f"{pulse.venue_name}: {pulse.completion_percentage:.0f}% complete, "
            f"{pulse.ready_task_count} ready task(s), {pulse.blocked_task_count} blocked task(s), "
            f"next move is {pulse.next_step_label.lower()}"
        )

    if signal_patterns:
        top_signal = signal_patterns[0]
        lines.append(
            f"Cross-venue read: {top_signal['signal_name']} is the clearest repeating signal pattern right now."
        )
        references.append(_reference("signal", top_signal["signal_name"], top_signal["signal_id"]))

    lines.append(
        "Best next move: use the venue thread for local execution decisions, and use this portfolio thread to name the repeating system gaps that should be standardized once."
    )
    return "\n\n".join(lines), references


def _compose_venue_reply(
    db: Session,
    thread: CopilotThread,
    prompt: str,
    repository: OntologyRepository,
) -> tuple[str, list[dict[str, object]]]:
    venue = db.get(Venue, thread.venue_id) if thread.venue_id else None
    if venue is None:
        return (
            "What I see: this thread is not attached to a venue yet.\n\n"
            "Best next move: use a venue-scoped thread so VOIS can ground guidance in actual assessment, plan, and progress state.",
            [],
        )

    references = [_reference("venue", venue.name, venue.id)]
    context_assessment = (
        db.get(Assessment, thread.context_id)
        if thread.context_kind == CopilotContextKind.ASSESSMENT and thread.context_id
        else None
    )
    context_run = (
        db.get(EngineRun, thread.context_id)
        if thread.context_kind == CopilotContextKind.REPORT and thread.context_id
        else None
    )
    context_plan = (
        db.get(OperationalPlan, thread.context_id)
        if thread.context_kind == CopilotContextKind.PLAN and thread.context_id
        else None
    )
    latest_assessment = db.scalar(
        select(Assessment)
        .where(Assessment.venue_id == venue.id)
        .order_by(Assessment.created_at.desc())
    )
    latest_run = db.scalar(
        select(EngineRun)
        .where(EngineRun.venue_id == venue.id)
        .order_by(EngineRun.created_at.desc())
    )
    active_plan = db.scalar(
        select(OperationalPlan)
        .where(OperationalPlan.venue_id == venue.id)
        .where(OperationalPlan.status == PlanStatus.ACTIVE)
        .order_by(OperationalPlan.created_at.desc())
    )
    latest_plan = db.scalar(
        select(OperationalPlan)
        .where(OperationalPlan.venue_id == venue.id)
        .order_by(OperationalPlan.created_at.desc())
    )
    latest_progress = db.scalar(
        select(ProgressEntry)
        .where(ProgressEntry.venue_id == venue.id)
        .order_by(ProgressEntry.created_at.desc())
    )

    effective_assessment = context_assessment or latest_assessment
    effective_run = context_run or latest_run
    effective_plan = context_plan or active_plan or latest_plan

    if effective_assessment is not None:
        references.append(_reference("assessment", "Latest assessment", effective_assessment.id))
    if effective_plan is not None:
        references.append(_reference("plan", effective_plan.title, effective_plan.id))
    if latest_progress is not None:
        references.append(_reference("progress_entry", latest_progress.summary, latest_progress.id))

    opening = f"What I see: VOIS is grounded in {venue.name}."
    if effective_assessment is None:
        return (
            "\n\n".join(
                [
                    opening,
                    "Best next move: analyze observations, save the assessment, and run the engine before trusting any recommendation.",
                    "Reason: I do not have a saved diagnostic state for this venue yet, so anything more specific would be guesswork.",
                ]
            ),
            references,
        )

    signal_names = _signal_names_for_assessment(repository, effective_assessment)
    execution_summary = execution_summary_for_plan(db, effective_plan) if effective_plan is not None else None
    prompt_lower = prompt.lower()
    report_summary = effective_run.report_json.get("summary") if effective_run is not None else None
    diagnostic_spine = _diagnostic_spine_excerpt(effective_run)
    assessment_excerpt = _assessment_grounding_excerpt(effective_assessment)
    bundle = _load_bundle_for_venue_state(repository, effective_assessment, effective_plan, effective_run)
    latest_plan_tasks = _plan_tasks(db, effective_plan.id, limit=8) if effective_plan is not None else []
    leverage_task = latest_plan_tasks[0] if latest_plan_tasks else None
    next_ready_task = execution_summary.next_executable_tasks[0] if execution_summary and execution_summary.next_executable_tasks else None
    next_blocked_task = execution_summary.blocked_tasks[0] if execution_summary and execution_summary.blocked_tasks else None
    second_task = latest_plan_tasks[1] if len(latest_plan_tasks) > 1 else None

    if effective_run is not None:
        references.append(_reference("engine_run", "Latest engine run", effective_run.id))
    if leverage_task is not None:
        references.append(_reference("block", leverage_task.title, leverage_task.block_id))

    chain_reply = _compose_causal_chain_reply(
        opening=opening,
        prompt=prompt,
        plan_tasks=latest_plan_tasks,
        assessment_excerpt=assessment_excerpt,
        bundle=bundle,
        references=references,
    )
    if chain_reply is not None:
        return chain_reply

    if any(keyword in prompt_lower for keyword in ["blocked", "stuck", "dependency", "can't", "cannot"]):
        return _compose_blocker_reply(
            opening=opening,
            execution_summary=execution_summary,
            latest_progress=latest_progress,
            references=references,
        )

    if any(keyword in prompt_lower for keyword in ["signal", "diagnostic", "root cause", "why", "failure"]):
        lines = [
            opening,
            f"Diagnostic read: {len(effective_assessment.selected_signal_ids)} active signal(s) are staged in the latest assessment.",
            f"Signal surface: {', '.join(signal_names[:5]) or 'No mapped signal names yet.'}",
        ]
        if report_summary:
            lines.append(f"Engine readout: {report_summary}")
        if diagnostic_spine:
            lines.append(f"Diagnostic spine: {diagnostic_spine}")
        if leverage_task is not None:
            lines.append(
                f"Leverage point: {leverage_task.title} is first in sequence because {leverage_task.rationale}"
            )
        task_trace_lines = _task_trace_snapshot(latest_plan_tasks[:3], bundle)
        if task_trace_lines:
            lines.append(f"Task chain snapshot:\n{task_trace_lines}")
        if execution_summary is not None:
            lines.append(
                f"Execution state: {round(execution_summary.completion_percentage)}% complete with "
                f"{len(execution_summary.next_executable_tasks)} ready task(s) and "
                f"{len(execution_summary.blocked_tasks)} blocked task(s)."
            )
        return "\n\n".join(lines), references

    if any(keyword in prompt_lower for keyword in ["plan", "sequence", "order", "after", "priority", "next", "focus"]):
        lines = [opening]
        if effective_plan is None or leverage_task is None:
            lines.extend(
                [
                    "Best next move: run the engine so the saved assessment becomes a sequenced plan.",
                    "Reason: without a persisted plan, VOIS can only name pressure, not intervention order.",
                ]
            )
            return "\n\n".join(lines), references

        best_next_move = next_ready_task.title if next_ready_task is not None else leverage_task.title
        lines.append(f"Best next move: {best_next_move}.")
        lines.append(f"Leverage point: {leverage_task.title} is first because {leverage_task.rationale}")
        if second_task is not None:
            lines.append(f"Then: {second_task.title}.")
        if next_blocked_task is not None:
            lines.append(
                f"Blocked after that: {next_blocked_task.title} is waiting on {', '.join(next_blocked_task.blocking_dependency_ids)}."
            )
        if latest_progress is not None:
            lines.append(f"Latest logged movement: {latest_progress.summary}")
        return "\n\n".join(lines), references

    if any(keyword in prompt_lower for keyword in ["values", "charter", "behaviour", "behavior", "culture"]):
        lines = [opening]
        if assessment_excerpt:
            lines.append(
                "Saved assessment input exists for this venue. Treat the quoted assessment evidence below as current source material, not as missing workspace data."
            )
            lines.append(f"Assessment evidence:\n{assessment_excerpt}")
        if signal_names:
            lines.append(f"Signal surface around this question: {', '.join(signal_names[:5])}.")
        if report_summary:
            lines.append(f"Latest diagnosis readout: {report_summary}")
        if leverage_task is not None:
            lines.append(
                f"Operational pressure behind the values work: {leverage_task.title} is currently a leverage point because {leverage_task.rationale}"
            )
        lines.append(
            "Use the saved assessment language above as the source of truth. Derive values and behaviours from repeated themes in that evidence, not from generic hospitality slogans."
        )
        return "\n\n".join(lines), references

    if any(keyword in prompt_lower for keyword in ["progress", "movement", "update", "done", "completed"]):
        lines = [opening]
        if latest_progress is not None:
            lines.append(f"Latest logged movement: {latest_progress.summary}")
        if execution_summary is not None:
            lines.append(
                f"Execution state: {round(execution_summary.completion_percentage)}% complete, "
                f"{len(execution_summary.next_executable_tasks)} ready task(s), "
                f"{len(execution_summary.blocked_tasks)} blocked task(s)."
            )
        if next_ready_task is not None:
            lines.append(f"Best next move: {next_ready_task.title}.")
        return "\n\n".join(lines), references

    ready_tasks = execution_summary.next_executable_tasks if execution_summary is not None else []
    blocked_tasks = execution_summary.blocked_tasks if execution_summary is not None else []
    next_focus = ready_tasks[0].title if ready_tasks else "clear dependencies or run the first plan so real execution can start"
    pressure_point = (
        f"{blocked_tasks[0].title} is waiting on {', '.join(blocked_tasks[0].blocking_dependency_ids)}."
        if blocked_tasks
        else "No tasks are blocked right now."
    )

    lines = [
        opening,
        (
            f"Best next move: {next_focus}."
            if effective_plan is not None
            else "Best next move: run the engine so the latest assessment becomes a sequenced operational plan."
        ),
        (
            f"Leverage point: {leverage_task.title} is first because {leverage_task.rationale}"
            if leverage_task is not None
            else "Leverage point: without a persisted plan, leverage is still hidden inside the current signal surface."
        ),
        (
            f"Pressure point: {pressure_point}"
            if effective_plan is not None
            else "Pressure point: without a persisted plan, we cannot see sequencing pressure yet."
        ),
    ]
    if latest_progress is not None:
        lines.append(f"Latest logged movement: {latest_progress.summary}")
    if assessment_excerpt:
        lines.append(f"Assessment evidence:\n{assessment_excerpt}")
    if diagnostic_spine:
        lines.append(f"Diagnostic spine: {diagnostic_spine}")
    return "\n\n".join(lines), references


def _compose_causal_chain_reply(
    *,
    opening: str,
    prompt: str,
    plan_tasks: list[PlanTask],
    assessment_excerpt: str | None,
    bundle,
    references: list[dict[str, object]],
) -> tuple[str, list[dict[str, object]]] | None:
    prompt_lower = prompt.lower()
    has_chain_prompt = (
        "causal chain" in prompt_lower
        or "why does this chain matter" in prompt_lower
        or "what happens if any link breaks" in prompt_lower
        or bool(re.search(r"\bFM\d+\b|\bRP\d+\b|\bB\d+\b|\bsig_[a-z0-9_]+\b", prompt, re.IGNORECASE))
    )
    if not has_chain_prompt:
        return None

    task = _match_plan_task_from_prompt(plan_tasks, prompt)
    trace = task.trace if task is not None and isinstance(task.trace, dict) else {}
    signal_ids = _dedupe_preserve_order(
        [*re.findall(r"\bsig_[a-z0-9_]+\b", prompt, re.IGNORECASE), *[str(item) for item in trace.get("signal_ids", [])]]
    )
    failure_mode_ids = _dedupe_preserve_order(
        [
            *re.findall(r"\bFM\d+\b", prompt, re.IGNORECASE),
            *[
                str(item.get("fm_id") or item.get("id") or "")
                for item in trace.get("failure_modes", [])
                if isinstance(item, dict)
            ],
        ]
    )
    response_pattern_ids = _dedupe_preserve_order(
        [
            *re.findall(r"\bRP\d+\b", prompt, re.IGNORECASE),
            (
                str(
                    trace.get("response_pattern_id")
                    or (task.source_response_pattern_id if task is not None else "")
                ).strip()
            ),
        ]
    )
    block_ids = _dedupe_preserve_order(
        [*re.findall(r"\bB\d+\b", prompt, re.IGNORECASE), task.block_id if task is not None else ""]
    )

    if not any([task, signal_ids, failure_mode_ids, response_pattern_ids, block_ids]):
        return None

    signal_map = {item.id.lower(): item for item in bundle.signals} if bundle is not None else {}
    failure_mode_map = {item.id.lower(): item for item in bundle.failure_modes} if bundle is not None else {}
    response_pattern_map = {item.id.lower(): item for item in bundle.response_patterns} if bundle is not None else {}
    block_map = {item.id.lower(): item for item in bundle.blocks} if bundle is not None else {}

    signal_id = signal_ids[0] if signal_ids else None
    failure_mode_id = failure_mode_ids[0] if failure_mode_ids else None
    response_pattern_id = response_pattern_ids[0] if response_pattern_ids else None
    block_id = block_ids[0] if block_ids else None

    signal = signal_map.get(signal_id.lower()) if signal_id else None
    failure_mode = failure_mode_map.get(failure_mode_id.lower()) if failure_mode_id else None
    response_pattern = response_pattern_map.get(response_pattern_id.lower()) if response_pattern_id else None
    block = block_map.get(block_id.lower()) if block_id else None

    if signal is not None:
        references.append(_reference("signal", signal.name, signal.id))
    if failure_mode is not None:
        references.append(_reference("failure_mode", failure_mode.name, failure_mode.id))
    if response_pattern is not None:
        references.append(_reference("response_pattern", response_pattern.name, response_pattern.id))
    if block is not None:
        references.append(_reference("block", block.name, block.id))
    if task is not None:
        references.append(_reference("plan_task", task.title, task.id))

    lines = [opening]
    if task is not None:
        lines.append(f"Task anchor: {task.title}.")

    chain_summary = " -> ".join(
        part
        for part in [
            _entity_label(signal_id, signal.name if signal is not None else None),
            _entity_label(failure_mode_id, failure_mode.name if failure_mode is not None else None),
            _entity_label(response_pattern_id, response_pattern.name if response_pattern is not None else None),
            _entity_label(block_id, block.name if block is not None else (task.title if task is not None else None)),
        ]
        if part
    )
    if chain_summary:
        lines.append(f"Chain in plain terms: {chain_summary}.")

    if signal is not None:
        lines.append(f"Signal read: {signal.id} means {signal.description}")
    if failure_mode is not None:
        lines.append(f"Failure mode: {failure_mode.id} means {failure_mode.description}")
    if response_pattern is not None:
        lines.append(f"Response logic: {response_pattern.id} means {response_pattern.description}")
    if block is not None:
        lines.append(f"Operational block: {block.id} means {block.description}")
    elif task is not None:
        lines.append(f"Operational block: {task.block_id} is executed here as '{task.title}'.")

    if task is not None and task.rationale:
        lines.append(f"Why this matters: {task.rationale}")
    else:
        lines.append(
            "Why this matters: the chain is how VOIS turns a surfaced signal into a concrete operational move. "
            "If the chain is wrong, the plan may still look tidy while correcting the wrong problem."
        )

    lines.append(
        "If a link breaks: if the signal read is wrong, you are diagnosing the wrong symptom; if the failure mode is "
        "wrong, you choose the wrong correction logic; if the response pattern is wrong, the strategy does not fit the "
        "actual problem; if the block is wrong, the strategy never becomes usable floor execution."
    )
    if assessment_excerpt:
        lines.append(f"Assessment evidence available for verification:\n{assessment_excerpt}")
    return "\n\n".join(lines), references


def _compose_blocker_reply(
    *,
    opening: str,
    execution_summary,
    latest_progress: ProgressEntry | None,
    references: list[dict[str, object]],
) -> tuple[str, list[dict[str, object]]]:
    if execution_summary is None:
        return (
            "\n\n".join(
                [
                    opening,
                    "Best next move: there is no persisted plan yet, so there is no dependency graph to inspect.",
                    "Reason: save the assessment and run the engine first so VOIS can tell you what is blocked by what.",
                ]
            ),
            references,
        )

    if execution_summary.blocked_tasks:
        blocked = execution_summary.blocked_tasks[0]
        ready = execution_summary.next_executable_tasks[0].title if execution_summary.next_executable_tasks else "the first unblocked task"
        lines = [
            opening,
            f"Blocked path: {blocked.title} is waiting on {', '.join(blocked.blocking_dependency_ids)}.",
            f"Best next move: advance {ready} first so the blocked chain can open cleanly.",
        ]
    else:
        lines = [
            opening,
            "Blocked path: there are no dependency-blocked tasks right now.",
            "Best next move: work the currently ready tasks in order and keep logging real movement so the signal picture stays fresh.",
        ]

    if latest_progress is not None:
        lines.append(f"Latest logged movement: {latest_progress.summary}")
    return "\n\n".join(lines), references


def _load_bundle_for_venue_state(
    repository: OntologyRepository,
    assessment: Assessment | None,
    plan: OperationalPlan | None,
    engine_run: EngineRun | None,
):
    ontology_id = None
    ontology_version = None
    if assessment is not None:
        ontology_id = assessment.ontology_id
        ontology_version = assessment.ontology_version
    elif plan is not None:
        ontology_id = plan.ontology_id
        ontology_version = plan.ontology_version
    elif engine_run is not None:
        ontology_id = engine_run.ontology_id
        ontology_version = engine_run.ontology_version
    if not ontology_id or not ontology_version:
        return None
    try:
        return repository.load_bundle_for_identity(ontology_id, ontology_version, allow_invalid=True)
    except Exception:
        return None


def _assessment_grounding_excerpt(assessment: Assessment | None, *, limit: int = 900) -> str | None:
    if assessment is None:
        return None
    sources = [
        assessment.raw_input_text,
        assessment.notes,
        json.dumps(assessment.raw_intake_payload or {}, ensure_ascii=False, indent=2) if assessment.raw_intake_payload else None,
    ]
    for source in sources:
        preview = _preview_text(source, limit=limit)
        if preview:
            return preview
    return None


def _diagnostic_spine_excerpt(engine_run: EngineRun | None, *, limit: int = 3) -> str | None:
    if engine_run is None:
        return None
    report = engine_run.report_json or {}
    spine = report.get("diagnostic_spine")
    if isinstance(spine, list) and spine:
        return " | ".join(str(item).strip() for item in spine[:limit] if str(item).strip())
    summary = report.get("summary")
    return _preview_text(summary, limit=260)


def _task_trace_snapshot(plan_tasks: list[PlanTask], bundle) -> str | None:
    if not plan_tasks:
        return None
    signal_map = {item.id.lower(): item.name for item in bundle.signals} if bundle is not None else {}
    response_pattern_map = {item.id.lower(): item.name for item in bundle.response_patterns} if bundle is not None else {}
    lines: list[str] = []
    for task in plan_tasks[:3]:
        trace = task.trace if isinstance(task.trace, dict) else {}
        signal_ids = [str(item) for item in trace.get("signal_ids", []) if str(item).strip()]
        signal_labels = [
            signal_map.get(signal_id.lower(), signal_id)
            for signal_id in signal_ids[:2]
        ]
        response_pattern_id = str(trace.get("response_pattern_id") or task.source_response_pattern_id or "").strip()
        response_pattern_label = (
            response_pattern_map.get(response_pattern_id.lower(), response_pattern_id)
            if response_pattern_id
            else None
        )
        chain_parts = [", ".join(signal_labels) if signal_labels else None, response_pattern_label, task.block_id]
        lines.append(
            f"- {task.title} :: {' -> '.join(part for part in chain_parts if part)}"
        )
    return "\n".join(lines)


def _match_plan_task_from_prompt(plan_tasks: list[PlanTask], prompt: str) -> PlanTask | None:
    if not plan_tasks:
        return None
    lowered = prompt.lower()
    quoted_candidates = [
        segment.strip().lower()
        for segment in re.findall(r"[\"“”']([^\"“”']{3,})[\"“”']", prompt)
        if segment.strip()
    ]
    for candidate in quoted_candidates:
        for task in plan_tasks:
            if task.title.lower() == candidate:
                return task
    for task in plan_tasks:
        if task.title and task.title.lower() in lowered:
            return task
    return None


def _preview_text(value: str | None, *, limit: int = 400) -> str | None:
    if not value:
        return None
    flattened = re.sub(r"\s+", " ", value).strip()
    if not flattened:
        return None
    if len(flattened) <= limit:
        return flattened
    return f"{flattened[:limit].rstrip()}..."


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        normalized = str(value or "").strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(normalized)
    return ordered


def _entity_label(entity_id: str | None, entity_name: str | None) -> str | None:
    if entity_id and entity_name:
        return f"{entity_id} ({entity_name})"
    return entity_id or entity_name


def _extract_quantitative_evidence(raw_text: str) -> list[QuantitativeEvidence]:
    snippets = _extract_snippets(raw_text)
    evidence: list[QuantitativeEvidence] = []
    pattern = re.compile(r"(\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?/5\b|\b\d+(?:\.\d+)?\b)")
    for snippet in snippets:
        matches = pattern.findall(snippet)
        for match in matches[:2]:
            evidence.append(
                QuantitativeEvidence(
                    label="Observed value",
                    value=match,
                    evidence_snippet=snippet,
                )
            )
        if len(evidence) >= 5:
            break
    return evidence


def _extract_venue_context(raw_text: str, *, ontology_id: str | None = None) -> VenueContextSnapshot:
    lowered = raw_text.lower()
    venue_type = ontology_id.replace("-", " ") if ontology_id else None
    if venue_type is None:
        venue_type = next(
            (
                label
                for label in ["bar", "hotel", "spa", "salon", "gym", "cleaning company", "building team"]
                if label in lowered
            ),
            None,
        )
    team_size_match = re.search(r"(team|staff|crew)\s+(?:of\s+)?(\d+)", lowered)
    if team_size_match:
        team_size_note = f"{team_size_match.group(2)} people"
    else:
        team_size_note = None
    stage = next(
        (
            label
            for label in ["opening", "growth", "stabilizing", "turnaround", "under pressure"]
            if label in lowered
        ),
        None,
    )
    return VenueContextSnapshot(
        venue_type=venue_type,
        team_size_note=team_size_note,
        stage=stage,
    )


def _thread_history_excerpt(db: Session, thread_id: str, *, limit: int = 6) -> str:
    messages = list(
        db.scalars(
            select(CopilotMessage)
            .where(CopilotMessage.thread_id == thread_id)
            .order_by(CopilotMessage.created_at.desc())
        ).all()
    )
    if not messages:
        return "No prior thread history."
    ordered = list(reversed(messages[:limit]))
    return "\n".join(f"{message.author_role.value}: {message.content}" for message in ordered)


def _attachment_excerpt(attachments: list[CopilotAttachmentBrief]) -> str:
    lines = []
    for attachment in attachments:
        details = [attachment.file_name]
        if attachment.content_type:
            details.append(attachment.content_type)
        header = " | ".join(details)
        if attachment.vision_input_url:
            lines.append(f"{header}\nImage: local upload available for visual review.")
        elif attachment.excerpt:
            lines.append(f"{header}\nExcerpt:\n{attachment.excerpt}")
        elif attachment.content_url:
            lines.append(f"{header} | {attachment.content_url}")
        else:
            lines.append(header)
    return "\n".join(lines)


def _build_anthropic_copilot_input(base_text: str, attachments: list[CopilotAttachmentBrief]) -> Any:
    """Build Anthropic Messages API content with optional vision blocks."""
    image_blocks = []
    for attachment in attachments:
        if attachment.vision_input_url:
            source = _anthropic_image_source(attachment.vision_input_url)
            if source is None:
                continue
            image_blocks.append({
                "type": "image",
                "source": source,
            })
    if not image_blocks:
        return base_text
    return [
        {"type": "text", "text": base_text},
        *image_blocks,
    ]


def _build_openai_copilot_input(base_text: str, attachments: list[CopilotAttachmentBrief]) -> Any:
    image_inputs = [
        {
            "type": "input_image",
            "image_url": attachment.vision_input_url,
        }
        for attachment in attachments
        if attachment.vision_input_url
    ]
    if not image_inputs:
        return base_text
    return [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": base_text},
                *image_inputs,
            ],
        }
    ]


def _anthropic_image_source(data_or_url: str) -> dict[str, str] | None:
    if not data_or_url:
        return None
    if data_or_url.startswith("data:"):
        match = re.match(r"^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$", data_or_url, re.IGNORECASE | re.DOTALL)
        if not match:
            return None
        media_type = match.group(1).lower()
        data = re.sub(r"\s+", "", match.group(2))
        return {
            "type": "base64",
            "media_type": media_type,
            "data": data,
        }
    return {
        "type": "url",
        "url": data_or_url,
    }


def _attachment_references(attachments: list[CopilotAttachmentBrief]) -> list[dict[str, object]]:
    references: list[dict[str, object]] = []
    for attachment in attachments:
        payload: dict[str, object] = {
            "content_type": attachment.content_type,
            "url": attachment.content_url,
            "briefing_mode": attachment.briefing_mode,
        }
        if attachment.excerpt:
            payload["excerpt_preview"] = attachment.excerpt[:280]
        if attachment.vision_input_url:
            payload["vision_ready"] = True
        references.append(
            {
                "type": "attachment",
                "label": attachment.file_name,
                "id": attachment.file_asset_id,
                "payload": payload,
            }
        )
    return references


def _attachment_grounding_note(attachments: list[CopilotAttachmentBrief]) -> str | None:
    image_brief = next((attachment for attachment in attachments if attachment.vision_input_url), None)
    if image_brief is not None:
        return f"Attachment evidence: {image_brief.file_name} is attached as a local image for grounded visual review."
    text_brief = next((attachment for attachment in attachments if attachment.excerpt), None)
    if text_brief is not None:
        excerpt = text_brief.excerpt.replace("\n", " ").strip()
        return f"Attachment evidence: {text_brief.file_name} adds context from uploaded notes: {excerpt[:220]}"
    metadata_brief = attachments[0] if attachments else None
    if metadata_brief is not None:
        return f"Attachment evidence: {metadata_brief.file_name} is attached for grounded review."
    return None


def _build_file_memory_recall(
    db: Session,
    *,
    thread: CopilotThread,
    prompt: str,
    attachments: list[CopilotAttachmentBrief],
) -> tuple[str | None, list[dict[str, object]]]:
    recalls = build_file_memory_context(
        db,
        organization_id=thread.organization_id,
        venue_id=thread.venue_id,
        prompt=prompt,
        attached_file_asset_ids=[attachment.file_asset_id for attachment in attachments if attachment.file_asset_id],
    )
    if not recalls:
        return None, []
    return file_memory_prompt_context(recalls), file_memory_references(recalls)


def _signal_update_context(
    prompt: str,
    attachments: list[CopilotAttachmentBrief],
    recalled_file_memory: str | None = None,
) -> str:
    attachment_excerpt = _attachment_excerpt(attachments)
    sections = [prompt]
    if attachment_excerpt:
        sections.append(f"Attachment evidence:\n{attachment_excerpt}")
    if recalled_file_memory:
        sections.append(f"Recalled file memory:\n{recalled_file_memory}")
    return "\n\n".join(section for section in sections if section.strip())


def _stringify_metadata(metadata: dict[str, object]) -> dict[str, str]:
    return {
        key[:64]: str(value)[:512]
        for key, value in metadata.items()
        if value not in (None, "")
    }


def _coerce_confidence(value: object) -> AIConfidenceBand:
    normalized = str(value or "").strip().lower()
    if normalized == AIConfidenceBand.HIGH.value:
        return AIConfidenceBand.HIGH
    if normalized == AIConfidenceBand.LOW.value:
        return AIConfidenceBand.LOW
    return AIConfidenceBand.MEDIUM


def _normalize_score(value: object) -> float:
    try:
        return max(0.0, min(float(value), 1.0))
    except (TypeError, ValueError):
        return 0.0


def _build_signal_update_suggestion(
    db: Session,
    thread: CopilotThread,
    prompt: str,
    repository: OntologyRepository,
) -> AISignalUpdateSuggestion | None:
    if not thread.venue_id:
        return None

    latest_assessment = db.scalar(
        select(Assessment)
        .where(Assessment.venue_id == thread.venue_id)
        .order_by(Assessment.created_at.desc())
    )
    if latest_assessment is None:
        return None

    mount = resolve_venue_mount(db, thread.venue_id, repository, allow_invalid=True, require_runtime=False)
    preview = IntakeService(repository).preview(raw_text=prompt, ontology_id=mount.ontology_id, version=mount.version)
    current_signal_ids = set(latest_assessment.selected_signal_ids)
    signal_lookup = {
        signal.id: signal.name
        for signal in repository.load_bundle_for_identity(
            latest_assessment.ontology_id,
            latest_assessment.ontology_version,
            allow_invalid=True,
        ).signals
    }

    additions = [
        AISignalUpdateItem(
            signal_id=match.signal_id,
            signal_name=match.signal_name,
            notes=match.evidence_snippet,
            confidence=AIConfidenceBand(match.confidence),
        )
        for match in preview.detected_signals
        if match.signal_id not in current_signal_ids
    ]

    removal_keywords = ["resolved", "fixed", "no longer", "stopped", "gone now", "better now"]
    should_remove = any(keyword in prompt.lower() for keyword in removal_keywords)
    removals: list[str] = []
    if should_remove:
        matched_ids = {match.signal_id for match in preview.detected_signals}
        removals = sorted(signal_id for signal_id in matched_ids if signal_id in current_signal_ids)
        if not removals:
            prompt_lower = prompt.lower()
            removals = sorted(
                signal_id
                for signal_id in current_signal_ids
                if signal_lookup.get(signal_id, "").lower() in prompt_lower
            )

    if not additions and not removals:
        return None

    return AISignalUpdateSuggestion(add=additions, remove=removals)


def _signal_names_for_assessment(repository: OntologyRepository, assessment: Assessment | None) -> list[str]:
    if assessment is None:
        return []
    bundle = repository.load_bundle_for_identity(
        assessment.ontology_id,
        assessment.ontology_version,
        allow_invalid=True,
    )
    signal_map = {signal.id: signal.name for signal in bundle.signals}
    return [signal_map[signal_id] for signal_id in assessment.selected_signal_ids if signal_id in signal_map]


def _shared_portfolio_signal_patterns(
    db: Session,
    venues: list[Venue],
    repository: OntologyRepository,
) -> list[dict[str, object]]:
    latest_assessments: list[Assessment] = []
    for venue in venues:
        latest_assessment = db.scalar(
            select(Assessment)
            .where(Assessment.venue_id == venue.id)
            .order_by(Assessment.created_at.desc())
        )
        if latest_assessment is not None:
            latest_assessments.append(latest_assessment)

    counts: Counter[str] = Counter()
    for assessment in latest_assessments:
        counts.update(set(assessment.selected_signal_ids))

    signal_name_by_id: dict[str, str] = {}
    for assessment in latest_assessments:
        bundle = repository.load_bundle_for_identity(
            assessment.ontology_id,
            assessment.ontology_version,
            allow_invalid=True,
        )
        signal_name_by_id.update({signal.id: signal.name for signal in bundle.signals})
    return [
        {
            "signal_id": signal_id,
            "signal_name": signal_name_by_id.get(signal_id, signal_id),
            "venue_count": venue_count,
        }
        for signal_id, venue_count in counts.most_common()
        if venue_count >= 2
    ]


def _shared_portfolio_block_patterns(
    db: Session,
    venues: list[Venue],
    repository: OntologyRepository,
) -> list[dict[str, object]]:
    latest_plan_ids: list[str] = []
    for venue in venues:
        latest_plan = db.scalar(
            select(OperationalPlan)
            .where(OperationalPlan.venue_id == venue.id)
            .order_by(OperationalPlan.created_at.desc())
        )
        if latest_plan is not None:
            latest_plan_ids.append(latest_plan.id)

    if not latest_plan_ids:
        return []

    tasks = list(
        db.scalars(
            select(PlanTask)
            .where(PlanTask.plan_id.in_(latest_plan_ids))
            .order_by(PlanTask.order_index.asc())
        ).all()
    )
    counts: Counter[str] = Counter(task.block_id for task in tasks)
    block_name_by_id: dict[str, str] = {}
    latest_plans = list(
        db.scalars(
            select(OperationalPlan)
            .where(OperationalPlan.id.in_(latest_plan_ids))
        ).all()
    )
    for plan in latest_plans:
        bundle = repository.load_bundle_for_identity(
            plan.ontology_id,
            plan.ontology_version,
            allow_invalid=True,
        )
        block_name_by_id.update({block.id: block.name for block in bundle.blocks})
    return [
        {
            "block_id": block_id,
            "block_name": block_name_by_id.get(block_id, block_id),
            "venue_count": venue_count,
        }
        for block_id, venue_count in counts.most_common()
        if venue_count >= 2
    ]


def _plan_task_titles(db: Session, plan_id: str) -> list[str]:
    return [task.title for task in _plan_tasks(db, plan_id)]


def _plan_tasks(db: Session, plan_id: str, limit: int | None = None) -> list[PlanTask]:
    tasks = list(
        db.scalars(
            select(PlanTask)
            .where(PlanTask.plan_id == plan_id)
            .order_by(PlanTask.order_index.asc())
        ).all()
    )
    return tasks[:limit] if limit is not None else tasks


def _extract_snippets(raw_text: str) -> list[str]:
    parts = re.split(r"[\n\r]+|(?<=[.!?])\s+", raw_text)
    return [part.strip(" -\t") for part in parts if part.strip()][:20]


def _reference(reference_type: str, label: str, reference_id: str | None = None) -> dict[str, object]:
    reference: dict[str, object] = {"type": reference_type, "label": label}
    if reference_id is not None:
        reference["id"] = reference_id
    return reference


def ai_invocation_payload(
    *,
    function: AIFunction,
    provider: str,
    model: str,
    prompt_version: str,
    organization_id: str | None = None,
    venue_id: str | None = None,
    thread_id: str | None = None,
    ontology_version: str | None = None,
    evidence_refs: list[str] | None = None,
    mutation_summary: dict[str, object] | None = None,
) -> dict[str, object]:
    return {
        "invocation_id": str(uuid4()),
        "function": function.value,
        "provider": provider,
        "model": model,
        "prompt_version": prompt_version,
        "organization_id": organization_id,
        "venue_id": venue_id,
        "thread_id": thread_id,
        "ontology_version": ontology_version,
        "evidence_refs": evidence_refs or [],
        "mutation_summary": mutation_summary or {},
    }
