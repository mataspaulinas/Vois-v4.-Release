import { Badge } from "../ui";

type PlanNodeProps = {
  code: string;
  title: string;
  status: string;
  priority?: string | null;
  milestone?: string;
  estimatedHours?: number;
  subtaskProgress?: string; // e.g. "3/3"
  onClick?: () => void;
  expanded?: boolean;
};

const STATUS_VARIANT: Record<string, "muted" | "accent" | "success" | "warning" | "danger" | "info"> = {
  not_started: "muted",
  in_progress: "info",
  completed: "success",
  blocked: "danger",
  on_hold: "warning",
  deferred: "muted",
};

const PRIORITY_CLASS: Record<string, string> = {
  critical: "plan-node__priority--critical",
  high: "plan-node__priority--high",
  normal: "plan-node__priority--normal",
  medium: "plan-node__priority--normal",
  low: "plan-node__priority--low",
};

/* Status indicator circle (matches PlanView's StatusCircle pattern) */
function StatusCircle({ status }: { status: string }) {
  const size = 16;
  if (status === "completed") {
    return (
      <svg className="plan-node__status-icon" width={size} height={size} viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="var(--color-success)" />
        <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "in_progress") {
    return (
      <svg className="plan-node__status-icon" width={size} height={size} viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
        <path d="M8 1 A7 7 0 0 1 15 8" fill="var(--color-info)" />
        <circle cx="8" cy="8" r="7" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (status === "blocked") {
    return (
      <svg className="plan-node__status-icon" width={size} height={size} viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="plan-node__status-icon" width={size} height={size} viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="none" stroke="var(--color-border-subtle)" strokeWidth="1.5" />
    </svg>
  );
}

export function PlanNode({
  code,
  title,
  status,
  priority,
  milestone,
  estimatedHours,
  subtaskProgress,
  onClick,
  expanded,
}: PlanNodeProps) {
  const rootCls = [
    "plan-node",
    expanded ? "plan-node--expanded" : "",
    onClick ? "plan-node--clickable" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rootCls} onClick={onClick}>
      <div className="plan-node__row">
        <StatusCircle status={status} />

        <span className="plan-node__code">{code}</span>

        <span className="plan-node__title">{title}</span>

        {priority && (
          <span className={`plan-node__priority ${PRIORITY_CLASS[priority] ?? ""}`}>
            {priority}
          </span>
        )}

        {subtaskProgress && (
          <span className="plan-node__subtasks">{subtaskProgress}</span>
        )}

        <Badge variant={STATUS_VARIANT[status] ?? "muted"}>
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="plan-node__meta">
        {milestone && <span className="plan-node__milestone">{milestone}</span>}
        {estimatedHours != null && estimatedHours > 0 && (
          <span className="plan-node__hours">{estimatedHours}h</span>
        )}
      </div>

      {expanded && (
        <span className="plan-node__chevron plan-node__chevron--open">{"\u25B4"}</span>
      )}
    </div>
  );
}
