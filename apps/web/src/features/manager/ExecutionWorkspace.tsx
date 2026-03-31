import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { EmptyState } from "../../components/EmptyState";
import { ActionBar } from "../../components/ActionBar";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import Icon from "../../components/Icon";
import {
  EvidenceRecord,
  FollowUpRecord,
  PlanRecord,
  PlanTaskRecord,
  PlanTaskUpdatePayload,
} from "../../lib/api";
import { Select } from "../../components/ui/Select";

type ExecutionWorkspaceProps = {
  plan: PlanRecord | null;
  followUps: FollowUpRecord[];
  evidence: EvidenceRecord[];
  selectedTaskId: string | null;
  updatingTaskId: string | null;
  formatTimestamp: (iso: string) => string;
  onSelectTask: (taskId: string | null) => void;
  onUpdateTask: (taskId: string, payload: PlanTaskUpdatePayload) => void;
  onCreateFollowUp: (taskId: string) => void;
  onCreateEvidence: (taskId: string) => void;
  onEscalateTask: (taskId: string) => void;
  onBackToToday?: () => void;
  onBackToPlan?: () => void;
  onAskCopilot?: (context: string) => void;
};

const STATUS_OPTIONS = ["not_started", "in_progress", "completed", "blocked", "on_hold", "deferred"];
const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--color-text-muted)",
  in_progress: "var(--color-info)",
  completed: "var(--color-success)",
  blocked: "var(--color-danger)",
  on_hold: "var(--color-warning)",
  deferred: "var(--color-text-muted)",
};

const STATUS_BG: Record<string, string> = {
  not_started: "var(--color-surface-subtle)",
  in_progress: "var(--color-accent-soft)",
  completed: "var(--color-success-soft)",
  blocked: "var(--color-danger-soft)",
  on_hold: "var(--color-warning-soft)",
  deferred: "var(--color-surface-subtle)",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "var(--color-text-muted)";
  const bg = STATUS_BG[status] ?? "var(--color-surface-subtle)";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-small)",
        fontWeight: 500,
        color,
        background: bg,
        borderRadius: "var(--radius-full)",
        padding: "3px 12px",
        lineHeight: "20px",
        whiteSpace: "nowrap",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ExecutionWorkspace({
  plan,
  followUps,
  evidence,
  selectedTaskId,
  updatingTaskId,
  formatTimestamp,
  onSelectTask,
  onUpdateTask,
  onCreateFollowUp,
  onCreateEvidence,
  onEscalateTask,
  onBackToToday,
  onBackToPlan,
  onAskCopilot,
}: ExecutionWorkspaceProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const tasks = plan?.tasks ?? [];
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const taskFollowUps = followUps.filter((fu) => fu.task_id === selectedTaskId);
  const taskEvidence = evidence.filter((ev) => ev.task_id === selectedTaskId);

  if (!plan) {
    return (
      <div style={{ padding: 48 }}>
        <SurfaceHeader title="Task workspace" subtitle="Select a task to begin execution." />
        <EmptyState title="No operational plan" description="Run the engine first to generate tasks." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-surface-subtle)" }}>
      {/* ── Page header ── */}
      <div style={{ padding: "48px 48px 0 48px" }}>
        {/* Nav links row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {!selectedTask && onBackToToday && (
            <button
              onClick={onBackToToday}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 14px",
                fontSize: "var(--text-small)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              Back to Today
            </button>
          )}
          {selectedTask && (
            <button
              onClick={() => onSelectTask(null)}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 14px",
                fontSize: "var(--text-small)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              Back to list
            </button>
          )}
          {onBackToPlan && (
            <button
              onClick={onBackToPlan}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 14px",
                fontSize: "var(--text-small)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              Back to Plan
            </button>
          )}
        </div>

        {/* Eyebrow + title */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: "var(--text-eyebrow)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              marginBottom: 6,
            }}
          >
            EXECUTION
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 style={{ fontSize: "var(--text-page)", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
              {selectedTask ? selectedTask.title : "Task workspace"}
            </h1>
            {selectedTask && <StatusPill status={selectedTask.status} />}
          </div>
          <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 4 }}>
            {selectedTask
              ? `${selectedTask.effort_hours}h effort${selectedTask.assigned_to ? ` \u00B7 ${selectedTask.assigned_to}` : ""}`
              : `${tasks.length} tasks in plan`}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, padding: "0 48px 48px 48px", gap: 24 }}>
        {!selectedTask ? (
          /* ── Task list ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                  padding: "16px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  borderLeft: `4px solid ${STATUS_COLORS[task.status] ?? "var(--color-text-muted)"}`,
                  transition: "box-shadow 0.15s ease",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{task.title}</div>
                  <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>
                    {task.effort_hours}h{task.assigned_to ? ` \u00B7 ${task.assigned_to}` : ""}
                  </div>
                </div>
                <StatusPill status={task.status} />
              </div>
            ))}
          </div>
        ) : (
          /* ── Task detail ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {onAskCopilot && selectedTask && (
              <div style={{ marginBottom: 12 }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-accent)",
                    fontSize: "var(--text-small)",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    transition: "background 180ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  onClick={() => onAskCopilot(`Tell me about task: "${selectedTask.title}" (${selectedTask.block_id}) — Status: ${selectedTask.status}, Effort: ${selectedTask.effort_hours}h${selectedTask.assigned_to ? `, Assigned: ${selectedTask.assigned_to}` : ""}${selectedTask.rationale ? `, Rationale: ${selectedTask.rationale.slice(0, 200)}` : ""}`)}
                  aria-label="Ask Copilot"
                  title="Ask Copilot about this task"
                >
                  <Icon name="copilot" size={20} />
                </button>
              </div>
            )}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <TaskDetail
                task={selectedTask}
                followUps={taskFollowUps}
                evidence={taskEvidence}
                updating={updatingTaskId === selectedTask.id}
                formatTimestamp={formatTimestamp}
                onUpdateTask={onUpdateTask}
                onAskCopilot={onAskCopilot}
              />
            </div>
            <div style={{ paddingTop: 16 }}>
              <ActionBar
                primaryAction={{ label: "Set follow-up", onClick: () => onCreateFollowUp(selectedTask.id) }}
                secondaryActions={[
                  { label: "Attach evidence", onClick: () => onCreateEvidence(selectedTask.id) },
                  { label: "Escalate", onClick: () => onEscalateTask(selectedTask.id) },
                ]}
                sticky
              />
            </div>
          </div>
        )}

        {/* ── Inspector sidebar ── */}
        {selectedTask && (
          <ContextInspector open={true} title="Execution context" width={280}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {selectedTask.dependencies.length > 0 && (
                <div>
                  <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                    Dependencies
                  </div>
                  {selectedTask.dependencies.map((dep) => (
                    <div key={dep} style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", padding: "2px 0" }}>{dep}</div>
                  ))}
                </div>
              )}
              <div>
                <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                  Block
                </div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>{selectedTask.block_id}</div>
              </div>
              {selectedTask.assigned_to && (
                <div>
                  <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                    Assigned to
                  </div>
                  <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>{selectedTask.assigned_to}</div>
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--color-surface-subtle)", paddingTop: 16 }}>
                <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                  Evidence
                </div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>{taskEvidence.length} item{taskEvidence.length !== 1 ? "s" : ""}</div>
              </div>
              <div>
                <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 8 }}>
                  Follow-ups
                </div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>{taskFollowUps.length} active</div>
              </div>
              {/* Drawer trigger */}
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-surface)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  fontSize: "var(--text-small)",
                  fontWeight: 500,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                View evidence &amp; audit
              </button>
            </div>
          </ContextInspector>
        )}
      </div>

      {/* ── Drawer: evidence + audit ── */}
      <DeepDrawer open={drawerOpen} title="Evidence and audit trail" onClose={() => setDrawerOpen(false)}>
        <div style={{ padding: 4 }}>
          {taskEvidence.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: "var(--text-section)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 16,
                }}
              >
                Evidence ({taskEvidence.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {taskEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      background: "var(--color-surface)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      padding: "14px 20px",
                      borderLeft: "4px solid var(--color-success)",
                    }}
                  >
                    <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{ev.title}</div>
                    <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {ev.evidence_type} \u00B7 {formatTimestamp(ev.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>No evidence attached yet.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}


/* ═══════════════════════════════════════════
   TaskDetail  (internal component)
   ═══════════════════════════════════════════ */

function TaskDetail({
  task,
  followUps,
  evidence,
  updating,
  formatTimestamp,
  onUpdateTask,
  onAskCopilot,
}: {
  task: PlanTaskRecord;
  followUps: FollowUpRecord[];
  evidence: EvidenceRecord[];
  updating: boolean;
  formatTimestamp: (iso: string) => string;
  onUpdateTask: (taskId: string, payload: PlanTaskUpdatePayload) => void;
  onAskCopilot?: (context: string) => void;
}) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Status selector card ── */}
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
        <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 10 }}>
          Status
        </div>
        <Select
          value={task.status}
          disabled={updating}
          onChange={(v) => onUpdateTask(task.id, { status: v })}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
        />

        {/* Rationale */}
        {task.rationale && (
          <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>
            {task.rationale}
          </p>
        )}

        {/* Blocked task suggestion */}
        {task.status === "blocked" && onAskCopilot && (
          <div style={{
            margin: "12px 0 0",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(239, 68, 68, 0.04)",
            border: "1px solid rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
            <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>
              This task is blocked{task.dependencies?.length ? ` by ${task.dependencies.join(", ")}` : ""}. VOIS can help find a resolution path.
            </div>
            <button
              onClick={() => onAskCopilot(`This task is blocked: "${task.title}" (${task.block_id}). ${task.dependencies?.length ? `Blocked by: ${task.dependencies.join(", ")}.` : ""} What are my options to unblock this? What's the fastest path to resolution?`)}
              style={{
                background: "none",
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent)",
                fontSize: "var(--text-small)",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 180ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              Ask VOIS to help
            </button>
          </div>
        )}
      </div>

      {/* ── Sub-actions card ── */}
      {task.sub_actions.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>Sub-actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {task.sub_actions.map((sa, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  cursor: "pointer",
                  fontSize: "var(--text-body)",
                }}
              >
                <input
                  type="checkbox"
                  checked={sa.completed}
                  disabled={updating}
                  onChange={() => {
                    const completions = task.sub_actions.map((item, idx) => idx === i ? !item.completed : item.completed);
                    onUpdateTask(task.id, { sub_action_completions: completions });
                  }}
                  style={{ width: 16, height: 16, accentColor: "var(--color-accent)" }}
                />
                <span style={{ textDecoration: sa.completed ? "line-through" : "none", opacity: sa.completed ? 0.5 : 1, color: "var(--color-text-secondary)" }}>
                  {sa.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Deliverables card ── */}
      {task.deliverables.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>Deliverables</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {task.deliverables.map((d, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  cursor: "pointer",
                  fontSize: "var(--text-body)",
                }}
              >
                <input
                  type="checkbox"
                  checked={d.completed}
                  disabled={updating}
                  onChange={() => {
                    const completions = task.deliverables.map((item, idx) => idx === i ? !item.completed : item.completed);
                    onUpdateTask(task.id, { deliverable_completions: completions });
                  }}
                  style={{ width: 16, height: 16, accentColor: "var(--color-accent)" }}
                />
                <span style={{ textDecoration: d.completed ? "line-through" : "none", opacity: d.completed ? 0.5 : 1, color: "var(--color-text-secondary)" }}>
                  {d.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes card ── */}
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
        <div style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>Notes</div>
        {editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "10px 12px",
                fontSize: "var(--text-body)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-subtle)",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                disabled={updating}
                onClick={() => { onUpdateTask(task.id, { notes }); setEditingNotes(false); }}
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-surface)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 18px",
                  fontSize: "var(--text-small)",
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: updating ? 0.6 : 1,
                }}
              >
                Save
              </button>
              <button
                onClick={() => { setNotes(task.notes ?? ""); setEditingNotes(false); }}
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 18px",
                  fontSize: "var(--text-small)",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => setEditingNotes(true)}
            style={{
              fontSize: "var(--text-body)",
              color: task.notes ? "var(--color-text-secondary)" : "var(--color-text-muted)",
              cursor: "pointer",
              minHeight: "2em",
              lineHeight: 1.6,
              margin: 0,
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--color-border-subtle)",
            }}
          >
            {task.notes || "Click to add notes..."}
          </p>
        )}
      </div>

      {/* ── Follow-ups card ── */}
      {followUps.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>
            Follow-ups ({followUps.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {followUps.map((fu) => (
              <div
                key={fu.id}
                style={{
                  padding: "12px 16px",
                  borderLeft: `4px solid ${fu.is_overdue ? "var(--color-danger)" : "var(--color-info)"}`,
                  borderRadius: "var(--radius-sm)",
                  background: fu.is_overdue ? "var(--color-danger-soft)" : "var(--color-surface-subtle)",
                }}
              >
                <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{fu.title}</div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>
                  {fu.status} \u00B7 due {formatTimestamp(fu.due_at)}
                  {fu.is_overdue && (
                    <span style={{ color: "var(--color-danger)", fontWeight: 500 }}> (overdue)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evidence card ── */}
      {evidence.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 16 }}>
            Evidence ({evidence.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {evidence.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: "12px 16px",
                  borderLeft: "4px solid var(--color-success)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-success-soft)",
                }}
              >
                <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{ev.title}</div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>
                  {ev.evidence_type} \u00B7 {formatTimestamp(ev.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
