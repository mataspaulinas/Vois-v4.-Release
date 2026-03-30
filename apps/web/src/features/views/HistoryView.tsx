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
  onOpenReportRecord: (engineRunId: string) => void;
  onLoadAssessmentRecord: (assessmentId: string) => void;
};

/* ── design tokens ─────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: "4px 0 0" },
  body: { fontSize: 15, color: "#525252", lineHeight: 1.55, margin: 0 },
  small: { fontSize: 13, color: "#737373", lineHeight: 1.5, margin: 0 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: 0 },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" } as React.CSSProperties,
  metricNumber: { fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#0A0A0A", margin: 0, lineHeight: 1.1 },
  metricLabel: { fontSize: 12, color: "#A3A3A3", margin: 0 },
  accent: "#6C5CE7",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  btnPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnSecondary: { background: "#FFFFFF", color: "#0A0A0A", border: "1px solid #E5E5E5", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  countPill: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#F5F5F5", color: "#737373" } as React.CSSProperties,
} as const;

export function HistoryView({
  loading,
  assessments,
  selectedAssessmentId,
  loadingAssessmentId,
  comparison,
  formatTimestamp,
  onOpenAssessment,
  onOpenPlan,
  onOpenReportRecord,
  onLoadAssessmentRecord,
}: HistoryViewProps) {
  const latestAssessment = assessments[0] ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <SurfaceHeader
        title="Assessment timeline"
        subtitle={`${assessments.length} assessment${assessments.length !== 1 ? "s" : ""} recorded`}
        moreActions={[
          { label: "New assessment", onClick: onOpenAssessment },
          { label: "Open plan", onClick: onOpenPlan },
        ]}
      />
      <PrimaryCanvas>
        <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
          {/* ── Main section ──────────────────────── */}
          <section style={ds.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <div>
                <p style={ds.eyebrow}>VENUE</p>
                <h2 style={ds.sectionTitle}>Assessment timeline</h2>
                <p style={{ ...ds.small, marginTop: 4 }}>Every analyzed venue state becomes a reviewable operational record.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ds.btnSecondary} onClick={onOpenAssessment}>New assessment</button>
                <button style={ds.btnPrimary} onClick={onOpenPlan}>Open plan</button>
              </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ ...ds.card, borderLeft: `4px solid ${ds.accent}` }}>
                <p style={ds.eyebrow}>Recorded snapshots</p>
                <p style={{ ...ds.metricNumber, marginTop: 8 }}>{assessments.length}</p>
                <p style={{ ...ds.small, marginTop: 6 }}>The venue timeline should show how operational reality changed over time, not just what the current state says.</p>
              </div>
              <div style={ds.card}>
                <p style={ds.eyebrow}>Latest snapshot</p>
                <p style={{ ...ds.metricNumber, marginTop: 8, fontSize: latestAssessment ? 20 : 36, fontFamily: latestAssessment ? "inherit" : "'JetBrains Mono', monospace" }}>
                  {latestAssessment ? formatTimestamp(latestAssessment.created_at) : "None yet"}
                </p>
                <p style={{ ...ds.small, marginTop: 6 }}>
                  {latestAssessment
                    ? `${latestAssessment.selected_signal_count} signals, ${latestAssessment.plan_task_count} plan tasks.`
                    : "Save the first assessment to create a durable operating timeline."}
                </p>
              </div>
              {comparison ? (
                <div style={ds.card}>
                  <p style={ds.eyebrow}>
                    {comparison.mode === "selected_vs_latest" ? "Selected vs latest" : "Latest vs previous"}
                  </p>
                  <p style={{ ...ds.metricNumber, marginTop: 8, fontSize: 20 }}>{comparison.loadShift}</p>
                  <p style={{ ...ds.small, marginTop: 6 }}>
                    {comparison.signalDelta >= 0 ? "+" : ""}{comparison.signalDelta} signals, {comparison.taskDelta >= 0 ? "+" : ""}{comparison.taskDelta} plan tasks.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Comparison grid */}
            {comparison ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={ds.card}>
                  <p style={ds.eyebrow}>Escalated or newly visible</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {comparison.addedSignals.length ? (
                      comparison.addedSignals.map((signal) => <span key={signal} style={ds.countPill}>{signal}</span>)
                    ) : (
                      <span style={ds.countPill}>No new signal families.</span>
                    )}
                  </div>
                </div>
                <div style={ds.card}>
                  <p style={ds.eyebrow}>Reduced or absent</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {comparison.removedSignals.length ? (
                      comparison.removedSignals.map((signal) => <span key={signal} style={ds.countPill}>{signal}</span>)
                    ) : (
                      <span style={ds.countPill}>No resolved signals surfaced yet.</span>
                    )}
                  </div>
                </div>
                <div style={ds.card}>
                  <p style={ds.eyebrow}>Comparison anchor</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#737373", fontWeight: 500 }}>Newest snapshot</span>
                      <span style={{ color: "#0A0A0A", fontWeight: 500 }}>{formatTimestamp(comparison.newer.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#737373", fontWeight: 500 }}>Baseline snapshot</span>
                      <span style={{ color: "#0A0A0A", fontWeight: 500 }}>{formatTimestamp(comparison.baseline.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      style={ds.btnSecondary}
                      onClick={() => onLoadAssessmentRecord(comparison.newer.id)}
                      disabled={loadingAssessmentId === comparison.newer.id}
                    >
                      {loadingAssessmentId === comparison.newer.id ? "Loading..." : "Load newest"}
                    </button>
                    <button
                      style={ds.btnSecondary}
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
              <p style={{ ...ds.small, textAlign: "center", padding: 32 }}>Loading assessment history...</p>
            ) : assessments.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    style={{
                      ...ds.card,
                      borderLeft: `4px solid ${selectedAssessmentId === assessment.id ? ds.accent : "#E5E5E5"}`,
                      ...(selectedAssessmentId === assessment.id ? { boxShadow: `0 0 0 1.5px ${ds.accent}20, 0 1px 3px rgba(0,0,0,0.04)` } : {}),
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{formatTimestamp(assessment.created_at)}</span>
                      <span style={ds.countPill}>{assessment.plan_load_classification ?? "saved_only"}</span>
                    </div>
                    <p style={{ ...ds.small, marginBottom: 8 }}>{assessment.notes ?? "No assessment notes captured."}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      <span style={ds.countPill}>{assessment.selected_signal_count} signals</span>
                      <span style={ds.countPill}>{assessment.plan_task_count} plan tasks</span>
                      {assessment.ontology_id && (
                        <span style={{ ...ds.countPill, opacity: 0.6 }}>{assessment.ontology_id}@{assessment.ontology_version}</span>
                      )}
                      {assessment.active_signal_names.map((name) => (
                        <span key={name} style={ds.countPill}>{name}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={ds.btnSecondary}
                        onClick={() => onLoadAssessmentRecord(assessment.id)}
                        disabled={loadingAssessmentId === assessment.id}
                      >
                        {loadingAssessmentId === assessment.id ? "Loading..." : "Load snapshot"}
                      </button>
                      {assessment.engine_run_id ? (
                        <button style={ds.btnSecondary} onClick={() => onOpenReportRecord(assessment.engine_run_id!)}>
                          Open report
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ ...ds.small, textAlign: "center", padding: 32 }}>No saved assessments yet. Analyze intake and save the first operational record.</p>
            )}
          </section>
        </div>
      </PrimaryCanvas>
    </div>
  );
}
