import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
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
};

const STATUS_OPTIONS = ["not_started", "in_progress", "completed", "blocked", "on_hold", "deferred"];
const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--muted)",
  in_progress: "var(--sky)",
  completed: "var(--leaf)",
  blocked: "var(--sunrise)",
  on_hold: "var(--gold)",
  deferred: "var(--lavender)",
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
}: ExecutionWorkspaceProps) {
  const tasks = plan?.tasks ?? [];
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const taskFollowUps = followUps.filter((fu) => fu.task_id === selectedTaskId);
  const taskEvidence = evidence.filter((ev) => ev.task_id === selectedTaskId);

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Execution"
        title="Task workspace"
        description="Select a task to view details, track sub-actions, and attach evidence."
      >
        {!plan ? (
          <div className="empty-state"><p>No operational plan yet. Run the engine first.</p></div>
        ) : (
          <div style={{ display: "flex", gap: "var(--spacing-lg)", minHeight: 400 }}>
            {/* Task list */}
            <div style={{ flex: "0 0 320px", overflowY: "auto" }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="clickable-row"
                  onClick={() => onSelectTask(task.id)}
                  style={{
                    padding: "var(--spacing-sm) var(--spacing-md)",
                    borderLeft: `3px solid ${STATUS_COLORS[task.status] ?? "var(--muted)"}`,
                    background: task.id === selectedTaskId ? "var(--bg-raised)" : "transparent",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "var(--spacing-xs)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{task.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {task.status.replace(/_/g, " ")} · {task.effort_hours}h
                  </div>
                </div>
              ))}
            </div>

            {/* Task detail */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedTask ? (
                <TaskDetail
                  task={selectedTask}
                  followUps={taskFollowUps}
                  evidence={taskEvidence}
                  updating={updatingTaskId === selectedTask.id}
                  formatTimestamp={formatTimestamp}
                  onUpdateTask={onUpdateTask}
                  onCreateFollowUp={() => onCreateFollowUp(selectedTask.id)}
                  onCreateEvidence={() => onCreateEvidence(selectedTask.id)}
                  onEscalate={() => onEscalateTask(selectedTask.id)}
                />
              ) : (
                <div className="empty-state">
                  <p>Select a task from the list to view its workspace.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>
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
  onCreateFollowUp,
  onCreateEvidence,
  onEscalate,
}: {
  task: PlanTaskRecord;
  followUps: FollowUpRecord[];
  evidence: EvidenceRecord[];
  updating: boolean;
  formatTimestamp: (iso: string) => string;
  onUpdateTask: (taskId: string, payload: PlanTaskUpdatePayload) => void;
  onCreateFollowUp: () => void;
  onCreateEvidence: () => void;
  onEscalate: () => void;
}) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
        <h3 style={{ margin: 0, flex: 1 }}>{task.title}</h3>
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

      {task.rationale ? (
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--spacing-md)" }}>{task.rationale}</p>
      ) : null}

      {/* Sub-actions */}
      {task.sub_actions.length > 0 ? (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <h4 style={{ marginBottom: "var(--spacing-xs)" }}>Sub-actions</h4>
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
              <span style={{ textDecoration: sa.completed ? "line-through" : "none", color: sa.completed ? "var(--text-muted)" : "var(--text)" }}>
                {sa.text}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {/* Deliverables */}
      {task.deliverables.length > 0 ? (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <h4 style={{ marginBottom: "var(--spacing-xs)" }}>Deliverables</h4>
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
              <span style={{ textDecoration: d.completed ? "line-through" : "none", color: d.completed ? "var(--text-muted)" : "var(--text)" }}>
                {d.name}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {/* Notes */}
      <div style={{ marginBottom: "var(--spacing-md)" }}>
        <h4 style={{ marginBottom: "var(--spacing-xs)" }}>Notes</h4>
        {editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
              className="input-text"
            />
            <div style={{ display: "flex", gap: "var(--spacing-xs)", marginTop: "var(--spacing-xs)" }}>
              <button className="btn btn-primary btn-sm" disabled={updating} onClick={() => { onUpdateTask(task.id, { notes }); setEditingNotes(false); }}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setNotes(task.notes ?? ""); setEditingNotes(false); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p
            className="clickable-row"
            onClick={() => setEditingNotes(true)}
            style={{ color: task.notes ? "var(--text)" : "var(--text-muted)", cursor: "pointer", minHeight: "2em" }}
          >
            {task.notes || "Click to add notes..."}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
        <button className="btn btn-secondary btn-sm" onClick={onCreateFollowUp}>Set follow-up</button>
        <button className="btn btn-secondary btn-sm" onClick={onCreateEvidence}>Attach evidence</button>
        <button className="btn btn-sm" style={{ background: "var(--sunrise)", color: "white" }} onClick={onEscalate}>Escalate</button>
      </div>

      {/* Follow-ups */}
      {followUps.length > 0 ? (
        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <h4 style={{ marginBottom: "var(--spacing-xs)" }}>Follow-ups ({followUps.length})</h4>
          {followUps.map((fu) => (
            <div key={fu.id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: `3px solid ${fu.is_overdue ? "var(--sunrise)" : "var(--sky)"}`, marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)", background: "var(--bg-raised)" }}>
              <div style={{ fontWeight: 500 }}>{fu.title}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {fu.status} · due {formatTimestamp(fu.due_at)}{fu.is_overdue ? " (overdue)" : ""}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Evidence */}
      {evidence.length > 0 ? (
        <div>
          <h4 style={{ marginBottom: "var(--spacing-xs)" }}>Evidence ({evidence.length})</h4>
          {evidence.map((ev) => (
            <div key={ev.id} style={{ padding: "var(--spacing-xs) var(--spacing-sm)", borderLeft: "3px solid var(--leaf)", marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)", background: "var(--bg-raised)" }}>
              <div style={{ fontWeight: 500 }}>{ev.title}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {ev.evidence_type} · {formatTimestamp(ev.created_at)}
              </div>
              {ev.description ? <div style={{ fontSize: "0.85rem", marginTop: 2 }}>{ev.description}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
