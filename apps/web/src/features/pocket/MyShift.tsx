import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { MyShiftResponse, generateShiftHandover, ShiftHandoverResponse } from "../../lib/api";
import { ShiftReadinessCheck, shouldShowReadinessCheck, markReadinessComplete } from "./ShiftReadinessCheck";

type MyShiftProps = {
  shift: MyShiftResponse | null;
  loading: boolean;
  onOpenTask: (taskId: string) => void;
  greeting?: string | null;
  onAskCopilot?: (context: string) => void;
  venueId?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--color-text-muted)",
  in_progress: "var(--color-info)",
  blocked: "var(--color-danger)",
};

const STATUS_BORDER: Record<string, string> = {
  not_started: "var(--color-text-muted)",
  in_progress: "var(--color-accent)",
  blocked: "var(--color-danger)",
  completed: "var(--color-success)",
};

export function MyShift({ shift, loading, onOpenTask, greeting, onAskCopilot, venueId }: MyShiftProps) {
  const [showReadiness, setShowReadiness] = useState(shouldShowReadinessCheck);
  const [handover, setHandover] = useState<ShiftHandoverResponse | null>(null);
  const [generatingHandover, setGeneratingHandover] = useState(false);

  async function handleGenerateHandover() {
    if (!venueId) return;
    setGeneratingHandover(true);
    try {
      const result = await generateShiftHandover(venueId);
      setHandover(result);
    } catch (e) {
      console.error("Handover failed", e);
    } finally {
      setGeneratingHandover(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "var(--color-bg)" }}>
        <SurfaceHeader title="My Shift" subtitle="Getting your shift ready..." />
        <PrimaryCanvas><LoadingState variant="card" /></PrimaryCanvas>
      </div>
    );
  }

  if (!shift) {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "var(--color-bg)" }}>
        <SurfaceHeader title="My Shift" />
        <PrimaryCanvas>
          <EmptyState title="No shift data" description="Your manager will assign tasks when your shift begins." />
        </PrimaryCanvas>
      </div>
    );
  }

  const totalTasks = shift.tasks.length;
  const activeTasks = shift.tasks.filter((t) => t.status === "in_progress").length;
  const blockedTasks = shift.tasks.filter((t) => t.status === "blocked").length;

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Readiness check — shows once per day */}
      {showReadiness && (
        <ShiftReadinessCheck
          venueName={shift.venue_name}
          onComplete={() => { markReadinessComplete(); setShowReadiness(false); }}
          onDismiss={() => { markReadinessComplete(); setShowReadiness(false); }}
        />
      )}

      <SurfaceHeader
        title={`Hi, ${shift.employee_name.split(" ")[0]}`}
        subtitle={`${shift.venue_name} — ${totalTasks} task${totalTasks !== 1 ? "s" : ""} today`}
      />
      {greeting && (
        <p style={{
          fontSize: "var(--text-card)",
          fontStyle: "italic",
          color: "var(--color-accent)",
          margin: "8px 20px 0",
          lineHeight: 1.5,
        }}>
          {greeting}
        </p>
      )}
      <PrimaryCanvas>
        {/* Quick pulse — stat cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}>
          {[
            { value: totalTasks, label: "Tasks" },
            { value: activeTasks, label: "Active" },
            { value: blockedTasks, label: "Blocked" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "16px 12px",
              textAlign: "center" as const,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                fontSize: "var(--text-page)",
                fontWeight: 700,
                color: stat.label === "Blocked" && stat.value > 0 ? "var(--color-danger)" : "var(--color-text-primary)",
                lineHeight: 1.2,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted)",
                marginTop: 4,
                fontWeight: 500,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Task list — tap to act */}
        {totalTasks === 0 ? (
          <EmptyState title="No tasks assigned" description="Check with your manager for today's priorities." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shift.tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isActive = task.status === "in_progress";
              const borderColor = STATUS_BORDER[task.status] ?? "var(--color-text-muted)";
              const doneCount = task.sub_actions.filter((sa) => sa.completed).length;
              const totalSteps = task.sub_actions.length;
              const progress = totalSteps > 0 ? doneCount / totalSteps : 0;

              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  style={{
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 20px",
                    borderLeft: `4px solid ${borderColor}`,
                    cursor: "pointer",
                    opacity: isCompleted ? 0.6 : 1,
                    boxShadow: isActive
                      ? "0 2px 12px rgba(108,92,231,0.15)"
                      : "0 1px 3px rgba(0,0,0,0.06)",
                    minHeight: 48,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    transition: "box-shadow 0.15s ease",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    {/* Active pulsing indicator */}
                    {isActive && (
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        flexShrink: 0,
                        animation: "pocket-pulse 1.8s ease-in-out infinite",
                      }} />
                    )}
                    {/* Completed green indicator */}
                    {isCompleted && (
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--color-success)",
                        flexShrink: 0,
                      }} />
                    )}
                    <span style={{
                      fontWeight: 600,
                      fontSize: "var(--text-card)",
                      flex: 1,
                      color: isCompleted ? "var(--color-text-muted)" : "var(--color-text-primary)",
                    }}>
                      {task.title}
                    </span>
                    <span style={{
                      fontSize: "var(--text-small)",
                      fontWeight: 500,
                      color: STATUS_COLORS[task.status] ?? "var(--color-text-muted)",
                      textTransform: "capitalize" as const,
                      whiteSpace: "nowrap" as const,
                    }}>
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Sub-action progress bar */}
                  {totalSteps > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "var(--text-small)",
                        color: "var(--color-text-muted)",
                        marginBottom: 6,
                      }}>
                        <span>{doneCount}/{totalSteps} steps done</span>
                      </div>
                      <div style={{
                        height: 4,
                        borderRadius: 2,
                        background: "var(--color-border-subtle)",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${progress * 100}%`,
                          borderRadius: 2,
                          background: isCompleted
                            ? "var(--color-success)"
                            : "linear-gradient(90deg, var(--color-accent), #a29bfe)",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Ask VOIS about this task */}
                  {onAskCopilot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskCopilot(
                          `I'm a barista working on: "${task.title}" — Status: ${task.status.replace(/_/g, " ")}. ` +
                          `${task.sub_actions?.length ? `Sub-actions: ${task.sub_actions.filter((a: any) => typeof a === "object" ? !a.completed : true).length} remaining. ` : ""}` +
                          `How should I approach this? What does "good" look like? Any tips?`
                        );
                      }}
                      style={{
                        background: "none",
                        border: "1px solid var(--color-accent)",
                        color: "var(--color-accent)",
                        fontSize: "var(--text-body)",
                        fontWeight: 600,
                        padding: "8px 16px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        width: "100%",
                        marginTop: 8,
                        minHeight: 44,
                        transition: "all 180ms ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >
                      Ask VOIS about this task
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PrimaryCanvas>

      {/* ── Shift Handover ── */}
      {venueId && (
        <div style={{ margin: "20px 0", padding: "0 20px" }}>
          {!handover ? (
            <button
              onClick={handleGenerateHandover}
              disabled={generatingHandover}
              style={{
                width: "100%",
                minHeight: 48,
                background: "none",
                border: "1px dashed var(--color-border-strong)",
                borderRadius: "var(--radius-lg)",
                color: "var(--color-text-secondary)",
                fontSize: "var(--text-body)",
                fontWeight: 500,
                cursor: generatingHandover ? "wait" : "pointer",
                padding: "12px 20px",
                transition: "all 180ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            >
              {generatingHandover ? "Generating handover..." : "Generate Shift Handover"}
            </button>
          ) : (
            <div style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: 20,
              borderLeft: "4px solid var(--color-success)",
            }}>
              <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 8 }}>
                Shift Handover
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-success)" }}>{handover.completed_tasks}</span>
                <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", alignSelf: "center" }}>done</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: "var(--color-warning)" }}>{handover.remaining_tasks}</span>
                <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", alignSelf: "center" }}>remaining</span>
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "var(--text-body)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                {handover.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
              <p style={{ marginTop: 12, fontSize: "var(--text-body)", color: "var(--color-text-primary)", fontWeight: 500, lineHeight: 1.5 }}>
                {handover.handover_notes}
              </p>
              <button
                onClick={() => setHandover(null)}
                style={{ marginTop: 8, background: "none", border: "none", color: "var(--color-text-muted)", fontSize: "var(--text-small)", cursor: "pointer" }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pocket-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
