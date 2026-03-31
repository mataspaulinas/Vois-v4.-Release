type DividerProps = {
  label?: string;
  className?: string;
};

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return <div className={`ui-divider ${className ?? ""}`}>{label}</div>;
  }
  return <div className={`ui-divider ${className ?? ""}`} />;
}
