type PlanRowProps = {
  laneLabel: string;
  laneColor: string;
  title: string;
  description?: string;
  progress: number; // 0-100
  taskCount: number;
  totalTasks: number;
  collapsed?: boolean;
  onToggle?: () => void;
};

export function PlanRow({
  laneLabel,
  laneColor,
  title,
  description,
  progress,
  taskCount,
  totalTasks,
  collapsed,
  onToggle,
}: PlanRowProps) {
  const rootCls = [
    "plan-row",
    collapsed ? "plan-row--collapsed" : "",
    onToggle ? "plan-row--clickable" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rootCls} onClick={onToggle}>
      <div className="plan-row__header">
        <span
          className="plan-row__badge"
          style={{
            "--plan-row-color": laneColor,
          } as React.CSSProperties}
        >
          {laneLabel}
        </span>

        <span className="plan-row__title">{title}</span>

        <span className="plan-row__count">
          {taskCount} / {totalTasks} task{totalTasks !== 1 ? "s" : ""}
        </span>

        <div className="plan-row__progress-track">
          <div
            className="plan-row__progress-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              "--plan-row-color": laneColor,
            } as React.CSSProperties}
          />
        </div>

        <span
          className="plan-row__pct"
          style={{ color: laneColor }}
        >
          {progress}%
        </span>

        <span className={`plan-row__chevron ${collapsed ? "plan-row__chevron--collapsed" : ""}`}>
          {"\u25BE"}
        </span>
      </div>

      {description && (
        <p className="plan-row__description">{description}</p>
      )}
    </div>
  );
}
