import Icon, { type IconName } from "../Icon";
import type { ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  label: string; // required for accessibility
};

export function IconButton({ icon, size = "md", variant = "ghost", label, className, ...rest }: IconButtonProps) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  const cls = ["btn", `btn-${variant}`, "btn-icon", size !== "md" ? `btn-${size}` : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
