import { Card, Badge } from "../ui";

type ReferenceEntityCardProps = {
  code: string;
  name: string;
  type: "block" | "tool" | "signal" | "failure_mode" | "response_pattern";
  domain?: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
};

const TYPE_VARIANT: Record<string, "accent" | "info" | "success" | "warning" | "muted"> = {
  signal: "info",
  block: "accent",
  tool: "success",
  failure_mode: "danger" as "warning",
  response_pattern: "warning",
};

export function ReferenceEntityCard({
  code,
  name,
  type,
  domain,
  description,
  selected,
  onClick,
}: ReferenceEntityCardProps) {
  return (
    <Card
      variant="interactive"
      className={`ref-entity-card${selected ? " ref-entity-card--selected" : ""}`}
      onClick={onClick}
    >
      <div className="ref-entity-card__header">
        <span className="ref-entity-card__code">{code}</span>
        <Badge variant={TYPE_VARIANT[type] ?? "muted"}>{type.replace(/_/g, " ")}</Badge>
      </div>
      <h3 className="ref-entity-card__name">{name}</h3>
      {description && <p className="ref-entity-card__desc">{description}</p>}
      {domain && (
        <div className="ref-entity-card__meta">
          <Badge variant="muted">{domain}</Badge>
        </div>
      )}
    </Card>
  );
}
