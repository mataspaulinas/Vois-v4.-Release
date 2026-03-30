import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { PlanExecutionSummary, PlanRecord, PlanTaskRecord, PlanTaskUpdatePayload, ProgressEntryRecord, TaskCommentRecord, fetchTaskComments, createTaskComment } from "../../lib/api";

const ALL_STATUSES = ["not_started", "in_progress", "completed", "blocked", "on_hold", "deferred"];

/* ── Design system tokens (v2) ── */
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
  textBody: 15,
  textSmall: 13,
  textEyebrow: 11,
  textHeading: 20,
  textTitle: 28,
  textCardTitle: 16,
  sectionGap: 32,
  cardGap: 12,
  pageMargin: 48,
  muted: "#8B8FA3",
  textPrimary: "#1A1D2E",
  textSecondary: "#5A5E73",
  border: "#E8E9EF",
  surfaceBg: "#F7F7FA",
  l1Color: "#F97316",
  l2Color: "#10B981",
  l3Color: "#6366F1",
  l4Color: "#8B5CF6",
} as const;

const LANE_COLORS = [ds.l1Color, ds.l2Color, ds.l3Color, ds.l4Color];

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

const priorityColor = (priority: string | null | undefined) => {
  switch (priority) {
    case "critical": return ds.danger;
    case "high": return ds.warning;
    case "normal": return ds.info;
    case "medium": return ds.info;
    case "low": return ds.muted;
    default: return ds.muted;
  }
};

/* ── Lane grouping logic ── */
type Lane = { index: number; title: string; description: string; tasks: PlanTaskRecord[] };

function groupTasksIntoLanes(tasks: PlanTaskRecord[]): Lane[] {
  const sorted = [...tasks].sort((a, b) => a.order_index - b.order_index);
  const hasLayerInfo = sorted.some(t => t.trace?.layer_index != null);

  if (hasLayerInfo) {
    const lanes = new Map<number, { tasks: PlanTaskRecord[]; title: string; description: string }>();
    for (const task of sorted) {
      const layerIdx = (task.trace?.layer_index as number) ?? 0;
      if (!lanes.has(layerIdx)) {
        lanes.set(layerIdx, {
          tasks: [],
          title: (task.trace?.layer_title as string) ?? `Layer ${layerIdx + 1}`,
          description: (task.trace?.layer_description as string) ?? "",
        });
      }
      lanes.get(layerIdx)!.tasks.push(task);
    }
    return Array.from(lanes.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([idx, lane]) => ({ index: idx, ...lane }));
  }

  const third = Math.ceil(sorted.length / 3);
  return [
    { index: 0, title: "Immediate Control", description: "Visibility, clarity, and stabilising the present.", tasks: sorted.slice(0, third) },
    { index: 1, title: "Structural Integration", description: "Embedding behaviour into daily and weekly routines.", tasks: sorted.slice(third, third * 2) },
    { index: 2, title: "Leadership Maintenance", description: "Monthly leadership routines, quarterly audits, and corrective pathways.", tasks: sorted.slice(third * 2) },
  ].filter(l => l.tasks.length > 0);
}

/* ── Filter logic ── */
function filterTasks(tasks: PlanTaskRecord[], mode: string): PlanTaskRecord[] {
  switch (mode) {
    case "overdue": return tasks.filter(t => t.due_at && new Date(t.due_at) < new Date() && t.status !== "completed");
    case "not_started": return tasks.filter(t => t.status === "not_started");
    case "high": return tasks.filter(t => t.priority === "high" || t.priority === "critical");
    case "medium": return tasks.filter(t => t.priority === "normal" || t.priority === "medium");
    default: return tasks;
  }
}

/* ── Signal chain extraction ── */
function extractSignalChain(task: PlanTaskRecord) {
  const chain: Array<{ type: string; code: string; label?: string }> = [];
  if (task.trace?.signal_id) chain.push({ type: "signal", code: task.trace.signal_id as string });
  if (task.trace?.failure_mode_id) chain.push({ type: "failure-mode", code: task.trace.failure_mode_id as string });
  if (task.trace?.response_pattern) {
    const rp = task.trace.response_pattern as string;
    chain.push({ type: "response-pattern", code: rp.split(":")[0] || rp, label: rp });
  }
  if (task.block_id) chain.push({ type: "block", code: task.block_id });
  return chain;
}

const chainTypeColor = (type: string) => {
  switch (type) {
    case "signal": return ds.success;
    case "failure-mode": return ds.danger;
    case "response-pattern": return ds.warning;
    case "block": return ds.accent;
    default: return ds.muted;
  }
};

/* ── Overdue count helper ── */
function countOverdue(tasks: PlanTaskRecord[]) {
  const now = new Date();
  return tasks.filter(t => t.due_at && new Date(t.due_at) < now && t.status !== "completed").length;
}

/* ── Types ── */
type PlanTab = "tasks" | "signals" | "report" | "assessments" | "timeline";
type FilterMode = "all" | "overdue" | "not_started" | "high" | "medium";

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
  /* ── State ── */
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [inspectedTaskId, setInspectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<TaskCommentRecord[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanTab>("tasks");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [collapsedLanes, setCollapsedLanes] = useState<Set<number>>(new Set());
  const [commentsOpen, setCommentsOpen] = useState(false);

  /* ── Effects ── */
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

  /* ── Derived data ── */
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

  const readyTaskIds = new Set((executionSummary?.next_executable_tasks ?? []).map((t) => t.task_id));
  const blockedTaskIds = new Set((executionSummary?.blocked_tasks ?? []).map((t) => t.task_id));

  const allTasks = plan?.tasks ?? [];
  const overdueCount = countOverdue(allTasks);
  const notStartedCount = allTasks.filter(t => t.status === "not_started").length;
  const highCount = allTasks.filter(t => t.priority === "high" || t.priority === "critical").length;
  const mediumCount = allTasks.filter(t => t.priority === "normal" || t.priority === "medium").length;
  const doneCount = countsByStatus.completed ?? 0;
  const activeCount = countsByStatus.in_progress ?? 0;
  const blockedCount = countsByStatus.blocked ?? 0;
  const pendingCount = notStartedCount;
  const signalCount = allTasks.filter(t => t.trace?.signal_id).length;

  /* ── Lanes ── */
  const lanes = useMemo(() => {
    if (!plan) return [];
    const filtered = filterTasks(plan.tasks, filterMode);
    return groupTasksIntoLanes(filtered);
  }, [plan, filterMode]);

  /* ── Lane toggle ── */
  const toggleLane = (idx: number) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  /* ── Lane progress ── */
  const laneProgress = (tasks: PlanTaskRecord[]) => {
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.status === "completed").length;
    return Math.round((done / tasks.length) * 100);
  };

  /* ── Focus today handler ── */
  const handleFocusToday = () => {
    const now = new Date();
    const target = allTasks.find(t => {
      if (!t.due_at || t.status === "completed") return false;
      const due = new Date(t.due_at);
      return due <= now || due.toDateString() === now.toDateString();
    });
    if (target) {
      setExpandedTaskId(target.id);
      setTimeout(() => {
        document.getElementById(`task-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  /* ── Status indicator icon ── */
  const StatusCircle = ({ status }: { status: string }) => {
    const size = 16;
    if (status === "completed") {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill={ds.success} />
          <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (status === "in_progress") {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill="none" stroke={ds.info} strokeWidth="1.5" />
          <path d="M8 1 A7 7 0 0 1 15 8" fill={ds.info} />
          <circle cx="8" cy="8" r="7" fill="none" stroke={ds.info} strokeWidth="1.5" />
        </svg>
      );
    }
    if (status === "blocked") {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill="none" stroke={ds.danger} strokeWidth="1.5" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={ds.danger} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" fill="none" stroke={ds.border} strokeWidth="1.5" />
      </svg>
    );
  };

  /* ── Plan date display ── */
  const planDate = plan?.created_at ? new Date(plan.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "";
  const planDateShort = plan?.created_at ? new Date(plan.created_at).toISOString().slice(0, 10) : "";
  const planVersion = plan?.ontology_version ?? "v1";

  /* ── Tab definitions ── */
  const tabs: Array<{ key: PlanTab; label: string; icon: string; badge?: number }> = [
    { key: "tasks", label: "Tasks", icon: "\u2611" },
    { key: "signals", label: "Signals", icon: "\u26A1", badge: signalCount || undefined },
    { key: "report", label: "Report", icon: "\uD83D\uDCC4" },
    { key: "assessments", label: "Assessments", icon: "\uD83D\uDCCB" },
    { key: "timeline", label: "Timeline", icon: "\uD83D\uDCCA" },
  ];

  /* ── Filter definitions ── */
  const filters: Array<{ key: FilterMode; label: string; count: number; group: "status" | "priority" }> = [
    { key: "all", label: "All", count: allTasks.length, group: "status" },
    { key: "overdue", label: "Overdue", count: overdueCount, group: "status" },
    { key: "not_started", label: "Not Started", count: notStartedCount, group: "status" },
    { key: "high", label: "High", count: highCount, group: "priority" },
    { key: "medium", label: "Medium", count: mediumCount, group: "priority" },
  ];

  /* ── Render: Signal chain ── */
  const renderSignalChain = (task: PlanTaskRecord) => {
    const chain = extractSignalChain(task);
    if (!chain.length) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: ds.textSmall, marginBottom: 12 }}>
        {chain.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span style={{ color: ds.muted, margin: "0 2px" }}>{"\u2192"}</span>}
            <span style={{
              color: chainTypeColor(item.type),
              fontWeight: 600,
              background: chainTypeColor(item.type) + "14",
              borderRadius: 4,
              padding: "2px 6px",
              cursor: "pointer",
            }}>
              {item.code}
            </span>
            {item.label && item.label !== item.code && (
              <span style={{ color: ds.textSecondary }}>{item.label.split(":").slice(1).join(":").trim()}</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  /* ── Render: Task card ── */
  const renderTaskCard = (task: PlanTaskRecord) => {
    const isExpanded = expandedTaskId === task.id;
    const blockedDependencies = blockedTaskMap.get(task.id) ?? [];
    const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== "completed";
    const completedSubActions = task.sub_actions.filter(a => a.completed).length;
    const totalSubActions = task.sub_actions.length;

    return (
      <article
        key={task.id}
        id={`task-${task.id}`}
        style={{
          background: ds.cardBg,
          borderRadius: ds.cardRadius,
          boxShadow: ds.cardShadow,
          marginBottom: ds.cardGap,
          overflow: "hidden",
          transition: "box-shadow 0.15s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = ds.cardShadowHover; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ds.cardShadow; }}
      >
        {/* ── Card face (collapsed) ── */}
        <div
          style={{ padding: "14px 20px", cursor: "pointer" }}
          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
        >
          {/* Row 1: status circle, block code, title, overdue badge, priority, sub-action count, chevron */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusCircle status={task.status} />
            <span style={{ fontSize: ds.textSmall, fontWeight: 700, color: ds.accent, letterSpacing: "0.02em" }}>
              {task.block_id}
            </span>
            <span style={{ fontSize: ds.textCardTitle, fontWeight: 600, color: ds.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.title}
            </span>
            {isOverdue && (
              <span style={{
                fontSize: ds.textEyebrow, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                color: "#fff", background: ds.danger, borderRadius: 4, padding: "2px 7px",
              }}>
                Overdue
              </span>
            )}
            {task.priority && (
              <span style={{
                fontSize: ds.textSmall, fontWeight: 600, color: priorityColor(task.priority),
              }}>
                {task.priority}
              </span>
            )}
            {totalSubActions > 0 && (
              <span style={{ fontSize: ds.textSmall, color: ds.muted, fontWeight: 500 }}>
                {"\u2713"}{completedSubActions}/{totalSubActions}
              </span>
            )}
            <span style={{ fontSize: 14, color: ds.muted, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s ease" }}>
              {"\u25BE"}
            </span>
          </div>
          {/* Row 2: assignee, task ID, due date */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, marginLeft: 26, fontSize: ds.textSmall, color: ds.muted }}>
            {task.assigned_to && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {"\uD83D\uDC64"} {task.assigned_to}
              </span>
            )}
            <span style={{ fontFamily: "monospace", fontSize: ds.textEyebrow, color: ds.textSecondary }}>
              M{task.order_index}
            </span>
            {task.due_at && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {"\uD83D\uDCC5"} {new Date(task.due_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
            {task.effort_hours > 0 && (
              <span>{task.effort_hours}h</span>
            )}
          </div>
        </div>

        {/* ── Expanded section ── */}
        {isExpanded && (
          <div style={{ borderTop: `1px solid ${ds.border}`, padding: "16px 20px" }}>

            {/* Signal chain */}
            {renderSignalChain(task)}

            {/* Guidance / Rationale */}
            {task.rationale && (
              <div style={{
                background: ds.surfaceBg, borderRadius: 8, padding: "12px 16px", marginBottom: 16,
                fontSize: ds.textSmall, color: ds.textSecondary, lineHeight: 1.6, fontStyle: "italic",
              }}>
                {task.rationale}
              </div>
            )}

            {/* EXECUTION section */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: ds.muted, margin: "0 0 10px" }}>
                Execution
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ds.textSmall }}>
                  <span style={{ color: ds.muted, fontWeight: 500 }}>Assignee</span>
                  <input
                    type="text"
                    className="progress-input"
                    defaultValue={task.assigned_to ?? ""}
                    placeholder="Unassigned"
                    disabled={updatingTaskId === task.id || isExecutionLocked}
                    onBlur={(e) => {
                      const value = e.target.value.trim() || null;
                      if (value !== task.assigned_to) onUpdateTask(task.id, { assigned_to: value });
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    style={{ fontSize: ds.textSmall, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "8px 10px", background: ds.surfaceBg }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ds.textSmall }}>
                  <span style={{ color: ds.muted, fontWeight: 500 }}>Due date</span>
                  <input
                    type="date"
                    value={task.due_at ? task.due_at.slice(0, 10) : ""}
                    disabled={updatingTaskId === task.id || isExecutionLocked}
                    onChange={(e) => {
                      const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                      onUpdateTask(task.id, { due_at: value });
                    }}
                    style={{ fontSize: ds.textSmall, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "8px 10px", background: ds.surfaceBg }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ds.textSmall }}>
                  <span style={{ color: ds.muted, fontWeight: 500 }}>Priority</span>
                  <select
                    value={task.priority ?? ""}
                    disabled={updatingTaskId === task.id || isExecutionLocked}
                    onChange={(e) => onUpdateTask(task.id, { priority: e.target.value || null })}
                    style={{ fontSize: ds.textSmall, borderRadius: 8, border: `1px solid ${ds.border}`, padding: "8px 10px", background: ds.surfaceBg }}
                  >
                    <option value="">No priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Status pills row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {ALL_STATUSES.map((status) => {
                const blockedForStatus = blockedDependencies.length > 0 && (status === "in_progress" || status === "completed");
                const isActive = task.status === status;
                return (
                  <button
                    key={status}
                    onClick={(e) => { e.stopPropagation(); onUpdateTaskStatus(task.id, status); }}
                    disabled={updatingTaskId === task.id || blockedForStatus || isExecutionLocked}
                    title={
                      isExecutionLocked ? "Only the active plan can be mutated."
                        : blockedForStatus ? `Blocked by: ${blockedDependencies.join(", ")}`
                          : undefined
                    }
                    style={{
                      padding: "4px 10px", fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                      border: isActive ? "none" : `1px solid ${ds.border}`, borderRadius: 6,
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
                marginBottom: 16, padding: "8px 12px", borderRadius: 8,
                background: ds.danger + "0A", border: `1px solid ${ds.danger}20`,
                fontSize: ds.textSmall, color: ds.danger, fontWeight: 500,
              }}>
                Blocked by: {blockedDependencies.join(", ")}
              </div>
            )}

            {/* SUB-ACTIONS section */}
            {task.sub_actions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: ds.muted, margin: "0 0 8px" }}>
                  Sub-actions
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {task.sub_actions.map((action, idx) => (
                    <label
                      key={`${action.text}-${idx}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                        fontSize: ds.textSmall, color: action.completed ? ds.muted : ds.textPrimary,
                        textDecoration: action.completed ? "line-through" : "none",
                        cursor: (updatingTaskId === task.id || isExecutionLocked) ? "not-allowed" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={action.completed}
                        disabled={updatingTaskId === task.id || isExecutionLocked}
                        onChange={() => {
                          const completions = task.sub_actions.map((a, i) => i === idx ? !a.completed : a.completed);
                          onUpdateTask(task.id, { sub_action_completions: completions });
                        }}
                        style={{ accentColor: ds.accent, width: 16, height: 16, flexShrink: 0 }}
                      />
                      {action.text}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* DELIVERABLES section */}
            {task.deliverables.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: ds.muted, margin: "0 0 8px" }}>
                  Deliverables
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {task.deliverables.map((deliverable, idx) => (
                    <label
                      key={`${deliverable.name}-${idx}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                        fontSize: ds.textSmall, color: deliverable.completed ? ds.muted : ds.textPrimary,
                        textDecoration: deliverable.completed ? "line-through" : "none",
                        cursor: (updatingTaskId === task.id || isExecutionLocked) ? "not-allowed" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={deliverable.completed}
                        disabled={updatingTaskId === task.id || isExecutionLocked}
                        onChange={() => {
                          const completions = task.deliverables.map((d, i) => i === idx ? !d.completed : d.completed);
                          onUpdateTask(task.id, { deliverable_completions: completions });
                        }}
                        style={{ accentColor: ds.accent, width: 16, height: 16, flexShrink: 0 }}
                      />
                      {deliverable.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Task notes */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: ds.muted, margin: "0 0 8px" }}>
                Notes
              </p>
              <TaskNotesEditor
                taskId={task.id}
                initialNotes={task.notes ?? ""}
                disabled={updatingTaskId === task.id || isExecutionLocked}
                onSave={(notes) => onUpdateTask(task.id, { notes })}
              />
            </div>

            {/* Comments (collapsible) */}
            <div style={{ borderTop: `1px solid ${ds.border}`, paddingTop: 12 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: commentsOpen ? 10 : 0 }}
                onClick={() => setCommentsOpen(!commentsOpen)}
              >
                <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.textPrimary }}>
                  Comments ({taskComments.length})
                </span>
                <span style={{ fontSize: 12, color: ds.muted, transform: commentsOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s ease" }}>
                  {"\u25BE"}
                </span>
              </div>
              {commentsOpen && (
                <>
                  {loadingComments ? (
                    <p style={{ fontSize: ds.textSmall, color: ds.muted }}>Loading comments...</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {taskComments.map((comment) => (
                        <div key={comment.id} style={{ background: ds.surfaceBg, borderRadius: 8, padding: "10px 14px" }}>
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
                          fontSize: ds.textSmall, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "none",
                          background: ds.accent, color: "#fff",
                          cursor: (submittingComment || !commentDraft.trim()) ? "not-allowed" : "pointer",
                          opacity: (submittingComment || !commentDraft.trim()) ? 0.5 : 1,
                        }}
                      >
                        {submittingComment ? "..." : "Comment"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Dependency chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${ds.border}` }}>
              <span style={{ fontSize: ds.textEyebrow, fontWeight: 600, color: ds.muted, textTransform: "uppercase", marginRight: 4 }}>Deps</span>
              {task.dependencies.length ? (
                task.dependencies.map((dep) => (
                  <span key={dep} style={{
                    fontSize: ds.textEyebrow, background: ds.surfaceBg, border: `1px solid ${ds.border}`,
                    borderRadius: 4, padding: "2px 8px", color: ds.textSecondary,
                  }}>
                    {dep}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: ds.textEyebrow, color: ds.muted }}>Independent start</span>
              )}
            </div>

            {/* Workspace button */}
            {onOpenWorkspace && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={() => onOpenWorkspace(task.id)}
                  style={{
                    fontSize: ds.textSmall, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
                    border: `1px solid ${ds.accent}`, background: "transparent", color: ds.accent, cursor: "pointer",
                  }}
                >
                  Open workspace
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  /* ── Render: Lane section ── */
  const renderLane = (lane: Lane, laneIdx: number) => {
    const color = LANE_COLORS[lane.index % LANE_COLORS.length];
    const isCollapsed = collapsedLanes.has(lane.index);
    const progress = laneProgress(lane.tasks);
    const dayRange = lane.index === 0 ? "Days 1\u201330" : lane.index === 1 ? "Days 31\u201360" : "Days 61\u201390";

    return (
      <div key={lane.index} style={{
        background: ds.cardBg, borderRadius: ds.cardRadius, boxShadow: ds.cardShadow,
        overflow: "hidden", marginBottom: ds.cardGap,
      }}>
        {/* Lane header */}
        <div
          style={{
            padding: "16px 20px", cursor: "pointer",
            borderBottom: isCollapsed ? "none" : `1px solid ${ds.border}`,
          }}
          onClick={() => toggleLane(lane.index)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            {/* Level badge */}
            <span style={{
              width: 26, height: 26, borderRadius: "50%", background: color + "18", color: color,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              L{lane.index + 1}
            </span>
            <span style={{ fontSize: ds.textHeading, fontWeight: 700, color: ds.textPrimary, flex: 1 }}>
              {lane.title}
            </span>
            <span style={{ fontSize: ds.textSmall, color: ds.muted }}>
              {dayRange} {"\u00B7"} {lane.tasks.length} task{lane.tasks.length !== 1 ? "s" : ""}
            </span>
            {/* Progress bar */}
            <div style={{ width: 80, height: 4, borderRadius: 2, background: ds.surfaceBg, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: color, borderRadius: 2, transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: color, minWidth: 32, textAlign: "right" }}>
              {progress}%
            </span>
            <span style={{ fontSize: 14, color: ds.muted, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.15s ease" }}>
              {"\u25BE"}
            </span>
          </div>
          {lane.description && (
            <p style={{ fontSize: ds.textSmall, color: ds.textSecondary, margin: 0, fontStyle: "italic", paddingLeft: 36 }}>
              {lane.description}
            </p>
          )}
        </div>

        {/* Lane tasks */}
        {!isCollapsed && (
          <div style={{ padding: "8px 12px 12px" }}>
            {lane.tasks.map(task => renderTaskCard(task))}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════
     ██  MAIN RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: ds.pageMargin, maxWidth: 1100, margin: "0 auto" }}>

      {loadingExecution ? (
        <LoadingState variant="list" />
      ) : !plan ? (
        <EmptyState
          title="No plan available"
          description="Run an assessment and engine to generate an operational plan for this venue."
        />
      ) : (
        <>
          {/* ═══ HEADER SECTION ═══ */}
          <div style={{ marginBottom: 24 }}>
            {/* Row 1 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: ds.textEyebrow, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: ds.textSecondary,
              }}>
                Operational Plan
              </span>
              <span style={{
                fontSize: ds.textEyebrow, fontWeight: 600, color: ds.muted,
                background: ds.surfaceBg, borderRadius: 4, padding: "2px 8px",
              }}>
                {planVersion}
              </span>
              <span style={{
                fontSize: ds.textEyebrow, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.04em", color: "#fff",
                background: plan.status === "active" ? ds.warning : plan.status === "archived" ? ds.muted : ds.accent,
                borderRadius: 4, padding: "2px 8px",
              }}>
                {plan.status === "active" ? "In Review" : plan.status}
              </span>
              {plan.load_classification && (
                <span style={{ fontSize: ds.textEyebrow, fontWeight: 600, textTransform: "uppercase", color: ds.muted }}>
                  {plan.load_classification}
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: ds.textSmall, color: ds.muted }}>
                {planDateShort}
              </span>
            </div>

            {/* Row 2: metadata */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6, fontSize: ds.textSmall, color: ds.muted }}>
              <span>Owner: <strong style={{ color: ds.textSecondary }}>Lead Consultant</strong></span>
              <span>Reviewer: <strong style={{ color: ds.textSecondary }}>Portfolio Lead</strong></span>
              <span>Review requested {planDate}</span>
            </div>

            {/* Plan title */}
            <h1 style={{ fontSize: ds.textTitle, fontWeight: 700, color: ds.textPrimary, margin: "12px 0 4px" }}>
              {plan.title}
            </h1>
            {plan.summary && (
              <p style={{ fontSize: ds.textBody, color: ds.textSecondary, margin: 0, lineHeight: 1.5 }}>
                {plan.summary}
              </p>
            )}
          </div>

          {/* ═══ STATUS DOT BAR ═══ */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, padding: "10px 0",
            borderTop: `1px solid ${ds.border}`, borderBottom: `1px solid ${ds.border}`,
            marginBottom: 20, flexWrap: "wrap",
          }}>
            {[
              { label: "done", count: doneCount, color: ds.success, filled: true },
              { label: "active", count: activeCount, color: ds.warning, filled: true },
              { label: "blocked", count: blockedCount, color: ds.danger, filled: true },
              { label: "overdue", count: overdueCount, color: ds.danger, filled: true },
              { label: "pending", count: pendingCount, color: ds.muted, filled: false },
            ].map(({ label, count, color, filled }) => (
              <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: ds.textSmall, color: ds.textSecondary }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: filled ? color : "transparent",
                  border: filled ? "none" : `1.5px solid ${color}`,
                }} />
                {count} {label}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: ds.textSmall, fontWeight: 600, color: ds.textPrimary }}>
              {allTasks.length} tasks
            </span>
          </div>

          {/* ═══ PLAN TABS ═══ */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4, marginBottom: 20,
            borderBottom: `1px solid ${ds.border}`, paddingBottom: 0,
          }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "report") onOpenReport();
                    if (tab.key === "timeline") onOpenHistory();
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "10px 16px", fontSize: ds.textSmall, fontWeight: active ? 700 : 500,
                    color: active ? ds.accent : ds.muted,
                    background: "transparent", border: "none",
                    borderBottom: active ? `2px solid ${ds.accent}` : "2px solid transparent",
                    cursor: "pointer", transition: "all 0.15s ease",
                    marginBottom: -1,
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span style={{
                      fontSize: ds.textEyebrow, fontWeight: 700, color: "#fff", background: ds.accent,
                      borderRadius: 8, padding: "1px 6px", minWidth: 16, textAlign: "center",
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ═══ TAB CONTENT ═══ */}
          {activeTab === "tasks" ? (
            <>
              {/* ── Filter bar ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap",
              }}>
                <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.muted, marginRight: 4 }}>Filter:</span>
                {filters.map((f, i) => {
                  const active = filterMode === f.key;
                  const showSep = i > 0 && filters[i - 1].group !== f.group;
                  return (
                    <span key={f.key} style={{ display: "inline-flex", alignItems: "center" }}>
                      {showSep && (
                        <span style={{ width: 1, height: 18, background: ds.border, margin: "0 6px", flexShrink: 0 }} />
                      )}
                      <button
                        onClick={() => setFilterMode(f.key)}
                        style={{
                          padding: "4px 12px", fontSize: ds.textSmall, fontWeight: 600,
                          borderRadius: 20, cursor: "pointer", transition: "all 0.15s ease",
                          border: active ? "none" : `1px solid ${ds.border}`,
                          background: active ? ds.accent : "transparent",
                          color: active ? "#fff" : ds.textSecondary,
                        }}
                      >
                        {f.label} ({f.count})
                      </button>
                    </span>
                  );
                })}
                <button
                  onClick={handleFocusToday}
                  style={{
                    marginLeft: "auto", padding: "4px 14px", fontSize: ds.textSmall, fontWeight: 600,
                    borderRadius: 20, border: `1px solid ${ds.accent}`, background: "transparent",
                    color: ds.accent, cursor: "pointer",
                  }}
                >
                  Focus Today
                </button>
              </div>

              {/* ── Historical selection warning ── */}
              {isHistoricalSelection && (
                <div style={{
                  background: ds.warning + "10", border: `1px solid ${ds.warning}30`, borderRadius: ds.cardRadius,
                  padding: "12px 16px", marginBottom: 20, fontSize: ds.textSmall, color: ds.warning, fontWeight: 500,
                }}>
                  You are viewing the plan linked to an older report selection, not the latest venue plan.
                </div>
              )}

              {/* ── Completion progress bar ── */}
              <div style={{
                background: ds.cardBg, borderRadius: ds.cardRadius, boxShadow: ds.cardShadow,
                padding: "14px 20px", marginBottom: 24,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: ds.textSmall, fontWeight: 600, color: ds.textPrimary }}>Execution progress</span>
                  <span style={{ fontSize: ds.textSmall, fontWeight: 700, color: (executionSummary?.completion_percentage ?? 0) >= 80 ? ds.success : ds.accent }}>
                    {Math.round(executionSummary?.completion_percentage ?? 0)}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: ds.surfaceBg, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, transition: "width 0.3s ease",
                    width: `${Math.round(executionSummary?.completion_percentage ?? 0)}%`,
                    background: (executionSummary?.completion_percentage ?? 0) >= 80 ? ds.success : ds.accent,
                  }} />
                </div>
              </div>

              {/* ── Lane sections ── */}
              {lanes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: ds.muted, fontSize: ds.textSmall }}>
                  No tasks match the current filter.
                </div>
              ) : (
                lanes.map((lane, i) => renderLane(lane, i))
              )}
            </>
          ) : (
            /* ── Placeholder for non-Tasks tabs ── */
            <div style={{
              background: ds.cardBg, borderRadius: ds.cardRadius, boxShadow: ds.cardShadow,
              padding: "40px 24px", textAlign: "center",
            }}>
              <p style={{ fontSize: ds.textBody, color: ds.textSecondary, margin: "0 0 16px" }}>
                Switch to the <strong>{activeTab}</strong> view to see this content.
              </p>
              <button
                onClick={() => {
                  if (activeTab === "report") onOpenReport();
                  else if (activeTab === "timeline") onOpenHistory();
                }}
                style={{
                  padding: "8px 20px", fontSize: ds.textSmall, fontWeight: 600, borderRadius: 8,
                  border: `1px solid ${ds.accent}`, background: "transparent", color: ds.accent, cursor: "pointer",
                }}
              >
                {activeTab === "report" ? "Open Report" : activeTab === "timeline" ? "Open Timeline" : `View ${activeTab}`}
              </button>
            </div>
          )}

          {/* ═══ PROGRESS FEED ═══ */}
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
                    alignSelf: "flex-start", padding: "8px 20px", fontSize: ds.textSmall, fontWeight: 600,
                    borderRadius: 8, border: "none", background: ds.accent, color: "#fff",
                    cursor: savingProgress ? "not-allowed" : "pointer", opacity: savingProgress ? 0.6 : 1,
                  }}
                >
                  {savingProgress ? "Logging..." : "Log progress"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ds.cardGap }}>
                {progressEntries.map((entry) => (
                  <div key={entry.id} style={{
                    background: ds.cardBg, borderRadius: ds.cardRadius, boxShadow: ds.cardShadow, padding: "14px 18px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: ds.textSmall, color: ds.muted }}>{formatTimestamp(entry.created_at)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(entry.status) }} />
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
        </>
      )}

      {/* ═══ CONTEXT INSPECTOR ═══ */}
      <ContextInspector
        open={inspectedTaskId !== null}
        title="Task context"
        onClose={() => setInspectedTaskId(null)}
      >
        {(() => {
          const t = plan?.tasks.find((task) => task.id === inspectedTaskId);
          return t ? (
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
                  onClick={() => { setInspectedTaskId(null); setExpandedTaskId(t.id); }}
                  style={{ background: ds.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: ds.textSmall, fontWeight: 600, cursor: "pointer" }}
                >
                  Expand full detail
                </button>
                {onOpenWorkspace && (
                  <button
                    onClick={() => onOpenWorkspace(t.id)}
                    style={{ background: "transparent", color: ds.accent, border: `1px solid ${ds.accent}`, borderRadius: 8, padding: "8px 16px", fontSize: ds.textSmall, fontWeight: 600, cursor: "pointer" }}
                  >
                    Open workspace
                  </button>
                )}
              </div>
            </div>
          ) : null;
        })()}
      </ContextInspector>

      {/* ═══ DRAWER ═══ */}
      <DeepDrawer open={drawerOpen} title="Plan history and compare" onClose={() => setDrawerOpen(false)}>
        <div>
          <p style={{ color: ds.muted, fontSize: ds.textSmall, marginBottom: 16, lineHeight: 1.5 }}>
            Plan version history and comparison view. View prior plan versions and track how the execution sequence has evolved.
          </p>
          <button
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

/* ═══ TaskNotesEditor (preserved) ═══ */
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
          minHeight: 60, fontSize: ds.textSmall, borderRadius: 8,
          border: `1px solid ${ds.border}`, padding: "10px 14px",
          width: "100%", boxSizing: "border-box", background: ds.surfaceBg,
        }}
        disabled={disabled}
      />
      {dirty && (
        <button
          onClick={() => onSave(draft)}
          disabled={disabled}
          style={{
            marginTop: 8, fontSize: ds.textSmall, fontWeight: 600, padding: "6px 14px",
            borderRadius: 8, border: "none", background: ds.accent, color: "#fff",
            cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
          }}
        >
          Save notes
        </button>
      )}
    </div>
  );
}
