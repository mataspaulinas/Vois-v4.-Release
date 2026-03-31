import { Badge } from "../ui";

type SignalChipProps = {
  name: string;
  domain?: string;
  confidence?: number; // 0-1
  active?: boolean;
  onClick?: () => void;
};

function confidenceVariant(confidence?: number) {
  if (confidence == null) return "muted" as const;
  if (confidence >= 0.7) return "success" as const;
  if (confidence >= 0.4) return "warning" as const;
  return "danger" as const;
}

function confidenceLabel(confidence?: number) {
  if (confidence == null) return null;
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

export function SignalChip({
  name,
  domain,
  confidence,
  active,
  onClick,
}: SignalChipProps) {
  const interactive = !!onClick;
  const label = confidenceLabel(confidence);

  return (
    <button
      type="button"
      className={[
        "signal-chip",
        active ? "signal-chip--active" : "",
        interactive ? "signal-chip--interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={!interactive}
    >
      <span className="signal-chip__name">{name}</span>

      {domain && (
        <span className="signal-chip__domain">
          {domain.replace(/_/g, " ")}
        </span>
      )}

      {label && (
        <Badge variant={confidenceVariant(confidence)}>{label}</Badge>
      )}
    </button>
  );
}
