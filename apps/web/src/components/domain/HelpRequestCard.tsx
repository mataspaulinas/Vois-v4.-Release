import { Card, Badge } from "../ui";

type HelpRequestCardProps = {
  message: string;
  urgency: "low" | "normal" | "high";
  status: "pending" | "acknowledged" | "resolved";
  author?: string;
  timestamp?: string;
  onClick?: () => void;
};

const URGENCY_VARIANT: Record<HelpRequestCardProps["urgency"], "info" | "warning" | "danger"> = {
  low: "info",
  normal: "warning",
  high: "danger",
};

const STATUS_VARIANT: Record<HelpRequestCardProps["status"], "muted" | "accent" | "success"> = {
  pending: "muted",
  acknowledged: "accent",
  resolved: "success",
};

export function HelpRequestCard({
  message,
  urgency,
  status,
  author,
  timestamp,
  onClick,
}: HelpRequestCardProps) {
  return (
    <Card
      variant={onClick ? "interactive" : "default"}
      className="help-request-card"
      onClick={onClick}
    >
      <div className="help-request-card__header">
        <Badge variant={URGENCY_VARIANT[urgency]}>{urgency}</Badge>
        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      </div>
      <p className="help-request-card__message">{message}</p>
      {(author || timestamp) && (
        <div className="help-request-card__meta">
          {author && <span className="help-request-card__author">{author}</span>}
          {timestamp && <span className="help-request-card__timestamp">{timestamp}</span>}
        </div>
      )}
    </Card>
  );
}
