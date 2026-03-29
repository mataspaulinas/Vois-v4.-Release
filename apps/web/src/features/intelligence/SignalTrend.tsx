import { AssessmentHistoryItem } from "../../lib/api";

export type TrendDirection = "improving" | "stable" | "worsening";

/**
 * Compute trend direction for a signal based on its occurrence
 * in the last 3 assessments compared to the 3 before that.
 */
export function computeSignalTrend(signalId: string, history: AssessmentHistoryItem[]): TrendDirection {
  if (history.length < 4) return "stable";
  const sorted = [...history].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const recent = sorted.slice(0, 3);
  const prior = sorted.slice(3, 6);
  const recentCount = recent.filter((a) => (a.active_signal_names ?? []).includes(signalId)).length;
  const priorCount = prior.filter((a) => (a.active_signal_names ?? []).includes(signalId)).length;
  if (recentCount < priorCount) return "improving";
  if (recentCount > priorCount) return "worsening";
  return "stable";
}

const TREND_STYLES: Record<TrendDirection, { symbol: string; color: string; label: string }> = {
  improving: { symbol: "\u2193", color: "var(--color-success)", label: "Improving" },
  stable: { symbol: "\u2014", color: "var(--color-text-muted)", label: "Stable" },
  worsening: { symbol: "\u2191", color: "var(--color-danger)", label: "Worsening" },
};

export function SignalTrendBadge({ direction }: { direction: TrendDirection }) {
  const style = TREND_STYLES[direction];
  return (
    <span
      title={style.label}
      style={{
        color: style.color,
        fontWeight: 700,
        fontSize: "var(--text-small)",
        marginLeft: "var(--spacing-4)",
      }}
    >
      {style.symbol}
    </span>
  );
}
