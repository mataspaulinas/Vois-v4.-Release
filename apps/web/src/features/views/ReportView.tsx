import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { TransitionSuggestion } from "../../components/TransitionSuggestion";
import {
  EnhancedReportResponse,
  EngineRunResponse,
  PersistedEngineRunDetailRecord,
  PersistedEngineRunRecord,
  exportEngineRun,
} from "../../lib/api";
import { ReportComparison } from "./reportInsights";

type ReportViewProps = {
  loadingReports: boolean;
  engineResult: EngineRunResponse | null;
  selectedEngineRun: PersistedEngineRunRecord | null;
  selectedEngineRunId: string | null;
  engineRunHistory: PersistedEngineRunRecord[];
  selectedEngineRunDetail: PersistedEngineRunDetailRecord | null;
  loadingEngineRunDetail: boolean;
  comparison: ReportComparison | null;
  enhancedReport: EnhancedReportResponse | null;
  loadingEnhancedReport: boolean;
  onGenerateEnhancedReport: () => void;
  onSelectEngineRun: (engineRunId: string) => void;
  formatTimestamp: (isoTimestamp: string) => string;
  onOpenAssessment: () => void;
  onOpenPlan: () => void;
  linkedPlanTitle?: string | null;
};

/* ── design-system tokens ───────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 },
  sectionHeading: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 12px 0" },
  body: { fontSize: 15, color: "#404040", lineHeight: 1.55 },
  small: { fontSize: 13, color: "#737373" },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: 24 } as React.CSSProperties,
  cardCompact: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: 20 } as React.CSSProperties,
  accent: "#6C5CE7",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  btnPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnSecondary: { background: "#FFFFFF", color: "#404040", border: "1px solid #E5E5E5", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  chip: { display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 6, background: "#F5F5F5", color: "#525252" } as React.CSSProperties,
  metaRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F5F5F5", fontSize: 13 } as React.CSSProperties,
  dot: (color: string) => ({ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }) as React.CSSProperties,
};

export function ReportView({
  loadingReports,
  engineResult,
  selectedEngineRun,
  selectedEngineRunId,
  engineRunHistory,
  selectedEngineRunDetail,
  loadingEngineRunDetail,
  comparison,
  enhancedReport,
  loadingEnhancedReport,
  onGenerateEnhancedReport,
  onSelectEngineRun,
  formatTimestamp,
  onOpenAssessment,
  onOpenPlan,
  linkedPlanTitle,
}: ReportViewProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: "markdown" | "json") {
    if (!selectedEngineRunId) return;
    setExporting(true);
    try {
      const content = await exportEngineRun(selectedEngineRunId, format);
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${selectedEngineRunId.slice(0, 8)}.${format === "json" ? "json" : "md"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { /* silently fail */ }
    setExporting(false);
  }

  const currentSessionReport =
    engineResult && (!selectedEngineRunId || engineResult.engine_run_id === selectedEngineRunId) ? engineResult : null;
  const topFailureMode = currentSessionReport?.failure_modes[0]?.name ?? "Historical report selected";
  const topResponsePattern = currentSessionReport?.response_patterns[0]?.name ?? "Use the persisted report details below";
  const normalizedSignalCount = selectedEngineRunDetail?.normalized_signals.length ?? 0;
  const diagnosticSnapshotKeys = Object.keys(selectedEngineRunDetail?.diagnostic_snapshot ?? {});
  const planSnapshotKeys = Object.keys(selectedEngineRunDetail?.plan_snapshot ?? {});
  const aiTraceEntries = Object.entries(selectedEngineRunDetail?.ai_trace ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  return (
    <div style={{ padding: 48, maxWidth: 960, margin: "0 auto" }}>
      <SurfaceHeader
        title="Diagnostic report"
        subtitle={currentSessionReport ? "Current session report" : selectedEngineRunId ? "Persisted engine run" : "No report loaded"}
        primaryAction={{ label: linkedPlanTitle ? "Open linked plan" : "Move to plan", onClick: onOpenPlan }}
        moreActions={[
          { label: "Revisit assessment", onClick: onOpenAssessment },
          { label: "Export MD", onClick: () => handleExport("markdown") },
          { label: "Export JSON", onClick: () => handleExport("json") },
        ]}
      />

      {(currentSessionReport || selectedEngineRunId) && (
        <TransitionSuggestion
          message="Report reviewed? Move to the plan to shape execution, or check escalations for blocked truth."
          actionLabel={linkedPlanTitle ? "Open linked plan" : "Move to plan"}
          onAction={onOpenPlan}
          autoHideMs={12000}
        />
      )}

      <PrimaryCanvas>
        <div style={{ marginBottom: 32 }}>
          <p style={ds.eyebrow}>VENUE</p>
          <h1 style={{ ...ds.pageTitle, marginTop: 4 }}>Diagnostic output</h1>
          <p style={{ ...ds.body, color: "#737373", marginTop: 4 }}>
            Failure modes, response patterns, and the persisted report history live here.
          </p>
        </div>

        {/* ── action row ────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <button style={ds.btnSecondary} onClick={onOpenAssessment}>Revisit assessment</button>
          <button style={ds.btnPrimary} onClick={onOpenPlan}>
            {linkedPlanTitle ? "Open linked plan" : "Move to plan"}
          </button>
        </div>

        {/* ── highlight cards ───────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: comparison ? "1fr 1fr 1fr" : "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ ...ds.card, borderLeft: `4px solid ${ds.accent}` }}>
            <p style={ds.eyebrow}>Most likely breakdown</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "8px 0 6px" }}>{topFailureMode}</h3>
            <p style={ds.small}>The report should quickly tell you what system is most likely failing, not force you to read everything first.</p>
          </div>
          <div style={ds.card}>
            <p style={ds.eyebrow}>Primary response logic</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "8px 0 6px" }}>{topResponsePattern}</h3>
            <p style={ds.small}>This is the operating correction pattern the engine currently thinks matters most.</p>
          </div>
          {comparison ? (
            <div style={ds.card}>
              <p style={ds.eyebrow}>
                {comparison.mode === "latest_vs_selected" ? "Latest vs selected" : "Latest vs previous"}
              </p>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "8px 0 6px" }}>{comparison.loadShift}</h3>
              <p style={ds.small}>
                {comparison.signalDelta >= 0 ? "+" : ""}
                {comparison.signalDelta} signals, {comparison.taskDelta >= 0 ? "+" : ""}
                {comparison.taskDelta} tasks.
              </p>
            </div>
          ) : null}
        </div>

        {/* ── provenance ────────────────────────────────────── */}
        {selectedEngineRun ? (
          <div style={{ ...ds.cardCompact, marginBottom: 32 }}>
            <p style={ds.eyebrow}>Report provenance</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <span style={ds.chip}>Run: {formatTimestamp(selectedEngineRun.created_at)}</span>
              <span style={ds.chip}>Load: {selectedEngineRun.load_classification}</span>
              <span style={ds.chip}>Ontology: {selectedEngineRun.ontology_version}</span>
              <span style={ds.chip}>{selectedEngineRun.active_signal_names.length} reviewed signals</span>
              <span style={ds.chip}>{selectedEngineRun.plan_task_count} plan tasks</span>
            </div>
            <p style={{ ...ds.small, marginTop: 10, opacity: 0.7 }}>
              This report was generated from a specific assessment and reviewed signal state. The diagnostic output, plan, and trust artifacts are all anchored to this run.
            </p>
          </div>
        ) : null}

        {/* ── current session diagnostics ───────────────────── */}
        {currentSessionReport ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div style={ds.card}>
              <h3 style={ds.sectionHeading}>Failure modes</h3>
              {currentSessionReport.failure_modes.map((finding) => (
                <div key={finding.id} style={{ ...ds.metaRow }}>
                  <span style={{ fontSize: 13 }}>{finding.name}</span>
                  <strong style={{ fontSize: 13, color: ds.accent }}>{finding.score}</strong>
                </div>
              ))}
            </div>
            <div style={ds.card}>
              <h3 style={ds.sectionHeading}>Response patterns</h3>
              {currentSessionReport.response_patterns.map((finding) => (
                <div key={finding.id} style={{ ...ds.metaRow }}>
                  <span style={{ fontSize: 13 }}>{finding.name}</span>
                  <strong style={{ fontSize: 13, color: ds.accent }}>{finding.score}</strong>
                </div>
              ))}
            </div>
            <div style={ds.card}>
              <h3 style={ds.sectionHeading}>Current-session spine</h3>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                {currentSessionReport.report.diagnostic_spine.map((line) => (
                  <li key={line} style={{ ...ds.small, marginBottom: 6 }}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ ...ds.card, marginBottom: 32 }}>
            <p style={ds.eyebrow}>Historical selection</p>
            <p style={{ ...ds.body, marginTop: 8, color: "#737373" }}>
              You are viewing a persisted report record. Live current-session diagnostics are only shown when the selected report matches the current run.
            </p>
          </div>
        )}

        {/* ── comparison section ────────────────────────────── */}
        {comparison ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div style={ds.card}>
              <p style={ds.eyebrow}>Newly surfaced signals</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {comparison.addedSignals.length ? (
                  comparison.addedSignals.map((signal) => <span key={signal} style={{ ...ds.chip, background: "#ECFDF5", color: "#065F46" }}>{signal}</span>)
                ) : (
                  <span style={ds.small}>No new signal families.</span>
                )}
              </div>
            </div>
            <div style={ds.card}>
              <p style={ds.eyebrow}>Reduced or absent</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {comparison.removedSignals.length ? (
                  comparison.removedSignals.map((signal) => <span key={signal} style={{ ...ds.chip, background: "#FEF2F2", color: "#991B1B" }}>{signal}</span>)
                ) : (
                  <span style={ds.small}>No reduced signal families.</span>
                )}
              </div>
            </div>
            <div style={ds.card}>
              <p style={ds.eyebrow}>Comparison anchor</p>
              <div style={{ marginTop: 10 }}>
                <div style={ds.metaRow}>
                  <span style={{ color: "#A3A3A3", fontSize: 13 }}>Newest report</span>
                  <span style={{ fontSize: 13 }}>{formatTimestamp(comparison.newer.created_at)}</span>
                </div>
                <div style={{ ...ds.metaRow, borderBottom: "none" }}>
                  <span style={{ color: "#A3A3A3", fontSize: 13 }}>Baseline report</span>
                  <span style={{ fontSize: 13 }}>{formatTimestamp(comparison.baseline.created_at)}</span>
                </div>
              </div>
              {comparison.mode === "latest_vs_selected" ? (
                <div style={{ marginTop: 12 }}>
                  <button style={ds.btnSecondary} onClick={() => onSelectEngineRun(comparison.newer.engine_run_id)}>
                    Return to latest report
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── report shell ──────────────────────────────────── */}
        {selectedEngineRun ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* toolbar */}
            <div style={{ ...ds.card, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "14px 24px" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={ds.chip}>{selectedEngineRun.load_classification}</span>
                <span style={ds.chip}>{selectedEngineRun.ontology_version}</span>
                <span style={ds.chip}>{selectedEngineRun.plan_task_count} tasks</span>
                {linkedPlanTitle ? <span style={{ ...ds.chip, background: "#EDE9FE", color: "#5B21B6" }}>{linkedPlanTitle}</span> : null}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button style={ds.btnSecondary} onClick={onGenerateEnhancedReport} disabled={loadingEnhancedReport}>
                  {loadingEnhancedReport ? "Generating..." : "AI narrative"}
                </button>
                <button style={ds.btnSecondary} onClick={() => handleExport("markdown")} disabled={exporting}>
                  {exporting ? "..." : "Export MD"}
                </button>
                <button style={ds.btnSecondary} onClick={() => handleExport("json")} disabled={exporting}>
                  {exporting ? "..." : "Export JSON"}
                </button>
                <span style={{ ...ds.small, marginLeft: 4 }}>{formatTimestamp(selectedEngineRun.created_at)}</span>
              </div>
            </div>

            {/* enhanced report */}
            {enhancedReport ? (
              <div style={{ ...ds.card, borderLeft: `4px solid ${ds.info}` }}>
                <p style={ds.eyebrow}>AI-enhanced narrative</p>
                <p style={{ ...ds.body, marginTop: 10, whiteSpace: "pre-wrap" }}>{enhancedReport.markdown}</p>
                {enhancedReport.references.length ? (
                  <>
                    <p style={{ ...ds.eyebrow, marginTop: 16 }}>Grounding</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {enhancedReport.references.map((reference) => (
                        <span key={`${reference.type}-${reference.id ?? reference.label}`} style={ds.chip}>
                          {reference.type}: {reference.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {/* persisted report + spine + threads */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div style={ds.card}>
                <h3 style={ds.sectionHeading}>Persisted report</h3>
                <p style={{ ...ds.body, marginBottom: 12 }}>{selectedEngineRun.summary}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedEngineRun.active_signal_names.slice(0, 6).map((name) => (
                    <span key={name} style={ds.chip}>{name}</span>
                  ))}
                </div>
              </div>
              <div style={ds.card}>
                <h3 style={ds.sectionHeading}>Diagnostic spine</h3>
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                  {selectedEngineRun.diagnostic_spine.map((line) => (
                    <li key={line} style={{ ...ds.small, marginBottom: 6 }}>{line}</li>
                  ))}
                </ul>
              </div>
              <div style={ds.card}>
                <h3 style={ds.sectionHeading}>Investigation threads</h3>
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc", marginBottom: 16 }}>
                  {selectedEngineRun.investigation_threads.map((line) => (
                    <li key={line} style={{ ...ds.small, marginBottom: 6 }}>{line}</li>
                  ))}
                </ul>
                <h3 style={ds.sectionHeading}>Verification briefs</h3>
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                  {selectedEngineRun.verification_briefs.map((line) => (
                    <li key={line} style={{ ...ds.small, marginBottom: 6 }}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* trust surface + ai trace */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={ds.card}>
                <h3 style={ds.sectionHeading}>Trust surface</h3>
                {loadingEngineRunDetail ? (
                  <p style={ds.small}>Loading persisted execution evidence...</p>
                ) : selectedEngineRunDetail ? (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      <span style={ds.chip}>{normalizedSignalCount} normalized signals</span>
                      <span style={ds.chip}>{diagnosticSnapshotKeys.length} diagnostic snapshot fields</span>
                      <span style={ds.chip}>{planSnapshotKeys.length} plan snapshot fields</span>
                      <span style={ds.chip}>{selectedEngineRunDetail.report_markdown ? "Persisted markdown" : "No persisted markdown"}</span>
                    </div>
                    {selectedEngineRunDetail.report_markdown ? (
                      <p style={ds.small}>{selectedEngineRunDetail.report_markdown.slice(0, 320)}</p>
                    ) : (
                      <p style={ds.small}>No persisted markdown report was stored for this run.</p>
                    )}
                  </>
                ) : (
                  <p style={ds.small}>No detailed engine-run evidence is available for this selection.</p>
                )}
              </div>
              <div style={ds.card}>
                <h3 style={ds.sectionHeading}>AI trace</h3>
                {loadingEngineRunDetail ? (
                  <p style={ds.small}>Loading AI trace...</p>
                ) : aiTraceEntries.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {aiTraceEntries.map(([key, value]) => (
                      <div key={key} style={ds.metaRow}>
                        <span style={{ color: "#A3A3A3", fontSize: 13 }}>{key}</span>
                        <span style={{ fontSize: 13, maxWidth: "60%", textAlign: "right", wordBreak: "break-word" }}>
                          {typeof value === "string" ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={ds.small}>No AI trace metadata was persisted for this run.</p>
                )}
              </div>
            </div>

            {/* report history */}
            <div style={ds.card}>
              <p style={{ ...ds.eyebrow, marginBottom: 12 }}>Report history</p>
              {loadingReports ? (
                <p style={ds.small}>Loading report history...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {engineRunHistory.map((run) => (
                    <button
                      key={run.engine_run_id}
                      onClick={() => onSelectEngineRun(run.engine_run_id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: selectedEngineRunId === run.engine_run_id ? `2px solid ${ds.accent}` : "1px solid #E5E5E5",
                        background: selectedEngineRunId === run.engine_run_id ? "#F5F3FF" : "#FFFFFF",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{formatTimestamp(run.created_at)}</strong>
                      <span style={ds.chip}>{run.load_classification}</span>
                      <span style={{ ...ds.small, marginLeft: "auto" }}>{run.plan_task_count} tasks</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ ...ds.card, textAlign: "center", padding: 48 }}>
            <p style={ds.body}>Run the engine after saving the assessment to generate the first persisted diagnostic readout.</p>
          </div>
        )}
      </PrimaryCanvas>
    </div>
  );
}
