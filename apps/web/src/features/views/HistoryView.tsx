import { useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { AssessmentHistoryItem } from "../../lib/api";
import { HistoryComparison } from "./historyInsights";

type HistoryViewProps = {
  loading: boolean;
  assessments: AssessmentHistoryItem[];
  selectedAssessmentId: string | null;
  loadingAssessmentId: string | null;
  comparison: HistoryComparison | null;
  formatTimestamp: (isoTimestamp: string) => string;
  onOpenAssessment: () => void;
  onOpenPlan: () => void;
  onOpenDiagnosisRecord: (engineRunId: string) => void;
  onLoadAssessmentRecord: (assessmentId: string) => void;
};

import { ds } from "../../styles/tokens";

export function HistoryView({
  loading,
  assessments,
  selectedAssessmentId,
  loadingAssessmentId,
  comparison,
  formatTimestamp,
  onOpenAssessment,
  onOpenPlan,
  onOpenDiagnosisRecord,
  onLoadAssessmentRecord,
}: HistoryViewProps) {
  const [showTrends, setShowTrends] = useState(false);

  const signalTrends = useMemo(() => {
    if (!assessments || assessments.length < 2) return [];

    const signalCounts: Record<string, { count: number; firstSeen: string; lastSeen: string }> = {};

    for (const assessment of assessments) {
      const signals = assessment.active_signal_names ?? [];
      for (const name of signals) {
        if (!name) continue;
        if (!signalCounts[name]) {
          signalCounts[name] = { count: 0, firstSeen: assessment.created_at ?? "", lastSeen: "" };
        }
        signalCounts[name].count++;
        signalCounts[name].lastSeen = assessment.created_at ?? "";
      }
    }

    return Object.entries(signalCounts)
      .map(([name, data]) => ({ signalName: name, ...data, frequency: data.count / assessments.length }))
      .sort((a, b) => b.count - a.count);
  }, [assessments]);

  const recurringSignals = signalTrends.filter(s => s.count >= 2);
  const persistentSignals = signalTrends.filter(s => s.frequency >= 0.5);

  const latestAssessment = assessments[0] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <SurfaceHeader
        title="History"
        subtitle={`${assessments.length} assessment${assessments.length !== 1 ? "s" : ""} recorded`}
        moreActions={[
          { label: "New assessment", onClick: onOpenAssessment },
          { label: "Open plan", onClick: onOpenPlan },
        ]}
      />
      <PrimaryCanvas>
        <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
          {/* ── Main section ──────────────────────── */}
          <section className="ui-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <div>
                <p className="eyebrow">VENUE</p>
                <h2 className="section-title">History and compare</h2>
                <p className="small-text" style={{ marginTop: 4 }}>Every assessment, diagnosis, and plan lineage should stay reviewable so the venue can learn over time.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={onOpenAssessment}>New assessment</button>
                <button className="btn btn-primary" onClick={onOpenPlan}>Open plan</button>
              </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div className="ui-card" style={{ borderLeft: `4px solid ${ds.accent}` }}>
                <p className="eyebrow">Recorded snapshots</p>
                <p className="metric-number" style={{ marginTop: 8 }}>{assessments.length}</p>
                <p className="small-text" style={{ marginTop: 6 }}>The venue timeline should show how operational reality changed over time, not just what the current state says.</p>
              </div>
              <div className="ui-card">
                <p className="eyebrow">Latest snapshot</p>
                <p className="metric-number" style={{ marginTop: 8, fontSize: latestAssessment ? 20 : 36, fontFamily: latestAssessment ? "inherit" : "'JetBrains Mono', monospace" }}>
                  {latestAssessment ? formatTimestamp(latestAssessment.created_at) : "None yet"}
                </p>
                <p className="small-text" style={{ marginTop: 6 }}>
                  {latestAssessment
                    ? `${latestAssessment.selected_signal_count} signals, ${latestAssessment.plan_task_count} plan tasks.`
                    : "Save the first assessment to create a durable operating timeline."}
                </p>
              </div>
              {comparison ? (
                <div className="ui-card">
                  <p className="eyebrow">
                    {comparison.mode === "selected_vs_latest" ? "Selected vs latest" : "Latest vs previous"}
                  </p>
                  <p className="metric-number" style={{ marginTop: 8, fontSize: 20 }}>{comparison.loadShift}</p>
                  <p className="small-text" style={{ marginTop: 6 }}>
                    {comparison.signalDelta >= 0 ? "+" : ""}{comparison.signalDelta} signals, {comparison.taskDelta >= 0 ? "+" : ""}{comparison.taskDelta} plan tasks.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Comparison grid */}
            {comparison ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div className="ui-card">
                  <p className="eyebrow">Escalated or newly visible</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {comparison.addedSignals.length ? (
                      comparison.addedSignals.map((signal) => <span key={signal} className="ui-badge ui-badge--muted">{signal}</span>)
                    ) : (
                      <span className="ui-badge ui-badge--muted">No new signal families.</span>
                    )}
                  </div>
                </div>
                <div className="ui-card">
                  <p className="eyebrow">Reduced or absent</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {comparison.removedSignals.length ? (
                      comparison.removedSignals.map((signal) => <span key={signal} className="ui-badge ui-badge--muted">{signal}</span>)
                    ) : (
                      <span className="ui-badge ui-badge--muted">No resolved signals surfaced yet.</span>
                    )}
                  </div>
                </div>
                <div className="ui-card">
                  <p className="eyebrow">Comparison anchor</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Newest snapshot</span>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{formatTimestamp(comparison.newer.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Baseline snapshot</span>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{formatTimestamp(comparison.baseline.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onLoadAssessmentRecord(comparison.newer.id)}
                      disabled={loadingAssessmentId === comparison.newer.id}
                    >
                      {loadingAssessmentId === comparison.newer.id ? "Loading..." : "Load newest"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onLoadAssessmentRecord(comparison.baseline.id)}
                      disabled={loadingAssessmentId === comparison.baseline.id}
                    >
                      {loadingAssessmentId === comparison.baseline.id ? "Loading..." : "Load baseline"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Assessment timeline list */}
            {loading ? (
              <p className="small-text" style={{ textAlign: "center", padding: 32 }}>Loading assessment history...</p>
            ) : assessments.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="ui-card"
                    style={{
                      borderLeft: `4px solid ${selectedAssessmentId === assessment.id ? ds.accent : "var(--color-border-subtle)"}`,
                      ...(selectedAssessmentId === assessment.id ? { boxShadow: `0 0 0 1.5px ${ds.accent}20, 0 1px 3px rgba(0,0,0,0.04)` } : {}),
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{formatTimestamp(assessment.created_at)}</span>
                      <span className="ui-badge ui-badge--muted">{assessment.plan_load_classification ?? "saved_only"}</span>
                    </div>
                    <p className="small-text" style={{ marginBottom: 8 }}>{assessment.notes ?? "No assessment notes captured."}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      <span className="ui-badge ui-badge--muted">{assessment.selected_signal_count} signals</span>
                      <span className="ui-badge ui-badge--muted">{assessment.plan_task_count} plan tasks</span>
                      {assessment.ontology_id && (
                        <span className="ui-badge ui-badge--muted" style={{ opacity: 0.6 }}>{assessment.ontology_id}@{assessment.ontology_version}</span>
                      )}
                      {assessment.active_signal_names.map((name) => (
                        <span key={name} className="ui-badge ui-badge--muted">{name}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => onLoadAssessmentRecord(assessment.id)}
                        disabled={loadingAssessmentId === assessment.id}
                      >
                        {loadingAssessmentId === assessment.id ? "Loading..." : "Load snapshot"}
                      </button>
                      {assessment.engine_run_id ? (
                        <button className="btn btn-secondary" onClick={() => onOpenDiagnosisRecord(assessment.engine_run_id!)}>
                          Open diagnosis
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small-text" style={{ textAlign: "center", padding: 32 }}>No saved assessments yet. Analyze intake and save the first operational record.</p>
            )}
          </section>

          {/* ── Signal Trends ──────────────────────── */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>Signal Trends</h2>
              <button
                onClick={() => setShowTrends(!showTrends)}
                style={{
                  background: showTrends ? "var(--color-accent)" : "none",
                  border: showTrends ? "none" : "1px solid var(--color-border-subtle)",
                  color: showTrends ? "var(--color-surface)" : "var(--color-text-secondary)",
                  fontSize: "var(--text-small)",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                {showTrends ? "Hide Trends" : "Show Trends"}
              </button>
            </div>

            {showTrends && (
              <div>
                {recurringSignals.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Not enough assessment data to detect trends. Run at least 2 assessments.</p>
                ) : (
                  <>
                    {persistentSignals.length > 0 && (
                      <div style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.04)",
                        borderLeft: "4px solid var(--color-danger)",
                        marginBottom: 16,
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                      }}>
                        <div style={{ fontWeight: 600, color: "var(--color-danger)", marginBottom: 4 }}>
                          Persistent signals detected
                        </div>
                        {persistentSignals.map(s => (
                          <div key={s.signalName}>
                            {s.signalName} — appeared in {s.count} of {assessments.length} assessments ({(s.frequency * 100).toFixed(0)}%)
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 8 }}>
                      Signal frequency
                    </div>
                    {recurringSignals.map(s => (
                      <div key={s.signalName} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--color-surface-subtle)",
                        fontSize: 13,
                      }}>
                        <span style={{ flex: 1, color: "var(--color-text-primary)" }}>{s.signalName}</span>
                        <div style={{ width: 80, height: 6, background: "var(--color-surface-subtle)", borderRadius: 3 }}>
                          <div style={{ width: `${s.frequency * 100}%`, height: "100%", background: s.frequency >= 0.5 ? "var(--color-danger)" : s.frequency >= 0.3 ? "var(--color-warning)" : "var(--color-accent)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)", minWidth: 30, textAlign: "right" }}>{s.count}x</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </PrimaryCanvas>
    </div>
  );
}
