import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { EvidenceRecord, PlanRecord } from "../../lib/api";

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
  if (score >= 70) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#A3A3A3";
}

function trustBg(score: number): string {
  if (score >= 70) return "#ECFDF5";
  if (score >= 50) return "#FFFBEB";
  return "#F5F5F5";
}

function trustLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 50) return "Adequate";
  return "Weak";
}

/* ── design-system tokens ───────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 },
  sectionHeading: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 12px 0" },
  body: { fontSize: 15, color: "#404040", lineHeight: 1.55 },
  small: { fontSize: 13, color: "#737373" },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: 20 } as React.CSSProperties,
  accent: "#6C5CE7",
  success: "#10B981",
  btnPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnSmSecondary: { background: "#FFFFFF", color: "#404040", border: "1px solid #E5E5E5", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  pill: (bg: string, fg: string) => ({ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: bg, color: fg, textTransform: "uppercase" as const, letterSpacing: "0.03em" }) as React.CSSProperties,
  dot: (color: string) => ({ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }) as React.CSSProperties,
  metaRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F5F5", fontSize: 13 } as React.CSSProperties,
  select: { borderRadius: 8, border: "1px solid #E5E5E5", padding: "8px 12px", fontSize: 13, background: "#FFFFFF", color: "#404040", cursor: "pointer" } as React.CSSProperties,
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
                  <p style={ds.eyebrow}>EXECUTION</p>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "4px 0 0" }}>Evidence hub</h2>
                </div>

                {/* filters */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={ds.select}>
                    <option value="all">All types</option>
                    {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                  </select>
                  <select value={filterTaskId} onChange={(e) => setFilterTaskId(e.target.value)} style={ds.select}>
                    <option value="all">All tasks</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
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
                          style={{
                            ...ds.card,
                            borderLeft: `4px solid ${trustColor(score)}`,
                            background: isSelected ? "#FAFAFA" : "#FFFFFF",
                            cursor: "pointer",
                            transition: "transform 0.15s ease, box-shadow 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                        >
                          {/* header row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <span style={ds.dot(trustColor(score))} />
                            <span style={ds.pill(trustBg(score), trustColor(score))}>
                              {trustLabel(score)}
                            </span>
                            <span style={ds.pill("#F5F5F5", "#525252")}>
                              {TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
                            </span>
                            <span style={{ fontSize: 12, color: "#A3A3A3", marginLeft: "auto" }}>
                              {formatTimestamp(ev.created_at)}
                            </span>
                          </div>

                          {/* title */}
                          <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>{ev.title}</div>

                          {/* description */}
                          {ev.description && (
                            <div style={{ fontSize: 13, color: "#737373", marginBottom: 4 }}>{ev.description}</div>
                          )}

                          {/* task link */}
                          {ev.task_id && (
                            <div style={{ fontSize: 12, color: "#A3A3A3", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={ds.dot(ds.accent)} />
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
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", margin: "0 0 8px 0" }}>{selected.title}</h4>
              {selected.description && <p style={{ color: "#737373", margin: "0 0 20px 0", fontSize: 13, lineHeight: 1.5 }}>{selected.description}</p>}

              {/* metadata rows */}
              <div style={{ marginBottom: 20 }}>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Type</span>
                  <span>{TYPE_LABELS[selected.evidence_type] ?? selected.evidence_type}</span>
                </div>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Trust score</span>
                  <span style={{ color: trustColor(selectedTrustScore), fontWeight: 600 }}>
                    {selectedTrustScore}/100
                    <span style={{ fontWeight: 400, marginLeft: 4 }}>({trustLabel(selectedTrustScore)})</span>
                  </span>
                </div>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Verification</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={ds.dot(selectedTrustScore >= 70 ? ds.success : selectedTrustScore >= 50 ? "#F59E0B" : "#A3A3A3")} />
                    {selectedTrustScore >= 70 ? "Verified" : selectedTrustScore >= 50 ? "Partial" : "Unverified"}
                  </span>
                </div>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3" }}>Linked to task</span>
                  <span>{selected.task_id ? "Yes" : "No"}</span>
                </div>
                <div style={{ ...ds.metaRow, borderBottom: "none" }}>
                  <span style={{ color: "#A3A3A3" }}>Created</span>
                  <span>{formatTimestamp(selected.created_at)}</span>
                </div>
              </div>

              {/* supports section */}
              {selected.task_id && (
                <div style={{ marginBottom: 20, padding: 14, background: "#F5F3FF", borderRadius: 10, borderLeft: `4px solid ${ds.accent}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: ds.accent, margin: "0 0 4px" }}>Supports</p>
                  <div style={{ fontSize: 13, color: "#0A0A0A" }}>{taskLookup.get(selected.task_id) ?? selected.task_id}</div>
                </div>
              )}

              {/* actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.task_id && onOpenWorkspace && (
                  <button style={ds.btnSmSecondary} onClick={() => onOpenWorkspace(selected.task_id!)}>Jump to task workspace</button>
                )}
              </div>
            </div>
          )}
        </ContextInspector>
      </div>
    </div>
  );
}
