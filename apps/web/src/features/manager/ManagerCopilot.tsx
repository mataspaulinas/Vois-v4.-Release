import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import {
  EscalationRecord,
  FollowUpRecord,
  NextActionItem,
  PlanExecutionSummary,
  PlanRecord,
} from "../../lib/api";

type ManagerCopilotProps = {
  nextActions: NextActionItem[];
  followUps: FollowUpRecord[];
  escalations: EscalationRecord[];
  plan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  venueName: string;
  onAskCopilot?: (context: string) => void;
};

type InsightCard = {
  title: string;
  body: string;
  tone: "supportive" | "alert" | "neutral";
};

const TONE_COLORS: Record<string, { border: string; badge: string; badgeBg: string; icon: string }> = {
  supportive: {
    border: "var(--color-success, #10B981)",
    badge: "var(--color-success, #10B981)",
    badgeBg: "var(--color-success-soft, rgba(16,185,129,0.08))",
    icon: "+",
  },
  alert: {
    border: "var(--color-warning, #F59E0B)",
    badge: "var(--color-warning, #F59E0B)",
    badgeBg: "var(--color-warning-soft, rgba(245,158,11,0.08))",
    icon: "!",
  },
  neutral: {
    border: "var(--color-info, #6366F1)",
    badge: "var(--color-info, #6366F1)",
    badgeBg: "var(--color-info-soft, rgba(99,102,241,0.08))",
    icon: "~",
  },
};

export function ManagerCopilot({
  nextActions,
  followUps,
  escalations,
  plan,
  executionSummary,
  venueName,
  onAskCopilot,
}: ManagerCopilotProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const insights = generateManagerInsights({
    nextActions,
    followUps,
    escalations,
    plan,
    executionSummary,
    venueName,
  });

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Copilot"
        title="Execution advisor"
        description="Supportive, practical guidance grounded in your venue's current execution state."
      >
        {onAskCopilot && (
          <div style={{
            marginBottom: 20,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(108, 92, 231, 0.04)",
            border: "1px solid rgba(108, 92, 231, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Get live AI analysis of your current execution state, follow-ups, and team pressure.
            </div>
            <button
              onClick={() => {
                const completionPct = executionSummary?.completion_percentage ?? 0;
                const overdue = followUps.filter(fu => fu.is_overdue).length;
                const escalationCount = escalations.filter(e => e.status === "open").length;
                const actionCount = nextActions.length;
                onAskCopilot(
                  `Analyze my current manager execution state for ${venueName ?? "this venue"}:\n` +
                  `- Plan completion: ${completionPct.toFixed(0)}%\n` +
                  `- Actions pending: ${actionCount}\n` +
                  `- Overdue follow-ups: ${overdue}\n` +
                  `- Open escalations: ${escalationCount}\n` +
                  `What should I focus on right now? What risks am I not seeing? Give me 3 actionable priorities.`
                );
              }}
              style={{
                background: "var(--color-accent)",
                border: "none",
                color: "var(--color-surface)",
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "opacity 180ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Get live analysis
            </button>
          </div>
        )}
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
              Everything looks on track. Keep moving through your task list.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-12)" }}>
            {insights.map((insight, i) => {
              const tone = TONE_COLORS[insight.tone] ?? TONE_COLORS.neutral;
              const isOpen = expandedIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => setExpandedIndex(isOpen ? null : i)}
                  style={{
                    padding: "var(--spacing-20)",
                    borderLeft: `3px solid ${tone.border}`,
                    borderRadius: "var(--radius-md, 12px)",
                    background: "var(--color-surface, #FFFFFF)",
                    border: `1px solid var(--color-border-subtle, #E5E5E5)`,
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


function generateManagerInsights(ctx: {
  nextActions: NextActionItem[];
  followUps: FollowUpRecord[];
  escalations: EscalationRecord[];
  plan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  venueName: string;
}): InsightCard[] {
  const insights: InsightCard[] = [];
  const { nextActions, followUps, escalations, plan, executionSummary, venueName } = ctx;

  const overdueCount = followUps.filter((fu) => fu.is_overdue).length;
  const openEscCount = escalations.filter((e) => e.status === "open").length;
  const completion = executionSummary?.completion_percentage ?? 0;
  const blockedCount = executionSummary?.blocked_tasks.length ?? 0;
  const readyCount = executionSummary?.next_executable_tasks.length ?? 0;

  // Opening context
  if (plan) {
    if (completion >= 80) {
      insights.push({
        title: `${venueName} is ${completion.toFixed(0)}% through the plan`,
        body: "Strong progress. Focus on closing out the remaining tasks cleanly. Evidence of completion strengthens the audit trail.",
        tone: "supportive",
      });
    } else if (completion >= 40) {
      insights.push({
        title: `Mid-execution: ${completion.toFixed(0)}% complete`,
        body: `${readyCount} task${readyCount !== 1 ? "s" : ""} ready to start. The key at this stage is momentum — pick the highest-leverage ready task and move it.`,
        tone: "neutral",
      });
    } else {
      insights.push({
        title: "Early in the plan",
        body: "Focus on the first 2-3 tasks in order. Don't try to parallelize too early — the dependency chain is designed to build on itself.",
        tone: "supportive",
      });
    }
  } else {
    insights.push({
      title: "No operational plan yet",
      body: "Run an assessment and engine cycle to generate a sequenced plan. The plan is the foundation for execution tracking.",
      tone: "neutral",
    });
  }

  // Overdue alert
  if (overdueCount > 0) {
    insights.push({
      title: `${overdueCount} follow-up${overdueCount > 1 ? "s" : ""} overdue`,
      body: "Overdue follow-ups are the highest priority. Either complete them, extend the deadline, or escalate. Leaving them unresolved creates compounding friction.",
      tone: "alert",
    });
  }

  // Escalation alert
  if (openEscCount > 0) {
    insights.push({
      title: `${openEscCount} open escalation${openEscCount > 1 ? "s" : ""}`,
      body: "Open escalations need resolution or acknowledgment. Each one is a signal that normal execution can't handle the situation — escalate to the owner if you need support.",
      tone: "alert",
    });
  }

  // Blocked tasks
  if (blockedCount > 0) {
    insights.push({
      title: `${blockedCount} task${blockedCount > 1 ? "s" : ""} blocked`,
      body: "Blocked tasks are waiting on dependencies. Check if the blocking tasks can be prioritized, or whether the block represents a real constraint that needs escalation.",
      tone: "neutral",
    });
  }

  // Next action guidance
  if (nextActions.length > 0) {
    const top = nextActions[0];
    insights.push({
      title: `Top priority: ${top.title}`,
      body: `${top.context}. Working top-down through the action list is the most efficient path.`,
      tone: "supportive",
    });
  }

  return insights;
}
