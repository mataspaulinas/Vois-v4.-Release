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

  return (
    <div className={`ui-banner ui-banner--${variant} ${className ?? ""}`} role="alert">
      <Icon name={variant === "danger" ? "alert" : variant === "warning" ? "alert" : variant === "success" ? "check" : "info"} size={16} />
      <span style={{ flex: 1 }}>{children}</span>
      {dismissible && (
        <button className="ui-banner__dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
