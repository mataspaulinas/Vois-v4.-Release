import importlib
import io
import json
import os
import sys
from contextlib import contextmanager, redirect_stdout
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
PHASE0_FIXTURES = ROOT / "docs" / "migration" / "phase0" / "fixtures"
PHASE1_DIR = ROOT / "docs" / "migration" / "phase1"
LEGACY_ENGINE_DIR = ROOT / "04_engine"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(LEGACY_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(LEGACY_ENGINE_DIR))

from packages.engine.ois_engine import configure_resources as configure_extracted_resources
from packages.engine.ois_engine import run_diagnostic as run_extracted_diagnostic


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


@contextmanager
def patched_env(**updates: str | None):
    previous = {key: os.environ.get(key) for key in updates}
    try:
        for key, value in updates.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def load_legacy_modules() -> dict[str, Any]:
    names = [
        "signal_normalization",
        "failure_mode_engine",
        "response_pattern_engine",
        "block_activation_engine",
        "constraint_engine",
        "plan_generator",
        "report_generator",
    ]
    return {name: importlib.import_module(name) for name in names}


def run_legacy_diagnostic(raw_input: dict[str, Any]) -> dict[str, Any]:
    modules = load_legacy_modules()
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        normalized_signals = modules["signal_normalization"].run(raw_input)
        failure_modes = modules["failure_mode_engine"].run(normalized_signals)
        response_patterns = modules["response_pattern_engine"].run(failure_modes)
        activation_set_raw, activation_context = modules["block_activation_engine"].run(response_patterns)
        activation_set_constrained, constraint_report = modules["constraint_engine"].run(
            activation_set=activation_set_raw,
            activation_context=activation_context,
            venue_context=raw_input.get("venue_context", {}),
            normalized_signals=normalized_signals,
            triage_enabled=raw_input.get("triage_enabled", False),
            triage_intensity=raw_input.get("triage_intensity", "balanced"),
        )
        action_plan = modules["plan_generator"].run(
            activation_set_constrained,
            activation_context,
            failure_modes,
            response_patterns,
            normalized_signals,
        )
        report_md, report_type = modules["report_generator"].run(
            action_plan,
            failure_modes,
            response_patterns,
            normalized_signals,
            {
                **raw_input.get("venue_context", {}),
                "venue_id": raw_input.get("venue_id", "unknown"),
                "assessment_date": raw_input.get("assessment_date", ""),
                "assessment_type": raw_input.get("assessment_type", "full_diagnostic"),
            },
        )
    return {
        "normalized_signals": normalized_signals,
        "failure_modes": failure_modes,
        "response_patterns": response_patterns,
        "activation_set_raw": activation_set_raw,
        "activation_context": activation_context,
        "activation_set_constrained": activation_set_constrained,
        "constraint_report": constraint_report,
        "action_plan": action_plan,
        "report_md": report_md,
        "report_type": report_type,
        "console": buffer.getvalue(),
    }


def run_extracted(raw_input: dict[str, Any]) -> dict[str, Any]:
    configure_extracted_resources(root_dir=ROOT)
    return run_extracted_diagnostic(raw_input, root_dir=ROOT).to_dict()


def compare_payloads(left: dict[str, Any], right: dict[str, Any]) -> list[str]:
    diffs: list[str] = []
    keys = [
        "normalized_signals",
        "failure_modes",
        "response_patterns",
        "activation_set_raw",
        "activation_context",
        "activation_set_constrained",
        "constraint_report",
        "action_plan",
        "report_md",
        "report_type",
    ]
    for key in keys:
        if canonical_json(left.get(key)) != canonical_json(right.get(key)):
            diffs.append(key)
    return diffs


def compare_to_fixture_goldens(fixture_dir: Path, extracted: dict[str, Any]) -> list[str]:
    diffs: list[str] = []
    expected_by_file = {
        "golden_normalized_signals.json": extracted["normalized_signals"],
        "golden_failure_modes.json": extracted["failure_modes"],
        "golden_response_patterns.json": extracted["response_patterns"],
        "golden_activation_set_raw.json": extracted["activation_set_raw"],
        "golden_activation_context.json": extracted["activation_context"],
        "golden_activation_set_constrained.json": extracted["activation_set_constrained"],
        "golden_constraint_report.json": extracted["constraint_report"],
        "golden_action_plan.json": extracted["action_plan"],
        "golden_summary.json": None,
    }
    for filename, payload in expected_by_file.items():
        if filename == "golden_summary.json":
            continue
        if canonical_json(read_json(fixture_dir / filename)) != canonical_json(payload):
            diffs.append(filename)
    if (fixture_dir / "golden_report.md").read_text(encoding="utf-8") != extracted["report_md"]:
        diffs.append("golden_report.md")
    return diffs


def main() -> int:
    PHASE1_DIR.mkdir(parents=True, exist_ok=True)
    fixture_dirs = sorted(path for path in PHASE0_FIXTURES.iterdir() if path.is_dir())

    deterministic_results = []
    phase0_comparison = []

    with patched_env(ANTHROPIC_API_KEY="", OIS_CLAUDE_MODEL=None):
        for fixture_dir in fixture_dirs:
            raw_input = read_json(fixture_dir / "fixture_input.json")
            legacy = run_legacy_diagnostic(raw_input)
            extracted = run_extracted(raw_input)
            deterministic_results.append(
                {
                    "fixture_id": fixture_dir.name,
                    "diff_keys": compare_payloads(legacy, extracted),
                }
            )

    for fixture_dir in fixture_dirs:
        raw_input = read_json(fixture_dir / "fixture_input.json")
        extracted = run_extracted(raw_input)
        phase0_comparison.append(
            {
                "fixture_id": fixture_dir.name,
                "diff_files": compare_to_fixture_goldens(fixture_dir, extracted),
                "report_type": extracted["report_type"],
            }
        )

    summary = {
        "deterministic_legacy_vs_extracted": deterministic_results,
        "phase0_goldens_vs_extracted": phase0_comparison,
        "legacy_vs_extracted_clean": all(not item["diff_keys"] for item in deterministic_results),
        "phase0_fixture_match_clean": all(not item["diff_files"] for item in phase0_comparison),
    }

    (PHASE1_DIR / "parity_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    if summary["legacy_vs_extracted_clean"]:
        print("Legacy vs extracted deterministic parity: PASS")
    else:
        print("Legacy vs extracted deterministic parity: FAIL")
        for item in deterministic_results:
            if item["diff_keys"]:
                print(f" - {item['fixture_id']}: {', '.join(item['diff_keys'])}")

    print("Phase 0 goldens vs extracted:")
    for item in phase0_comparison:
        label = "PASS" if not item["diff_files"] else "DIFF"
        details = "" if not item["diff_files"] else f" ({', '.join(item['diff_files'])})"
        print(f" - {item['fixture_id']}: {label}{details}")

    return 0 if summary["legacy_vs_extracted_clean"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
