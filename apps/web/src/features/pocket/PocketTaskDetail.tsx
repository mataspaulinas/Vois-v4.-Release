import type { CSSProperties } from "react";
import type { MyShiftTask } from "../../lib/api";
import { SectionCard } from "../../components/SectionCard";

type PocketTaskDetailProps = {
  task: MyShiftTask | null;
  onBack: () => void;
  onAskCopilot?: (context: string) => void;
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: "var(--radius-full)",
  background: "var(--color-bg-muted)",
  color: "var(--color-text-secondary)",
  fontSize: "var(--text-small)",
  fontWeight: 600,
};

const listCardStyle: CSSProperties = {
  border: "1px solid var(--color-border-subtle)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-surface-subtle)",
  padding: "16px",
};

export function PocketTaskDetail({ task, onBack, onAskCopilot }: PocketTaskDetailProps) {
  if (!task) {
    return (
      <SectionCard
        eyebrow="Pocket"
        title="Task details unavailable"
        description="The selected task is no longer available in this shift."
      >
        <div className="empty-state">
          <p>Go back to My Shift and choose a current task.</p>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to My Shift
          </button>
        </div>
      </SectionCard>
    );
  }

  const remainingSubActions = task.sub_actions.filter((item) => !item.completed).length;
  const remainingDeliverables = task.deliverables.filter((item) => !item.completed).length;

  return (
    <SectionCard
      eyebrow="Pocket Task"
      title={task.title}
      description="Use this lane to understand the task, what good looks like, and what still needs attention."
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to My Shift
          </button>
          {onAskCopilot ? (
            <button
              className="btn btn-primary"
              onClick={() =>
                onAskCopilot(
                  `I'm working on the pocket task "${task.title}". ` +
                    `Status: ${task.status.replace(/_/g, " ")}. ` +
                    `Remaining sub-actions: ${remainingSubActions}. ` +
                    `Remaining deliverables: ${remainingDeliverables}. ` +
                    `Help me execute this well as a barista.`
                )
              }
            >
              Ask VOIS about this task
            </button>
          ) : null}
        </div>
      }
    >
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={badgeStyle}>Status: {task.status.replace(/_/g, " ")}</span>
          <span style={badgeStyle}>Sub-actions left: {remainingSubActions}</span>
          <span style={badgeStyle}>Deliverables left: {remainingDeliverables}</span>
        </div>

        <div style={listCardStyle}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "var(--text-card)" }}>Why this matters</h3>
          <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{task.rationale}</p>
        </div>

        {task.notes ? (
          <div style={listCardStyle}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "var(--text-card)" }}>Notes</h3>
            <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{task.notes}</p>
          </div>
        ) : null}

        <div style={listCardStyle}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "var(--text-card)" }}>Sub-actions</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {task.sub_actions.length ? (
              task.sub_actions.map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      borderRadius: "50%",
                      background: item.completed ? "var(--color-success)" : "var(--color-border-strong)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-primary)", fontWeight: 600 }}>{item.label}</p>
                    <p style={{ margin: "2px 0 0 0", color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
                      {item.completed ? "Completed" : "Still to do"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: "var(--color-text-muted)" }}>No sub-actions are attached to this task yet.</p>
            )}
          </div>
        </div>

        <div style={listCardStyle}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "var(--text-card)" }}>Deliverables</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {task.deliverables.length ? (
              task.deliverables.map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      borderRadius: "50%",
                      background: item.completed ? "var(--color-info)" : "var(--color-border-strong)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ margin: 0, color: "var(--color-text-primary)", fontWeight: 600 }}>{item.label}</p>
                    <p style={{ margin: "2px 0 0 0", color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
                      {item.completed ? "Delivered" : "Still needed"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: "var(--color-text-muted)" }}>No deliverables are attached to this task yet.</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
