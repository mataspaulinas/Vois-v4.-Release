import { SectionCard } from "../../components/SectionCard";
import { MyShiftResponse } from "../../lib/api";

type MyShiftProps = {
  shift: MyShiftResponse | null;
  loading: boolean;
  onOpenTask: (taskId: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "var(--muted)",
  in_progress: "var(--sky)",
  blocked: "var(--sunrise)",
};

export function MyShift({ shift, loading, onOpenTask }: MyShiftProps) {
  if (loading || !shift) {
    return (
      <div className="pocket-view">
        <SectionCard eyebrow="My shift" title="Loading...">
          <div className="empty-state"><p>Getting your shift ready...</p></div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="pocket-view">
      <SectionCard
        eyebrow="My shift"
        title={`Hi, ${shift.employee_name.split(" ")[0]}`}
        description={`${shift.venue_name} — ${shift.tasks.length} task${shift.tasks.length !== 1 ? "s" : ""} today`}
      >
        {/* Quick stats */}
        <div className="pocket-stats">
          <div className="pocket-stat-card">
            <div className="pocket-stat-value">{shift.tasks.length}</div>
            <div className="pocket-stat-label">Tasks</div>
          </div>
          <div className="pocket-stat-card" style={{ borderLeft: `3px solid ${shift.overdue_follow_ups > 0 ? "var(--sunrise)" : "var(--leaf)"}` }}>
            <div className="pocket-stat-value">{shift.overdue_follow_ups}</div>
            <div className="pocket-stat-label">Overdue</div>
          </div>
          <div className="pocket-stat-card">
            <div className="pocket-stat-value">{shift.open_follow_ups}</div>
            <div className="pocket-stat-label">Follow-ups</div>
          </div>
        </div>

        {/* Task cards — mobile-optimized */}
        {shift.tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks assigned right now. Check back later or ask your manager.</p>
          </div>
        ) : (
          <div className="pocket-task-list">
            {shift.tasks.map((task) => (
              <div
                key={task.id}
                className="pocket-task-card"
                onClick={() => onOpenTask(task.id)}
                style={{ borderLeft: `3px solid ${STATUS_COLORS[task.status] ?? "var(--muted)"}` }}
              >
                <div className="pocket-task-header">
                  <span className="pocket-task-title">{task.title}</span>
                  <span
                    className="status-pill"
                    style={{ background: STATUS_COLORS[task.status] ?? "var(--muted)", color: "white", fontSize: "0.75rem" }}
                  >
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
                {task.sub_actions.length > 0 ? (
                  <div className="pocket-task-progress">
                    {task.sub_actions.filter((sa) => sa.completed).length}/{task.sub_actions.length} steps done
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
