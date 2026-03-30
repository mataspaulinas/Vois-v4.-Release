import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { EmptyState } from "../../components/EmptyState";
import { ActionBar } from "../../components/ActionBar";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import {
  EvidenceRecord,
  FollowUpRecord,
  PlanRecord,
  PlanTaskRecord,
  PlanTaskUpdatePayload,
} from "../../lib/api";

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
  not_started: "#9CA3AF",
  in_progress: "#6366F1",
  completed: "#10B981",
  blocked: "#EF4444",
  on_hold: "#F59E0B",
  deferred: "#9CA3AF",
};

const STATUS_BG: Record<string, string> = {
  not_started: "#F3F4F6",
  in_progress: "#EEF2FF",
  completed: "#ECFDF5",
  blocked: "#FEF2F2",
  on_hold: "#FFFBEB",
  deferred: "#F3F4F6",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#9CA3AF";
  const bg = STATUS_BG[status] ?? "#F3F4F6";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 13,
        fontWeight: 500,
        color,
        background: bg,
        borderRadius: 24,
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F9FAFB" }}>
      {/* ── Page header ── */}
      <div style={{ padding: "48px 48px 0 48px" }}>
        {/* Nav links row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {!selectedTask && onBackToToday && (
            <button
              onClick={onBackToToday}
              style={{
                background: "white",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
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
                background: "white",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
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
                background: "white",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
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
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9CA3AF",
              marginBottom: 6,
            }}
          >
            EXECUTION
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>
              {selectedTask ? selectedTask.title : "Task workspace"}
            </h1>
            {selectedTask && <StatusPill status={selectedTask.status} />}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
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
                  background: "white",
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                  padding: "16px 20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  borderLeft: `4px solid ${STATUS_COLORS[task.status] ?? "#9CA3AF"}`,
                  transition: "box-shadow 0.15s ease",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>{task.title}</div>
                  <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
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
                  onClick={() => onAskCopilot(`Tell me about task: "${selectedTask.title}" (${selectedTask.block_id}) — Status: ${selectedTask.status}, Effort: ${selectedTask.effort_hours}h${selectedTask.assigned_to ? `, Assigned: ${selectedTask.assigned_to}` : ""}${selectedTask.rationale ? `, Rationale: ${selectedTask.rationale.slice(0, 200)}` : ""}`)}
                >
                  Ask Copilot about this task
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
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>
                    Dependencies
                  </div>
                  {selectedTask.dependencies.map((dep) => (
                    <div key={dep} style={{ fontSize: 13, color: "#6B7280", padding: "2px 0" }}>{dep}</div>
                  ))}
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>
                  Block
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>{selectedTask.block_id}</div>
              </div>
              {selectedTask.assigned_to && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>
                    Assigned to
                  </div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{selectedTask.assigned_to}</div>
                </div>
              )}
              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>
                  Evidence
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>{taskEvidence.length} item{taskEvidence.length !== 1 ? "s" : ""}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>
                  Follow-ups
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>{taskFollowUps.length} active</div>
              </div>
              {/* Drawer trigger */}
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: "#6C5CE7",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
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
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#111827",
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
                      background: "white",
                      borderRadius: 12,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      padding: "14px 20px",
                      borderLeft: "4px solid #10B981",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>{ev.title}</div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                      {ev.evidence_type} \u00B7 {formatTimestamp(ev.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#9CA3AF" }}>No evidence attached yet.</p>
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
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 10 }}>
          Status
        </div>
        <select
          value={task.status}
          disabled={updating}
          onChange={(e) => onUpdateTask(task.id, { status: e.target.value })}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: 15,
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            background: "white",
            color: STATUS_COLORS[task.status] ?? "#374151",
            fontWeight: 500,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>

        {/* Rationale */}
        {task.rationale && (
          <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>
            {task.rationale}
          </p>
        )}

        {/* Blocked task suggestion */}
        {task.status === "blocked" && onAskCopilot && (
          <div style={{
            margin: "12px 0 0",
            padding: "12px 16px",
            borderRadius: 8,
            background: "rgba(239, 68, 68, 0.04)",
            border: "1px solid rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
            <div style={{ fontSize: 13, color: "#525252" }}>
              This task is blocked{task.dependencies?.length ? ` by ${task.dependencies.join(", ")}` : ""}. VOIS can help find a resolution path.
            </div>
            <button
              onClick={() => onAskCopilot(`This task is blocked: "${task.title}" (${task.block_id}). ${task.dependencies?.length ? `Blocked by: ${task.dependencies.join(", ")}.` : ""} What are my options to unblock this? What's the fastest path to resolution?`)}
              style={{
                background: "none",
                border: "1px solid #6C5CE7",
                color: "#6C5CE7",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: 6,
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
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Sub-actions</div>
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
                  fontSize: 15,
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
                  style={{ width: 16, height: 16, accentColor: "#6C5CE7" }}
                />
                <span style={{ textDecoration: sa.completed ? "line-through" : "none", opacity: sa.completed ? 0.5 : 1, color: "#374151" }}>
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
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Deliverables</div>
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
                  fontSize: 15,
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
                  style={{ width: 16, height: 16, accentColor: "#6C5CE7" }}
                />
                <span style={{ textDecoration: d.completed ? "line-through" : "none", opacity: d.completed ? 0.5 : 1, color: "#374151" }}>
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
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Notes</div>
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
                fontSize: 15,
                borderRadius: 8,
                border: "1px solid #E5E7EB",
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
                  background: "#6C5CE7",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
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
                  background: "white",
                  color: "#374151",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
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
              fontSize: 15,
              color: task.notes ? "#374151" : "#9CA3AF",
              cursor: "pointer",
              minHeight: "2em",
              lineHeight: 1.6,
              margin: 0,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px dashed #E5E7EB",
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
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
            Follow-ups ({followUps.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {followUps.map((fu) => (
              <div
                key={fu.id}
                style={{
                  padding: "12px 16px",
                  borderLeft: `4px solid ${fu.is_overdue ? "#EF4444" : "#6366F1"}`,
                  borderRadius: 8,
                  background: fu.is_overdue ? "#FEF2F2" : "#F9FAFB",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>{fu.title}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                  {fu.status} \u00B7 due {formatTimestamp(fu.due_at)}
                  {fu.is_overdue && (
                    <span style={{ color: "#EF4444", fontWeight: 500 }}> (overdue)</span>
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
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
            Evidence ({evidence.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {evidence.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: "12px 16px",
                  borderLeft: "4px solid #10B981",
                  borderRadius: 8,
                  background: "#ECFDF5",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>{ev.title}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
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
