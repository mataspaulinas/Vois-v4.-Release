import { AssessmentHistoryItem } from "../../lib/api";

export type HistoryComparison = {
  mode: "latest_vs_previous" | "selected_vs_latest";
  newer: AssessmentHistoryItem;
  baseline: AssessmentHistoryItem;
  signalDelta: number;
  taskDelta: number;
  addedSignals: string[];
  removedSignals: string[];
  loadShift: string;
};

export function buildHistoryComparison(
  assessments: AssessmentHistoryItem[],
  selectedAssessmentId: string | null
): HistoryComparison | null {
  if (assessments.length < 2) {
    return null;
  }

  const latest = assessments[0];
  const selected = selectedAssessmentId
    ? assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null
    : null;

  if (selected && selected.id !== latest.id) {
    return compareAssessments("selected_vs_latest", latest, selected);
  }

  return compareAssessments("latest_vs_previous", latest, assessments[1]);
}

function compareAssessments(
  mode: HistoryComparison["mode"],
  newer: AssessmentHistoryItem,
  baseline: AssessmentHistoryItem
): HistoryComparison {
  const newerSignals = new Set(newer.active_signal_names);
  const baselineSignals = new Set(baseline.active_signal_names);

  return {
    mode,
    newer,
    baseline,
    signalDelta: newer.selected_signal_count - baseline.selected_signal_count,
    taskDelta: newer.plan_task_count - baseline.plan_task_count,
    addedSignals: [...newerSignals].filter((signal) => !baselineSignals.has(signal)),
    removedSignals: [...baselineSignals].filter((signal) => !newerSignals.has(signal)),
    loadShift: describeLoadShift(baseline.plan_load_classification, newer.plan_load_classification),
  };
}

function describeLoadShift(previous: string | null, next: string | null) {
  const baseline = previous ?? "saved_only";
  const current = next ?? "saved_only";
  if (baseline === current) {
    return `${current} unchanged`;
  }
  return `${baseline} -> ${current}`;
}
