import type { ReactNode } from "react";
import { Badge } from "../ui";

type TaskCardProps = {
  title: string;
  status: string;
  statusColor?: string;
  priority?: string | null;
  assignee?: string;
  milestone?: string;
  onClick?: () => void;
  selected?: boolean;
  children?: ReactNode; // for extra content like sub-actions
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
  critical: "task-card__priority--critical",
  high: "task-card__priority--high",
  normal: "task-card__priority--normal",
  medium: "task-card__priority--normal",
  low: "task-card__priority--low",
};

export function TaskCard({
  title,
  status,
  statusColor,
  priority,
  assignee,
  milestone,
  onClick,
  selected,
  children,
}: TaskCardProps) {
  const rootCls = [
    "task-card",
    selected ? "task-card--selected" : "",
    onClick ? "task-card--clickable" : "",
  ].filter(Boolean).join(" ");

  const borderStyle = statusColor
    ? ({ "--task-card-border-color": statusColor } as React.CSSProperties)
    : undefined;

  return (
    <div className={rootCls} style={borderStyle} onClick={onClick}>
      <div className="task-card__body">
        <div className="task-card__header">
          <span className="task-card__title">{title}</span>
          <Badge variant={STATUS_VARIANT[status] ?? "muted"}>
            {status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="task-card__meta">
          {priority && (
            <span className={`task-card__priority ${PRIORITY_CLASS[priority] ?? ""}`}>
              {priority}
            </span>
          )}
          {assignee && <span className="task-card__assignee">{assignee}</span>}
          {milestone && <span className="task-card__milestone">{milestone}</span>}
        </div>
      </div>

      {children && <div className="task-card__extra">{children}</div>}
    </div>
  );
}
