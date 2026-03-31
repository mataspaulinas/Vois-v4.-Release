import { Card, Badge } from "../ui";

type ProofCardProps = {
  source: string;
  content: string;
  timestamp?: string;
  trustLevel?: "verified" | "unverified" | "disputed";
  taskCode?: string;
  onClick?: () => void;
};

const TRUST_VARIANT = {
  verified: "success",
  unverified: "muted",
  disputed: "danger",
} as const;

export function ProofCard({
  source,
  content,
  timestamp,
  trustLevel,
  taskCode,
  onClick,
}: ProofCardProps) {
  const interactive = !!onClick;

  return (
    <Card
      variant={interactive ? "interactive" : "default"}
      className={[
        "proof-card",
        trustLevel ? `proof-card--${trustLevel}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {/* header row */}
      <div className="proof-card__header">
        <div className="proof-card__badges">
          {trustLevel && (
            <Badge variant={TRUST_VARIANT[trustLevel]}>{trustLevel}</Badge>
          )}
          {taskCode && <Badge variant="accent">{taskCode}</Badge>}
        </div>
        {timestamp && (
          <span className="proof-card__timestamp">{timestamp}</span>
        )}
      </div>

      {/* source */}
      <div className="proof-card__source">{source}</div>

      {/* content */}
      <p className="proof-card__content">{content}</p>
    </Card>
  );
}
