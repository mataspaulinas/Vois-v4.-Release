from __future__ import annotations
import importlib
import os
import sys
from pathlib import Path
from typing import Any

from app.core.config import ROOT_DIR

class LegacyEngineService:
    """
    Bridge service that wraps the OIS 3.6 legacy diagnostic engine.
    This ensures behavioral parity with the "Gold Standard" during migration.
    """
    
    def run_legacy_analysis(self, raw_input: dict[str, Any], *, engine_mount_root: Path | str | None = None) -> dict[str, Any]:
        """
        Executes the extracted Phase 1 engine through a legacy-compatible shim.
        """
        os.environ["ANTHROPIC_API_KEY"] = ""
        legacy_input = self._normalize_legacy_input(raw_input)
        engine_api = _load_extracted_engine_api()
        run_result = engine_api.run_diagnostic(legacy_input, root_dir=engine_mount_root or _default_engine_mount_root())
        pipeline_data = self._normalize_pipeline_data(run_result.to_dict())

        return {
            "report_markdown": run_result.report_md,
            "pipeline_data": pipeline_data,
            "engine_version": "3.6-bridge",
            "status": "success" if run_result.report_md else "failed",
        }

    def _normalize_legacy_input(self, raw_input: dict[str, Any]) -> dict[str, Any]:
        signals = raw_input.get("signals")
        if not isinstance(signals, dict):
            signal_states = raw_input.get("signal_states") or {}
            selected_signal_ids = raw_input.get("selected_signal_ids") or []
            signals = {
                signal_id: {
                    "active": True,
                    **(signal_states.get(signal_id) or {}),
                }
                for signal_id in selected_signal_ids
            }
            for signal_id, state in signal_states.items():
                if signal_id not in signals:
                    signals[signal_id] = state

        normalized = {
            **raw_input,
            "assessment_date": raw_input.get("assessment_date"),
            "venue_context": raw_input.get("venue_context", {}),
            "signals": signals,
        }
        return normalized

    def _normalize_pipeline_data(self, raw_pipeline_data: dict[str, Any]) -> dict[str, Any]:
        metadata = raw_pipeline_data.get("metadata", {})
        action_plan = raw_pipeline_data.get("action_plan", {})
        constraint_report = raw_pipeline_data.get("constraint_report") or action_plan.get("summary", {})
        return {
            "normalized_signals": raw_pipeline_data.get("normalized_signals", []),
            "activated_failure_modes": raw_pipeline_data.get("failure_modes", []),
            "activated_response_patterns": raw_pipeline_data.get("response_patterns", []),
            "action_plan": action_plan,
            "metadata": {
                "engine_version": metadata.get("engine_version", "phase1-extracted"),
                "report_type": raw_pipeline_data.get("report_type", metadata.get("report_type", "legacy_markdown")),
            },
            "activation_set_raw": raw_pipeline_data.get("activation_set_raw", {}),
            "activation_context": raw_pipeline_data.get("activation_context", []),
            "activation_set_constrained": raw_pipeline_data.get("activation_set_constrained", {}),
            "constraint_report": constraint_report,
            "failure_modes": raw_pipeline_data.get("failure_modes", []),
            "response_patterns": raw_pipeline_data.get("response_patterns", []),
            "report_type": raw_pipeline_data.get("report_type", metadata.get("report_type", "legacy_markdown")),
            "load_classification": (
                constraint_report.get("plan_load")
                or action_plan.get("summary", {}).get("plan_load")
                or "moderate"
            ),
        }

    def _empty_pipeline_data(self, raw_input: dict[str, Any]) -> dict[str, Any]:
        return {
            "venue_context": raw_input.get("venue_context", {}),
            "normalized_signals": [],
            "activated_failure_modes": [],
            "activated_response_patterns": [],
            "action_plan": {"L1_tasks": [], "L2_tasks": [], "L3_tasks": [], "summary": {"plan_load": "light"}},
            "metadata": {"engine_version": "3.6-bridge", "report_type": "legacy_markdown"},
            "failure_modes": [],
            "response_patterns": [],
            "activation_set_raw": {},
            "activation_context": [],
            "activation_set_constrained": {},
            "constraint_report": {"plan_load": "light"},
            "report_type": "legacy_markdown",
            "load_classification": "light",
        }


def _default_engine_mount_root() -> Path:
    """Resolve the engine mount root for the legacy bridge.

    Resolution order:
    1. Explicit ``EXTRACTED_ENGINE_ROOT`` env var (highest precedence).
    2. First active mountable ontology pack that has an engine_mount directory.
    3. Raise if nothing is found.

    This no longer hardcodes ``cafe``.  The legacy bridge is developer-only
    so any active pack's engine mount is acceptable for parity testing.
    """
    configured_root = os.getenv("EXTRACTED_ENGINE_ROOT")
    if configured_root:
        return Path(configured_root).resolve()

    # Scan ontology_packs for a pack with an engine_mount directory.
    # Prefer "cafe" for backwards-compatibility with legacy parity test fixtures,
    # then fall back to any other pack that has an engine mount.
    packs_root = ROOT_DIR / "ontology_packs"
    if packs_root.exists():
        cafe_candidate = packs_root / "cafe" / "runtime" / "engine_mount"
        if cafe_candidate.exists():
            return cafe_candidate
        for pack_dir in sorted(packs_root.iterdir()):
            candidate = pack_dir / "runtime" / "engine_mount"
            if candidate.exists():
                return candidate

    raise RuntimeError(
        "No engine mount found under ontology_packs/*/runtime/engine_mount. "
        "Set EXTRACTED_ENGINE_ROOT or ensure at least one ontology pack has a runtime engine mount."
    )


def _load_extracted_engine_api():
    runtime_root = ROOT_DIR
    runtime_root_str = str(runtime_root)
    if runtime_root_str not in sys.path:
        sys.path.insert(0, runtime_root_str)
    return importlib.import_module("packages.engine_runtime.ois_engine.api")
