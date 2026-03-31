import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { EscalationRecord } from "../../lib/api";
import { ds, statusDot } from "../../styles/tokens";

type EscalationChannelProps = {
  escalations: EscalationRecord[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onResolveEscalation: (escalationId: string, resolutionNotes: string) => void;
  onCreateEscalation: () => void;
  resolvingEscalationId: string | null;
  onOpenPlan?: () => void;
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--color-danger)", high: "var(--color-danger)", medium: "var(--color-warning)", low: "var(--color-info)",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "var(--color-danger-soft)", high: "var(--color-danger-soft)", medium: "var(--color-warning-soft)", low: "var(--color-accent-soft)",
};

const ESCALATION_TYPE_LABELS: Record<string, string> = {
  owner_decision: "Owner decision required",
  resource_gap: "Resource gap",
  quality_concern: "Quality concern",
  structural: "Structural clarity needed",
  team_concern: "Team concern",
};

function inferEscalationType(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("decision") || r.includes("budget") || r.includes("approve")) return "owner_decision";
  if (r.includes("resource") || r.includes("staff") || r.includes("capacity")) return "resource_gap";
  if (r.includes("quality") || r.includes("standard")) return "quality_concern";
  if (r.includes("team") || r.includes("morale") || r.includes("conflict")) return "team_concern";
  return "structural";
}

/* ── file-specific helpers ───────────────────────────────────── */
const pillBadge = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", fontSize: "var(--text-eyebrow)", fontWeight: 600,
  padding: "3px 8px", borderRadius: 10, background: bg, color: fg,
  textTransform: "uppercase", letterSpacing: "0.03em",
});

export function EscalationChannel({
  escalations, loading, formatTimestamp, onResolveEscalation, onCreateEscalation, resolvingEscalationId, onOpenPlan,
}: EscalationChannelProps) {
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const openCount = escalations.filter((e) => e.status === "open" || e.status === "acknowledged").length;
  const selected = escalations.find((e) => e.id === selectedId) ?? null;

  const filtered = escalations.filter((e) => {
    if (filter === "open") return e.status !== "resolved";
    if (filter === "resolved") return e.status === "resolved";
    return true;
  });

  return (
    <div style={{ padding: 48 }}>
      <SurfaceHeader
        title="Escalations"
        subtitle={openCount > 0 ? `${openCount} open — blocked truth needs resolution` : "All resolved"}
        status={openCount > 0 ? `${openCount} open` : undefined}
        statusTone={openCount > 0 ? "danger" : "neutral"}
        primaryAction={{ label: "Raise escalation", onClick: onCreateEscalation }}
        moreActions={[
          ...(onOpenPlan ? [{ label: "Back to Plan", onClick: onOpenPlan }] : []),
          { label: "View resolution history", onClick: () => setDrawerOpen(true) },
        ]}
      />

      <div style={{ display: "flex", gap: 24, marginTop: 32 }}>
        {/* ── main column ────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <PrimaryCanvas>
            {loading ? (
              <LoadingState variant="list" />
            ) : (
              <>
                {/* eyebrow + title */}
                <div style={{ marginBottom: 24 }}>
                  <p className="eyebrow">EXECUTION</p>
                  <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", margin: "4px 0 0" }}>Escalation channel</h2>
                </div>

                {/* filter tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {(["all", "open", "resolved"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={filter === f ? "btn btn-sm btn-primary" : "btn btn-sm btn-secondary"}
                    >
                      {f === "all" ? `All (${escalations.length})` : f === "open" ? `Open (${openCount})` : `Resolved (${escalations.length - openCount})`}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <EmptyState
                    title={filter === "all" ? "No escalations" : `No ${filter} escalations`}
                    description={filter === "all" ? "Nothing has been escalated. The team is handling issues at their level." : "Try a different filter."}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map((esc) => {
                      const escType = inferEscalationType(esc.reason);
                      const sevColor = SEVERITY_COLORS[esc.severity] ?? "var(--color-text-muted)";
                      const sevBg = SEVERITY_BG[esc.severity] ?? "var(--color-surface-subtle)";
                      const isSelected = selectedId === esc.id;

                      return (
                        <div
                          key={esc.id}
                          onClick={() => setSelectedId(isSelected ? null : esc.id)}
                          className="ui-card"
                          style={{
                            borderLeft: `4px solid ${sevColor}`,
                            background: isSelected ? "var(--color-surface-subtle)" : "var(--color-surface)",
                            cursor: "pointer",
                            transition: "transform 0.15s ease, box-shadow 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={statusDot(sevColor)} />
                            <span style={pillBadge(sevBg, sevColor)}>{esc.severity}</span>
                            <span style={pillBadge(
                              esc.status === "resolved" ? "var(--color-success-soft)" : "var(--color-surface-subtle)",
                              esc.status === "resolved" ? "var(--color-success)" : "var(--color-text-secondary)"
                            )}>{esc.status}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-muted)" }}>{ESCALATION_TYPE_LABELS[escType] ?? escType}</span>
                            <span style={{ fontSize: 13, color: "var(--color-text-muted)", marginLeft: "auto" }}>{formatTimestamp(esc.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{esc.reason}</div>

                          {/* inline resolve */}
                          {isSelected && esc.status !== "resolved" && (
                            <div style={{ marginTop: 12, borderTop: "1px solid var(--color-surface-subtle)", paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
                              <textarea
                                placeholder="Resolution notes..."
                                value={resolutionNotes[esc.id] ?? ""}
                                onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [esc.id]: e.target.value }))}
                                rows={2}
                                style={{ width: "100%", resize: "vertical", borderRadius: 8, border: "1px solid var(--color-border-subtle)", padding: 10, fontSize: "var(--text-small)", fontFamily: "inherit" }}
                              />
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ marginTop: 8 }}
                                disabled={!resolutionNotes[esc.id]?.trim() || resolvingEscalationId === esc.id}
                                onClick={() => { const notes = resolutionNotes[esc.id]?.trim(); if (notes) onResolveEscalation(esc.id, notes); }}
                              >
                                {resolvingEscalationId === esc.id ? "Resolving..." : "Resolve"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </PrimaryCanvas>
        </div>

        {/* ── inspector ──────────────────────────────────── */}
        <ContextInspector open={selected !== null} title="Escalation detail" onClose={() => setSelectedId(null)}>
          {selected && (
            <div style={{ fontSize: 13 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px 0" }}>{selected.reason}</h4>
              <div style={{ marginBottom: 20 }}>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Severity</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={statusDot(SEVERITY_COLORS[selected.severity] ?? "var(--color-text-muted)")} />
                    {selected.severity}
                  </span>
                </div>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Type</span>
                  <span>{ESCALATION_TYPE_LABELS[inferEscalationType(selected.reason)]}</span>
                </div>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Status</span>
                  <span style={pillBadge(
                    selected.status === "resolved" ? "var(--color-success-soft)" : "var(--color-surface-subtle)",
                    selected.status === "resolved" ? "var(--color-success)" : "var(--color-text-secondary)"
                  )}>{selected.status}</span>
                </div>
                <div className="kv-row" style={{ borderBottom: "none" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Created</span>
                  <span>{formatTimestamp(selected.created_at)}</span>
                </div>
              </div>

              {selected.resolution_notes && (
                <div style={{ marginBottom: 20, padding: 16, background: "var(--color-success-soft)", borderRadius: 10, borderLeft: `4px solid ${ds.success}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-success)", margin: "0 0 6px" }}>Resolution</p>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{selected.resolution_notes}</div>
                  {selected.resolved_at && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>Resolved {formatTimestamp(selected.resolved_at)}</div>}
                </div>
              )}

              {onOpenPlan && (
                <button className="btn btn-sm btn-secondary" onClick={onOpenPlan}>Jump to blocked task in Plan</button>
              )}
            </div>
          )}
        </ContextInspector>
      </div>

      {/* ── drawer: resolution history ───────────────────── */}
      <DeepDrawer open={drawerOpen} title="Resolution history" onClose={() => setDrawerOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {escalations.filter((e) => e.status === "resolved").length > 0 ? (
            escalations.filter((e) => e.status === "resolved").map((esc) => (
              <div key={esc.id} style={{ padding: 16, borderLeft: `4px solid ${ds.success}`, borderRadius: 10, background: "var(--color-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{esc.reason}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>{esc.resolution_notes}</div>
                {esc.resolved_at && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>Resolved {formatTimestamp(esc.resolved_at)}</div>}
              </div>
            ))
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No resolved escalations yet.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}
