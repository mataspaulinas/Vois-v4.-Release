import { useEffect, useState } from "react";

type TransitionSuggestionProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  autoHideMs?: number;
};

export function TransitionSuggestion({ message, actionLabel, onAction, autoHideMs = 8000 }: TransitionSuggestionProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs]);

  if (!visible) return null;

  return (
    <div className="transition-suggestion">
      <span className="transition-suggestion__message">{message}</span>
      <button className="btn btn-primary btn-sm" onClick={onAction}>
        {actionLabel}
      </button>
      <button className="transition-suggestion__dismiss" onClick={() => setVisible(false)} aria-label="Dismiss">
        x
      </button>
    </div>
  );
}
