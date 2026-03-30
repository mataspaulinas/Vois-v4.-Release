import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { MyShiftResponse } from "../../lib/api";
import { ShiftReadinessCheck, shouldShowReadinessCheck, markReadinessComplete } from "./ShiftReadinessCheck";

type MyShiftProps = {
  shift: MyShiftResponse | null;
  loading: boolean;
  onOpenTask: (taskId: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--color-text-muted)",
  in_progress: "var(--color-info)",
  blocked: "var(--color-danger)",
};

const STATUS_BORDER: Record<string, string> = {
  not_started: "#999",
  in_progress: "#6C5CE7",
  blocked: "var(--color-danger)",
  completed: "#27ae60",
};

export function MyShift({ shift, loading, onOpenTask }: MyShiftProps) {
  const [showReadiness, setShowReadiness] = useState(shouldShowReadinessCheck);

  if (loading) {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "#fafafa" }}>
        <SurfaceHeader title="My Shift" subtitle="Getting your shift ready..." />
        <PrimaryCanvas><LoadingState variant="card" /></PrimaryCanvas>
      </div>
    );
  }

  if (!shift) {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "#fafafa" }}>
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
    <div style={{ padding: 20, minHeight: "100vh", background: "#fafafa" }}>
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
              background: "#fff",
              borderRadius: 16,
              padding: "16px 12px",
              textAlign: "center" as const,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: stat.label === "Blocked" && stat.value > 0 ? "var(--color-danger)" : "#222",
                lineHeight: 1.2,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 13,
                color: "#888",
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
              const borderColor = STATUS_BORDER[task.status] ?? "#999";
              const doneCount = task.sub_actions.filter((sa) => sa.completed).length;
              const totalSteps = task.sub_actions.length;
              const progress = totalSteps > 0 ? doneCount / totalSteps : 0;

              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
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
                        background: "#6C5CE7",
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
                        background: "#27ae60",
                        flexShrink: 0,
                      }} />
                    )}
                    <span style={{
                      fontWeight: 600,
                      fontSize: 16,
                      flex: 1,
                      color: isCompleted ? "#999" : "#222",
                    }}>
                      {task.title}
                    </span>
                    <span style={{
                      fontSize: 12,
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
                        fontSize: 13,
                        color: "#888",
                        marginBottom: 6,
                      }}>
                        <span>{doneCount}/{totalSteps} steps done</span>
                      </div>
                      <div style={{
                        height: 4,
                        borderRadius: 2,
                        background: "#eee",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${progress * 100}%`,
                          borderRadius: 2,
                          background: isCompleted
                            ? "#27ae60"
                            : "linear-gradient(90deg, #6C5CE7, #a29bfe)",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PrimaryCanvas>

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
