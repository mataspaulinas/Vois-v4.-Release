import { SectionCard } from "../../components/SectionCard";
import { AttentionItem, ExecutionVelocity } from "../../lib/api";

type CommandCenterProps = {
  attentionItems: AttentionItem[];
  velocities: ExecutionVelocity[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onOpenVenue: (venueId: string) => void;
};

const SEVERITY_STYLES: Record<string, { accent: string; badgeBackground: string; badgeForeground: string }> = {
  critical: {
    accent: "var(--color-danger)",
    badgeBackground: "var(--color-danger)",
    badgeForeground: "var(--color-danger-foreground)",
  },
  high: {
    accent: "var(--color-warning)",
    badgeBackground: "var(--color-warning)",
    badgeForeground: "var(--color-warning-foreground)",
  },
  medium: {
    accent: "var(--color-info)",
    badgeBackground: "var(--info-soft)",
    badgeForeground: "var(--color-info)",
  },
  low: {
    accent: "var(--border-strong)",
    badgeBackground: "var(--bg)",
    badgeForeground: "var(--text-secondary)",
  },
};

const VELOCITY_ACCENTS: Record<string, string> = {
  strong: "var(--color-success)",
  steady: "var(--color-info)",
  stalled: "var(--color-danger)",
};

export function CommandCenter({
  attentionItems,
  velocities,
  loading,
  formatTimestamp,
  onOpenVenue,
}: CommandCenterProps) {
  const top3 = attentionItems.slice(0, 3);

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Owner"
        title="Command center"
        description="Top attention items across your venues. Deal with the top 3 first."
      >
        {loading ? (
          <div className="empty-state"><p>Loading command center...</p></div>
        ) : (
          <>
            {/* Top 3 attention items */}
            {top3.length === 0 ? (
              <div className="empty-state">
                <p>No items requiring attention. All venues are operating normally.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-lg)" }}>
                {top3.map((item) => {
                  const severity = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.medium;
                  return (
                    <div
                      key={`${item.type}-${item.entity_id}`}
                      style={{
                        padding: "var(--spacing-md)",
                        borderLeft: `4px solid ${severity.accent}`,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-raised)",
                        cursor: "pointer",
                      }}
                      onClick={() => onOpenVenue(item.venue_id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xs)" }}>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                        <span
                          className="status-pill"
                          style={{
                            background: severity.badgeBackground,
                            color: severity.badgeForeground,
                            fontSize: "0.7rem",
                          }}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "var(--spacing-xs)" }}>
                        {item.detail}
                      </p>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {item.venue_name} — {formatTimestamp(item.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Remaining items */}
            {attentionItems.length > 3 ? (
              <div style={{ marginBottom: "var(--spacing-lg)" }}>
                <h4 style={{ color: "var(--text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                  More items ({attentionItems.length - 3})
                </h4>
                {attentionItems.slice(3).map((item) => (
                  <div
                    key={`${item.type}-${item.entity_id}`}
                    className="clickable-row"
                    onClick={() => onOpenVenue(item.venue_id)}
                    style={{ padding: "var(--spacing-sm) var(--spacing-md)", display: "flex", justifyContent: "space-between" }}
                  >
                    <span>{item.title} — {item.venue_name}</span>
                    <span className="text-muted">{item.severity}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Venue velocity overview */}
            {velocities.length > 0 ? (
              <div>
                <h4 style={{ color: "var(--text-secondary)", marginBottom: "var(--spacing-sm)" }}>Venue velocity</h4>
                <div className="highlight-grid">
                  {velocities.map((v) => (
                    <div
                      key={v.venue_id}
                      className="focus-card"
                      style={{
                        cursor: "pointer",
                        borderLeft: `3px solid ${VELOCITY_ACCENTS[v.velocity_label] ?? "var(--border-strong)"}`,
                      }}
                      onClick={() => onOpenVenue(v.venue_id)}
                    >
                      <div className="focus-card-value">{v.completion_percentage}%</div>
                      <div className="focus-card-label">{v.velocity_label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
