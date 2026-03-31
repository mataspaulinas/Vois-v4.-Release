import type { ReactNode, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "compact" | "interactive" | "flush";
  children: ReactNode;
};

export function Card({ variant = "default", children, className, ...rest }: CardProps) {
  const cls = [
    "ui-card",
    variant !== "default" ? `ui-card--${variant}` : "",
    className ?? "",
  ].filter(Boolean).join(" ");
  return <div className={cls} {...rest}>{children}</div>;
}
