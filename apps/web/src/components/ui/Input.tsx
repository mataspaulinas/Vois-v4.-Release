import { forwardRef, type InputHTMLAttributes } from "react";
import Icon, { type IconName } from "../Icon";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: IconName;
  inputSize?: "sm" | "md";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({ icon, inputSize = "md", className, ...rest }, ref) => {
  if (icon) {
    return (
      <div className={`ui-input ${inputSize === "sm" ? "sm" : ""} ${className ?? ""}`}>
        <Icon name={icon} size={14} className="ui-input-icon" />
        <input ref={ref} style={{ border: "none", background: "none", outline: "none", flex: 1, fontSize: "inherit", color: "inherit", padding: 0, fontFamily: "inherit" }} {...rest} />
      </div>
    );
  }
  return <input ref={ref} className={`ui-input ${inputSize === "sm" ? "sm" : ""} ${className ?? ""}`} {...rest} />;
});
Input.displayName = "Input";
