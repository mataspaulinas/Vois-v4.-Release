type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
};

export function Checkbox({ checked, onChange, indeterminate, disabled = false, label }: CheckboxProps) {
  const cn = [
    "custom-checkbox",
    checked && "checked",
    indeterminate && !checked && "indeterminate",
  ].filter(Boolean).join(" ");

  return (
    <label className={`checkbox-wrapper ${disabled ? "disabled" : ""}`}>
      <span className={cn} onClick={() => !disabled && onChange(!checked)} />
      {label && <span className="check-label">{label}</span>}
    </label>
  );
}
