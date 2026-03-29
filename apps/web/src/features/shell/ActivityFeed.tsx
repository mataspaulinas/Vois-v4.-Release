import { useEffect, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState } from "../../components/LoadingState";

type ActivityItem = {
  id: string;
  type: "progress" | "audit";
  subtype: string;
  summary: string;
  detail: string | null;
  venue_id: string | null;
  actor_user_id: string | null;
  created_at: string | null;
};

type ActivityFeedProps = {
  formatTimestamp: (iso: string) => string;
  limit?: number;
};

const SUBTYPE_LABELS: Record<string, string> = {
  note: "Note", update: "Update", milestone: "Milestone", risk: "Risk", decision: "Decision",
  created: "Created", submitted: "Submitted", activated: "Activated", archived: "Archived",
  status_updated: "Status change", created_from_block: "Block added",
};

const SUBTYPE_COLORS: Record<string, string> = {
  milestone: "var(--color-success)", risk: "var(--color-danger)", decision: "var(--color-info)",
  activated: "var(--color-success)", archived: "var(--color-text-muted)",
};

export function ActivityFeed({ formatTimestamp, limit = 30 }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "progress" | "audit">("all");

  useEffect(() => {
    fetch(`/api/v1/activity/feed?limit=${limit}`, { credentials: "include" })
      .then((r: Response) => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  if (loading) return <LoadingState variant="list" />;
  if (!items.length) return <EmptyState title="No activity yet" description="Activity will appear here as the team works." />;

  return (
    <div>
      <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
        {(["all", "progress", "audit"] as const).map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "progress" ? "Operational" : "System"}
          </button>
        ))}
      </div>
      <div>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "var(--spacing-sm) var(--spacing-md)",
              borderLeft: `3px solid ${SUBTYPE_COLORS[item.subtype] ?? "var(--color-border-subtle)"}`,
              marginBottom: "var(--spacing-xs)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 500, fontSize: "var(--text-body)" }}>{item.summary}</span>
              <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                {item.created_at ? formatTimestamp(item.created_at) : ""}
              </span>
            </div>
            {item.detail && (
              <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{item.detail}</p>
            )}
            <span style={{ fontSize: 10, color: "var(--color-text-muted)", opacity: 0.6 }}>
              {SUBTYPE_LABELS[item.subtype] ?? item.subtype}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
