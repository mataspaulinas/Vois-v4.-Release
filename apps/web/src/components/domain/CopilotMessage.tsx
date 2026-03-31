type CopilotMessageProps = {
  role: "user" | "copilot";
  content: string;
  timestamp?: string;
  actions?: Array<{ label: string; onClick: () => void }>;
};

export function CopilotMessage({ role, content, timestamp, actions }: CopilotMessageProps) {
  const isCopilot = role === "copilot";

  return (
    <article className={`copilot-msg ${isCopilot ? "copilot-msg--copilot" : "copilot-msg--user"}`}>
      <div className="copilot-msg__header">
        <span className="copilot-msg__role">
          {isCopilot ? "VOIS" : "You"}
        </span>
        {timestamp && (
          <span className="copilot-msg__timestamp">{timestamp}</span>
        )}
      </div>
      <p className="copilot-msg__body">{content}</p>
      {actions && actions.length > 0 && (
        <div className="copilot-msg__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              className="copilot-msg__action-btn"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
