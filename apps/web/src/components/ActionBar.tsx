type ActionDef = { label: string; onClick: () => void; disabled?: boolean };

type ActionBarProps = {
  primaryAction?: ActionDef;
  secondaryActions?: ActionDef[];
  sticky?: boolean;
};

export function ActionBar({ primaryAction, secondaryActions, sticky }: ActionBarProps) {
  if (!primaryAction && !secondaryActions?.length) return null;

  return (
    <div className={`action-bar ${sticky ? "action-bar--sticky" : ""}`}>
      <div className="action-bar__group">
        {secondaryActions?.map((action) => (
          <button
            key={action.label}
            className="btn btn-secondary"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </button>
        ))}
      </div>
      {primaryAction && (
        <button
          className="btn btn-primary"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </button>
      )}
    </div>
  );
}
