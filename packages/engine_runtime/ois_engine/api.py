import io
from contextlib import redirect_stdout
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from . import block_activation_engine
from . import constraint_engine
from . import failure_mode_engine
from . import plan_generator
from . import report_generator
from . import response_pattern_engine
from . import signal_normalization
from .resources import configure_resources, get_resources


@dataclass
class DiagnosticRunResult:
    normalized_signals: Any
    failure_modes: list[dict[str, Any]]
    response_patterns: list[dict[str, Any]]
    activation_set_raw: dict[str, list[dict[str, Any]]]
    activation_context: list[dict[str, Any]]
    activation_set_constrained: dict[str, list[dict[str, Any]]]
    constraint_report: dict[str, Any]
    action_plan: dict[str, Any]
    report_md: str
    report_type: str
    console: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "normalized_signals": self.normalized_signals,
            "failure_modes": self.failure_modes,
            "response_patterns": self.response_patterns,
            "activation_set_raw": self.activation_set_raw,
            "activation_context": self.activation_context,
            "activation_set_constrained": self.activation_set_constrained,
            "constraint_report": self.constraint_report,
            "action_plan": self.action_plan,
            "report_md": self.report_md,
            "report_type": self.report_type,
            "console": self.console,
        }


def _report_context(raw_input: dict[str, Any]) -> dict[str, Any]:
    return {
        **raw_input.get("venue_context", {}),
        "venue_id": raw_input.get("venue_id", "unknown"),
        "assessment_date": raw_input.get("assessment_date", datetime.now().strftime("%Y-%m-%d")),
        "assessment_type": raw_input.get("assessment_type", "full_diagnostic"),
    }


def _ensure_resources(root_dir: Path | str | None) -> None:
    if root_dir is not None:
        configure_resources(root_dir=root_dir)
        return
    get_resources()


def run_diagnostic(raw_input: dict[str, Any], *, root_dir: Path | str | None = None) -> DiagnosticRunResult:
    _ensure_resources(root_dir)

    buffer = io.StringIO()
    with redirect_stdout(buffer):
        normalized_signals = signal_normalization.run(raw_input)
        activated_fms = failure_mode_engine.run(normalized_signals)
        activated_rps = response_pattern_engine.run(activated_fms)
        activation_set, activation_context = block_activation_engine.run(activated_rps)
        constrained_set, constraint_report = constraint_engine.run(
            activation_set=activation_set,
            activation_context=activation_context,
            venue_context=raw_input.get("venue_context", {}),
            normalized_signals=normalized_signals,
            triage_enabled=raw_input.get("triage_enabled", False),
            triage_intensity=raw_input.get("triage_intensity", "balanced"),
        )
        action_plan = plan_generator.run(
            constrained_set,
            activation_context,
            activated_fms,
            activated_rps,
            normalized_signals,
        )
        report_md, report_type = report_generator.run(
            action_plan,
            activated_fms,
            activated_rps,
            normalized_signals,
            _report_context(raw_input),
        )

    return DiagnosticRunResult(
        normalized_signals=normalized_signals,
        failure_modes=activated_fms,
        response_patterns=activated_rps,
        activation_set_raw=activation_set,
        activation_context=activation_context,
        activation_set_constrained=constrained_set,
        constraint_report=constraint_report,
        action_plan=action_plan,
        report_md=report_md,
        report_type=report_type,
        console=buffer.getvalue(),
    )


def generate_plan(
    activation_set: dict[str, list[dict[str, Any]]],
    activation_context: list[dict[str, Any]],
    activated_fms: list[dict[str, Any]],
    activated_rps: list[dict[str, Any]],
    normalized_signals: Any,
    *,
    root_dir: Path | str | None = None,
) -> dict[str, Any]:
    _ensure_resources(root_dir)
    return plan_generator.run(
        activation_set,
        activation_context,
        activated_fms,
        activated_rps,
        normalized_signals,
    )


def build_report(
    action_plan: dict[str, Any],
    activated_fms: list[dict[str, Any]],
    activated_rps: list[dict[str, Any]],
    normalized_signals: Any,
    venue_context: dict[str, Any],
    *,
    root_dir: Path | str | None = None,
) -> tuple[str, str]:
    _ensure_resources(root_dir)
    return report_generator.run(
        action_plan,
        activated_fms,
        activated_rps,
        normalized_signals,
        venue_context,
    )


def save_pipeline_artifacts(run_result: DiagnosticRunResult, raw_input: dict[str, Any]) -> dict[str, str]:
    resources = get_resources()
    resources.sample_outputs_dir.mkdir(parents=True, exist_ok=True)
    venue_context = raw_input.get("venue_context", {})
    venue_name = venue_context.get("venue_name", raw_input.get("venue_id", "unknown"))
    venue_slug = venue_name.lower().replace(" ", "_").replace("'", "")
    timestamp = datetime.now().strftime("%Y-%m-%d")

    report_path = resources.sample_outputs_dir / f"{venue_slug}_report_{timestamp}.md"
    pipeline_path = resources.sample_outputs_dir / f"{venue_slug}_pipeline_{timestamp}.json"

    report_path.write_text(run_result.report_md, encoding="utf-8")
    pipeline_path.write_text(
        __import__("json").dumps(
            {
                "venue_context": _report_context(raw_input),
                "normalized_signals": run_result.normalized_signals,
                "activated_failure_modes": run_result.failure_modes,
                "activated_response_patterns": [
                    {k: v for k, v in rp.items() if k != "triggering_fms"}
                    | {"triggering_fm_ids": [tfm["failure_mode_id"] for tfm in rp.get("triggering_fms", [])]}
                    for rp in run_result.response_patterns
                ],
                "action_plan": run_result.action_plan,
                "metadata": {
                    "engine_version": "3.0",
                    "report_type": run_result.report_type,
                    "generated_at": datetime.now().isoformat(),
                },
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return {"report_path": str(report_path), "pipeline_path": str(pipeline_path)}
