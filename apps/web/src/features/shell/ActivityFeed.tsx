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
  milestone: "var(--color-success)",
  risk: "var(--color-danger)",
  decision: "var(--color-info)",
  activated: "var(--color-success)",
  archived: "var(--color-text-muted)",
};

const filterBtnBase: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: "var(--text-small)",
  fontWeight: 500,
  borderRadius: "var(--radius-sm)",
  border: "1px solid rgba(0,0,0,0.08)",
  cursor: "pointer",
  transition: "all 180ms ease",
  minHeight: 32,
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
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "progress", "audit"] as const).map((f) => (
          <button
            key={f}
            style={{
              ...filterBtnBase,
              background: filter === f ? "var(--color-accent)" : "var(--color-surface)",
              color: filter === f ? "var(--color-surface)" : "var(--color-text-secondary)",
              borderColor: filter === f ? "var(--color-accent)" : "rgba(0,0,0,0.08)",
            }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "progress" ? "Operational" : "System"}
          </button>
        ))}
      </div>

      {/* Activity items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "12px 16px",
              borderLeft: `3px solid ${SUBTYPE_COLORS[item.subtype] ?? "rgba(0,0,0,0.08)"}`,
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "box-shadow 180ms ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 500, fontSize: "var(--text-body)", color: "var(--color-text-primary)" }}>{item.summary}</span>
              <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
                {item.created_at ? formatTimestamp(item.created_at) : ""}
              </span>
            </div>
            {item.detail && (
              <p style={{ margin: "3px 0 0 0", fontSize: "var(--text-small)", color: "var(--color-text-muted)", lineHeight: 1.4 }}>{item.detail}</p>
            )}
            <span style={{
              fontSize: "var(--text-eyebrow)",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              fontWeight: 500,
              marginTop: 4,
              display: "inline-block",
            }}>
              {SUBTYPE_LABELS[item.subtype] ?? item.subtype}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
