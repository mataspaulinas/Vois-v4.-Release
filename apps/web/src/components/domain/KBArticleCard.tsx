import { Card, Badge } from "../ui";

type KBArticleCardProps = {
  title: string;
  summary?: string;
  category?: string;
  readStatus?: "unread" | "read";
  readTime?: string;
  onClick?: () => void;
};

export function KBArticleCard({
  title,
  summary,
  category,
  readStatus,
  readTime,
  onClick,
}: KBArticleCardProps) {
  return (
    <Card
      variant="interactive"
      className={`kb-article-card${readStatus === "read" ? " kb-article-card--read" : ""}`}
      onClick={onClick}
    >
      <div className="kb-article-card__header">
        {category && (
          <span className="kb-article-card__category">{category.replace(/_/g, " ")}</span>
        )}
        <div className="kb-article-card__status-group">
          {readStatus && (
            <Badge variant={readStatus === "read" ? "success" : "muted"}>
              {readStatus}
            </Badge>
          )}
        </div>
      </div>
      <h3 className="kb-article-card__title">{title}</h3>
      {summary && <p className="kb-article-card__summary">{summary}</p>}
      {readTime && <span className="kb-article-card__time">{readTime}</span>}
    </Card>
  );
}
