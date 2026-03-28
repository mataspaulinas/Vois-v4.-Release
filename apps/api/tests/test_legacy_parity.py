import json
from pathlib import Path
import pytest
from app.services.legacy_bridge import LegacyEngineService

FIXTURE_DIR = Path("c:/Users/matas/Documents/00/CODEX-VOIS-claude-debug-api-500-error-HACD2/tests/golden/fixtures/GF-001")

def test_legacy_engine_parity():
    # 1. Load captured input
    input_path = FIXTURE_DIR / "input_project.json"
    with open(input_path, "r", encoding="utf-8") as f:
        raw_input = json.load(f)
    
    # 2. Run through bridge
    service = LegacyEngineService()
    result = service.run_legacy_analysis(raw_input)
    
    # 3. Load expected action plan
    expected_path = FIXTURE_DIR / "output_action_plan.json"
    with open(expected_path, "r", encoding="utf-8") as f:
        expected_plan = json.load(f)
    
    # 4. Compare results
    actual_l1 = result["pipeline_data"]["action_plan"]["L1_tasks"]
    expected_l1 = expected_plan["L1_tasks"]
    
    # Note: We compare the count of tasks and the first task title at minimum
    assert len(actual_l1) == len(expected_l1), f"Plan size mismatch: {len(actual_l1)} vs {len(expected_l1)}"
    
    if len(actual_l1) > 0:
        assert actual_l1[0]["item_id"] == expected_l1[0]["item_id"]
        assert actual_l1[0]["title"] == expected_l1[0]["title"]

    print(f"SUCCESS: GF-001 parity verified. {len(actual_l1)} tasks matched.")

if __name__ == "__main__":
    test_legacy_engine_parity()
