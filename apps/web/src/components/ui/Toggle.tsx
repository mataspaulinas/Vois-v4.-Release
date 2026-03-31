type ToggleProps = {
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export function Toggle({ on, onChange, disabled = false, label }: ToggleProps) {
  return (
    <div className="toggle-wrapper">
      <button
        type="button"
        className={`toggle ${on ? "on" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && onChange(!on)}
        role="switch"
        aria-checked={on}
        aria-label={label}
      >
        <span className="toggle-thumb" />
      </button>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  );
}
