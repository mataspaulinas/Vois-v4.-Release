import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { EscalationRecord } from "../../lib/api";

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
  critical: "#EF4444", high: "#EF4444", medium: "#F59E0B", low: "#6366F1",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "#FEF2F2", high: "#FEF2F2", medium: "#FFFBEB", low: "#EEF2FF",
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

/* ── design-system tokens ───────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 },
  body: { fontSize: 15, color: "#404040", lineHeight: 1.55 },
  small: { fontSize: 13, color: "#737373" },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: 20 } as React.CSSProperties,
  accent: "#6C5CE7",
  success: "#10B981",
  btnPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnSecondary: { background: "#FFFFFF", color: "#404040", border: "1px solid #E5E5E5", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  btnSmPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnSmSecondary: { background: "#FFFFFF", color: "#404040", border: "1px solid #E5E5E5", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  pill: (bg: string, fg: string) => ({ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: bg, color: fg, textTransform: "uppercase" as const, letterSpacing: "0.03em" }) as React.CSSProperties,
  dot: (color: string) => ({ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }) as React.CSSProperties,
  metaRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F5F5", fontSize: 13 } as React.CSSProperties,
};

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
                  <p style={ds.eyebrow}>EXECUTION</p>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "4px 0 0" }}>Escalation channel</h2>
                </div>

                {/* filter tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {(["all", "open", "resolved"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={filter === f ? ds.btnSmPrimary : ds.btnSmSecondary}
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
                      const sevColor = SEVERITY_COLORS[esc.severity] ?? "#A3A3A3";
                      const sevBg = SEVERITY_BG[esc.severity] ?? "#F5F5F5";
                      const isSelected = selectedId === esc.id;

                      return (
                        <div
                          key={esc.id}
                          onClick={() => setSelectedId(isSelected ? null : esc.id)}
                          style={{
                            ...ds.card,
                            borderLeft: `4px solid ${sevColor}`,
                            background: isSelected ? "#FAFAFA" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "transform 0.15s ease, box-shadow 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={ds.dot(sevColor)} />
                            <span style={ds.pill(sevBg, sevColor)}>{esc.severity}</span>
                            <span style={ds.pill(
                              esc.status === "resolved" ? "#ECFDF5" : "#F5F5F5",
                              esc.status === "resolved" ? "#065F46" : "#525252"
                            )}>{esc.status}</span>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "#A3A3A3" }}>{ESCALATION_TYPE_LABELS[escType] ?? escType}</span>
                            <span style={{ fontSize: 13, color: "#A3A3A3", marginLeft: "auto" }}>{formatTimestamp(esc.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{esc.reason}</div>

                          {/* inline resolve */}
                          {isSelected && esc.status !== "resolved" && (
                            <div style={{ marginTop: 12, borderTop: "1px solid #F5F5F5", paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
                              <textarea
                                placeholder="Resolution notes..."
                                value={resolutionNotes[esc.id] ?? ""}
                                onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [esc.id]: e.target.value }))}
                                rows={2}
                                style={{ width: "100%", resize: "vertical", borderRadius: 8, border: "1px solid #E5E5E5", padding: 10, fontSize: 13, fontFamily: "inherit" }}
                              />
                              <button
                                style={{ ...ds.btnSmPrimary, marginTop: 8 }}
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
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 16px 0" }}>{selected.reason}</h4>
              <div style={{ marginBottom: 20 }}>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Severity</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={ds.dot(SEVERITY_COLORS[selected.severity] ?? "#A3A3A3")} />
                    {selected.severity}
                  </span>
                </div>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Type</span>
                  <span>{ESCALATION_TYPE_LABELS[inferEscalationType(selected.reason)]}</span>
                </div>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Status</span>
                  <span style={ds.pill(
                    selected.status === "resolved" ? "#ECFDF5" : "#F5F5F5",
                    selected.status === "resolved" ? "#065F46" : "#525252"
                  )}>{selected.status}</span>
                </div>
                <div style={{ ...ds.metaRow, borderBottom: "none" }}>
                  <span style={{ color: "#A3A3A3" }}>Created</span>
                  <span>{formatTimestamp(selected.created_at)}</span>
                </div>
              </div>

              {selected.resolution_notes && (
                <div style={{ marginBottom: 20, padding: 16, background: "#F0FDF4", borderRadius: 10, borderLeft: `4px solid ${ds.success}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#059669", margin: "0 0 6px" }}>Resolution</p>
                  <div style={{ fontSize: 13, color: "#0A0A0A" }}>{selected.resolution_notes}</div>
                  {selected.resolved_at && <div style={{ fontSize: 12, color: "#737373", marginTop: 6 }}>Resolved {formatTimestamp(selected.resolved_at)}</div>}
                </div>
              )}

              {onOpenPlan && (
                <button style={ds.btnSmSecondary} onClick={onOpenPlan}>Jump to blocked task in Plan</button>
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
              <div key={esc.id} style={{ padding: 16, borderLeft: `4px solid ${ds.success}`, borderRadius: 10, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{esc.reason}</div>
                <div style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>{esc.resolution_notes}</div>
                {esc.resolved_at && <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 4 }}>Resolved {formatTimestamp(esc.resolved_at)}</div>}
              </div>
            ))
          ) : (
            <p style={{ color: "#A3A3A3", fontSize: 13 }}>No resolved escalations yet.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}
