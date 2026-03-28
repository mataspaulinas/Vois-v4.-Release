"""
OIS v3 — Main Engine Orchestrator
Chains Steps 1-6 of the Full Architecture into a single execution pipeline.

Usage:
    python engine.py <input_file.json>
    python engine.py  (uses default test input)

Architecture Flow:
    Step 1: Signal Normalization    → normalized signal rows
    Step 2: Failure Mode Engine     → activated failure modes
    Step 3: Response Pattern Engine → activated response patterns
    Step 4: Block Activation Engine → raw activation set
    Step 5: Plan Generator          → structured action plan
    Step 6: Report Generator        → human-readable report
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

from .api import run_diagnostic, save_pipeline_artifacts
from .resources import get_resources


def load_input(input_path=None):
    """Load the raw assessment input file."""
    if input_path and Path(input_path).exists():
        with open(input_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    # Try default test input
    default_path = get_resources().data_dir / "sample_inputs" / "rosehip_signals.json"
    if default_path.exists():
        with open(default_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    print("ERROR: No input file found. Usage: python engine.py <input_file.json>")
    sys.exit(1)


def run_pipeline(raw_input):
    """Execute the full 6-step OIS pipeline."""
    result = run_diagnostic(raw_input)
    venue_context = raw_input.get("venue_context", {})
    venue_name = venue_context.get("venue_name", raw_input.get("venue_id", "Unknown Venue"))
    
    print(f"")
    print(f"{'='*60}")
    print(f"  OIS v3 — Operational Intelligence System")
    print(f"  Venue: {venue_name}")
    print(f"  Date: {raw_input.get('assessment_date', datetime.now().strftime('%Y-%m-%d'))}")
    print(f"{'='*60}")
    print(f"")
    print(result.console, end="")
    artifacts = save_pipeline_artifacts(result, raw_input)
    
    print(f"\n{'='*60}")
    print(f"  Pipeline complete!")
    print(f"  Report ({result.report_type}): {artifacts['report_path']}")
    print(f"  Pipeline data: {artifacts['pipeline_path']}")
    print(f"{'='*60}")
    
    return result.report_md


def main():
    """CLI entry point."""
    # Load .env file if present
    env_path = get_resources().env_file
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()
    
    input_path = sys.argv[1] if len(sys.argv) > 1 else None
    raw_input = load_input(input_path)
    run_pipeline(raw_input)


if __name__ == "__main__":
    main()
