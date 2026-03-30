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
  onAskCopilot?: (context: string) => void;
  greeting?: string | null;
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

/* ── Inline style constants (golden page tokens) ── */

const S = {
  pageBg: "#FAFAFA",
  surface: "#FFFFFF",
  accent: "#6C5CE7",
  accentSoft: "rgba(108, 92, 231, 0.06)",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  textPrimary: "var(--color-text-primary, #1A1A2E)",
  textSecondary: "var(--color-text-secondary, #64748B)",
  textMuted: "var(--color-text-muted, #94A3B8)",
  radius: 12,
  radiusBtn: 8,
  radiusPill: 24,
  shadow: "0 1px 3px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
  transition: "all 180ms ease",
  cardPad: 24,
  sectionGap: 32,
  cardGap: 16,
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
} as const;

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
  onAskCopilot,
  greeting,
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

  /* ── Helpers for metric card color ── */
  const metricColor = (value: number, mode: "danger" | "success" | "default") => {
    if (mode === "danger") return value > 0 ? S.danger : S.textPrimary;
    if (mode === "success") return value > 0 ? S.success : S.textPrimary;
    return S.textPrimary;
  };

  return (
    <div className="page-layout" style={{ background: S.pageBg, minHeight: "100vh" }}>
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

      <div className="page-layout__body" style={{ padding: "0 48px 48px", display: "flex", gap: S.cardGap }}>
        <PrimaryCanvas>
          {loading ? (
            <LoadingState variant="list" />
          ) : (
            <>
              {/* ─── Page header ─── */}
              <div style={{ marginBottom: S.sectionGap }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  color: S.textMuted,
                  marginBottom: 6,
                }}>
                  Workspace
                </div>
                <h1 style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: S.textPrimary,
                  margin: 0,
                  lineHeight: 1.2,
                }}>
                  Today
                </h1>
                <p style={{
                  fontSize: 15,
                  color: S.textSecondary,
                  margin: "6px 0 0",
                  lineHeight: 1.5,
                }}>
                  {dayShape}
                </p>
                {greeting && (
                  <p style={{
                    fontSize: 14,
                    fontStyle: "italic",
                    color: "#6C5CE7",
                    margin: "8px 0 0",
                    lineHeight: 1.5,
                  }}>
                    {greeting}
                  </p>
                )}
              </div>

              {/* ─── Metric cards (4-column flex) ─── */}
              <div style={{
                display: "flex",
                gap: S.cardGap,
                marginBottom: S.sectionGap,
              }}>
                {/* Actions today */}
                <div style={{
                  flex: 1,
                  background: S.surface,
                  borderRadius: S.radius,
                  boxShadow: S.shadow,
                  padding: 20,
                  transition: S.transition,
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = S.shadowMd; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = S.shadow; }}
                >
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: S.mono, color: S.textPrimary, lineHeight: 1 }}>
                    {nextActions.length}
                  </div>
                  <div style={{ fontSize: 12, color: S.textMuted, marginTop: 6, fontWeight: 500 }}>Actions today</div>
                </div>

                {/* Overdue */}
                <div style={{
                  flex: 1,
                  background: S.surface,
                  borderRadius: S.radius,
                  boxShadow: S.shadow,
                  padding: 20,
                  transition: S.transition,
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = S.shadowMd; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = S.shadow; }}
                >
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: S.mono, color: metricColor(overdueCount, "danger"), lineHeight: 1 }}>
                    {overdueCount}
                  </div>
                  <div style={{ fontSize: 12, color: S.textMuted, marginTop: 6, fontWeight: 500 }}>Overdue</div>
                </div>

                {/* Escalations */}
                <div style={{
                  flex: 1,
                  background: S.surface,
                  borderRadius: S.radius,
                  boxShadow: S.shadow,
                  padding: 20,
                  transition: S.transition,
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = S.shadowMd; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = S.shadow; }}
                >
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: S.mono, color: metricColor(openEscalationCount, "danger"), lineHeight: 1 }}>
                    {openEscalationCount}
                  </div>
                  <div style={{ fontSize: 12, color: S.textMuted, marginTop: 6, fontWeight: 500 }}>Escalations</div>
                </div>

                {/* Plan progress */}
                <div style={{
                  flex: 1,
                  background: S.surface,
                  borderRadius: S.radius,
                  boxShadow: S.shadow,
                  padding: 20,
                  transition: S.transition,
                  cursor: "default",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = S.shadowMd; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = S.shadow; }}
                >
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: S.mono, color: S.textPrimary, lineHeight: 1 }}>
                    {completionPct.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 12, color: S.textMuted, marginTop: 6, fontWeight: 500 }}>Plan progress</div>
                </div>
              </div>

              {/* ─── Zone 1: Priority actions ─── */}
              {nextActions.length === 0 ? (
                <EmptyState
                  title="Nothing pressing"
                  description="All follow-ups are on track. Check your plan for ready tasks."
                  actionLabel="Open Plan"
                  onAction={onOpenPlan}
                />
              ) : (
                <div style={{ marginBottom: S.sectionGap }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <h3 style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: S.textPrimary,
                      margin: 0,
                    }}>
                      Attention Required
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: "var(--color-bg-muted, #F1F5F9)",
                      color: S.textMuted,
                      borderRadius: S.radiusPill,
                      padding: "2px 10px",
                      lineHeight: "18px",
                    }}>
                      {nextActions.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {nextActions.map((action, idx) => {
                      const isSelected = selectedActionIdx === idx;
                      const borderColor = PRIORITY_COLORS[action.action_type] ?? S.textMuted;

                      return (
                        <div
                          key={`${action.action_type}-${action.entity_id}`}
                          style={{
                            background: isSelected ? S.accentSoft : S.surface,
                            borderRadius: S.radius,
                            boxShadow: S.shadow,
                            borderLeft: isSelected ? `3px solid ${S.accent}` : `4px solid ${borderColor}`,
                            padding: "14px 20px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            transition: S.transition,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "#F5F5F5";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = S.surface;
                          }}
                          onClick={() => setSelectedActionIdx(idx)}
                        >
                          {/* Status dot */}
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: borderColor,
                            flexShrink: 0,
                          }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 16, color: S.textPrimary, lineHeight: 1.3 }}>
                              {action.title}
                            </div>
                            <div style={{ fontSize: 13, color: S.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                              {action.context}
                            </div>
                          </div>

                          <span style={{ fontSize: 13, color: S.textMuted, flexShrink: 0, whiteSpace: "nowrap" }}>
                            {action.due_at ? formatTimestamp(action.due_at) : ""}
                          </span>

                          <button
                            style={{
                              flexShrink: 0,
                              fontSize: 13,
                              fontWeight: 500,
                              padding: "6px 14px",
                              borderRadius: S.radiusBtn,
                              border: "1px solid var(--color-border, #E2E8F0)",
                              background: S.surface,
                              color: S.textSecondary,
                              cursor: "pointer",
                              transition: S.transition,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = S.surface; }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (action.action_type.includes("follow_up")) onOpenFollowUp(action.entity_id);
                              else if (action.action_type === "open_escalation") onOpenEscalation(action.entity_id);
                              else onOpenWorkspace(action.entity_id);
                            }}
                          >
                            Open
                          </button>

                          {onAskCopilot && (
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                color: "#6C5CE7",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 6,
                                transition: "background 180ms ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.06)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskCopilot(`Tell me about: "${action.title}" — Type: ${PRIORITY_LABELS[action.action_type] ?? action.action_type}, Context: ${action.context}${action.due_at ? `, Due: ${formatTimestamp(action.due_at)}` : ""}`);
                              }}
                            >
                              Ask Copilot
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Zone 2: Ready tasks ─── */}
              {readyTasks.length > 0 && (
                <div style={{ marginBottom: S.sectionGap }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <h3 style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: S.success,
                      margin: 0,
                    }}>
                      Ready to Execute
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: "var(--color-bg-muted, #F1F5F9)",
                      color: S.textMuted,
                      borderRadius: S.radiusPill,
                      padding: "2px 10px",
                      lineHeight: "18px",
                    }}>
                      {readyTasks.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {readyTasks.map((task) => (
                      <div
                        key={task.task_id}
                        style={{
                          background: S.surface,
                          borderRadius: S.radius,
                          boxShadow: S.shadow,
                          borderLeft: `4px solid ${S.success}`,
                          padding: "14px 20px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          transition: S.transition,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = S.surface; }}
                        onClick={() => onOpenWorkspace(task.task_id)}
                      >
                        {/* Status dot */}
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: S.success,
                          flexShrink: 0,
                        }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 16, color: S.textPrimary }}>
                            {task.title}
                          </div>
                        </div>

                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: S.textMuted,
                          background: "var(--color-bg-muted, #F1F5F9)",
                          borderRadius: S.radiusPill,
                          padding: "2px 10px",
                        }}>
                          {task.status.replace(/_/g, " ")}
                        </span>

                        <button
                          style={{
                            flexShrink: 0,
                            fontSize: 13,
                            fontWeight: 500,
                            padding: "6px 14px",
                            borderRadius: S.radiusBtn,
                            border: "1px solid var(--color-border, #E2E8F0)",
                            background: S.surface,
                            color: S.textSecondary,
                            cursor: "pointer",
                            transition: S.transition,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = S.surface; }}
                          onClick={(e) => { e.stopPropagation(); onOpenPlan(); }}
                        >
                          Plan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Zone 3: Blocked ─── */}
              {blockedTasks.length > 0 && (
                <div style={{ marginBottom: S.sectionGap }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <h3 style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: S.danger,
                      margin: 0,
                    }}>
                      Blocked
                    </h3>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: "var(--color-bg-muted, #F1F5F9)",
                      color: S.textMuted,
                      borderRadius: S.radiusPill,
                      padding: "2px 10px",
                      lineHeight: "18px",
                    }}>
                      {blockedTasks.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {blockedTasks.map((task) => (
                      <div
                        key={task.task_id}
                        style={{
                          background: S.surface,
                          borderRadius: S.radius,
                          boxShadow: S.shadow,
                          borderLeft: `4px solid ${S.danger}`,
                          padding: "14px 20px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          transition: S.transition,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F5F5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = S.surface; }}
                        onClick={() => onOpenTask(task.task_id)}
                      >
                        {/* Status dot */}
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: S.danger,
                          flexShrink: 0,
                        }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 16, color: S.textPrimary }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: 13, color: S.danger, marginTop: 2, lineHeight: 1.4 }}>
                            {task.blocking_dependency_ids?.length ? `Blocked by: ${task.blocking_dependency_ids.join(", ")}` : "Dependency not resolved"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
            <div style={{ padding: 4 }}>
              <h4 style={{
                margin: "0 0 8px 0",
                fontSize: 16,
                fontWeight: 600,
                color: S.textPrimary,
              }}>
                {selectedAction.title}
              </h4>
              <p style={{
                fontSize: 13,
                color: S.textMuted,
                margin: "0 0 20px 0",
                lineHeight: 1.5,
              }}>
                {selectedAction.context}
              </p>

              {/* Metadata rows */}
              <div style={{
                fontSize: 13,
                marginBottom: 20,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--color-border, #F1F5F9)",
                }}>
                  <span style={{ color: S.textMuted, fontWeight: 500 }}>Type</span>
                  <span style={{
                    fontWeight: 500,
                    color: S.textPrimary,
                    background: "var(--color-bg-muted, #F1F5F9)",
                    borderRadius: S.radiusPill,
                    padding: "2px 10px",
                    fontSize: 12,
                  }}>
                    {PRIORITY_LABELS[selectedAction.action_type] ?? selectedAction.action_type}
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--color-border, #F1F5F9)",
                }}>
                  <span style={{ color: S.textMuted, fontWeight: 500 }}>Due</span>
                  <span style={{ fontWeight: 500, color: S.textPrimary }}>
                    {selectedAction.due_at ? formatTimestamp(selectedAction.due_at) : "No due date"}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: S.radiusBtn,
                    border: "none",
                    background: S.accent,
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: S.transition,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  onClick={() => {
                    if (selectedAction.action_type.includes("follow_up")) onOpenFollowUp(selectedAction.entity_id);
                    else if (selectedAction.action_type === "open_escalation") onOpenEscalation(selectedAction.entity_id);
                    else onOpenWorkspace(selectedAction.entity_id);
                  }}
                >
                  Open in workspace
                </button>
                <button
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: S.radiusBtn,
                    border: "1px solid var(--color-border, #E2E8F0)",
                    background: S.surface,
                    color: S.textSecondary,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: S.transition,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = S.surface; }}
                  onClick={onOpenPlan}
                >
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
            <div style={{ marginBottom: S.sectionGap }}>
              <h4 style={{
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 600,
                color: S.textPrimary,
              }}>
                Blocked tasks ({blockedTasks.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {blockedTasks.map((task) => (
                  <div key={task.task_id} style={{
                    padding: "12px 16px",
                    borderLeft: `4px solid ${S.danger}`,
                    borderRadius: S.radius,
                    background: S.surface,
                    boxShadow: S.shadow,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: S.textPrimary }}>{task.title}</div>
                    <div style={{ fontSize: 13, color: S.textMuted, marginTop: 4 }}>
                      {task.blocking_dependency_ids?.length ? `Blocked by: ${task.blocking_dependency_ids.join(", ")}` : "Unresolved dependency"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {followUps.filter((fu) => fu.is_overdue).length > 0 && (
            <div>
              <h4 style={{
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 600,
                color: S.textPrimary,
              }}>
                Overdue follow-ups
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {followUps.filter((fu) => fu.is_overdue).map((fu) => (
                  <div key={fu.id} style={{
                    padding: "12px 16px",
                    borderLeft: `4px solid ${S.warning}`,
                    borderRadius: S.radius,
                    background: S.surface,
                    boxShadow: S.shadow,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: S.textPrimary }}>{fu.title}</div>
                    <div style={{ fontSize: 13, color: S.textMuted, marginTop: 4 }}>
                      Due {formatTimestamp(fu.due_at)} · {fu.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blockedTasks.length === 0 && followUps.filter((fu) => fu.is_overdue).length === 0 && (
            <p style={{ color: S.textMuted, textAlign: "center", fontSize: 15 }}>No blocked tasks or overdue follow-ups. Execution is clear.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}
