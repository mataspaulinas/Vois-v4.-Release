import { ReactNode, useState } from "react";
import Icon from "./Icon";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type SurfaceHeaderProps = {
  backLabel?: string;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: StatusTone;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  moreActions?: { label: string; onClick: () => void }[];
  trailing?: ReactNode;
};

export function SurfaceHeader({
  backLabel,
  onBack,
  title,
  subtitle,
  status,
  statusTone = "neutral",
  primaryAction,
  moreActions,
  trailing,
}: SurfaceHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="surface-header">
      <div className="surface-header__left">
        {onBack && (
          <button className="surface-header__back" onClick={onBack} title={backLabel ?? "Back"} aria-label={backLabel ?? "Back"}>
            <Icon name="back" size={16} />
          </button>
        )}
        <div className="surface-header__identity">
          <h1 className="surface-header__title">{title}</h1>
          {subtitle && <p className="surface-header__subtitle">{subtitle}</p>}
        </div>
        {status && (
          <span className={`surface-header__status surface-header__status--${statusTone}`}>
            {status}
          </span>
        )}
      </div>

      <div className="surface-header__right">
        {trailing}
        {primaryAction && (
          <button
            className="btn btn-primary"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.label}
          </button>
        )}
        {moreActions?.length ? (
          <div className="surface-header__more" style={{ position: "relative" }}>
            <button className="btn btn-secondary" onClick={() => setMoreOpen(!moreOpen)} aria-label="More actions" title="More actions" style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="more-vertical" size={16} />
            </button>
            {moreOpen && (
              <div className="surface-header__menu" onClick={() => setMoreOpen(false)}>
                {moreActions.map((action) => (
                  <button key={action.label} className="surface-header__menu-item" onClick={action.onClick}>
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
