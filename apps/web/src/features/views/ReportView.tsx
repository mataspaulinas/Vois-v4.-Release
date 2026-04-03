import { useState } from "react";
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
import { ds } from "../../styles/tokens";

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

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "var(--text-eyebrow)",
  fontWeight: 500,
  padding: "4px 10px",
  borderRadius: 6,
  background: "var(--color-surface-subtle)",
  color: "var(--color-text-secondary)",
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
      const blob = new Blob([content], {
        type: format === "json" ? "application/json" : "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `diagnosis-${selectedEngineRunId.slice(0, 8)}.${format === "json" ? "json" : "md"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // keep export failure silent for now
    }
    setExporting(false);
  }

  const currentSessionReport =
    engineResult && (!selectedEngineRunId || engineResult.engine_run_id === selectedEngineRunId)
      ? engineResult
      : null;

  const topFailureMode =
    currentSessionReport?.failure_modes[0]?.name ?? "Historical diagnosis selected";
  const topResponsePattern =
    currentSessionReport?.response_patterns[0]?.name ?? "Use the persisted diagnosis details below";
  const assessmentTypeLabel =
    currentSessionReport?.report.assessment_type_label ??
    selectedEngineRun?.assessment_type_label ??
    "Full Diagnostic";

  const normalizedSignalCount = selectedEngineRunDetail?.normalized_signals.length ?? 0;
  const diagnosticSnapshotKeys = Object.keys(selectedEngineRunDetail?.diagnostic_snapshot ?? {});
  const planSnapshotKeys = Object.keys(selectedEngineRunDetail?.plan_snapshot ?? {});
  const aiTraceEntries = Object.entries(selectedEngineRunDetail?.ai_trace ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  const constraintReport =
    currentSessionReport?.constraint_report ?? selectedEngineRunDetail?.constraint_report ?? {};
  const generatedPlan =
    currentSessionReport?.generated_plan ?? selectedEngineRunDetail?.generated_plan ?? {};

  const triageMessage =
    typeof constraintReport.triage_message === "string" ? constraintReport.triage_message : null;
  const deferredCount =
    typeof constraintReport.deferred_count === "number" ? constraintReport.deferred_count : 0;
  const constrainedCount =
    typeof constraintReport.constrained_count === "number" ? constraintReport.constrained_count : null;
  const weeklyBudget =
    typeof constraintReport.weekly_budget === "number" ? constraintReport.weekly_budget : null;

  const planLayerCounts = {
    L1: Array.isArray(generatedPlan.L1_tasks) ? generatedPlan.L1_tasks.length : 0,
    L2: Array.isArray(generatedPlan.L2_tasks) ? generatedPlan.L2_tasks.length : 0,
    L3: Array.isArray(generatedPlan.L3_tasks) ? generatedPlan.L3_tasks.length : 0,
  };

  const generatedPlanConfidence =
    generatedPlan.confidence && typeof generatedPlan.confidence === "object"
      ? (generatedPlan.confidence as Record<string, unknown>)
      : null;
  const confidenceState =
    typeof generatedPlanConfidence?.state === "string" ? generatedPlanConfidence.state : "Unspecified";
  const confidenceNote =
    typeof generatedPlanConfidence?.note === "string"
      ? generatedPlanConfidence.note
      : "No explicit confidence note was persisted for this diagnosis.";

  const loadClassification =
    selectedEngineRun?.load_classification ??
    (typeof constraintReport.triage_mode === "string" ? "TRIAGE" : null) ??
    "FULL";
  const capacityPostureLabel = loadClassification.toUpperCase();
  const capacityPostureDescription =
    triageMessage ??
    (capacityPostureLabel === "TRIAGE"
      ? "This run was deliberately trimmed to match limited venue capacity."
      : "This run was generated without explicit capacity trimming.");

  const nextMoveSummary = buildNextMoveSummary({
    linkedPlanTitle,
    confidenceState,
    deferredCount,
    constrainedCount,
  });
  const comparisonSummary = buildComparisonSummary(comparison);

  return (
    <div style={{ padding: 48, maxWidth: 1040, margin: "0 auto" }}>
      <SurfaceHeader
        title="Diagnosis"
        subtitle={
          currentSessionReport
            ? "Current session diagnosis"
            : selectedEngineRunId
              ? "Persisted engine run"
              : "No diagnosis loaded"
        }
        primaryAction={{ label: linkedPlanTitle ? "Open linked plan" : "Move to plan", onClick: onOpenPlan }}
        moreActions={[
          { label: "Revisit assessment", onClick: onOpenAssessment },
          { label: "Export MD", onClick: () => handleExport("markdown") },
          { label: "Export JSON", onClick: () => handleExport("json") },
        ]}
      />

      {(currentSessionReport || selectedEngineRunId) && (
        <TransitionSuggestion
          message="Diagnosis reviewed? Move to the plan to shape execution, or return to assessment if the evidence still feels weak."
          actionLabel={linkedPlanTitle ? "Open linked plan" : "Move to plan"}
          onAction={onOpenPlan}
          autoHideMs={12000}
        />
      )}

      <PrimaryCanvas>
        <div style={{ marginBottom: 32 }}>
          <p className="eyebrow">VENUE</p>
          <h1 className="page-title" style={{ marginTop: 4 }}>Diagnosis</h1>
          <p className="body-text" style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
            This is where VOIS explains what is most likely failing, why it thinks that, and what logic should guide the next move.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={onOpenAssessment}>Revisit assessment</button>
          <button className="btn btn-primary" onClick={onOpenPlan}>
            {linkedPlanTitle ? "Open linked plan" : "Move to plan"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: comparison ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div className="ui-card" style={{ borderLeft: `4px solid ${ds.accent}` }}>
            <p className="eyebrow">Most likely breakdown</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px" }}>
              {topFailureMode}
            </h3>
            <p className="small-text">The diagnosis should quickly tell you what system is most likely failing, not force you to read everything first.</p>
          </div>

          <div className="ui-card">
            <p className="eyebrow">Assessment mode</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px" }}>
              {assessmentTypeLabel}
            </h3>
            <p className="small-text">The diagnosis framing and verification posture should match the visit mode used to generate this run.</p>
          </div>

          <div className="ui-card">
            <p className="eyebrow">Primary response logic</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px" }}>
              {topResponsePattern}
            </h3>
            <p className="small-text">This is the operating correction pattern the engine currently thinks matters most.</p>
          </div>

          {comparison ? (
            <div className="ui-card">
              <p className="eyebrow">What changed since the last comparable run</p>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px" }}>
                {comparison.loadShift}
              </h3>
              <p className="small-text">{comparisonSummary}</p>
            </div>
          ) : null}
        </div>

        {selectedEngineRun ? (
          <div className="ui-card ui-card--compact" style={{ marginBottom: 32 }}>
            <p className="eyebrow">Diagnosis provenance</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <span style={chip}>Run: {formatTimestamp(selectedEngineRun.created_at)}</span>
              <span style={chip}>Mode: {selectedEngineRun.assessment_type_label}</span>
              <span style={chip}>Load: {selectedEngineRun.load_classification}</span>
              <span style={chip}>Ontology: {selectedEngineRun.ontology_version}</span>
              <span style={chip}>{selectedEngineRun.active_signal_names.length} reviewed signals</span>
              <span style={chip}>{selectedEngineRun.plan_task_count} plan tasks</span>
            </div>
            <p className="small-text" style={{ marginTop: 10, opacity: 0.7 }}>
              This diagnosis was generated from a specific assessment and reviewed signal state. The diagnostic output, plan, and trust artifacts are all anchored to this run.
            </p>
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: comparison ? "1.2fr 1fr 1fr 1fr" : "1.2fr 1fr 1fr",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div className="ui-card" style={{ borderLeft: `4px solid ${ds.accent}` }}>
            <p className="eyebrow">What to do now</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px" }}>
              Move from diagnosis into execution
            </h3>
            <p className="small-text" style={{ marginBottom: 12 }}>{nextMoveSummary}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={onOpenPlan}>
                {linkedPlanTitle ? "Open linked plan" : "Open plan"}
              </button>
              <button className="btn btn-secondary" onClick={onOpenAssessment}>Revisit assessment</button>
            </div>
          </div>

          <div className="ui-card">
            <p className="eyebrow">Capacity posture</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px", textTransform: "uppercase" }}>
              {capacityPostureLabel}
            </h3>
            <p className="small-text">{capacityPostureDescription}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <span style={chip}>{deferredCount} deferred</span>
              {constrainedCount !== null ? <span style={chip}>{constrainedCount} kept</span> : null}
              {weeklyBudget !== null ? <span style={chip}>{weeklyBudget}h weekly budget</span> : null}
            </div>
          </div>

          <div className="ui-card">
            <p className="eyebrow">Plan shape</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px" }}>
              L1 {planLayerCounts.L1} / L2 {planLayerCounts.L2} / L3 {planLayerCounts.L3}
            </h3>
            <p className="small-text">
              The engine grouped the kept work into execution layers instead of dumping a flat task list.
            </p>
          </div>

          <div className="ui-card">
            <p className="eyebrow">Confidence posture</p>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "8px 0 6px", textTransform: "uppercase" }}>
              {confidenceState}
            </h3>
            <p className="small-text">{confidenceNote}</p>
          </div>
        </div>

        {currentSessionReport ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div className="ui-card">
              <h3 className="section-title">Failure modes</h3>
              {currentSessionReport.failure_modes.map((finding) => (
                <div key={finding.id} className="kv-row">
                  <span style={{ fontSize: 13 }}>{finding.name}</span>
                  <strong style={{ fontSize: 13, color: ds.accent }}>{finding.score}</strong>
                </div>
              ))}
            </div>
            <div className="ui-card">
              <h3 className="section-title">Response patterns</h3>
              {currentSessionReport.response_patterns.map((finding) => (
                <div key={finding.id} className="kv-row">
                  <span style={{ fontSize: 13 }}>{finding.name}</span>
                  <strong style={{ fontSize: 13, color: ds.accent }}>{finding.score}</strong>
                </div>
              ))}
            </div>
            <div className="ui-card">
              <h3 className="section-title">Current-session spine</h3>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                {currentSessionReport.report.diagnostic_spine.map((line) => (
                  <li key={line} className="small-text" style={{ marginBottom: 6 }}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="ui-card" style={{ marginBottom: 32 }}>
            <p className="eyebrow">Historical selection</p>
            <p className="body-text" style={{ marginTop: 8, color: "var(--color-text-muted)" }}>
              You are viewing a persisted diagnosis record. Live current-session diagnostics are only shown when the selected diagnosis matches the current run.
            </p>
          </div>
        )}

        {comparison ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div className="ui-card">
              <p className="eyebrow">Operational meaning</p>
              <p className="small-text" style={{ marginTop: 10 }}>{comparisonSummary}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                <span style={chip}>
                  {comparison.signalDelta >= 0 ? "+" : ""}
                  {comparison.signalDelta} signals
                </span>
                <span style={chip}>
                  {comparison.taskDelta >= 0 ? "+" : ""}
                  {comparison.taskDelta} tasks
                </span>
              </div>
            </div>
            <div className="ui-card">
              <p className="eyebrow">Newly surfaced signals</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {comparison.addedSignals.length ? (
                  comparison.addedSignals.map((signal) => (
                    <span key={signal} style={{ ...chip, background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                      {signal}
                    </span>
                  ))
                ) : (
                  <span className="small-text">No new signal families.</span>
                )}
              </div>
            </div>
            <div className="ui-card">
              <p className="eyebrow">Reduced or absent</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {comparison.removedSignals.length ? (
                  comparison.removedSignals.map((signal) => (
                    <span key={signal} style={{ ...chip, background: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
                      {signal}
                    </span>
                  ))
                ) : (
                  <span className="small-text">No reduced signal families.</span>
                )}
              </div>
            </div>
            <div className="ui-card">
              <p className="eyebrow">Comparison anchor</p>
              <div style={{ marginTop: 10 }}>
                <div className="kv-row">
                  <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Newest diagnosis</span>
                  <span style={{ fontSize: 13 }}>{formatTimestamp(comparison.newer.created_at)}</span>
                </div>
                <div className="kv-row" style={{ borderBottom: "none" }}>
                  <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Baseline diagnosis</span>
                  <span style={{ fontSize: 13 }}>{formatTimestamp(comparison.baseline.created_at)}</span>
                </div>
              </div>
              {comparison.mode === "latest_vs_selected" ? (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={() => onSelectEngineRun(comparison.newer.engine_run_id)}>
                    Return to latest diagnosis
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {selectedEngineRun ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="ui-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "14px 24px" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={chip}>{selectedEngineRun.load_classification}</span>
                <span style={chip}>{selectedEngineRun.ontology_version}</span>
                <span style={chip}>{selectedEngineRun.plan_task_count} tasks</span>
                {linkedPlanTitle ? <span style={{ ...chip, background: "var(--color-accent-soft)", color: "var(--color-accent)" }}>{linkedPlanTitle}</span> : null}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={onGenerateEnhancedReport} disabled={loadingEnhancedReport}>
                  {loadingEnhancedReport ? "Generating..." : "AI narrative"}
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport("markdown")} disabled={exporting}>
                  {exporting ? "..." : "Export MD"}
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport("json")} disabled={exporting}>
                  {exporting ? "..." : "Export JSON"}
                </button>
                <span className="small-text" style={{ marginLeft: 4 }}>{formatTimestamp(selectedEngineRun.created_at)}</span>
              </div>
            </div>

            {enhancedReport ? (
              <div className="ui-card" style={{ borderLeft: `4px solid ${ds.info}` }}>
                <p className="eyebrow">AI narrative</p>
                <p className="body-text" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{enhancedReport.markdown}</p>
                {enhancedReport.references.length ? (
                  <>
                    <p className="eyebrow" style={{ marginTop: 16 }}>Grounding</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {enhancedReport.references.map((reference) => (
                        <span key={`${reference.type}-${reference.id ?? reference.label}`} style={chip}>
                          {reference.type}: {reference.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div className="ui-card">
                <h3 className="section-title">Persisted diagnosis</h3>
                <p className="body-text" style={{ marginBottom: 12 }}>{selectedEngineRun.summary}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedEngineRun.active_signal_names.slice(0, 6).map((name) => (
                    <span key={name} style={chip}>{name}</span>
                  ))}
                </div>
              </div>
              <div className="ui-card">
                <h3 className="section-title">Diagnostic spine</h3>
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                  {selectedEngineRun.diagnostic_spine.map((line) => (
                    <li key={line} className="small-text" style={{ marginBottom: 6 }}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="ui-card">
                <h3 className="section-title">Investigation threads</h3>
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc", marginBottom: 16 }}>
                  {selectedEngineRun.investigation_threads.map((line) => (
                    <li key={line} className="small-text" style={{ marginBottom: 6 }}>{line}</li>
                  ))}
                </ul>
                <h3 className="section-title">Verification briefs</h3>
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                  {selectedEngineRun.verification_briefs.map((line) => (
                    <li key={line} className="small-text" style={{ marginBottom: 6 }}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>

            <details className="ui-card">
              <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--color-text-primary)" }}>
                Verification and debug
              </summary>
              <p className="small-text" style={{ marginTop: 10, marginBottom: 16 }}>
                Use this only when you need to inspect traceability, persisted markdown, or low-level engine artifacts.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="ui-card">
                  <h3 className="section-title">Trust surface</h3>
                  {loadingEngineRunDetail ? (
                    <p className="small-text">Loading persisted execution evidence...</p>
                  ) : selectedEngineRunDetail ? (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        <span style={chip}>{normalizedSignalCount} normalized signals</span>
                        <span style={chip}>{diagnosticSnapshotKeys.length} diagnostic snapshot fields</span>
                        <span style={chip}>{planSnapshotKeys.length} plan snapshot fields</span>
                        <span style={chip}>{selectedEngineRunDetail.report_markdown ? "Persisted markdown" : "No persisted markdown"}</span>
                      </div>
                      {selectedEngineRunDetail.report_markdown ? (
                        <p className="small-text">{selectedEngineRunDetail.report_markdown.slice(0, 320)}</p>
                      ) : (
                        <p className="small-text">No persisted markdown diagnosis was stored for this run.</p>
                      )}
                    </>
                  ) : (
                    <p className="small-text">No detailed engine-run evidence is available for this selection.</p>
                  )}
                </div>
                <div className="ui-card">
                  <h3 className="section-title">AI trace</h3>
                  {loadingEngineRunDetail ? (
                    <p className="small-text">Loading AI trace...</p>
                  ) : aiTraceEntries.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {aiTraceEntries.map(([key, value]) => (
                        <div key={key} className="kv-row">
                          <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{key}</span>
                          <span style={{ fontSize: 13, maxWidth: "60%", textAlign: "right", wordBreak: "break-word" }}>
                            {typeof value === "string" ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="small-text">No AI trace metadata was persisted for this run.</p>
                  )}
                </div>
              </div>
            </details>

            <div className="ui-card">
              <p className="eyebrow" style={{ marginBottom: 12 }}>Diagnosis history</p>
              {loadingReports ? (
                <p className="small-text">Loading diagnosis history...</p>
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
                        border: selectedEngineRunId === run.engine_run_id ? `2px solid ${ds.accent}` : "1px solid var(--color-border-subtle)",
                        background: selectedEngineRunId === run.engine_run_id ? "var(--color-accent-soft)" : "var(--color-surface)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{formatTimestamp(run.created_at)}</strong>
                      <span style={chip}>{run.load_classification}</span>
                      <span className="small-text" style={{ marginLeft: "auto" }}>{run.plan_task_count} tasks</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ui-card" style={{ textAlign: "center", padding: 48 }}>
            <p className="body-text">Run the engine after saving the assessment to generate the first persisted diagnosis.</p>
          </div>
        )}
      </PrimaryCanvas>
    </div>
  );
}

function buildNextMoveSummary({
  linkedPlanTitle,
  confidenceState,
  deferredCount,
  constrainedCount,
}: {
  linkedPlanTitle?: string | null;
  confidenceState: string;
  deferredCount: number;
  constrainedCount: number | null;
}) {
  const planReference = linkedPlanTitle ? `"${linkedPlanTitle}"` : "the linked plan";
  if (confidenceState.toUpperCase() === "PROVISIONAL") {
    return `${planReference} is still the right next move, but treat L2 and L3 work carefully until the weaker assumptions are verified. ${
      deferredCount > 0 && constrainedCount !== null
        ? `${constrainedCount} items were kept and ${deferredCount} were deferred to protect execution capacity.`
        : ""
    }`.trim();
  }

  return `${planReference} is the execution truth for this run. Move into it now and work the highest-priority kept items before reopening diagnosis.`;
}

function buildComparisonSummary(comparison: ReportComparison | null) {
  if (!comparison) {
    return "No comparison baseline is available yet.";
  }

  const signalDirection =
    comparison.signalDelta === 0
      ? "the signal picture stayed level"
      : comparison.signalDelta > 0
        ? `${comparison.signalDelta} additional signal families surfaced`
        : `${Math.abs(comparison.signalDelta)} signal families dropped away`;

  const taskDirection =
    comparison.taskDelta === 0
      ? "the kept plan size stayed stable"
      : comparison.taskDelta > 0
        ? `${comparison.taskDelta} more tasks were kept in the plan`
        : `${Math.abs(comparison.taskDelta)} fewer tasks were kept in the plan`;

  return `Compared with the baseline, ${signalDirection} and ${taskDirection}. Read this as a shift in what the engine now believes is worth acting on, not as raw system noise.`;
}
