import { useState } from "react";
import Icon from "../../components/Icon";
import { DelegationEntry } from "../../lib/api";
import { pillStyle, statusDot } from "../../styles/tokens";

type DelegationConsoleProps = {
  delegations: DelegationEntry[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
};

type FilterKey = "all" | "overdue" | "pending" | "in_progress" | "completed";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

const statusColor = (d: DelegationEntry) => {
  if (d.is_overdue) return "var(--critical)";
  switch (d.status) {
    case "completed": return "var(--medium)";
    case "in_progress": return "var(--low)";
    default: return "var(--text-muted)";
  }
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`;
}

export function DelegationConsole({ delegations, loading, formatTimestamp }: DelegationConsoleProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "all"
    ? delegations
    : filter === "overdue"
      ? delegations.filter(d => d.is_overdue)
      : delegations.filter(d => d.status === filter && !d.is_overdue);

  const overdueCount = delegations.filter(d => d.is_overdue).length;

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <p className="eyebrow">Delegations</p>
        <p className="small-text" style={{ color: "var(--text-muted)", marginTop: 2 }}>
          {delegations.length} delegation{delegations.length !== 1 ? "s" : ""}
          {overdueCount > 0 && <span style={{ color: "var(--critical)", fontWeight: 600 }}> · {overdueCount} overdue</span>}
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const count = f.key === "all" ? delegations.length
            : f.key === "overdue" ? overdueCount
            : delegations.filter(d => d.status === f.key && !d.is_overdue).length;
          return (
            <button key={f.key} style={pillStyle(filter === f.key)} onClick={() => setFilter(f.key)}>
              {f.key === "overdue" && count > 0 && <span style={{ ...statusDot("var(--critical)"), width: 6, height: 6, display: "inline-block", marginRight: 4 }} />}
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Delegation list */}
      {loading ? (
        <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading delegations...</p>
      ) : filtered.length === 0 ? (
        <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
          {filter === "all" ? "No delegations yet. Create follow-ups to delegate tasks." : "No delegations match this filter."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((d, i) => {
            const isExpanded = expandedId === d.follow_up_id;
            return (
              <div
                key={d.follow_up_id}
                style={{
                  borderLeft: `3px solid ${statusColor(d)}`,
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  cursor: "pointer",
                  transition: "background var(--motion-fast) var(--easing-standard)",
                  background: isExpanded ? "var(--overlay-hover)" : "transparent",
                  animation: `cardEnter 0.25s var(--easing-standard) both`,
                  animationDelay: `${i * 30}ms`,
                }}
                onClick={() => setExpandedId(isExpanded ? null : d.follow_up_id)}
              >
                {/* Main row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ ...statusDot(statusColor(d)), width: 7, height: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {d.title}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                    {d.assigned_to && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.assigned_to}</span>
                    )}
                    <span style={{ fontSize: 11, color: d.is_overdue ? "var(--critical)" : "var(--text-muted)", fontWeight: d.is_overdue ? 600 : 400 }}>
                      {d.is_overdue ? "Overdue" : timeAgo(d.due_at)}
                    </span>
                    <span style={{ fontSize: 11, color: statusColor(d), textTransform: "capitalize", fontWeight: 500 }}>
                      {d.is_overdue ? "overdue" : d.status.replace(/_/g, " ")}
                    </span>
                    <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={12} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ marginTop: 12, marginLeft: 15, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    {d.task_title && (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}>
                        Task: <span style={{ color: "var(--text-secondary)" }}>{d.task_title}</span>
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                      <span>Due: {formatTimestamp(d.due_at)}</span>
                      <span>Evidence: {d.evidence_count}</span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {d.status !== "completed" && (
                        <button style={{ ...actionBtnStyle, color: "var(--medium)" }} title="Mark complete">
                          <Icon name="check" size={13} /> Complete
                        </button>
                      )}
                      <button style={actionBtnStyle} title="Add note">
                        <Icon name="comment" size={13} /> Note
                      </button>
                      <button style={actionBtnStyle} title="Request evidence">
                        <Icon name="evidence" size={13} /> Evidence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "4px 10px", fontSize: 11, fontWeight: 500,
  background: "transparent", border: "none", color: "var(--text-muted)",
  cursor: "pointer", borderRadius: "var(--r-sm, 6px)",
  transition: "color var(--motion-fast) var(--easing-standard), background var(--motion-fast) var(--easing-standard)",
};
