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

/* ── Design system tokens (inline) ── */
const ds = {
  accent: "#6C5CE7",
  accentSoft: "rgba(108,92,231,0.08)",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  cardBg: "#FFFFFF",
  cardRadius: 12,
  cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
  cardShadowHover: "0 4px 12px rgba(0,0,0,0.08)",
  cardPadding: "20px 24px",
  textBody: 15,
  textSmall: 13,
  textEyebrow: 11,
  textHeading: 20,
  textTitle: 28,
  textCardTitle: 16,
  sectionGap: 32,
  cardGap: 16,
  pageMargin: 48,
  muted: "#8B8FA3",
  textPrimary: "#1A1D2E",
  textSecondary: "#5A5E73",
  border: "#E8E9EF",
  surfaceBg: "#F7F7FA",
  statusDot: 8,
} as const;

const statusColor = (status: string) => {
  switch (status) {
    case "not_started": return ds.muted;
    case "in_progress": return ds.info;
    case "completed": return ds.success;
    case "blocked": return ds.danger;
    case "on_hold": return ds.warning;
    case "deferred": return "#9CA3AF";
    default: return ds.muted;
  }
};

const laneColor = (status: string) => {
  switch (status) {
    case "ready": return ds.success;
    case "active": return ds.info;
    case "blocked": return ds.danger;
    case "completed": return ds.success;
    default: return ds.muted;
  }
};

const priorityColor = (priority: string | null | undefined) => {
  switch (priority) {
    case "critical": return ds.danger;
    case "high": return ds.warning;
    case "normal": return ds.info;
    case "low": return ds.muted;
    default: return ds.muted;
  }
};

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
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

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

  /* ── Lane classification ── */
  const readyTaskIds = new Set((executionSummary?.next_executable_tasks ?? []).map((t) => t.task_id));
  const blockedTaskIds = new Set((executionSummary?.blocked_tasks ?? []).map((t) => t.task_id));

  const classifyTask = (task: { id: string; status: string }) => {
    if (task.status === "completed") return "completed";
    if (blockedTaskIds.has(task.id) || task.status === "blocked") return "blocked";
    if (task.status === "in_progress") return "active";
    if (readyTaskIds.has(task.id)) return "ready";
    return "ready"; // not_started, on_hold, deferred default to ready lane
  };

  const lanes = {
    ready: plan?.tasks.filter((t) => classifyTask(t) === "ready") ?? [],
    active: plan?.tasks.filter((t) => classifyTask(t) === "active") ?? [],
    blocked: plan?.tasks.filter((t) => classifyTask(t) === "blocked") ?? [],
    completed: plan?.tasks.filter((t) => classifyTask(t) === "completed") ?? [],
  };

  /* ── Shared card style factory ── */
  const cardStyle = (borderColor?: string): React.CSSProperties => ({
    background: ds.cardBg,
    borderRadius: ds.cardRadius,
    boxShadow: ds.cardShadow,
    padding: ds.cardPadding,
    borderLeft: borderColor ? `4px solid ${borderColor}` : undefined,
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  });

  const eyebrowStyle: React.CSSProperties = {
    fontSize: ds.textEyebrow,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ds.muted,
    margin: 0,
    lineHeight: 1,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: ds.textHeading,
    fontWeight: 600,
    color: ds.textPrimary,
    margin: 0,
  };

  const countPillStyle = (color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    background: color + "14",
    color: color,
    fontSize: ds.textSmall,
    fontWeight: 600,
    padding: "0 8px",
  });

  const dotStyle = (color: string): React.CSSProperties => ({
    width: ds.statusDot,
    height: ds.statusDot,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  });

  /* ── Render task card ── */
  const renderTaskCard = (task: typeof plan extends { tasks: (infer T)[] } | null ? T : never, lane: string) => {
    const isExpanded = expandedTaskId === task.id;
    const blockedDependencies = blockedTaskMap.get(task.id) ?? [];
    const borderColor = laneColor(lane);
    const isSelected = expandedTaskId === task.id;

    return (
      <article
        key={task.id}
        style={{
          ...cardStyle(borderColor),
          marginBottom: ds.cardGap,
          cursor: "pointer",
          ...(isSelected
            ? { background: ds.accentSoft, borderLeftColor: ds.accent, borderLeftWidth: 3 }
            : {}),
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = ds.cardShadowHover;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = ds.cardShadow;
        }}
      >
        {/* Card face */}
        <div
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}
          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: ds.textCardTitle, fontWeight: 600, color: ds.textPrimary, marginBottom: 4, lineHeight: 1.3 }}>
              {task.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {task.assigned_to && (
                <span style={{ fontSize: ds.textSmall, color: ds.muted }}>{task.assigned_to}</span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={dotStyle(statusColor(task.status))} />
                <span style={{ fontSize: ds.textSmall, color: ds.textSecondary }}>{task.status.replace(/_/g, " ")}</span>
              </div>
              {task.dependencies.length > 0 && (
                <span style={{
                  fontSize: ds.textEyebrow,
                  fontWeight: 500,
                  color: ds.muted,
                  background: ds.surfaceBg,
                  borderRadius: 4,
                  padding: "2px 6px",
                }}>
                  {task.dependencies.length} dep{task.dependencies.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.textSecondary }}>{task.effort_hours}h</span>
            {task.priority && (
              <span style={{
                fontSize: ds.textEyebrow,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: priorityColor(task.priority),
              }}>
                {task.priority}
              </span>
            )}
            {task.due_at && (
              <span style={{ fontSize: ds.textEyebrow, color: ds.muted }}>{new Date(task.due_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Rationale */}
        <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: "8px 0 0", lineHeight: 1.5 }}>{task.rationale}</p>

        {/* Status pills row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {ALL_STATUSES.map((status) => {
            const blockedForStatus =
              blockedDependencies.length > 0 && (status === "in_progress" || status === "completed");
            const isActive = task.status === status;
            return (
              <button
                key={status}
                onClick={(e) => { e.stopPropagation(); onUpdateTaskStatus(task.id, status); }}
                disabled={updatingTaskId === task.id || blockedForStatus || isExecutionLocked}
                title={
                  isExecutionLocked
                    ? "Only the active plan can be mutated."
                    : blockedForStatus
                      ? `Blocked by: ${blockedDependencies.join(", ")}`
                      : undefined
                }
                style={{
                  padding: "4px 10px",
                  fontSize: ds.textEyebrow,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  border: isActive ? "none" : `1px solid ${ds.border}`,
                  borderRadius: 6,
                  background: isActive ? statusColor(status) + "18" : "transparent",
                  color: isActive ? statusColor(status) : ds.muted,
                  cursor: (updatingTaskId === task.id || blockedForStatus || isExecutionLocked) ? "not-allowed" : "pointer",
                  opacity: (updatingTaskId === task.id || blockedForStatus || isExecutionLocked) ? 0.4 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                {status.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        {/* Blocked notice */}
        {blockedDependencies.length > 0 && (
          <div style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 8,
            background: ds.danger + "0A",
            border: `1px solid ${ds.danger}20`,
            fontSize: ds.textSmall,
            color: ds.danger,
            fontWeight: 500,
          }}>
            Blocked by: {blockedDependencies.join(", ")}
          </div>
        )}

        {/* Sub-actions and deliverables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: ds.muted, marginBottom: 6 }}>Sub-actions</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {task.sub_actions.map((action, idx) => (
                <li
                  key={`${action.text}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: ds.textSmall,
                    color: action.completed ? ds.muted : ds.textPrimary,
                    textDecoration: action.completed ? "line-through" : "none",
                    opacity: action.completed ? 0.6 : 1,
                    padding: "3px 0",
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
                    style={{ accentColor: ds.accent, flexShrink: 0, width: 14, height: 14 }}
                  />
                  {action.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: ds.muted, marginBottom: 6 }}>Deliverables</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {task.deliverables.map((deliverable, idx) => (
                <li
                  key={`${deliverable.name}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: ds.textSmall,
                    color: deliverable.completed ? ds.muted : ds.textPrimary,
                    textDecoration: deliverable.completed ? "line-through" : "none",
                    opacity: deliverable.completed ? 0.6 : 1,
                    padding: "3px 0",
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
                    style={{ accentColor: ds.accent, flexShrink: 0, width: 14, height: 14 }}
                  />
                  {deliverable.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Dependency chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {task.dependencies.length ? (
            task.dependencies.map((dependency) => (
              <span
                key={dependency}
                style={{
                  fontSize: ds.textEyebrow,
                  background: ds.surfaceBg,
                  border: `1px solid ${ds.border}`,
                  borderRadius: 4,
                  padding: "2px 8px",
                  color: ds.textSecondary,
                }}
              >
                {dependency}
              </span>
            ))
          ) : (
            <span style={{ fontSize: ds.textEyebrow, color: ds.muted }}>Independent start</span>
          )}
        </div>

        {/* Expanded inline editing section */}
        {isExpanded && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${ds.border}`, paddingTop: 16 }}>
            {/* Assignment and priority */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              <label style={{ fontSize: ds.textSmall, display: "flex", alignItems: "center", gap: 8, color: ds.textSecondary }}>
                <strong style={{ color: ds.textPrimary }}>Assigned to</strong>
                <input
                  type="text"
                  className="progress-input"
                  value={task.assigned_to ?? ""}
                  placeholder="Unassigned"
                  style={{ width: 160, fontSize: ds.textSmall, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "6px 10px" }}
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
              <label style={{ fontSize: ds.textSmall, display: "flex", alignItems: "center", gap: 8, color: ds.textSecondary }}>
                <strong style={{ color: ds.textPrimary }}>Due date</strong>
                <input
                  type="date"
                  value={task.due_at ? task.due_at.slice(0, 10) : ""}
                  disabled={updatingTaskId === task.id || isExecutionLocked}
                  onChange={(e) => {
                    const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                    onUpdateTask(task.id, { due_at: value });
                  }}
                  style={{ background: ds.surfaceBg, border: `1px solid ${ds.border}`, borderRadius: 8, padding: "6px 10px", fontSize: ds.textSmall }}
                />
              </label>
              <label style={{ fontSize: ds.textSmall, display: "flex", alignItems: "center", gap: 8, color: ds.textSecondary }}>
                <strong style={{ color: ds.textPrimary }}>Priority</strong>
                <select
                  value={task.priority ?? ""}
                  disabled={updatingTaskId === task.id || isExecutionLocked}
                  onChange={(e) => onUpdateTask(task.id, { priority: e.target.value || null })}
                  style={{ background: ds.surfaceBg, border: `1px solid ${ds.border}`, borderRadius: 8, padding: "6px 10px", fontSize: ds.textSmall }}
                >
                  <option value="">No priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>

            <div style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.textPrimary, marginBottom: 6 }}>Task notes</div>
            <TaskNotesEditor
              taskId={task.id}
              initialNotes={task.notes ?? ""}
              disabled={updatingTaskId === task.id || isExecutionLocked}
              onSave={(notes) => onUpdateTask(task.id, { notes })}
            />

            {/* Task comments */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${ds.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.textPrimary, marginBottom: 8 }}>
                Comments ({taskComments.length})
              </div>
              {loadingComments ? (
                <p style={{ fontSize: ds.textSmall, color: ds.muted }}>Loading comments...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {taskComments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        background: ds.surfaceBg,
                        borderRadius: 8,
                        padding: "10px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.textPrimary }}>{comment.author_name ?? "System"}</span>
                        <span style={{ fontSize: ds.textEyebrow, color: ds.muted }}>{formatTimestamp(comment.created_at)}</span>
                      </div>
                      <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0, lineHeight: 1.5 }}>{comment.body}</p>
                    </div>
                  ))}
                  {!taskComments.length && !loadingComments && (
                    <p style={{ fontSize: ds.textSmall, color: ds.muted }}>No comments on this task yet.</p>
                  )}
                </div>
              )}
              {venueId && !isExecutionLocked && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    className="progress-input"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ flex: 1, fontSize: ds.textSmall, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "6px 10px" }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !submittingComment) handleSubmitComment(); }}
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !commentDraft.trim()}
                    style={{
                      fontSize: ds.textSmall,
                      fontWeight: 600,
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: ds.accent,
                      color: "#fff",
                      cursor: (submittingComment || !commentDraft.trim()) ? "not-allowed" : "pointer",
                      opacity: (submittingComment || !commentDraft.trim()) ? 0.5 : 1,
                    }}
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
  };

  /* ── Lane section renderer ── */
  const renderLane = (label: string, tasks: typeof lanes.ready, color: string) => {
    if (tasks.length === 0) return null;
    return (
      <div style={{ marginBottom: ds.sectionGap }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: ds.cardGap }}>
          <h2 style={sectionHeadingStyle}>{label}</h2>
          <span style={countPillStyle(color)}>{tasks.length}</span>
        </div>
        {tasks.map((task) => renderTaskCard(task, label.toLowerCase()))}
      </div>
    );
  };

  return (
    <div style={{ padding: ds.pageMargin }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: ds.sectionGap }}>
        <p style={eyebrowStyle}>VENUE</p>
        <h1 style={{ fontSize: ds.textTitle, fontWeight: 700, color: ds.textPrimary, margin: "4px 0 0" }}>Plan</h1>
      </div>

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
          <div style={{ display: "flex", flexDirection: "column", gap: ds.sectionGap }}>

            {/* ── Completion progress bar ── */}
            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: ds.textBody, fontWeight: 600, color: ds.textPrimary }}>Execution progress</span>
                <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: (executionSummary?.completion_percentage ?? 0) >= 80 ? ds.success : ds.accent }}>
                  {Math.round(executionSummary?.completion_percentage ?? 0)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: ds.surfaceBg, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round(executionSummary?.completion_percentage ?? 0)}%`,
                  background: (executionSummary?.completion_percentage ?? 0) >= 80 ? ds.success : ds.accent,
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>

            {/* ── Provenance strip ── */}
            {plan && (
              <div style={{ ...cardStyle(), borderLeft: `4px solid ${ds.info}` }}>
                <p style={{ ...eyebrowStyle, marginBottom: 8 }}>Provenance</p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: ds.textSmall, color: ds.textSecondary }}>
                  <span>Plan: {plan.status}</span>
                  <span>Load: {plan.load_classification ?? "unknown"}</span>
                  <span>{plan.tasks.length} tasks</span>
                  <span>{totalDependencyCount} dependencies</span>
                  {plan.ontology_id && <span>Ontology: {plan.ontology_id}@{plan.ontology_version}</span>}
                </div>
              </div>
            )}

            {/* ── Summary cards grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: ds.cardGap }}>
              {/* Execution stance */}
              <div style={{ ...cardStyle(ds.accent) }}>
                <p style={{ ...eyebrowStyle, marginBottom: 8 }}>Execution stance</p>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: ds.textPrimary, margin: "0 0 6px" }}>
                  {executionSummary?.next_executable_tasks.length ? "Move ready work" : "Resolve bottlenecks"}
                </h3>
                <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0, lineHeight: 1.5 }}>
                  {executionSummary?.next_executable_tasks.length
                    ? "There is executable work waiting now. The plan view should push action, not analysis drift."
                    : "The queue is being constrained by dependencies. Clear the blocked path before adding new noise."}
                </p>
              </div>

              {/* Status mix */}
              <div style={cardStyle()}>
                <p style={{ ...eyebrowStyle, marginBottom: 10 }}>Status mix</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Not started", count: countsByStatus.not_started ?? 0, color: ds.muted },
                    { label: "In progress", count: countsByStatus.in_progress ?? 0, color: ds.info },
                    { label: "Completed", count: countsByStatus.completed ?? 0, color: ds.success },
                    ...(countsByStatus.blocked ? [{ label: "Blocked", count: countsByStatus.blocked, color: ds.danger }] : []),
                    ...(countsByStatus.on_hold ? [{ label: "On hold", count: countsByStatus.on_hold, color: ds.warning }] : []),
                    ...(countsByStatus.deferred ? [{ label: "Deferred", count: countsByStatus.deferred, color: "#9CA3AF" }] : []),
                  ].map(({ label, count, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ds.textSmall }}>
                      <span style={dotStyle(color)} />
                      <span style={{ color: ds.textSecondary }}>{label}</span>
                      <span style={{ marginLeft: "auto", fontWeight: 600, color: ds.textPrimary }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical selection (conditional) */}
              {isHistoricalSelection ? (
                <div style={{ ...cardStyle(ds.warning) }}>
                  <p style={{ ...eyebrowStyle, marginBottom: 8 }}>Selection</p>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: ds.textPrimary, margin: "0 0 6px" }}>Historical plan</h3>
                  <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0, lineHeight: 1.5 }}>
                    You are viewing the plan linked to an older report selection, not necessarily the latest venue plan.
                  </p>
                </div>
              ) : null}

              {/* Dependencies */}
              <div style={cardStyle()}>
                <p style={{ ...eyebrowStyle, marginBottom: 10 }}>Dependencies</p>
                <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: ds.textPrimary }}>{totalDependencyCount}</div>
                    <div style={{ fontSize: ds.textEyebrow, color: ds.muted, textTransform: "uppercase" }}>links</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: (executionSummary?.blocked_tasks.length ?? 0) > 0 ? ds.danger : ds.textPrimary }}>
                      {executionSummary?.blocked_tasks.length ?? 0}
                    </div>
                    <div style={{ fontSize: ds.textEyebrow, color: ds.muted, textTransform: "uppercase" }}>blocked</div>
                  </div>
                </div>
                <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0, lineHeight: 1.5 }}>{criticalPathSummary}</p>
              </div>
            </div>

            {/* ── Next executable / Blocked split ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ds.cardGap }}>
              <div style={cardStyle(ds.success)}>
                <p style={{ ...eyebrowStyle, marginBottom: 10 }}>Next executable</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {(executionSummary?.next_executable_tasks ?? []).map((task) => (
                    <li key={task.task_id} style={{ fontSize: ds.textSmall, color: ds.textPrimary, padding: "4px 0", borderBottom: `1px solid ${ds.border}` }}>
                      {task.title}
                    </li>
                  ))}
                  {!executionSummary?.next_executable_tasks.length ? <li style={{ fontSize: ds.textSmall, color: ds.muted }}>No ready tasks.</li> : null}
                </ul>
              </div>
              <div style={cardStyle(ds.danger)}>
                <p style={{ ...eyebrowStyle, marginBottom: 10 }}>Blocked tasks</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {(executionSummary?.blocked_tasks ?? []).slice(0, 4).map((task) => (
                    <li key={task.task_id} style={{ fontSize: ds.textSmall, color: ds.textPrimary, padding: "4px 0", borderBottom: `1px solid ${ds.border}` }}>
                      {task.title}: <span style={{ color: ds.muted }}>{task.blocking_dependency_ids.join(", ")}</span>
                    </li>
                  ))}
                  {!executionSummary?.blocked_tasks.length ? <li style={{ fontSize: ds.textSmall, color: ds.muted }}>No blocked tasks.</li> : null}
                </ul>
              </div>
            </div>

            {/* ── Dependency view section ── */}
            <SectionCard
              eyebrow="Dependencies"
              title="Dependency view"
              description="Graph is folded into Plan until there is a real visualization surface."
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <div style={{ fontSize: ds.textBody, fontWeight: 600, color: ds.textPrimary, marginBottom: 8 }}>Critical path</div>
                  <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, lineHeight: 1.5 }}>{criticalPathSummary}</p>
                </div>
                <div>
                  <div style={{ fontSize: ds.textBody, fontWeight: 600, color: ds.textPrimary, marginBottom: 8 }}>Selected task links</div>
                  {selectedTask ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ ...cardStyle(), padding: "12px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: ds.textSmall, fontWeight: 600 }}>Upstream</span>
                          <span style={{ fontSize: ds.textEyebrow, color: ds.muted }}>{selectedTask.block_id}</span>
                        </div>
                        <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0 }}>
                          {selectedTask.dependencies.length ? selectedTask.dependencies.join(", ") : "Independent start"}
                        </p>
                      </div>
                      <div style={{ ...cardStyle(), padding: "12px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: ds.textSmall, fontWeight: 600 }}>Downstream</span>
                          <span style={{ fontSize: ds.textEyebrow, color: ds.muted }}>{downstreamTaskTitles.length} linked</span>
                        </div>
                        <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0 }}>
                          {downstreamTaskTitles.length ? downstreamTaskTitles.join(", ") : "No downstream tasks derived from the current plan data."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: ds.textSmall, color: ds.muted }}>Expand a task to inspect its upstream and downstream links.</p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* ── Plan lanes ── */}
            {renderLane("Ready", lanes.ready, ds.success)}
            {renderLane("Active", lanes.active, ds.info)}
            {renderLane("Blocked", lanes.blocked, ds.danger)}

            {/* Completed section: collapsible */}
            {lanes.completed.length > 0 && (
              <div style={{ marginBottom: ds.sectionGap }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: ds.cardGap, cursor: "pointer" }}
                  onClick={() => setCompletedCollapsed(!completedCollapsed)}
                >
                  <h2 style={sectionHeadingStyle}>Completed</h2>
                  <span style={countPillStyle(ds.success)}>{lanes.completed.length}</span>
                  <span style={{ fontSize: ds.textSmall, color: ds.muted, marginLeft: 4 }}>
                    {completedCollapsed ? "Show" : "Hide"}
                  </span>
                </div>
                {!completedCollapsed && lanes.completed.map((task) => renderTaskCard(task, "completed"))}
              </div>
            )}
          </div>
        )}
      </PrimaryCanvas>

      {/* ── Progress feed ── */}
      <div style={{ marginTop: ds.sectionGap }}>
        <SectionCard
          eyebrow="Progress"
          title="Progress feed"
          description="Operators log real movement, not just plans."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <input
              className="progress-input"
              value={progressSummary}
              onChange={(event) => onProgressSummaryChange(event.target.value)}
              placeholder="What changed operationally?"
              style={{ fontSize: ds.textBody, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "10px 14px" }}
            />
            <textarea
              className="progress-textarea"
              value={progressDetail}
              onChange={(event) => onProgressDetailChange(event.target.value)}
              placeholder="Add detail, blockers, or evidence..."
              style={{ fontSize: ds.textBody, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "10px 14px", minHeight: 80 }}
            />
            <button
              onClick={onCreateProgressEntry}
              disabled={savingProgress}
              style={{
                alignSelf: "flex-start",
                padding: "8px 20px",
                fontSize: ds.textSmall,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: ds.accent,
                color: "#fff",
                cursor: savingProgress ? "not-allowed" : "pointer",
                opacity: savingProgress ? 0.6 : 1,
              }}
            >
              {savingProgress ? "Logging..." : "Log progress"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ds.cardGap }}>
            {progressEntries.map((entry) => (
              <div key={entry.id} style={{ ...cardStyle(), padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: ds.textSmall, color: ds.muted }}>{formatTimestamp(entry.created_at)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={dotStyle(statusColor(entry.status))} />
                    <span style={{ fontSize: ds.textEyebrow, fontWeight: 600, color: ds.textSecondary }}>{entry.status}</span>
                  </div>
                </div>
                <p style={{ fontSize: ds.textBody, color: ds.textPrimary, margin: 0, fontWeight: 500 }}>{entry.summary}</p>
                {entry.detail ? <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: "6px 0 0", lineHeight: 1.5 }}>{entry.detail}</p> : null}
              </div>
            ))}
            {!progressEntries.length ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: ds.textSmall, color: ds.muted }}>No progress logged yet. Start capturing real execution movement here.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {/* ── Inspector: selected task context ── */}
      <ContextInspector
        open={inspectedTaskId !== null}
        title="Task context"
        onClose={() => setInspectedTaskId(null)}
      >
        {(() => { const t = plan?.tasks.find((task) => task.id === inspectedTaskId); return t ? (
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: ds.textCardTitle, fontWeight: 600, color: ds.textPrimary }}>{t.title}</h4>
            <p style={{ fontSize: ds.textSmall, color: ds.muted, margin: "0 0 16px 0", lineHeight: 1.5 }}>{t.rationale}</p>
            <div style={{ fontSize: ds.textSmall, marginBottom: 16 }}>
              {[
                { label: "Status", value: t.status.replace(/_/g, " ") },
                { label: "Assigned", value: t.assigned_to ?? "Unassigned" },
                { label: "Priority", value: t.priority ?? "Normal" },
                { label: "Effort", value: `${t.effort_hours}h` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${ds.border}` }}>
                  <span style={{ color: ds.muted }}>{label}</span>
                  <span style={{ color: ds.textPrimary, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              {t.dependencies.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: ds.muted }}>Dependencies</span>
                  <span style={{ color: ds.textPrimary, fontWeight: 500 }}>{t.dependencies.length} tasks</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setInspectedTaskId(null); setExpandedTaskId(t.id); }}
                style={{ background: ds.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: ds.textSmall, fontWeight: 600, cursor: "pointer" }}
              >
                Expand full detail
              </button>
              {onOpenWorkspace && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenWorkspace(t.id)}
                  style={{ background: "transparent", color: ds.accent, border: `1px solid ${ds.accent}`, borderRadius: 8, padding: "8px 16px", fontSize: ds.textSmall, fontWeight: 600, cursor: "pointer" }}
                >
                  Open workspace
                </button>
              )}
            </div>
          </div>
        ) : null; })()}
      </ContextInspector>

      {/* ── Drawer: compare + history ── */}
      <DeepDrawer open={drawerOpen} title="Plan history and compare" onClose={() => setDrawerOpen(false)}>
        <div>
          <p style={{ color: ds.muted, fontSize: ds.textSmall, marginBottom: 16, lineHeight: 1.5 }}>
            Plan version history and comparison view. View prior plan versions and track how the execution sequence has evolved.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenHistory}
            style={{ background: "transparent", color: ds.accent, border: `1px solid ${ds.accent}`, borderRadius: 8, padding: "8px 16px", fontSize: ds.textSmall, fontWeight: 600, cursor: "pointer" }}
          >
            Open full timeline
          </button>
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
        style={{
          minHeight: 60,
          fontSize: ds.textSmall,
          borderRadius: 8,
          border: `1px solid ${ds.border}`,
          padding: "10px 14px",
          width: "100%",
          boxSizing: "border-box",
        }}
        disabled={disabled}
      />
      {dirty && (
        <button
          onClick={() => onSave(draft)}
          disabled={disabled}
          style={{
            marginTop: 8,
            fontSize: ds.textSmall,
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: ds.accent,
            color: "#fff",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Save notes
        </button>
      )}
    </div>
  );
}
