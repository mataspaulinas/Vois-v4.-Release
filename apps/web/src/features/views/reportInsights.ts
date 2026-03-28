import { PersistedEngineRunRecord } from "../../lib/api";

export type ReportComparison = {
  mode: "latest_vs_previous" | "latest_vs_selected";
  newer: PersistedEngineRunRecord;
  baseline: PersistedEngineRunRecord;
  signalDelta: number;
  taskDelta: number;
  loadShift: string;
  addedSignals: string[];
  removedSignals: string[];
};

export function buildReportComparison(
  engineRunHistory: PersistedEngineRunRecord[],
  selectedEngineRunId: string | null
): ReportComparison | null {
  if (engineRunHistory.length < 2) {
    return null;
  }

  const latest = engineRunHistory[0];
  const selected =
    (selectedEngineRunId
      ? engineRunHistory.find((run) => run.engine_run_id === selectedEngineRunId) ?? latest
      : latest);

  if (selected.engine_run_id !== latest.engine_run_id) {
    return compare("latest_vs_selected", latest, selected);
  }

  return compare("latest_vs_previous", latest, engineRunHistory[1]);
}

function compare(
  mode: ReportComparison["mode"],
  newer: PersistedEngineRunRecord,
  baseline: PersistedEngineRunRecord
): ReportComparison {
  const newerSignals = new Set(newer.active_signal_names);
  const baselineSignals = new Set(baseline.active_signal_names);

  return {
    mode,
    newer,
    baseline,
    signalDelta: newer.active_signal_names.length - baseline.active_signal_names.length,
    taskDelta: newer.plan_task_count - baseline.plan_task_count,
    loadShift: `${baseline.load_classification} -> ${newer.load_classification}`,
    addedSignals: [...newerSignals].filter((signal) => !baselineSignals.has(signal)),
    removedSignals: [...baselineSignals].filter((signal) => !newerSignals.has(signal)),
  };
}
