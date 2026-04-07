import { useMemo, useState } from "react";
import Icon from "../../components/Icon";
import { AttentionItem, DelegationEntry, ExecutionVelocity } from "../../lib/api";
import { pillStyle, statusDot } from "../../styles/tokens";

type CommandCenterProps = {
  attentionItems: AttentionItem[];
  velocities: ExecutionVelocity[];
  delegations: DelegationEntry[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onOpenVenue: (venueId: string) => void;
  onOpenDelegations: () => void;
  onOpenIntelligence: () => void;
  onAskCopilot?: (context: string) => void;
};

/* ── Helpers ── */

const severityColor = (sev: string) => {
  switch (sev) {
    case "critical": return "var(--critical)";
    case "high": return "var(--high)";
    case "medium": return "var(--medium)";
    case "low": return "var(--text-muted)";
    default: return "var(--text-muted)";
  }
};

const velocityColor = (label: string) => {
  switch (label) {
    case "strong": return "var(--medium)";
    case "steady": return "var(--low)";
    case "stalled": return "var(--critical)";
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

type SeverityKey = "all" | "critical" | "high" | "medium" | "low";
const SEVERITIES: SeverityKey[] = ["all", "critical", "high", "medium", "low"];

/* ── Component ── */

export function CommandCenter({
  attentionItems,
  velocities,
  delegations,
  loading,
  formatTimestamp,
  onOpenVenue,
  onOpenDelegations,
  onOpenIntelligence,
  onAskCopilot,
}: CommandCenterProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityKey>("all");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => ({
    all: attentionItems.length,
    critical: attentionItems.filter(i => i.severity === "critical").length,
    high: attentionItems.filter(i => i.severity === "high").length,
    medium: attentionItems.filter(i => i.severity === "medium").length,
    low: attentionItems.filter(i => i.severity === "low").length,
  }), [attentionItems]);

  const filtered = severityFilter === "all"
    ? attentionItems
    : attentionItems.filter(i => i.severity === severityFilter);
  const visible = expanded ? filtered : filtered.slice(0, 3);

  const velocityMap = useMemo(() => {
    const m = new Map<string, ExecutionVelocity>();
    velocities.forEach(v => m.set(v.venue_id, v));
    return m;
  }, [velocities]);

  const overdueDelegations = delegations.filter(d => d.is_overdue).length;
  const activeDelegations = delegations.filter(d => !d.is_overdue && d.status !== "completed").length;
  const totalSignals = velocities.reduce((sum, v) => sum + (v.total_tasks || 0), 0);

  if (loading) {
    return (
      <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
        <p className="small-text" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading command center...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Section 1: Command Summary ── */}
      <section>
        <div className="command-summary">
          <h1 className="command-summary__title">Command Center</h1>
          <div className="command-summary__pills">
            {SEVERITIES.map(sev => (
              <button
                key={sev}
                className={`command-pill ${severityFilter === sev ? "active" : ""}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev !== "all" && <span className="command-pill__dot" style={{ background: severityColor(sev) }} />}
                <span style={{ textTransform: "capitalize" }}>{sev === "all" ? "All" : sev}</span>
                <span className="command-pill__count">{counts[sev]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Attention Board ── */}
      <section>
        <p className="eyebrow" style={{ marginBottom: 12 }}>
          Attention items
          {filtered.length > 0 && <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--accent)" }}>{filtered.length}</span>}
        </p>

        {filtered.length === 0 ? (
          <p className="small-text" style={{ color: "var(--text-muted)", padding: "24px 0" }}>
            No items requiring attention. All venues are operating normally.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((item, index) => {
              const velocity = velocityMap.get(item.venue_id);
              const vColor = velocity ? velocityColor(velocity.velocity_label) : "var(--text-muted)";
              const pct = velocity?.completion_percentage ?? 0;
              return (
                <div
                  key={`${item.type}-${item.entity_id}`}
                  className="attention-card"
                  style={{ borderLeftColor: severityColor(item.severity), animationDelay: `${index * 30}ms` }}
                  onClick={() => onOpenVenue(item.venue_id)}
                >
                  <div className="attention-card__header">
                    <div className="attention-card__title">
                      <span style={{ ...statusDot(severityColor(item.severity)), width: 7, height: 7 }} />
                      {item.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {velocity && (
                        <div className="attention-card__velocity">
                          <div className="attention-card__velocity-bar">
                            <div className="attention-card__velocity-fill" style={{ width: `${Math.min(pct, 100)}%`, background: vColor }} />
                          </div>
                          <span style={{ fontSize: 10, color: vColor, fontWeight: 500 }}>{Math.round(pct)}%</span>
                        </div>
                      )}
                      <span className="attention-card__severity" style={{ color: severityColor(item.severity) }}>{item.severity}</span>
                    </div>
                  </div>
                  <p className="attention-card__detail">{item.detail}</p>
                  <div className="attention-card__footer">
                    <span>{item.venue_name}</span>
                    <span>{timeAgo(item.created_at)}</span>
                    {onAskCopilot && (
                      <button
                        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskCopilot(`Attention: "${item.title}" — ${item.severity}, ${item.venue_name}. ${item.detail}`);
                        }}
                        title="Ask Copilot"
                      >
                        <Icon name="copilot" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 3 && (
          <button
            style={{ ...pillStyle(false), marginTop: 10, fontSize: 11 }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? "Show less" : `+${filtered.length - 3} more`}
          </button>
        )}
      </section>

      {/* ── Section 3: Quick Access ── */}
      <section>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Quick access</p>
        <div className="quick-access-row">
          <button className="quick-access-card" onClick={onOpenDelegations}>
            <div className="quick-access-card__icon">
              <Icon name="delegation" size={16} />
            </div>
            <div>
              <div className="quick-access-card__label">Delegations</div>
              <div className="quick-access-card__count">
                {overdueDelegations > 0 && <span style={{ color: "var(--critical)", fontWeight: 600 }}>{overdueDelegations} overdue</span>}
                {overdueDelegations > 0 && activeDelegations > 0 && " · "}
                {activeDelegations > 0 && <span>{activeDelegations} active</span>}
                {overdueDelegations === 0 && activeDelegations === 0 && "None"}
              </div>
            </div>
          </button>

          <button className="quick-access-card" onClick={onOpenIntelligence}>
            <div className="quick-access-card__icon">
              <Icon name="chart-line" size={16} />
            </div>
            <div>
              <div className="quick-access-card__label">Intelligence</div>
              <div className="quick-access-card__count">{velocities.length} venues · {totalSignals} tasks tracked</div>
            </div>
          </button>

          <button className="quick-access-card" onClick={() => onAskCopilot?.("Give me a strategic overview of all venues")}>
            <div className="quick-access-card__icon">
              <Icon name="copilot" size={16} />
            </div>
            <div>
              <div className="quick-access-card__label">Strategic Advisor</div>
              <div className="quick-access-card__count">Ask copilot for insights</div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
