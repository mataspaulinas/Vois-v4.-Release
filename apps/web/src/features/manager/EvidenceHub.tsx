import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { EvidenceRecord, PlanRecord } from "../../lib/api";
import { Select } from "../../components/ui/Select";
import { ds, statusDot } from "../../styles/tokens";

type EvidenceHubProps = {
  evidence: EvidenceRecord[];
  plan: PlanRecord | null;
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onCreateEvidence: (taskId: string | undefined) => void;
  onOpenWorkspace?: (taskId: string) => void;
};

const TYPE_LABELS: Record<string, string> = {
  photo: "Photo", observation: "Observation", document: "Document", checklist: "Checklist", metric: "Metric",
};

const TYPE_ICONS: Record<string, string> = {
  photo: "camera", observation: "eye", document: "file", checklist: "check-square", metric: "bar-chart",
};

const TRUST_SCORES: Record<string, number> = {
  metric: 90, photo: 80, checklist: 70, document: 60, observation: 40,
};

function trustColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 50) return "var(--color-warning)";
  return "var(--color-text-muted)";
}

function trustBg(score: number): string {
  if (score >= 70) return "var(--color-success-soft)";
  if (score >= 50) return "var(--color-warning-soft)";
  return "var(--color-surface-subtle)";
}

function trustLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 50) return "Adequate";
  return "Weak";
}

/* ── file-specific helpers ───────────────────────────────────── */
const pillBadge = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", fontSize: "var(--text-eyebrow)", fontWeight: 600,
  padding: "3px 8px", borderRadius: 10, background: bg, color: fg,
  textTransform: "uppercase", letterSpacing: "0.03em",
});
const selectLocal: React.CSSProperties = {
  borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-subtle)",
  padding: "8px 12px", fontSize: "var(--text-small)", background: "var(--bg-input)",
  color: "var(--color-text-secondary)", cursor: "pointer",
};

export function EvidenceHub({ evidence, plan, loading, formatTimestamp, onCreateEvidence, onOpenWorkspace }: EvidenceHubProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTaskId, setFilterTaskId] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const types = [...new Set(evidence.map((e) => e.evidence_type))];
  const tasks = plan?.tasks ?? [];
  const taskLookup = new Map(tasks.map((t) => [t.id, t.title]));

  const filtered = evidence.filter((ev) => {
    if (filterType !== "all" && ev.evidence_type !== filterType) return false;
    if (filterTaskId !== "all" && ev.task_id !== filterTaskId) return false;
    return true;
  });

  const selected = evidence.find((e) => e.id === selectedId) ?? null;
  const selectedTrustScore = selected ? (TRUST_SCORES[selected.evidence_type] ?? 50) + (selected.task_id ? 10 : 0) + (selected.description ? 5 : 0) : 0;

  return (
    <div style={{ padding: 48 }}>
      <SurfaceHeader
        title="Evidence"
        subtitle={`${evidence.length} item${evidence.length !== 1 ? "s" : ""} documented`}
        primaryAction={{ label: "Add evidence", onClick: () => onCreateEvidence(undefined) }}
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
                  <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", margin: "4px 0 0" }}>Evidence hub</h2>
                </div>

                {/* filters */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  <Select
                    value={filterType}
                    onChange={(v) => setFilterType(v)}
                    options={[
                      { value: "all", label: "All types" },
                      ...types.map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t })),
                    ]}
                  />
                  <Select
                    value={filterTaskId}
                    onChange={(v) => setFilterTaskId(v)}
                    options={[
                      { value: "all", label: "All tasks" },
                      ...tasks.map((t) => ({ value: t.id, label: t.title })),
                    ]}
                  />
                </div>

                {filtered.length === 0 ? (
                  <EmptyState
                    title="No evidence yet"
                    description="Attach photos, observations, or documents to tasks to build a trust trail."
                    actionLabel="Add evidence"
                    onAction={() => onCreateEvidence(undefined)}
                  />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                    {filtered.map((ev) => {
                      const score = (TRUST_SCORES[ev.evidence_type] ?? 50) + (ev.task_id ? 10 : 0) + (ev.description ? 5 : 0);
                      const isSelected = selectedId === ev.id;

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedId(ev.id)}
                          className="ui-card"
                          style={{
                            borderLeft: `4px solid ${trustColor(score)}`,
                            background: isSelected ? "var(--color-surface-subtle)" : "var(--color-surface)",
                            cursor: "pointer",
                            transition: "transform 0.15s ease, box-shadow 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                        >
                          {/* header row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <span style={statusDot(trustColor(score))} />
                            <span style={pillBadge(trustBg(score), trustColor(score))}>
                              {trustLabel(score)}
                            </span>
                            <span style={pillBadge("var(--color-surface-subtle)", "var(--color-text-secondary)")}>
                              {TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "auto" }}>
                              {formatTimestamp(ev.created_at)}
                            </span>
                          </div>

                          {/* title */}
                          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>{ev.title}</div>

                          {/* description */}
                          {ev.description && (
                            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4 }}>{ev.description}</div>
                          )}

                          {/* task link */}
                          {ev.task_id && (
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={statusDot(ds.accent)} />
                              Task: {taskLookup.get(ev.task_id) ?? ev.task_id}
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
        <ContextInspector open={selected !== null} title="Evidence detail" onClose={() => setSelectedId(null)}>
          {selected && (
            <div style={{ fontSize: 13 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px 0" }}>{selected.title}</h4>
              {selected.description && <p style={{ color: "var(--color-text-muted)", margin: "0 0 20px 0", fontSize: 13, lineHeight: 1.5 }}>{selected.description}</p>}

              {/* metadata rows */}
              <div style={{ marginBottom: 20 }}>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Type</span>
                  <span>{TYPE_LABELS[selected.evidence_type] ?? selected.evidence_type}</span>
                </div>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Trust score</span>
                  <span style={{ color: trustColor(selectedTrustScore), fontWeight: 600 }}>
                    {selectedTrustScore}/100
                    <span style={{ fontWeight: 400, marginLeft: 4 }}>({trustLabel(selectedTrustScore)})</span>
                  </span>
                </div>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Verification</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={statusDot(selectedTrustScore >= 70 ? ds.success : selectedTrustScore >= 50 ? ds.warning : "var(--color-text-muted)")} />
                    {selectedTrustScore >= 70 ? "Verified" : selectedTrustScore >= 50 ? "Partial" : "Unverified"}
                  </span>
                </div>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)" }}>Linked to task</span>
                  <span>{selected.task_id ? "Yes" : "No"}</span>
                </div>
                <div className="kv-row" style={{ borderBottom: "none" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Created</span>
                  <span>{formatTimestamp(selected.created_at)}</span>
                </div>
              </div>

              {/* supports section */}
              {selected.task_id && (
                <div style={{ marginBottom: 20, padding: 14, background: "var(--color-accent-soft)", borderRadius: 10, borderLeft: `4px solid ${ds.accent}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: ds.accent, margin: "0 0 4px" }}>Supports</p>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{taskLookup.get(selected.task_id) ?? selected.task_id}</div>
                </div>
              )}

              {/* actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.task_id && onOpenWorkspace && (
                  <button className="btn btn-sm btn-secondary" onClick={() => onOpenWorkspace(selected.task_id!)}>Jump to task workspace</button>
                )}
              </div>
            </div>
          )}
        </ContextInspector>
      </div>
    </div>
  );
}
