import { useState, type ReactNode } from "react";
import Icon from "../Icon";

type BannerProps = {
  variant?: "info" | "warning" | "danger" | "success";
  dismissible?: boolean;
  children: ReactNode;
  className?: string;
};

export function Banner({ variant = "info", dismissible, children, className }: BannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const iconName = variant === "danger" ? "error" : variant === "warning" ? "warning" : variant === "success" ? "check" : "info";

  return (
    <div className={`ui-banner ui-banner--${variant} ${className ?? ""}`} role="alert">
      <Icon name={iconName} size={16} />
      <span style={{ flex: 1 }}>{children}</span>
      {dismissible && (
        <button className="ui-banner__dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
