import { ReactNode } from "react";

type TooltipProps = {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
};

export function Tooltip({ content, position = "top", children }: TooltipProps) {
  return (
    <span className="ui-tooltip-wrapper">
      {children}
      <span className={`ui-tooltip ${position}`}>{content}</span>
    </span>
  );
}
