import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import Icon from "../../components/Icon";
import { LoadingState } from "../../components/LoadingState";
import { AttentionItem, ExecutionVelocity } from "../../lib/api";

type CommandCenterProps = {
  attentionItems: AttentionItem[];
  velocities: ExecutionVelocity[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onOpenVenue: (venueId: string) => void;
  onAskCopilot?: (context: string) => void;
};

const SEVERITY_STYLES: Record<string, { accent: string; badgeBackground: string; badgeForeground: string }> = {
  critical: {
    accent: "var(--color-danger)",
    badgeBackground: "var(--color-danger-soft)",
    badgeForeground: "var(--color-danger)",
  },
  high: {
    accent: "var(--color-warning)",
    badgeBackground: "var(--color-warning-soft)",
    badgeForeground: "var(--color-warning)",
  },
  medium: {
    accent: "var(--color-info)",
    badgeBackground: "var(--color-accent-soft)",
    badgeForeground: "var(--color-info)",
  },
  low: {
    accent: "var(--color-text-muted)",
    badgeBackground: "var(--color-surface-subtle)",
    badgeForeground: "var(--color-text-secondary)",
  },
};

const VELOCITY_ACCENTS: Record<string, string> = {
  strong: "var(--color-success)",
  steady: "var(--color-info)",
  stalled: "var(--color-danger)",
};

const SEVERITY_ORDER = ["all", "critical", "high", "medium", "low"] as const;

export function CommandCenter({
  attentionItems,
  velocities,
  loading,
  formatTimestamp,
  onOpenVenue,
  onAskCopilot,
}: CommandCenterProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filteredItems = severityFilter === "all"
    ? attentionItems
    : attentionItems.filter((i) => i.severity === severityFilter);
  const top3 = filteredItems.slice(0, 3);

  const criticalCount = attentionItems.filter((i) => i.severity === "critical").length;
  const highCount = attentionItems.filter((i) => i.severity === "high").length;
  const mediumCount = attentionItems.filter((i) => i.severity === "medium").length;
  const lowCount = attentionItems.filter((i) => i.severity === "low").length;

  return (
    <div className="view-stack">
      <SurfaceHeader
        title="Command"
        subtitle={`${attentionItems.length} attention item${attentionItems.length !== 1 ? "s" : ""} across your venues`}
        status={criticalCount > 0 ? "Critical" : undefined}
        statusTone="danger"
        moreActions={[
          { label: "View delegation health", onClick: () => setDrawerOpen(true) },
          { label: "View all escalations", onClick: () => setDrawerOpen(true) },
        ]}
      />
      <PrimaryCanvas>
        {/* Page title with eyebrow */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: "var(--text-eyebrow)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "var(--color-text-muted)",
            marginBottom: 6,
          }}>
            Organization
          </div>
          <div style={{
            fontSize: "var(--text-page)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}>
            Command Center
          </div>
        </div>

        {/* Metric summary cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          {[
            { value: attentionItems.length, label: "Total Items", color: "var(--color-accent)" },
            { value: criticalCount, label: "Critical", color: "var(--color-danger)" },
            { value: highCount, label: "High", color: "var(--color-warning)" },
            { value: velocities.length, label: "Venues", color: "var(--color-info)" },
          ].map((metric) => (
            <div
              key={metric.label}
              style={{
                background: "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{
                fontSize: 36,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: metric.color,
                lineHeight: 1.1,
              }}>
                {metric.value}
              </div>
              <div style={{
                fontSize: "var(--text-small)",
                color: "var(--color-text-muted)",
                fontWeight: 500,
                textTransform: "uppercase" as const,
                letterSpacing: "0.04em",
              }}>
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        <SectionCard
          eyebrow="Owner"
          title="Command center"
          description="Top attention items across your venues. Deal with the top 3 first."
        >
          {loading ? (
            <LoadingState variant="list" />
          ) : (
            <>
              {/* Severity filter pills */}
              <div style={{
                display: "flex",
                gap: 8,
                marginBottom: 24,
                flexWrap: "wrap",
              }}>
                {SEVERITY_ORDER.map((sev) => {
                  const isActive = severityFilter === sev;
                  const pillColor = sev === "all" ? "var(--color-accent)"
                    : sev === "critical" ? "var(--color-danger)"
                    : sev === "high" ? "var(--color-warning)"
                    : sev === "medium" ? "var(--color-info)"
                    : "var(--color-text-muted)";
                  return (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "var(--radius-full)",
                        border: isActive ? "none" : "1px solid var(--color-border-subtle)",
                        background: isActive ? pillColor : "var(--color-surface)",
                        color: isActive ? "var(--color-surface)" : "var(--color-text-secondary)",
                        fontSize: "var(--text-small)",
                        fontWeight: 500,
                        cursor: "pointer",
                        textTransform: "capitalize" as const,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {sev === "all" ? "All" : sev}
                    </button>
                  );
                })}
              </div>

              {/* Section heading: Attention items with count */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}>
                <h3 style={{
                  fontSize: "var(--text-section)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: 0,
                }}>
                  Attention Items
                </h3>
                <span style={{
                  fontSize: "var(--text-small)",
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  background: "var(--color-accent-soft)",
                  borderRadius: "var(--radius-full)",
                  padding: "2px 10px",
                  lineHeight: "20px",
                }}>
                  {filteredItems.length}
                </span>
              </div>

              {/* Top 3 attention items */}
              {top3.length === 0 ? (
                <div className="empty-state">
                  <p>No items requiring attention. All venues are operating normally.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {top3.map((item) => {
                    const severity = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.medium;
                    return (
                      <div
                        key={`${item.type}-${item.entity_id}`}
                        style={{
                          padding: "16px 20px",
                          borderLeft: `4px solid ${severity.accent}`,
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-surface)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          cursor: "pointer",
                          transition: "box-shadow 0.15s ease",
                        }}
                        onClick={() => onOpenVenue(item.venue_id)}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                        }}
                      >
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {/* Status dot */}
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: severity.accent,
                              flexShrink: 0,
                            }} />
                            <span style={{
                              fontWeight: 600,
                              fontSize: "var(--text-body)",
                              color: "var(--color-text-primary)",
                            }}>
                              {item.title}
                            </span>
                          </div>
                          <span style={{
                            background: severity.badgeBackground,
                            color: severity.badgeForeground,
                            fontSize: "var(--text-eyebrow)",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                            textTransform: "capitalize" as const,
                            letterSpacing: "0.02em",
                          }}>
                            {item.severity}
                          </span>
                        </div>
                        <p style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-small)",
                          margin: "0 0 8px 16px",
                          lineHeight: 1.5,
                        }}>
                          {item.detail}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16 }}>
                          <span style={{
                            fontSize: "var(--text-eyebrow)",
                            color: "var(--color-text-muted)",
                            fontWeight: 500,
                          }}>
                            {item.venue_name} — {formatTimestamp(item.created_at)}
                          </span>
                          {onAskCopilot && (
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--color-accent)",
                                fontSize: "var(--text-small)",
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-sm)",
                                transition: "background 180ms ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(108,92,231,0.06)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskCopilot(`Attention item: "${item.title}" — Severity: ${item.severity}, Venue: ${item.venue_name}${item.detail ? `, Detail: ${item.detail}` : ""}`);
                              }}
                              aria-label="Ask Copilot"
                              title="Ask Copilot"
                            >
                              <Icon name="copilot" size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Remaining items */}
              {filteredItems.length > 3 ? (
                <div style={{ marginBottom: 32 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}>
                    <h4 style={{
                      fontSize: "var(--text-body)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}>
                      More items
                    </h4>
                    <span style={{
                      fontSize: "var(--text-eyebrow)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      background: "var(--color-surface-subtle)",
                      borderRadius: "var(--radius-full)",
                      padding: "2px 8px",
                    }}>
                      {filteredItems.length - 3}
                    </span>
                  </div>
                  <div style={{
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                  }}>
                    {filteredItems.slice(3).map((item, idx) => {
                      const severity = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.medium;
                      return (
                        <div
                          key={`${item.type}-${item.entity_id}`}
                          onClick={() => onOpenVenue(item.venue_id)}
                          style={{
                            padding: "12px 20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            borderBottom: idx < filteredItems.length - 4 ? "1px solid var(--color-surface-subtle)" : "none",
                            transition: "background 0.1s ease",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-subtle)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: severity.accent,
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-primary)" }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: "var(--text-eyebrow)", color: "var(--color-text-muted)" }}>
                              — {item.venue_name}
                            </span>
                          </div>
                          <span style={{
                            fontSize: "var(--text-eyebrow)",
                            fontWeight: 600,
                            color: severity.badgeForeground,
                            textTransform: "capitalize" as const,
                          }}>
                            {item.severity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Venue velocity overview */}
              {velocities.length > 0 ? (
                <div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}>
                    <h3 style={{
                      fontSize: "var(--text-section)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                      margin: 0,
                    }}>
                      Venue Pulse
                    </h3>
                    <span style={{
                      fontSize: "var(--text-small)",
                      fontWeight: 600,
                      color: "var(--color-accent)",
                      background: "var(--color-accent-soft)",
                      borderRadius: "var(--radius-full)",
                      padding: "2px 10px",
                      lineHeight: "20px",
                    }}>
                      {velocities.length}
                    </span>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: 16,
                  }}>
                    {velocities.map((v) => {
                      const accentColor = VELOCITY_ACCENTS[v.velocity_label] ?? "var(--color-text-muted)";
                      const pct = v.completion_percentage ?? 0;
                      return (
                        <div
                          key={v.venue_id}
                          style={{
                            background: "var(--color-surface)",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            padding: "20px 24px",
                            cursor: "pointer",
                            transition: "box-shadow 0.15s ease",
                          }}
                          onClick={() => onOpenVenue(v.venue_id)}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                          }}
                        >
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginBottom: 12,
                          }}>
                            <div style={{
                              fontSize: 36,
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: accentColor,
                              lineHeight: 1,
                            }}>
                              {pct}%
                            </div>
                            <span style={{
                              fontSize: "var(--text-eyebrow)",
                              fontWeight: 600,
                              textTransform: "capitalize" as const,
                              color: accentColor,
                              letterSpacing: "0.02em",
                            }}>
                              {v.velocity_label}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{
                            width: "100%",
                            height: 6,
                            background: "var(--color-surface-subtle)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${Math.min(pct, 100)}%`,
                              height: "100%",
                              background: accentColor,
                              borderRadius: 3,
                              transition: "width 0.4s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </SectionCard>
      </PrimaryCanvas>

      {/* Inspector: selected venue pressure context */}
      <ContextInspector
        open={selectedVenueId !== null}
        title="Venue pressure"
        onClose={() => setSelectedVenueId(null)}
      >
        {selectedVenueId && (() => {
          const items = attentionItems.filter((i) => i.venue_id === selectedVenueId);
          const venueVelocity = velocities.find((v) => v.venue_id === selectedVenueId);
          return (
            <div style={{ fontSize: "var(--text-small)" }}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: "var(--text-small)", marginBottom: 6, color: "var(--color-text-secondary)", fontWeight: 600 }}>Attention items</h4>
                <div style={{ color: "var(--color-text-primary)" }}>{items.length} item{items.length !== 1 ? "s" : ""}</div>
              </div>
              {venueVelocity && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: "var(--text-small)", marginBottom: 6, color: "var(--color-text-secondary)", fontWeight: 600 }}>Velocity</h4>
                  <div style={{ color: "var(--color-text-primary)" }}>{venueVelocity.completion_percentage?.toFixed(0) ?? 0}% complete · {venueVelocity.velocity_label}</div>
                </div>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => onOpenVenue(selectedVenueId)}>Open venue</button>
            </div>
          );
        })()}
      </ContextInspector>

      {/* Drawer: delegation + escalation depth */}
      <DeepDrawer open={drawerOpen} title="Delegation and escalation depth" onClose={() => setDrawerOpen(false)}>
        <div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
            Delegation health, escalation thread history, and cross-venue trend data.
          </p>
        </div>
      </DeepDrawer>
    </div>
  );
}
