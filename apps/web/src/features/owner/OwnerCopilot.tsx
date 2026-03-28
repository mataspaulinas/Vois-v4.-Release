import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import {
  AttentionItem,
  DelegationEntry,
  ExecutionVelocity,
  FlightRiskEntry,
  OverloadEntry,
} from "../../lib/api";

type OwnerCopilotProps = {
  attentionItems: AttentionItem[];
  delegations: DelegationEntry[];
  velocities: ExecutionVelocity[];
  overloadMap: OverloadEntry[];
  flightRisk: FlightRiskEntry[];
  venueName: string;
};

type StrategicInsight = {
  title: string;
  body: string;
  tone: "strategic" | "warning" | "opportunity";
};

const TONE_STYLES: Record<string, { border: string; icon: string }> = {
  strategic: { border: "var(--ois-coral, #FF6B5A)", icon: "S" },
  warning: { border: "var(--sunrise)", icon: "!" },
  opportunity: { border: "var(--leaf)", icon: "+" },
};

export function OwnerCopilot({
  attentionItems,
  delegations,
  velocities,
  overloadMap,
  flightRisk,
  venueName,
}: OwnerCopilotProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const insights = generateOwnerInsights({
    attentionItems,
    delegations,
    velocities,
    overloadMap,
    flightRisk,
    venueName,
  });

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Copilot"
        title="Strategic advisor"
        description="Direct, strategic guidance for portfolio-level decisions."
      >
        {insights.length === 0 ? (
          <div className="empty-state">
            <p>Portfolio is stable. No strategic actions needed right now.</p>
          </div>
        ) : (
          <div>
            {insights.map((insight, i) => {
              const style = TONE_STYLES[insight.tone] ?? TONE_STYLES.strategic;
              return (
                <div
                  key={i}
                  style={{
                    padding: "var(--spacing-md)",
                    borderLeft: `3px solid ${style.border}`,
                    marginBottom: "var(--spacing-sm)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-raised)",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: style.border, width: 20, textAlign: "center" }}>
                      {style.icon}
                    </span>
                    <span style={{ fontWeight: 500 }}>{insight.title}</span>
                  </div>
                  {expandedIndex === i ? (
                    <div style={{ marginTop: "var(--spacing-sm)", paddingLeft: 28, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {insight.body}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}


function generateOwnerInsights(ctx: {
  attentionItems: AttentionItem[];
  delegations: DelegationEntry[];
  velocities: ExecutionVelocity[];
  overloadMap: OverloadEntry[];
  flightRisk: FlightRiskEntry[];
  venueName: string;
}): StrategicInsight[] {
  const insights: StrategicInsight[] = [];
  const { attentionItems, delegations, velocities, overloadMap, flightRisk } = ctx;

  // Critical attention items
  const critical = attentionItems.filter((a) => a.severity === "critical" || a.severity === "high");
  if (critical.length > 0) {
    insights.push({
      title: `${critical.length} high-priority item${critical.length > 1 ? "s" : ""} need your attention`,
      body: `${critical.map((c) => `${c.title} at ${c.venue_name}`).join(". ")}. These require owner-level decisions — don't delegate these back down.`,
      tone: "warning",
    });
  }

  // Delegation health
  const overdueDelegations = delegations.filter((d) => d.is_overdue);
  if (overdueDelegations.length > 0) {
    insights.push({
      title: `${overdueDelegations.length} delegation${overdueDelegations.length > 1 ? "s" : ""} overdue`,
      body: "Overdue delegations signal either unclear expectations, insufficient resources, or the wrong person on the task. Don't just extend — ask why it's late.",
      tone: "warning",
    });
  } else if (delegations.length > 0) {
    insights.push({
      title: "All delegations on track",
      body: "Your team is executing against deadlines. Consider adding evidence requirements to key delegations for audit readiness.",
      tone: "opportunity",
    });
  }

  // Venue velocity spread
  const stalled = velocities.filter((v) => v.velocity_label === "stalled");
  const strong = velocities.filter((v) => v.velocity_label === "strong");
  if (stalled.length > 0) {
    insights.push({
      title: `${stalled.length} venue${stalled.length > 1 ? "s" : ""} stalled`,
      body: "A stalled venue means no tasks are moving. This usually means either the plan doesn't match reality or the manager isn't engaged. Investigate before pushing harder.",
      tone: "strategic",
    });
  }
  if (strong.length > 0) {
    insights.push({
      title: `${strong.length} venue${strong.length > 1 ? "s" : ""} performing strongly`,
      body: "Strong venues can serve as models. Consider having these managers share their approach with struggling venues.",
      tone: "opportunity",
    });
  }

  // People risks
  const highOverload = overloadMap.filter((o) => o.risk_level === "high");
  if (highOverload.length > 0) {
    insights.push({
      title: `${highOverload.length} team member${highOverload.length > 1 ? "s" : ""} at high overload`,
      body: `${highOverload.map((o) => o.full_name).join(", ")} — ${highOverload[0].risk_factors[0]}. Sustained overload leads to quality drops and turnover. Redistribute or hire.`,
      tone: "warning",
    });
  }

  if (flightRisk.length > 0) {
    insights.push({
      title: `${flightRisk.length} potential flight risk${flightRisk.length > 1 ? "s" : ""}`,
      body: "Flight risk indicators include declining engagement, rising friction, and diary silence. Have a direct 1:1 before it becomes a resignation.",
      tone: "strategic",
    });
  }

  // Portfolio-level strategy
  if (insights.length === 0) {
    insights.push({
      title: "Portfolio is stable",
      body: "No immediate issues. Use this window to invest in standards, training, or next assessment cycle preparation.",
      tone: "opportunity",
    });
  }

  return insights;
}
