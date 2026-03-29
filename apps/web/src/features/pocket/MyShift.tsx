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

export function MyShift({ shift, loading, onOpenTask }: MyShiftProps) {
  const [showReadiness, setShowReadiness] = useState(shouldShowReadinessCheck);

  if (loading) {
    return (
      <div className="pocket-view">
        <SurfaceHeader title="My Shift" subtitle="Getting your shift ready..." />
        <PrimaryCanvas><LoadingState variant="card" /></PrimaryCanvas>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="pocket-view">
        <SurfaceHeader title="My Shift" />
        <PrimaryCanvas>
          <EmptyState title="No shift data" description="Your manager will assign tasks when your shift begins." />
        </PrimaryCanvas>
      </div>
    );
  }

  return (
    <div className="pocket-view">
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
        subtitle={`${shift.venue_name} — ${shift.tasks.length} task${shift.tasks.length !== 1 ? "s" : ""} today`}
      />
      <PrimaryCanvas>
        {/* Quick pulse */}
        <div className="pocket-stats">
          <div className="pocket-stat-card">
            <div className="pocket-stat-value">{shift.tasks.length}</div>
            <div className="pocket-stat-label">Tasks</div>
          </div>
          <div className="pocket-stat-card">
            <div className="pocket-stat-value">{shift.tasks.filter((t) => t.status === "in_progress").length}</div>
            <div className="pocket-stat-label">Active</div>
          </div>
          <div className="pocket-stat-card">
            <div className="pocket-stat-value">{shift.tasks.filter((t) => t.status === "blocked").length}</div>
            <div className="pocket-stat-label">Blocked</div>
          </div>
        </div>

        {/* Task list — tap to act */}
        {shift.tasks.length === 0 ? (
          <EmptyState title="No tasks assigned" description="Check with your manager for today's priorities." />
        ) : (
          <div className="pocket-task-list">
            {shift.tasks.map((task) => (
              <div
                key={task.id}
                className="pocket-task-card"
                onClick={() => onOpenTask(task.id)}
                style={{
                  borderLeft: `3px solid ${STATUS_COLORS[task.status] ?? "var(--color-text-muted)"}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
                  <span style={{ fontWeight: 500, flex: 1 }}>{task.title}</span>
                  <span className="status-pill" style={{ fontSize: 10 }}>{task.status.replace(/_/g, " ")}</span>
                </div>
                {task.sub_actions.length > 0 && (
                  <div className="pocket-task-progress">
                    {task.sub_actions.filter((sa) => sa.completed).length}/{task.sub_actions.length} steps done
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PrimaryCanvas>
    </div>
  );
}
