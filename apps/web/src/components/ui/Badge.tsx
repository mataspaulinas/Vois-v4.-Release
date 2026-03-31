import type { ReactNode } from "react";

type BadgeProps = {
  variant?: "muted" | "accent" | "success" | "warning" | "danger" | "info";
  solid?: boolean;
  children: ReactNode;
  className?: string;
};

export function Badge({ variant = "muted", solid, children, className }: BadgeProps) {
  const cls = [
    "ui-badge",
    `ui-badge--${variant}`,
    solid ? "ui-badge--solid" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
  return <span className={cls}>{children}</span>;
}
