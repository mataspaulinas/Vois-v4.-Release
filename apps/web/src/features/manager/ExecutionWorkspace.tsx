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
}: ExecutionWorkspaceProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const tasks = plan?.tasks ?? [];
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const taskFollowUps = followUps.filter((fu) => fu.task_id === selectedTaskId);
  const taskEvidence = evidence.filter((ev) => ev.task_id === selectedTaskId);

  if (!plan) {
    return (
      <div className="view-stack">
        <SurfaceHeader title="Task workspace" subtitle="Select a task to begin execution." />
        <EmptyState title="No operational plan" description="Run the engine first to generate tasks." />
      </div>
    );
  }

  return (
    <div className="view-stack">
      <SurfaceHeader
        title={selectedTask ? selectedTask.title : "Task workspace"}
        subtitle={selectedTask ? `${selectedTask.effort_hours}h · ${selectedTask.status.replace(/_/g, " ")}` : `${tasks.length} tasks in plan`}
        status={selectedTask?.status.replace(/_/g, " ")}
        statusTone={selectedTask?.status === "completed" ? "success" : selectedTask?.status === "blocked" ? "danger" : selectedTask?.status === "in_progress" ? "info" : "neutral"}
        onBack={selectedTask ? () => onSelectTask(null) : onBackToToday}
        backLabel={selectedTask ? "Back to list" : "Back to Today"}
        moreActions={[
          ...(onBackToPlan ? [{ label: "Back to Plan", onClick: onBackToPlan }] : []),
          ...(onBackToToday ? [{ label: "Back to Today", onClick: onBackToToday }] : []),
          ...(selectedTask ? [{ label: "View evidence & audit", onClick: () => setDrawerOpen(true) }] : []),
        ]}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Task list (left rail when no task selected, or hidden when task is selected on narrow screens) */}
        {!selectedTask ? (
          <div className="primary-canvas">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="clickable-row"
                onClick={() => onSelectTask(task.id)}
                style={{
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  borderLeft: `3px solid ${STATUS_COLORS[task.status] ?? "var(--color-text-muted)"}`,
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "var(--spacing-xs)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 500, fontSize: "var(--text-body)" }}>{task.title}</div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                  {task.status.replace(/_/g, " ")} · {task.effort_hours}h
                  {task.assigned_to ? ` · ${task.assigned_to}` : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="primary-canvas">
            <TaskDetail
              task={selectedTask}
              followUps={taskFollowUps}
              evidence={taskEvidence}
              updating={updatingTaskId === selectedTask.id}
              formatTimestamp={formatTimestamp}
              onUpdateTask={onUpdateTask}
            />
            <ActionBar
              primaryAction={{ label: "Set follow-up", onClick: () => onCreateFollowUp(selectedTask.id) }}
              secondaryActions={[
                { label: "Attach evidence", onClick: () => onCreateEvidence(selectedTask.id) },
                { label: "Escalate", onClick: () => onEscalateTask(selectedTask.id) },
              ]}
              sticky
            />
          </div>
        )}

        {/* ─── Inspector: dependency + linked context ─── */}
        {selectedTask && (
          <ContextInspector open={true} title="Execution context" width={280}>
            <div style={{ fontSize: "var(--text-small)" }}>
              {selectedTask.dependencies.length > 0 && (
                <div style={{ marginBottom: "var(--spacing-md)" }}>
                  <h4 style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>Dependencies</h4>
                  {selectedTask.dependencies.map((dep) => (
                    <div key={dep} style={{ padding: "2px 0", color: "var(--color-text-muted)" }}>{dep}</div>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <h4 style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>Block</h4>
                <div>{selectedTask.block_id}</div>
              </div>
              {selectedTask.assigned_to && (
                <div style={{ marginBottom: "var(--spacing-md)" }}>
                  <h4 style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>Assigned to</h4>
                  <div>{selectedTask.assigned_to}</div>
                </div>
              )}
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <h4 style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>Evidence</h4>
                <div>{taskEvidence.length} item{taskEvidence.length !== 1 ? "s" : ""}</div>
              </div>
              <div>
                <h4 style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>Follow-ups</h4>
                <div>{taskFollowUps.length} active</div>
              </div>
            </div>
          </ContextInspector>
        )}
      </div>

      {/* ─── Drawer: evidence + audit ─── */}
      <DeepDrawer open={drawerOpen} title="Evidence and audit trail" onClose={() => setDrawerOpen(false)}>
        <div>
          {taskEvidence.length > 0 ? (
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <h4 style={{ marginBottom: "var(--spacing-sm)" }}>Evidence ({taskEvidence.length})</h4>
              {taskEvidence.map((ev) => (
                <div key={ev.id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: "3px solid var(--color-success)", marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontWeight: 500 }}>{ev.title}</div>
                  <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{ev.evidence_type} · {formatTimestamp(ev.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>No evidence attached yet.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}


function TaskDetail({
  task,
  followUps,
  evidence,
  updating,
  formatTimestamp,
  onUpdateTask,
}: {
  task: PlanTaskRecord;
  followUps: FollowUpRecord[];
  evidence: EvidenceRecord[];
  updating: boolean;
  formatTimestamp: (iso: string) => string;
  onUpdateTask: (taskId: string, payload: PlanTaskUpdatePayload) => void;
}) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <div style={{ paddingBottom: "var(--spacing-xl)" }}>
      {/* Status selector */}
      <div style={{ marginBottom: "var(--spacing-md)" }}>
        <select
          value={task.status}
          disabled={updating}
          onChange={(e) => onUpdateTask(task.id, { status: e.target.value })}
          className="select-input"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Rationale — why this task matters */}
      {task.rationale && (
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--spacing-md)", lineHeight: "var(--lh-normal)" }}>
          {task.rationale}
        </p>
      )}

      {/* Sub-actions */}
      {task.sub_actions.length > 0 && (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <h4 style={{ marginBottom: "var(--spacing-xs)", fontSize: "var(--text-small)", color: "var(--color-text-secondary)", fontWeight: "var(--weight-semibold)" }}>Sub-actions</h4>
          {task.sub_actions.map((sa, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "4px 0", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sa.completed}
                disabled={updating}
                onChange={() => {
                  const completions = task.sub_actions.map((item, idx) => idx === i ? !item.completed : item.completed);
                  onUpdateTask(task.id, { sub_action_completions: completions });
                }}
              />
              <span style={{ textDecoration: sa.completed ? "line-through" : "none", opacity: sa.completed ? 0.6 : 1 }}>
                {sa.text}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Deliverables */}
      {task.deliverables.length > 0 && (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <h4 style={{ marginBottom: "var(--spacing-xs)", fontSize: "var(--text-small)", color: "var(--color-text-secondary)", fontWeight: "var(--weight-semibold)" }}>Deliverables</h4>
          {task.deliverables.map((d, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "4px 0", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={d.completed}
                disabled={updating}
                onChange={() => {
                  const completions = task.deliverables.map((item, idx) => idx === i ? !item.completed : item.completed);
                  onUpdateTask(task.id, { deliverable_completions: completions });
                }}
              />
              <span style={{ textDecoration: d.completed ? "line-through" : "none", opacity: d.completed ? 0.6 : 1 }}>
                {d.name}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: "var(--spacing-md)" }}>
        <h4 style={{ marginBottom: "var(--spacing-xs)", fontSize: "var(--text-small)", color: "var(--color-text-secondary)", fontWeight: "var(--weight-semibold)" }}>Notes</h4>
        {editingNotes ? (
          <div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: "100%", resize: "vertical" }} className="input-text" />
            <div style={{ display: "flex", gap: "var(--spacing-xs)", marginTop: "var(--spacing-xs)" }}>
              <button className="btn btn-primary btn-sm" disabled={updating} onClick={() => { onUpdateTask(task.id, { notes }); setEditingNotes(false); }}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setNotes(task.notes ?? ""); setEditingNotes(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className="clickable-row" onClick={() => setEditingNotes(true)} style={{ color: task.notes ? "var(--color-text-primary)" : "var(--color-text-muted)", cursor: "pointer", minHeight: "2em" }}>
            {task.notes || "Click to add notes..."}
          </p>
        )}
      </div>

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <h4 style={{ marginBottom: "var(--spacing-xs)", fontSize: "var(--text-small)", color: "var(--color-text-secondary)", fontWeight: "var(--weight-semibold)" }}>Follow-ups ({followUps.length})</h4>
          {followUps.map((fu) => (
            <div key={fu.id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: `3px solid ${fu.is_overdue ? "var(--color-danger)" : "var(--color-info)"}`, marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-muted)" }}>
              <div style={{ fontWeight: 500 }}>{fu.title}</div>
              <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                {fu.status} · due {formatTimestamp(fu.due_at)}{fu.is_overdue ? " (overdue)" : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div>
          <h4 style={{ marginBottom: "var(--spacing-xs)", fontSize: "var(--text-small)", color: "var(--color-text-secondary)", fontWeight: "var(--weight-semibold)" }}>Evidence ({evidence.length})</h4>
          {evidence.map((ev) => (
            <div key={ev.id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: "3px solid var(--color-success)", marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-muted)" }}>
              <div style={{ fontWeight: 500 }}>{ev.title}</div>
              <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                {ev.evidence_type} · {formatTimestamp(ev.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
