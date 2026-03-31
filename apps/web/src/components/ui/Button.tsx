import type { ReactNode, ButtonHTMLAttributes } from "react";
import Icon, { type IconName } from "../Icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconOnly?: boolean;
  children?: ReactNode;
};

export function Button({ variant = "secondary", size = "md", icon, iconOnly, children, className, ...rest }: ButtonProps) {
  const cls = [
    "btn",
    `btn-${variant}`,
    size !== "md" ? `btn-${size}` : "",
    iconOnly ? "btn-icon" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />}
      {!iconOnly && children}
    </button>
  );
}
