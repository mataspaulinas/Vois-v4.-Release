type CopilotThreadRowProps = {
  title: string;
  preview: string;
  timestamp: string;
  active?: boolean;
  onClick?: () => void;
};

export function CopilotThreadRow({ title, preview, timestamp, active, onClick }: CopilotThreadRowProps) {
  return (
    <button
      className={`copilot-thread-row ${active ? "copilot-thread-row--active" : ""}`}
      onClick={onClick}
    >
      <strong className="copilot-thread-row__title">{title}</strong>
      <span className="copilot-thread-row__preview">{preview}</span>
      <span className="copilot-thread-row__timestamp">{timestamp}</span>
    </button>
  );
}
