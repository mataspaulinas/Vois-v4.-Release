import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { TransitionSuggestion } from "../../components/TransitionSuggestion";
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
  onOpenPlan: () => void;
  onOpenWorkspace: (taskId: string) => void;
};

const PRIORITY_LABELS: Record<string, string> = {
  overdue_follow_up: "Overdue",
  open_escalation: "Escalation",
  pending_follow_up: "Follow-up",
  in_progress_task: "In progress",
  blocked_task: "Blocked",
};

const PRIORITY_COLORS: Record<string, string> = {
  overdue_follow_up: "var(--color-danger)",
  open_escalation: "var(--color-danger)",
  pending_follow_up: "var(--color-warning)",
  in_progress_task: "var(--color-info)",
  blocked_task: "var(--color-danger)",
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
  onOpenPlan,
  onOpenWorkspace,
}: TodayBoardProps) {
  const [selectedActionIdx, setSelectedActionIdx] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showStallHint, setShowStallHint] = useState(false);

  const overdueCount = followUps.filter((fu) => fu.is_overdue).length;
  const openEscalationCount = escalations.filter((e) => e.status === "open").length;
  const completionPct = executionSummary?.completion_percentage ?? 0;
  const readyTasks = executionSummary?.next_executable_tasks ?? [];
  const blockedTasks = executionSummary?.blocked_tasks ?? [];

  const dayShape =
    overdueCount > 0 ? `${overdueCount} overdue item${overdueCount > 1 ? "s" : ""} need attention` :
    openEscalationCount > 0 ? `${openEscalationCount} escalation${openEscalationCount > 1 ? "s" : ""} require response` :
    nextActions.length > 0 ? `${nextActions.length} action${nextActions.length > 1 ? "s" : ""} ready to move` :
    "All clear. Nothing pressing today.";

  const selectedAction = selectedActionIdx !== null ? nextActions[selectedActionIdx] ?? null : null;

  // Stall detection — show hint after 8 seconds of inactivity
  if (!showStallHint && !loading && nextActions.length > 0 && selectedActionIdx === null) {
    setTimeout(() => setShowStallHint(true), 8000);
  }

  return (
    <div className="page-layout">
      <SurfaceHeader
        title="Today"
        subtitle={dayShape}
        status={overdueCount > 0 ? `${overdueCount} overdue` : openEscalationCount > 0 ? `${openEscalationCount} escalated` : undefined}
        statusTone={overdueCount > 0 ? "danger" : openEscalationCount > 0 ? "warning" : "neutral"}
        moreActions={[
          { label: "Open full plan", onClick: onOpenPlan },
          { label: "View blocked tasks", onClick: () => setDrawerOpen(true) },
        ]}
      />

      {showStallHint && selectedActionIdx === null && (
        <TransitionSuggestion
          message="Need the broader sequence? Jump to Plan for the full picture."
          actionLabel="Open Plan"
          onAction={onOpenPlan}
        />
      )}

      <div className="page-layout__body">
        <PrimaryCanvas>
          {loading ? (
            <LoadingState variant="list" />
          ) : (
            <>
              {/* ─── Summary strip ─── */}
              <div className="highlight-grid">
                <div className="focus-card focus-card-primary">
                  <div className="focus-card-value">{nextActions.length}</div>
                  <div className="focus-card-label">Actions today</div>
                </div>
                <div className="focus-card" style={{ borderLeft: `3px solid ${overdueCount > 0 ? "var(--color-danger)" : "var(--color-success)"}` }}>
                  <div className="focus-card-value">{overdueCount}</div>
                  <div className="focus-card-label">Overdue</div>
                </div>
                <div className="focus-card" style={{ borderLeft: `3px solid ${openEscalationCount > 0 ? "var(--color-danger)" : "var(--color-success)"}` }}>
                  <div className="focus-card-value">{openEscalationCount}</div>
                  <div className="focus-card-label">Escalations</div>
                </div>
                <div className="focus-card">
                  <div className="focus-card-value">{completionPct.toFixed(0)}%</div>
                  <div className="focus-card-label">Plan progress</div>
                </div>
              </div>

              {/* ─── Zone 1: Next executable work (hero) ─── */}
              {nextActions.length === 0 ? (
                <EmptyState
                  title="Nothing pressing"
                  description="All follow-ups are on track. Check your plan for ready tasks."
                  actionLabel="Open Plan"
                  onAction={onOpenPlan}
                />
              ) : (
                <div style={{ marginTop: "var(--spacing-md)" }}>
                  <h3 style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                    Priority actions
                  </h3>
                  {nextActions.map((action, idx) => (
                    <div
                      key={`${action.action_type}-${action.entity_id}`}
                      className="today-action-row"
                      style={{
                        padding: "var(--spacing-sm) var(--spacing-md)",
                        borderLeft: `3px solid ${PRIORITY_COLORS[action.action_type] ?? "var(--color-text-muted)"}`,
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "var(--spacing-xs)",
                        background: selectedActionIdx === idx ? "var(--color-bg-muted)" : "var(--color-surface)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--spacing-sm)",
                        transition: "background var(--motion-fast)",
                      }}
                      onClick={() => setSelectedActionIdx(idx)}
                    >
                      <span className="status-pill" style={{ background: PRIORITY_COLORS[action.action_type] ?? "var(--color-text-muted)", color: "white", fontSize: "var(--text-small)", flexShrink: 0 }}>
                        {PRIORITY_LABELS[action.action_type] ?? action.action_type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "var(--text-body)" }}>{action.title}</div>
                        <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{action.context}</div>
                      </div>
                      <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", flexShrink: 0 }}>
                        {action.due_at ? formatTimestamp(action.due_at) : ""}
                      </span>
                      {/* Quick action: open in workspace */}
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0, fontSize: "var(--text-small)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (action.action_type.includes("follow_up")) onOpenFollowUp(action.entity_id);
                          else if (action.action_type === "open_escalation") onOpenEscalation(action.entity_id);
                          else onOpenWorkspace(action.entity_id);
                        }}
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── Zone 2: Ready tasks ─── */}
              {readyTasks.length > 0 && (
                <div style={{ marginTop: "var(--spacing-xl)" }}>
                  <h3 style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                    Ready to execute ({readyTasks.length})
                  </h3>
                  {readyTasks.map((task) => (
                    <div
                      key={task.task_id}
                      className="today-action-row"
                      style={{
                        padding: "var(--spacing-sm) var(--spacing-md)",
                        borderLeft: "3px solid var(--color-success)",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "var(--spacing-xs)",
                        background: "var(--color-surface)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--spacing-sm)",
                      }}
                      onClick={() => onOpenWorkspace(task.task_id)}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500 }}>{task.title}</span>
                      </div>
                      <span className="status-pill" style={{ fontSize: "var(--text-small)" }}>{task.status.replace(/_/g, " ")}</span>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: "var(--text-small)" }} onClick={(e) => { e.stopPropagation(); onOpenPlan(); }}>
                        Plan
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── Zone 3: Blocked (visually sharper than ready) ─── */}
              {blockedTasks.length > 0 && (
                <div style={{ marginTop: "var(--spacing-xl)" }}>
                  <h3 style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-semibold)", color: "var(--color-danger)", marginBottom: "var(--spacing-sm)" }}>
                    Blocked ({blockedTasks.length})
                  </h3>
                  {blockedTasks.map((task) => (
                    <div
                      key={task.task_id}
                      style={{
                        padding: "var(--spacing-sm) var(--spacing-md)",
                        borderLeft: "3px solid var(--color-danger)",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "var(--spacing-xs)",
                        background: "var(--color-danger-foreground)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--spacing-sm)",
                      }}
                      onClick={() => onOpenTask(task.task_id)}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 500, color: "var(--color-danger)" }}>{task.title}</span>
                        <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                          {task.blocking_dependency_ids?.length ? `Blocked by: ${task.blocking_dependency_ids.join(", ")}` : "Dependency not resolved"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Draft plan prompt */}
              {plan?.status === "draft" && (
                <EmptyState
                  title="Plan requires authorization"
                  description="The engine has proposed a plan. Review the report and activate it."
                  actionLabel="Review proposal"
                  onAction={onOpenPlan}
                />
              )}
            </>
          )}
        </PrimaryCanvas>

        {/* ─── Inspector: selected action context ─── */}
        <ContextInspector
          open={selectedAction !== null}
          title="Action context"
          onClose={() => setSelectedActionIdx(null)}
        >
          {selectedAction && (
            <div>
              <h4 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{selectedAction.title}</h4>
              <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", margin: "0 0 var(--spacing-md) 0" }}>
                {selectedAction.context}
              </p>

              <div style={{ fontSize: "var(--text-small)", marginBottom: "var(--spacing-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Type</span>
                  <span>{PRIORITY_LABELS[selectedAction.action_type] ?? selectedAction.action_type}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Due</span>
                  <span>{selectedAction.due_at ? formatTimestamp(selectedAction.due_at) : "No due date"}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  if (selectedAction.action_type.includes("follow_up")) onOpenFollowUp(selectedAction.entity_id);
                  else if (selectedAction.action_type === "open_escalation") onOpenEscalation(selectedAction.entity_id);
                  else onOpenWorkspace(selectedAction.entity_id);
                }}>
                  Open in workspace
                </button>
                <button className="btn btn-secondary btn-sm" onClick={onOpenPlan}>
                  Jump to Plan
                </button>
              </div>
            </div>
          )}
        </ContextInspector>
      </div>

      {/* ─── Drawer: blocked pattern + follow-up residue ─── */}
      <DeepDrawer open={drawerOpen} title="Blocked tasks and follow-up residue" onClose={() => setDrawerOpen(false)}>
        <div>
          {blockedTasks.length > 0 && (
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <h4 style={{ marginBottom: "var(--spacing-sm)" }}>Blocked tasks ({blockedTasks.length})</h4>
              {blockedTasks.map((task) => (
                <div key={task.task_id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: "3px solid var(--color-danger)", marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 500 }}>{task.title}</div>
                  <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    {task.blocking_dependency_ids?.length ? `Blocked by: ${task.blocking_dependency_ids.join(", ")}` : "Unresolved dependency"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {followUps.filter((fu) => fu.is_overdue).length > 0 && (
            <div>
              <h4 style={{ marginBottom: "var(--spacing-sm)" }}>Overdue follow-ups</h4>
              {followUps.filter((fu) => fu.is_overdue).map((fu) => (
                <div key={fu.id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: "3px solid var(--color-warning)", marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 500 }}>{fu.title}</div>
                  <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                    Due {formatTimestamp(fu.due_at)} · {fu.status}
                  </div>
                </div>
              ))}
            </div>
          )}

          {blockedTasks.length === 0 && followUps.filter((fu) => fu.is_overdue).length === 0 && (
            <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>No blocked tasks or overdue follow-ups. Execution is clear.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}
