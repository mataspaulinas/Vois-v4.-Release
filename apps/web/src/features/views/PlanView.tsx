import { useEffect, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { PlanExecutionSummary, PlanRecord, PlanTaskUpdatePayload, ProgressEntryRecord, TaskCommentRecord, fetchTaskComments, createTaskComment } from "../../lib/api";

const ALL_STATUSES = ["not_started", "in_progress", "completed", "blocked", "on_hold", "deferred"];

type PlanViewProps = {
  loadingExecution: boolean;
  plan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  isHistoricalSelection: boolean;
  progressEntries: ProgressEntryRecord[];
  progressSummary: string;
  progressDetail: string;
  savingProgress: boolean;
  updatingTaskId: string | null;
  venueId: string | null;
  onProgressSummaryChange: (value: string) => void;
  onProgressDetailChange: (value: string) => void;
  onCreateProgressEntry: () => void;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
  onUpdateTask: (taskId: string, payload: PlanTaskUpdatePayload) => void;
  formatTimestamp: (isoTimestamp: string) => string;
  onOpenReport: () => void;
  onOpenHistory: () => void;
  onOpenWorkspace?: (taskId: string) => void;
};

export function PlanView({
  loadingExecution,
  plan,
  executionSummary,
  isHistoricalSelection,
  progressEntries,
  progressSummary,
  progressDetail,
  savingProgress,
  updatingTaskId,
  onProgressSummaryChange,
  onProgressDetailChange,
  onCreateProgressEntry,
  onUpdateTaskStatus,
  onUpdateTask,
  formatTimestamp,
  venueId,
  onOpenReport,
  onOpenHistory,
  onOpenWorkspace,
}: PlanViewProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [inspectedTaskId, setInspectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<TaskCommentRecord[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Load comments when task is expanded
  useEffect(() => {
    if (!expandedTaskId) {
      setTaskComments([]);
      return;
    }
    setLoadingComments(true);
    fetchTaskComments(expandedTaskId)
      .then(setTaskComments)
      .catch(() => setTaskComments([]))
      .finally(() => setLoadingComments(false));
  }, [expandedTaskId]);

  async function handleSubmitComment() {
    if (!expandedTaskId || !venueId || !commentDraft.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await createTaskComment(expandedTaskId, venueId, commentDraft.trim());
      setTaskComments((prev) => [...prev, comment]);
      setCommentDraft("");
    } catch { /* silently fail */ }
    setSubmittingComment(false);
  }
  const blockedTaskMap = new Map(
    (executionSummary?.blocked_tasks ?? []).map((task) => [task.task_id, task.blocking_dependency_ids])
  );
  const countsByStatus = executionSummary?.counts_by_status ?? {};
  const isExecutionLocked = !plan || plan.status !== "active";
  const totalDependencyCount = plan?.tasks.reduce((count, task) => count + task.dependencies.length, 0) ?? 0;
  const selectedTask = plan?.tasks.find((task) => task.id === expandedTaskId) ?? null;
  const downstreamTaskTitles =
    plan?.tasks
      .filter((task) => task.dependencies.includes(selectedTask?.block_id ?? ""))
      .map((task) => task.title) ?? [];
  const criticalPathSummary = (executionSummary?.blocked_tasks.length ?? 0) > 0
    ? "Critical path pressure is currently driven by blocked dependency chains."
    : (executionSummary?.next_executable_tasks.length ?? 0) > 0
      ? "Critical path is clear enough to move the next executable tasks immediately."
      : "No immediate dependency pressure is visible in the current execution summary.";

  return (
    <div className="page-layout">
      <SurfaceHeader
        title={plan?.title ?? "Operational plan board"}
        subtitle={plan ? `${plan.summary} Load: ${plan.load_classification ?? "unknown"}.` : undefined}
        status={plan?.status === "active" ? "Active" : plan?.status === "archived" ? "Archived" : plan?.status === "draft" ? "Draft" : undefined}
        statusTone={plan?.status === "active" ? "success" : plan?.status === "archived" ? "neutral" : "warning"}
        primaryAction={selectedTask && onOpenWorkspace ? { label: "Open workspace", onClick: () => onOpenWorkspace(selectedTask.id) } : undefined}
        moreActions={[
          { label: "Review report", onClick: onOpenReport },
          { label: "Timeline", onClick: onOpenHistory },
          { label: "Compare versions", onClick: () => setDrawerOpen(true) },
        ]}
      />
      <PrimaryCanvas>
        {loadingExecution ? (
          <LoadingState variant="list" />
        ) : !plan ? (
          <EmptyState
            title="No plan available"
            description="Run an assessment and engine to generate an operational plan for this venue."
          />
        ) : (
          <>
            {/* Completion progress bar */}
            <div style={{ marginBottom: "var(--spacing-md, 16px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm, 13px)", marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>Execution progress</span>
                <span>{Math.round(executionSummary?.completion_percentage ?? 0)}% complete</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2, #f0f0f0)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round(executionSummary?.completion_percentage ?? 0)}%`,
                  background: (executionSummary?.completion_percentage ?? 0) >= 80 ? "var(--success, #16a34a)" : "var(--ois-coral, #3b82f6)",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>

            {/* Provenance strip */}
            {plan && (
              <div className="focus-card" style={{ marginBottom: "var(--spacing-md, 16px)", fontSize: "var(--text-sm, 13px)" }}>
                <p className="section-eyebrow">Provenance</p>
                <div className="dependency-list">
                  <span>Plan: {plan.status}</span>
                  <span>Load: {plan.load_classification ?? "unknown"}</span>
                  <span>{plan.tasks.length} tasks</span>
                  <span>{totalDependencyCount} dependencies</span>
                  {plan.ontology_id && <span>Ontology: {plan.ontology_id}@{plan.ontology_version}</span>}
                </div>
              </div>
            )}

            <div className="highlight-grid">
              <div className="focus-card focus-card-primary">
                <p className="section-eyebrow">Execution stance</p>
                <h3>{executionSummary?.next_executable_tasks.length ? "Move ready work" : "Resolve bottlenecks"}</h3>
                <p>
                  {executionSummary?.next_executable_tasks.length
                    ? "There is executable work waiting now. The plan view should push action, not analysis drift."
                    : "The queue is being constrained by dependencies. Clear the blocked path before adding new noise."}
                </p>
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Status mix</p>
                <div className="dependency-list">
                  <span>{countsByStatus.not_started ?? 0} not started</span>
                  <span>{countsByStatus.in_progress ?? 0} in progress</span>
                  <span>{countsByStatus.completed ?? 0} completed</span>
                  {(countsByStatus.blocked ?? 0) > 0 && <span>{countsByStatus.blocked} blocked</span>}
                  {(countsByStatus.on_hold ?? 0) > 0 && <span>{countsByStatus.on_hold} on hold</span>}
                  {(countsByStatus.deferred ?? 0) > 0 && <span>{countsByStatus.deferred} deferred</span>}
                </div>
              </div>
              {isHistoricalSelection ? (
                <div className="focus-card">
                  <p className="section-eyebrow">Selection</p>
                  <h3>Historical plan</h3>
                  <p>You are viewing the plan linked to an older report selection, not necessarily the latest venue plan.</p>
                </div>
              ) : null}
              <div className="focus-card">
                <p className="section-eyebrow">Dependencies</p>
                <div className="dependency-list">
                  <span>{totalDependencyCount} dependency links</span>
                  <span>{executionSummary?.blocked_tasks.length ?? 0} blocked tasks</span>
                </div>
                <p>{criticalPathSummary}</p>
              </div>
            </div>
            <div className="execution-summary-grid">
              <div className="diagnostic-column">
                <h3>Next executable</h3>
                <ul className="spine-list">
                  {(executionSummary?.next_executable_tasks ?? []).map((task) => (
                    <li key={task.task_id}>{task.title}</li>
                  ))}
                  {!executionSummary?.next_executable_tasks.length ? <li>No ready tasks.</li> : null}
                </ul>
              </div>
              <div className="diagnostic-column">
                <h3>Blocked tasks</h3>
                <ul className="spine-list">
                  {(executionSummary?.blocked_tasks ?? []).slice(0, 4).map((task) => (
                    <li key={task.task_id}>
                      {task.title}: {task.blocking_dependency_ids.join(", ")}
                    </li>
                  ))}
                  {!executionSummary?.blocked_tasks.length ? <li>No blocked tasks.</li> : null}
                </ul>
              </div>
            </div>
            <SectionCard
              eyebrow="Dependencies"
              title="Dependency view"
              description="Graph is folded into Plan until there is a real visualization surface."
            >
              <div className="timeline-split">
                <div>
                  <h3 className="subsection-title">Critical path</h3>
                  <p className="history-note">{criticalPathSummary}</p>
                </div>
                <div>
                  <h3 className="subsection-title">Selected task links</h3>
                  {selectedTask ? (
                    <div className="thread-list compact-list">
                      <div className="history-card compact-card">
                        <div className="thread-row">
                          <span>Upstream</span>
                          <em>{selectedTask.block_id}</em>
                        </div>
                        <p className="history-note">
                          {selectedTask.dependencies.length ? selectedTask.dependencies.join(", ") : "Independent start"}
                        </p>
                      </div>
                      <div className="history-card compact-card">
                        <div className="thread-row">
                          <span>Downstream</span>
                          <em>{downstreamTaskTitles.length} linked</em>
                        </div>
                        <p className="history-note">
                          {downstreamTaskTitles.length ? downstreamTaskTitles.join(", ") : "No downstream tasks derived from the current plan data."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="history-note">Expand a task to inspect its upstream and downstream links.</p>
                  )}
                </div>
              </div>
            </SectionCard>
            <div className="plan-list">
              {(() => {
                const groups: Record<string, typeof plan.tasks> = {};
                plan.tasks.forEach((task) => {
                  const blockPrefix = task.block_id?.split("-")[0] || "Other";
                  if (!groups[blockPrefix]) groups[blockPrefix] = [];
                  groups[blockPrefix].push(task);
                });

                return Object.entries(groups).sort().map(([prefix, tasks]) => (
                  <div key={prefix} className="plan-block-group" style={{ marginBottom: "var(--spacing-lg)" }}>
                    <h2 style={{ 
                      padding: "var(--spacing-sm) var(--spacing-md)", 
                      background: "var(--bg-raised)", 
                      borderRadius: "var(--radius-sm)",
                      borderLeft: `5px solid ${prefix === "L1" ? "var(--sky)" : prefix === "L2" ? "var(--gold)" : prefix === "L3" ? "var(--leaf)" : "var(--muted)"}`,
                      marginBottom: "var(--spacing-md)",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-sm)"
                    }}>
                      <span className="badge" style={{ background: "transparent", color: "inherit", border: "1px solid currentColor" }}>{prefix}</span>
                      {prefix === "L1" ? "Standardization & Layer 1" : prefix === "L2" ? "Infrastructure & Layer 2" : prefix === "L3" ? "Optimization & Layer 3" : "Additional Tasks"}
                    </h2>
                    {tasks.map((task) => {
                      const isExpanded = expandedTaskId === task.id;
                      const blockedDependencies = blockedTaskMap.get(task.id) ?? [];
                      return (
                        <article className="plan-task" key={task.id} style={{ marginLeft: "var(--spacing-md)", marginBottom: "var(--spacing-md)" }}>
                          <div className="plan-task-top">
                            <h3
                              style={{ cursor: "pointer" }}
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            >
                              {task.title}
                            </h3>
                            <div style={{ display: "flex", gap: "var(--space-2, 8px)", alignItems: "center" }}>
                              {task.assigned_to && <span className="badge" style={{ opacity: 0.7 }}>{task.assigned_to}</span>}
                              {task.priority && <span className="badge" style={{ opacity: 0.7 }}>{task.priority}</span>}
                              {task.due_at && <span className="badge" style={{ opacity: 0.7 }}>{new Date(task.due_at).toLocaleDateString()}</span>}
                              <span className="badge">{task.effort_hours}h</span>
                            </div>
                          </div>
                          <p>{task.rationale}</p>
                          <div className="task-status-row">
                            {ALL_STATUSES.map((status) => {
                              const blockedForStatus =
                                blockedDependencies.length > 0 && (status === "in_progress" || status === "completed");
                              return (
                                <button
                                  key={status}
                                  className={`status-pill ${task.status === status ? "active" : ""}`}
                                  onClick={() => onUpdateTaskStatus(task.id, status)}
                                  disabled={updatingTaskId === task.id || blockedForStatus || isExecutionLocked}
                                  title={
                                    isExecutionLocked
                                      ? "Only the active plan can be mutated."
                                      : blockedForStatus
                                        ? `Blocked by: ${blockedDependencies.join(", ")}`
                                        : undefined
                                  }
                                >
                                  {status.replace(/_/g, " ")}
                                </button>
                              );
                            })}
                          </div>
                          {blockedDependencies.length > 0 && (
                            <p className="blocking-note">
                              Blocked by dependencies: {blockedDependencies.join(", ")}
                            </p>
                          )}
                          <div className="task-detail-grid">
                            <div>
                              <strong>Sub-actions</strong>
                              <ul className="mini-list">
                                {task.sub_actions.map((action, idx) => (
                                  <li
                                    key={`${action.text}-${idx}`}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "var(--space-2)",
                                      textDecoration: action.completed ? "line-through" : "none",
                                      opacity: action.completed ? 0.6 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={action.completed}
                                      disabled={updatingTaskId === task.id || isExecutionLocked}
                                      onChange={() => {
                                        const completions = task.sub_actions.map((a, i) =>
                                          i === idx ? !a.completed : a.completed
                                        );
                                        onUpdateTask(task.id, { sub_action_completions: completions });
                                      }}
                                      style={{ accentColor: "var(--ois-coral)", flexShrink: 0 }}
                                    />
                                    {action.text}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <strong>Deliverables</strong>
                              <ul className="mini-list">
                                {task.deliverables.map((deliverable, idx) => (
                                  <li
                                    key={`${deliverable.name}-${idx}`}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "var(--space-2)",
                                      textDecoration: deliverable.completed ? "line-through" : "none",
                                      opacity: deliverable.completed ? 0.6 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={deliverable.completed}
                                      disabled={updatingTaskId === task.id || isExecutionLocked}
                                      onChange={() => {
                                        const completions = task.deliverables.map((d, i) =>
                                          i === idx ? !d.completed : d.completed
                                        );
                                        onUpdateTask(task.id, { deliverable_completions: completions });
                                      }}
                                      style={{ accentColor: "var(--ois-coral)", flexShrink: 0 }}
                                    />
                                    {deliverable.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="dependency-list">
                            {task.dependencies.length ? (
                              task.dependencies.map((dependency) => <span key={dependency}>{dependency}</span>)
                            ) : (
                              <span>Independent start</span>
                            )}
                          </div>

                          {/* Expanded inline editing section */}
                          {isExpanded && (
                            <div style={{ marginTop: "var(--space-3)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
                              {/* Assignment and priority */}
                              <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
                                <label style={{ fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                  <strong>Assigned to</strong>
                                  <input
                                    type="text"
                                    className="progress-input"
                                    value={task.assigned_to ?? ""}
                                    placeholder="Unassigned"
                                    style={{ width: 160, fontSize: "var(--text-sm)" }}
                                    disabled={updatingTaskId === task.id || isExecutionLocked}
                                    onBlur={(e) => {
                                      const value = e.target.value.trim() || null;
                                      if (value !== task.assigned_to) {
                                        onUpdateTask(task.id, { assigned_to: value });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    }}
                                    defaultValue={task.assigned_to ?? ""}
                                  />
                                </label>
                                <label style={{ fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                  <strong>Due date</strong>
                                  <input
                                    type="date"
                                    value={task.due_at ? task.due_at.slice(0, 10) : ""}
                                    disabled={updatingTaskId === task.id || isExecutionLocked}
                                    onChange={(e) => {
                                      const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                                      onUpdateTask(task.id, { due_at: value });
                                    }}
                                    style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 8px", fontSize: "var(--text-sm)" }}
                                  />
                                </label>
                                <label style={{ fontSize: "var(--text-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                  <strong>Priority</strong>
                                  <select
                                    value={task.priority ?? ""}
                                    disabled={updatingTaskId === task.id || isExecutionLocked}
                                    onChange={(e) => onUpdateTask(task.id, { priority: e.target.value || null })}
                                    style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 8px", fontSize: "var(--text-sm)" }}
                                  >
                                    <option value="">No priority</option>
                                    <option value="critical">Critical</option>
                                    <option value="high">High</option>
                                    <option value="normal">Normal</option>
                                    <option value="low">Low</option>
                                  </select>
                                </label>
                              </div>

                              <label style={{ fontWeight: "bold", display: "block", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                                Task notes
                              </label>
                              <TaskNotesEditor
                                taskId={task.id}
                                initialNotes={task.notes ?? ""}
                                disabled={updatingTaskId === task.id || isExecutionLocked}
                                onSave={(notes) => onUpdateTask(task.id, { notes })}
                              />

                              {/* Task comments */}
                              <div style={{ marginTop: "var(--space-3)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
                                <label style={{ fontWeight: "bold", display: "block", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                                  Comments ({taskComments.length})
                                </label>
                                {loadingComments ? (
                                  <p style={{ fontSize: "var(--text-sm)", opacity: 0.5 }}>Loading comments...</p>
                                ) : (
                                  <div className="thread-list compact-list">
                                    {taskComments.map((comment) => (
                                      <div className="history-card compact-card" key={comment.id}>
                                        <div className="thread-row">
                                          <span>{comment.author_name ?? "System"}</span>
                                          <em>{formatTimestamp(comment.created_at)}</em>
                                        </div>
                                        <p className="history-note">{comment.body}</p>
                                      </div>
                                    ))}
                                    {!taskComments.length && !loadingComments && (
                                      <p style={{ fontSize: "var(--text-sm)", opacity: 0.5 }}>No comments on this task yet.</p>
                                    )}
                                  </div>
                                )}
                                {venueId && !isExecutionLocked && (
                                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                                    <input
                                      type="text"
                                      className="progress-input"
                                      value={commentDraft}
                                      onChange={(e) => setCommentDraft(e.target.value)}
                                      placeholder="Add a comment..."
                                      style={{ flex: 1, fontSize: "var(--text-sm)" }}
                                      onKeyDown={(e) => { if (e.key === "Enter" && !submittingComment) handleSubmitComment(); }}
                                    />
                                    <button
                                      className="btn btn-secondary"
                                      style={{ fontSize: "var(--text-sm)" }}
                                      onClick={handleSubmitComment}
                                      disabled={submittingComment || !commentDraft.trim()}
                                    >
                                      {submittingComment ? "..." : "Comment"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </PrimaryCanvas>

      <SectionCard
        eyebrow="Progress"
        title="Progress feed"
        description="Operators log real movement, not just plans."
      >
        <div className="progress-form">
          <input
            className="progress-input"
            value={progressSummary}
            onChange={(event) => onProgressSummaryChange(event.target.value)}
            placeholder="What changed operationally?"
          />
          <textarea
            className="progress-textarea"
            value={progressDetail}
            onChange={(event) => onProgressDetailChange(event.target.value)}
            placeholder="Add detail, blockers, or evidence..."
          />
          <button className="btn btn-secondary" onClick={onCreateProgressEntry} disabled={savingProgress}>
            {savingProgress ? "Logging..." : "Log progress"}
          </button>
        </div>
        <div className="thread-list">
          {progressEntries.map((entry) => (
            <div className="history-card" key={entry.id}>
              <div className="thread-row">
                <span>{formatTimestamp(entry.created_at)}</span>
                <em>{entry.status}</em>
              </div>
              <p className="history-note">{entry.summary}</p>
              {entry.detail ? <p className="history-detail">{entry.detail}</p> : null}
            </div>
          ))}
          {!progressEntries.length ? (
            <div className="empty-state">
              <p>No progress logged yet. Start capturing real execution movement here.</p>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* ─── Inspector: selected task context ─── */}
      <ContextInspector
        open={inspectedTaskId !== null}
        title="Task context"
        onClose={() => setInspectedTaskId(null)}
      >
        {(() => { const t = plan?.tasks.find((task) => task.id === inspectedTaskId); return t ? (
          <div>
            <h4 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{t.title}</h4>
            <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", margin: "0 0 var(--spacing-md) 0" }}>{t.rationale}</p>
            <div style={{ fontSize: "var(--text-small)", marginBottom: "var(--spacing-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}><span style={{ color: "var(--color-text-muted)" }}>Status</span><span>{t.status.replace(/_/g, " ")}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}><span style={{ color: "var(--color-text-muted)" }}>Assigned</span><span>{t.assigned_to ?? "Unassigned"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}><span style={{ color: "var(--color-text-muted)" }}>Priority</span><span>{t.priority ?? "Normal"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}><span style={{ color: "var(--color-text-muted)" }}>Effort</span><span>{t.effort_hours}h</span></div>
              {t.dependencies.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--color-text-muted)" }}>Dependencies</span><span>{t.dependencies.length} tasks</span></div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setInspectedTaskId(null); setExpandedTaskId(t.id); }}>Expand full detail</button>
              {onOpenWorkspace && <button className="btn btn-secondary btn-sm" onClick={() => onOpenWorkspace(t.id)}>Open workspace</button>}
            </div>
          </div>
        ) : null; })()}
      </ContextInspector>

      {/* ─── Drawer: compare + history ─── */}
      <DeepDrawer open={drawerOpen} title="Plan history and compare" onClose={() => setDrawerOpen(false)}>
        <div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)", marginBottom: "var(--spacing-md)" }}>
            Plan version history and comparison view. View prior plan versions and track how the execution sequence has evolved.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={onOpenHistory}>Open full timeline</button>
        </div>
      </DeepDrawer>
    </div>
  );
}

function TaskNotesEditor({
  taskId,
  initialNotes,
  disabled,
  onSave,
}: {
  taskId: string;
  initialNotes: string;
  disabled: boolean;
  onSave: (notes: string) => void;
}) {
  const [draft, setDraft] = useState(initialNotes);
  const dirty = draft !== initialNotes;

  return (
    <div>
      <textarea
        className="progress-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Evidence, blockers, observations..."
        style={{ minHeight: 60, fontSize: "var(--text-sm)" }}
        disabled={disabled}
      />
      {dirty && (
        <button
          className="btn btn-secondary"
          onClick={() => onSave(draft)}
          disabled={disabled}
          style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}
        >
          Save notes
        </button>
      )}
    </div>
  );
}
