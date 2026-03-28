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
};

type InsightCard = {
  title: string;
  body: string;
  tone: "supportive" | "alert" | "neutral";
};

export function ManagerCopilot({
  nextActions,
  followUps,
  escalations,
  plan,
  executionSummary,
  venueName,
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

  const TONE_STYLES: Record<string, { border: string; icon: string }> = {
    supportive: { border: "var(--leaf)", icon: "+" },
    alert: { border: "var(--sunrise)", icon: "!" },
    neutral: { border: "var(--sky)", icon: "~" },
  };

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Copilot"
        title="Execution advisor"
        description="Supportive, practical guidance grounded in your venue's current execution state."
      >
        {insights.length === 0 ? (
          <div className="empty-state">
            <p>Everything looks on track. Keep moving through your task list.</p>
          </div>
        ) : (
          <div>
            {insights.map((insight, i) => {
              const style = TONE_STYLES[insight.tone] ?? TONE_STYLES.neutral;
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
