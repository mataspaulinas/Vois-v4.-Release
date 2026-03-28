import { describe, expect, it } from "vitest";

import { AssessmentHistoryItem } from "../../lib/api";
import { buildHistoryComparison } from "./historyInsights";

const assessments: AssessmentHistoryItem[] = [
  {
    id: "a3",
    created_at: "2026-03-14T09:00:00Z",
    notes: "Latest",
    selected_signal_count: 6,
    active_signal_names: ["Delay", "Confusion", "Absent manager", "Missed handoff"],
    engine_run_id: "run-3",
    plan_load_classification: "medium",
    plan_task_count: 7,
  },
  {
    id: "a2",
    created_at: "2026-03-12T09:00:00Z",
    notes: "Previous",
    selected_signal_count: 4,
    active_signal_names: ["Delay", "Confusion", "Tool friction"],
    engine_run_id: "run-2",
    plan_load_classification: "high",
    plan_task_count: 9,
  },
  {
    id: "a1",
    created_at: "2026-03-10T09:00:00Z",
    notes: "Oldest",
    selected_signal_count: 3,
    active_signal_names: ["Delay", "Tool friction"],
    engine_run_id: "run-1",
    plan_load_classification: null,
    plan_task_count: 5,
  },
];

describe("buildHistoryComparison", () => {
  it("compares latest against previous when nothing older is selected", () => {
    const comparison = buildHistoryComparison(assessments, "a3");

    expect(comparison).not.toBeNull();
    expect(comparison?.mode).toBe("latest_vs_previous");
    expect(comparison?.signalDelta).toBe(2);
    expect(comparison?.taskDelta).toBe(-2);
    expect(comparison?.addedSignals).toEqual(["Absent manager", "Missed handoff"]);
    expect(comparison?.removedSignals).toEqual(["Tool friction"]);
    expect(comparison?.loadShift).toBe("high -> medium");
  });

  it("compares a selected older snapshot against the latest snapshot", () => {
    const comparison = buildHistoryComparison(assessments, "a1");

    expect(comparison).not.toBeNull();
    expect(comparison?.mode).toBe("selected_vs_latest");
    expect(comparison?.baseline.id).toBe("a1");
    expect(comparison?.newer.id).toBe("a3");
    expect(comparison?.signalDelta).toBe(3);
    expect(comparison?.addedSignals).toEqual(["Confusion", "Absent manager", "Missed handoff"]);
    expect(comparison?.removedSignals).toEqual(["Tool friction"]);
    expect(comparison?.loadShift).toBe("saved_only -> medium");
  });
});
