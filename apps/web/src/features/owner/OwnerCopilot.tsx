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

const TONE_COLORS: Record<string, { border: string; badge: string; badgeBg: string; icon: string }> = {
  strategic: {
    border: "var(--color-accent, #6C5CE7)",
    badge: "var(--color-accent, #6C5CE7)",
    badgeBg: "var(--color-accent-soft, rgba(108,92,231,0.08))",
    icon: "S",
  },
  warning: {
    border: "var(--color-warning, #F59E0B)",
    badge: "var(--color-warning, #F59E0B)",
    badgeBg: "var(--color-warning-soft, rgba(245,158,11,0.08))",
    icon: "!",
  },
  opportunity: {
    border: "var(--color-success, #10B981)",
    badge: "var(--color-success, #10B981)",
    badgeBg: "var(--color-success-soft, rgba(16,185,129,0.08))",
    icon: "+",
  },
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
          <div
            style={{
              padding: "var(--spacing-48) var(--spacing-24)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-body, 15px)",
                color: "var(--color-text-muted, #A3A3A3)",
              }}
            >
              Portfolio is stable. No strategic actions needed right now.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-12)" }}>
            {insights.map((insight, i) => {
              const tone = TONE_COLORS[insight.tone] ?? TONE_COLORS.strategic;
              const isOpen = expandedIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => setExpandedIndex(isOpen ? null : i)}
                  style={{
                    padding: "var(--spacing-20)",
                    borderRadius: "var(--radius-md, 12px)",
                    background: "var(--color-surface, #FFFFFF)",
                    border: "1px solid var(--color-border-subtle, #E5E5E5)",
                    borderLeftWidth: 3,
                    borderLeftColor: tone.border,
                    boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
                    cursor: "pointer",
                    transition: "box-shadow var(--motion-fast) var(--easing-standard)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-12)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: "var(--radius-full, 9999px)",
                        background: tone.badgeBg,
                        color: tone.badge,
                        fontWeight: "var(--weight-bold, 700)" as any,
                        fontSize: "var(--text-small, 13px)",
                        flexShrink: 0,
                      }}
                    >
                      {tone.icon}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--text-body, 15px)",
                        fontWeight: "var(--weight-medium, 500)",
                        color: "var(--color-text-primary, #0A0A0A)",
                      }}
                    >
                      {insight.title}
                    </span>
                  </div>
                  {isOpen ? (
                    <div
                      style={{
                        marginTop: "var(--spacing-12)",
                        paddingLeft: 36,
                        fontSize: "var(--text-body, 15px)",
                        lineHeight: "var(--lh-loose, 1.6)",
                        color: "var(--color-text-secondary, #525252)",
                      }}
                    >
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
