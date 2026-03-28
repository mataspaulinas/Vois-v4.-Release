import { SectionCard } from "../../components/SectionCard";
import {
  EscalationRecord,
  FollowUpRecord,
  NextActionItem,
  PlanExecutionSummary,
  PlanRecord,
} from "../../lib/api";

type TodayBoardProps = {
  nextActions: NextActionItem[];
  followUps: FollowUpRecord[];
  escalations: EscalationRecord[];
  plan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onOpenTask: (taskId: string) => void;
  onOpenFollowUp: (followUpId: string) => void;
  onOpenEscalation: (escalationId: string) => void;
};

const PRIORITY_LABELS: Record<string, string> = {
  overdue_follow_up: "Overdue",
  open_escalation: "Escalation",
  pending_follow_up: "Follow-up",
  in_progress_task: "In progress",
};

const PRIORITY_COLORS: Record<string, string> = {
  overdue_follow_up: "var(--sunrise)",
  open_escalation: "var(--sunrise)",
  pending_follow_up: "var(--gold)",
  in_progress_task: "var(--sky)",
};

export function TodayBoard({
  nextActions,
  followUps,
  escalations,
  plan,
  executionSummary,
  loading,
  formatTimestamp,
  onOpenTask,
  onOpenFollowUp,
  onOpenEscalation,
}: TodayBoardProps) {
  const overdueCount = followUps.filter((fu) => fu.is_overdue).length;
  const openEscalationCount = escalations.filter((e) => e.status === "open").length;
  const completionPct = executionSummary?.completion_percentage ?? 0;
  const readyCount = executionSummary?.next_executable_tasks.length ?? 0;

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Manager"
        title="Today's board"
        description="Auto-prioritized daily view. Work the list top to bottom."
      >
        {loading ? (
          <div className="empty-state"><p>Loading your day...</p></div>
        ) : (
          <>
            <div className="highlight-grid">
              <div className="focus-card focus-card-primary">
                <div className="focus-card-value">{nextActions.length}</div>
                <div className="focus-card-label">Actions today</div>
              </div>
              <div className="focus-card" style={{ borderLeft: `3px solid ${overdueCount > 0 ? "var(--sunrise)" : "var(--leaf)"}` }}>
                <div className="focus-card-value">{overdueCount}</div>
                <div className="focus-card-label">Overdue</div>
              </div>
              <div className="focus-card" style={{ borderLeft: `3px solid ${openEscalationCount > 0 ? "var(--sunrise)" : "var(--leaf)"}` }}>
                <div className="focus-card-value">{openEscalationCount}</div>
                <div className="focus-card-label">Escalations</div>
              </div>
              <div className="focus-card">
                <div className="focus-card-value">{completionPct.toFixed(0)}%</div>
                <div className="focus-card-label">Plan progress</div>
              </div>
            </div>

            {nextActions.length === 0 ? (
              <div className="empty-state">
                <p>Nothing pressing right now. All follow-ups are on track.</p>
              </div>
            ) : (
              <div className="data-table-container" style={{ marginTop: "var(--spacing-md)" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "100px" }}>Priority</th>
                      <th>Action</th>
                      <th>Context</th>
                      <th style={{ width: "120px" }}>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextActions.map((action) => (
                      <tr
                        key={`${action.action_type}-${action.entity_id}`}
                        className="clickable-row"
                        onClick={() => {
                          if (action.action_type.includes("follow_up")) onOpenFollowUp(action.entity_id);
                          else if (action.action_type === "open_escalation") onOpenEscalation(action.entity_id);
                          else onOpenTask(action.entity_id);
                        }}
                      >
                        <td>
                          <span
                            className="status-pill"
                            style={{
                              background: PRIORITY_COLORS[action.action_type] ?? "var(--muted)",
                              color: "white",
                            }}
                          >
                            {PRIORITY_LABELS[action.action_type] ?? action.action_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{action.title}</td>
                        <td className="text-muted">{action.context}</td>
                        <td className="text-muted">
                          {action.due_at ? formatTimestamp(action.due_at) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {plan && plan.status === "active" && readyCount > 0 ? (
              <div style={{ marginTop: "var(--spacing-lg)" }}>
                <h4 style={{ marginBottom: "var(--spacing-sm)", color: "var(--text-secondary)" }}>
                  Ready to execute ({readyCount})
                </h4>
                <div className="task-list">
                  {executionSummary?.next_executable_tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className="task-card clickable-row"
                      onClick={() => onOpenTask(task.task_id)}
                      style={{ padding: "var(--spacing-sm) var(--spacing-md)", borderLeft: "3px solid var(--leaf)" }}
                    >
                      <span style={{ fontWeight: 500 }}>{task.title}</span>
                      <span className="status-pill" style={{ marginLeft: "auto" }}>
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : plan && plan.status === "draft" ? (
              <div
                className="focus-card"
                style={{
                  marginTop: "var(--spacing-lg)",
                  borderLeft: "4px solid var(--gold)",
                  textAlign: "center",
                  padding: "var(--spacing-xl)",
                }}
              >
                <div
                  className="status-pill"
                  style={{ background: "var(--gold)", color: "white", marginBottom: "var(--spacing-sm)", display: "inline-block" }}
                >
                  STAGED DRAFT
                </div>
                <h3 style={{ marginBottom: "var(--spacing-sm)" }}>Plan Requires Authorization</h3>
                <p style={{ color: "var(--text-secondary)", maxWidth: "400px", margin: "0 auto var(--spacing-md)" }}>
                  The diagnostic engine has proposed a baseline intervention plan. Review the report and activate the plan to enable execution modes.
                </p>
                <button className="btn btn-primary" onClick={() => onOpenTask("") /* Redirect to plan mode handle by App.tsx */}>
                  Review Proposal in Plan Mode
                </button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
