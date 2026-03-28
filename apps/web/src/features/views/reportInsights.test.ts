import { describe, expect, it } from "vitest";

import { PersistedEngineRunRecord } from "../../lib/api";
import { buildReportComparison } from "./reportInsights";

const history: PersistedEngineRunRecord[] = [
  {
    engine_run_id: "run-3",
    assessment_id: "a3",
    venue_id: "v1",
    plan_id: "p3",
    ontology_version: "v4",
    load_classification: "medium",
    summary: "Latest",
    diagnostic_spine: [],
    investigation_threads: [],
    verification_briefs: [],
    active_signal_names: ["Delay", "Confusion", "Manager absence"],
    plan_task_count: 6,
    created_at: "2026-03-14T09:00:00Z",
  },
  {
    engine_run_id: "run-2",
    assessment_id: "a2",
    venue_id: "v1",
    plan_id: "p2",
    ontology_version: "v4",
    load_classification: "high",
    summary: "Previous",
    diagnostic_spine: [],
    investigation_threads: [],
    verification_briefs: [],
    active_signal_names: ["Delay", "Confusion"],
    plan_task_count: 8,
    created_at: "2026-03-13T09:00:00Z",
  },
];

describe("buildReportComparison", () => {
  it("compares latest against previous when latest is selected", () => {
    const comparison = buildReportComparison(history, "run-3");

    expect(comparison?.mode).toBe("latest_vs_previous");
    expect(comparison?.signalDelta).toBe(1);
    expect(comparison?.taskDelta).toBe(-2);
    expect(comparison?.loadShift).toBe("high -> medium");
    expect(comparison?.addedSignals).toEqual(["Manager absence"]);
    expect(comparison?.removedSignals).toEqual([]);
  });

  it("compares latest against a selected historical report", () => {
    const comparison = buildReportComparison(history, "run-2");

    expect(comparison?.mode).toBe("latest_vs_selected");
    expect(comparison?.newer.engine_run_id).toBe("run-3");
    expect(comparison?.baseline.engine_run_id).toBe("run-2");
  });
});
