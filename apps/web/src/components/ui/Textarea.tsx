import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...rest }, ref) => {
  return <textarea ref={ref} className={`ui-textarea ${className ?? ""}`} {...rest} />;
});
Textarea.displayName = "Textarea";
