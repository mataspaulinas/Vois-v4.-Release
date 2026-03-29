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
  critical: "var(--color-danger)", high: "var(--color-danger)", medium: "var(--color-warning)", low: "var(--color-info)",
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
    <div className="page-layout">
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
      <div className="page-layout__body">
        <PrimaryCanvas>
          {loading ? (
            <LoadingState variant="list" />
          ) : (
            <>
              {/* Filter tabs */}
              <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
                {(["all", "open", "resolved"] as const).map((f) => (
                  <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)}>
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
                <div>
                  {filtered.map((esc) => {
                    const escType = inferEscalationType(esc.reason);
                    return (
                      <div
                        key={esc.id}
                        style={{
                          padding: "var(--spacing-md)",
                          borderLeft: `4px solid ${SEVERITY_COLORS[esc.severity] ?? "var(--color-text-muted)"}`,
                          marginBottom: "var(--spacing-sm)",
                          borderRadius: "var(--radius-sm)",
                          background: selectedId === esc.id ? "var(--color-bg-muted)" : "var(--color-surface)",
                          cursor: "pointer",
                          transition: "background var(--motion-fast)",
                        }}
                        onClick={() => setSelectedId(selectedId === esc.id ? null : esc.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-4)" }}>
                          <span className="status-pill" style={{ background: SEVERITY_COLORS[esc.severity], color: "white", fontSize: 10 }}>{esc.severity}</span>
                          <span className="status-pill" style={{ background: esc.status === "resolved" ? "var(--color-success)" : "var(--color-bg-muted)", color: esc.status === "resolved" ? "white" : "var(--color-text-secondary)", fontSize: 10 }}>{esc.status}</span>
                          <span style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 500 }}>{ESCALATION_TYPE_LABELS[escType] ?? escType}</span>
                          <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginLeft: "auto" }}>{formatTimestamp(esc.created_at)}</span>
                        </div>
                        <div style={{ fontWeight: 500 }}>{esc.reason}</div>

                        {/* Inline resolve for open escalations */}
                        {selectedId === esc.id && esc.status !== "resolved" && (
                          <div style={{ marginTop: "var(--spacing-sm)" }} onClick={(e) => e.stopPropagation()}>
                            <textarea
                              placeholder="Resolution notes..."
                              value={resolutionNotes[esc.id] ?? ""}
                              onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [esc.id]: e.target.value }))}
                              rows={2}
                              style={{ width: "100%", resize: "vertical" }}
                              className="input-text"
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ marginTop: "var(--spacing-xs)" }}
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

        {/* Inspector: escalation context */}
        <ContextInspector open={selected !== null} title="Escalation detail" onClose={() => setSelectedId(null)}>
          {selected && (
            <div style={{ fontSize: "var(--text-small)" }}>
              <h4 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{selected.reason}</h4>
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Severity</span><span>{selected.severity}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Type</span><span>{ESCALATION_TYPE_LABELS[inferEscalationType(selected.reason)]}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Status</span><span>{selected.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Created</span><span>{formatTimestamp(selected.created_at)}</span>
                </div>
              </div>

              {selected.resolution_notes && (
                <div style={{ marginBottom: "var(--spacing-md)", padding: "var(--spacing-sm)", background: "var(--color-bg-muted)", borderRadius: "var(--radius-sm)" }}>
                  <h4 style={{ fontSize: "var(--text-small)", marginBottom: "var(--spacing-4)" }}>Resolution</h4>
                  <div>{selected.resolution_notes}</div>
                  {selected.resolved_at && <div style={{ color: "var(--color-text-muted)", marginTop: "var(--spacing-4)" }}>Resolved {formatTimestamp(selected.resolved_at)}</div>}
                </div>
              )}

              {onOpenPlan && (
                <button className="btn btn-secondary btn-sm" onClick={onOpenPlan}>Jump to blocked task in Plan</button>
              )}
            </div>
          )}
        </ContextInspector>
      </div>

      {/* Drawer: resolution history */}
      <DeepDrawer open={drawerOpen} title="Resolution history" onClose={() => setDrawerOpen(false)}>
        <div>
          {escalations.filter((e) => e.status === "resolved").length > 0 ? (
            escalations.filter((e) => e.status === "resolved").map((esc) => (
              <div key={esc.id} style={{ padding: "var(--spacing-sm)", borderLeft: "3px solid var(--color-success)", marginBottom: "var(--spacing-xs)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontWeight: 500 }}>{esc.reason}</div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{esc.resolution_notes}</div>
                {esc.resolved_at && <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Resolved {formatTimestamp(esc.resolved_at)}</div>}
              </div>
            ))
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>No resolved escalations yet.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}
