import { Badge } from "../ui";

type FMChipProps = {
  code: string;
  name: string;
  severity?: "critical" | "high" | "medium" | "low";
  onClick?: () => void;
};

const SEVERITY_VARIANT = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "muted",
} as const;

export function FMChip({ code, name, severity, onClick }: FMChipProps) {
  const interactive = !!onClick;

  return (
    <button
      type="button"
      className={[
        "fm-chip",
        interactive ? "fm-chip--interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={!interactive}
    >
      <span className="fm-chip__code">{code}</span>
      <span className="fm-chip__name">{name}</span>

      {severity && (
        <Badge variant={SEVERITY_VARIANT[severity]}>{severity}</Badge>
      )}
    </button>
  );
}
