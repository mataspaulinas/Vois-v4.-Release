import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { EscalationRecord } from "../../lib/api";

type EscalationChannelProps = {
  escalations: EscalationRecord[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onResolveEscalation: (escalationId: string, resolutionNotes: string) => void;
  onCreateEscalation: () => void;
  resolvingEscalationId: string | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--sunrise)",
  high: "var(--sunrise)",
  medium: "var(--gold)",
  low: "var(--sky)",
};

export function EscalationChannel({
  escalations,
  loading,
  formatTimestamp,
  onResolveEscalation,
  onCreateEscalation,
  resolvingEscalationId,
}: EscalationChannelProps) {
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const openCount = escalations.filter((e) => e.status === "open" || e.status === "acknowledged").length;
  const resolvedCount = escalations.filter((e) => e.status === "resolved").length;

  const filtered = escalations.filter((e) => {
    if (filter === "open") return e.status !== "resolved";
    if (filter === "resolved") return e.status === "resolved";
    return true;
  });

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Escalations"
        title="Escalation channel"
        description="Categorized escalations to owner. Resolve or raise new issues."
        actions={
          <button className="btn btn-primary" onClick={onCreateEscalation}>
            Raise escalation
          </button>
        }
      >
        {loading ? (
          <div className="empty-state"><p>Loading escalations...</p></div>
        ) : (
          <>
            <div className="highlight-grid">
              <div className="focus-card" style={{ borderLeft: openCount > 0 ? "3px solid var(--sunrise)" : undefined }}>
                <div className="focus-card-value">{openCount}</div>
                <div className="focus-card-label">Open</div>
              </div>
              <div className="focus-card">
                <div className="focus-card-value">{resolvedCount}</div>
                <div className="focus-card-label">Resolved</div>
              </div>
              <div className="focus-card">
                <div className="focus-card-value">{escalations.length}</div>
                <div className="focus-card-label">Total</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--spacing-xs)", marginTop: "var(--spacing-md)", marginBottom: "var(--spacing-md)" }}>
              {(["all", "open", "resolved"] as const).map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <p>No escalations{filter !== "all" ? ` with status "${filter}"` : ""}.</p>
              </div>
            ) : (
              <div>
                {filtered.map((esc) => (
                  <div
                    key={esc.id}
                    style={{
                      padding: "var(--spacing-md)",
                      borderLeft: `3px solid ${SEVERITY_COLORS[esc.severity] ?? "var(--muted)"}`,
                      marginBottom: "var(--spacing-sm)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-raised)",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedId(expandedId === esc.id ? null : esc.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                      <span
                        className="status-pill"
                        style={{ background: SEVERITY_COLORS[esc.severity], color: "white", fontSize: "0.7rem" }}
                      >
                        {esc.severity}
                      </span>
                      <span
                        className="status-pill"
                        style={{ background: esc.status === "resolved" ? "var(--leaf)" : "var(--muted)", color: "white", fontSize: "0.7rem" }}
                      >
                        {esc.status}
                      </span>
                      <span style={{ fontWeight: 500, flex: 1 }}>{esc.reason}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatTimestamp(esc.created_at)}</span>
                    </div>

                    {expandedId === esc.id ? (
                      <div style={{ marginTop: "var(--spacing-sm)" }} onClick={(e) => e.stopPropagation()}>
                        {esc.resolution_notes ? (
                          <div style={{ padding: "var(--spacing-sm)", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", marginBottom: "var(--spacing-sm)" }}>
                            <div style={{ fontWeight: 500, fontSize: "0.8rem", marginBottom: 4 }}>Resolution</div>
                            <div style={{ fontSize: "0.85rem" }}>{esc.resolution_notes}</div>
                            {esc.resolved_at ? (
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                                Resolved {formatTimestamp(esc.resolved_at)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {esc.status !== "resolved" ? (
                          <div style={{ display: "flex", gap: "var(--spacing-xs)", alignItems: "flex-end" }}>
                            <textarea
                              placeholder="Resolution notes..."
                              value={resolutionNotes[esc.id] ?? ""}
                              onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [esc.id]: e.target.value }))}
                              rows={2}
                              style={{ flex: 1, resize: "vertical" }}
                              className="input-text"
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!resolutionNotes[esc.id]?.trim() || resolvingEscalationId === esc.id}
                              onClick={() => {
                                const notes = resolutionNotes[esc.id]?.trim();
                                if (notes) onResolveEscalation(esc.id, notes);
                              }}
                            >
                              {resolvingEscalationId === esc.id ? "Resolving..." : "Resolve"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
