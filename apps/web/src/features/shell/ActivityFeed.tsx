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
  milestone: "#10B981",
  risk: "#EF4444",
  decision: "#6366F1",
  activated: "#10B981",
  archived: "#999",
};

const filterBtnBase: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 8,
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
              background: filter === f ? "#6C5CE7" : "#FFFFFF",
              color: filter === f ? "#fff" : "#555",
              borderColor: filter === f ? "#6C5CE7" : "rgba(0,0,0,0.08)",
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
              borderRadius: 12,
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "box-shadow 180ms ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: "#1a1a1a" }}>{item.summary}</span>
              <span style={{ fontSize: 13, color: "#999" }}>
                {item.created_at ? formatTimestamp(item.created_at) : ""}
              </span>
            </div>
            {item.detail && (
              <p style={{ margin: "3px 0 0 0", fontSize: 13, color: "#777", lineHeight: 1.4 }}>{item.detail}</p>
            )}
            <span style={{
              fontSize: 11,
              color: "#999",
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
