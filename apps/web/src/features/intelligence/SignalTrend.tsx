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

const TREND_STYLES: Record<TrendDirection, { label: string; color: string; arrow: "down" | "flat" | "up" }> = {
  improving: { label: "Improving", color: "var(--color-success)", arrow: "down" },
  stable: { label: "Stable", color: "var(--color-text-muted)", arrow: "flat" },
  worsening: { label: "Worsening", color: "var(--color-danger)", arrow: "up" },
};

/** CSS-based arrow indicators */
function TrendArrow({ direction }: { direction: "down" | "flat" | "up" }) {
  if (direction === "flat") {
    return (
      <span style={{
        display: "inline-block",
        width: 10,
        height: 2,
        background: "currentColor",
        borderRadius: 1,
        verticalAlign: "middle",
      }} />
    );
  }
  const isUp = direction === "up";
  return (
    <span style={{
      display: "inline-block",
      width: 0,
      height: 0,
      borderLeft: "4px solid transparent",
      borderRight: "4px solid transparent",
      ...(isUp
        ? { borderBottom: "6px solid currentColor" }
        : { borderTop: "6px solid currentColor" }),
      verticalAlign: "middle",
    }} />
  );
}

export function SignalTrendBadge({ direction }: { direction: TrendDirection }) {
  const style = TREND_STYLES[direction];
  return (
    <span
      title={style.label}
      style={{
        color: style.color,
        fontWeight: 600,
        fontSize: 13,
        marginLeft: 6,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <TrendArrow direction={style.arrow} />
    </span>
  );
}
