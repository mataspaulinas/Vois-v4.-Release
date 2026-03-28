import { SectionCard } from "../../components/SectionCard";
import {
  EnhancedReportResponse,
  EngineRunResponse,
  PersistedEngineRunDetailRecord,
  PersistedEngineRunRecord,
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
    <SectionCard
      eyebrow="Report"
      title="Diagnostic output"
      description="Failure modes, response patterns, and the persisted report history live here."
      actions={
        <>
          <button className="btn btn-secondary" onClick={onOpenAssessment}>
            Revisit assessment
          </button>
          <button className="btn btn-primary" onClick={onOpenPlan}>
            {linkedPlanTitle ? "Open linked plan" : "Move to plan"}
          </button>
        </>
      }
    >
      <div className="highlight-grid">
        <div className="focus-card focus-card-primary">
          <p className="section-eyebrow">Most likely breakdown</p>
          <h3>{topFailureMode}</h3>
          <p>The report should quickly tell you what system is most likely failing, not force you to read everything first.</p>
        </div>
        <div className="focus-card">
          <p className="section-eyebrow">Primary response logic</p>
          <h3>{topResponsePattern}</h3>
          <p>This is the operating correction pattern the engine currently thinks matters most.</p>
        </div>
        {comparison ? (
          <div className="focus-card">
            <p className="section-eyebrow">
              {comparison.mode === "latest_vs_selected" ? "Latest vs selected" : "Latest vs previous"}
            </p>
            <h3>{comparison.loadShift}</h3>
            <p>
              {comparison.signalDelta >= 0 ? "+" : ""}
              {comparison.signalDelta} signals, {comparison.taskDelta >= 0 ? "+" : ""}
              {comparison.taskDelta} tasks.
            </p>
          </div>
        ) : null}
      </div>

      {currentSessionReport ? (
        <div className="diagnostic-grid">
          <div className="diagnostic-column">
            <h3>Failure modes</h3>
            {currentSessionReport.failure_modes.map((finding) => (
              <div className="finding-row" key={finding.id}>
                <span>{finding.name}</span>
                <strong>{finding.score}</strong>
              </div>
            ))}
          </div>
          <div className="diagnostic-column">
            <h3>Response patterns</h3>
            {currentSessionReport.response_patterns.map((finding) => (
              <div className="finding-row" key={finding.id}>
                <span>{finding.name}</span>
                <strong>{finding.score}</strong>
              </div>
            ))}
          </div>
          <div className="diagnostic-column">
            <h3>Current-session spine</h3>
            <ul className="spine-list">
              {currentSessionReport.report.diagnostic_spine.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="focus-card">
          <p className="section-eyebrow">Historical selection</p>
          <p className="history-note">
            You are viewing a persisted report record. Live current-session diagnostics are only shown when the selected report matches the current run.
          </p>
        </div>
      )}

      {comparison ? (
        <div className="timeline-split comparison-grid">
          <div className="focus-card">
            <p className="section-eyebrow">Newly surfaced signals</p>
            <div className="dependency-list">
              {comparison.addedSignals.length ? (
                comparison.addedSignals.map((signal) => <span key={signal}>{signal}</span>)
              ) : (
                <span>No new signal families.</span>
              )}
            </div>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Reduced or absent</p>
            <div className="dependency-list">
              {comparison.removedSignals.length ? (
                comparison.removedSignals.map((signal) => <span key={signal}>{signal}</span>)
              ) : (
                <span>No reduced signal families.</span>
              )}
            </div>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Comparison anchor</p>
            <div className="readiness-list compact-list">
              <div className="readiness-row">
                <strong>Newest report</strong>
                <span>{formatTimestamp(comparison.newer.created_at)}</span>
              </div>
              <div className="readiness-row">
                <strong>Baseline report</strong>
                <span>{formatTimestamp(comparison.baseline.created_at)}</span>
              </div>
            </div>
            {comparison.mode === "latest_vs_selected" ? (
              <div className="sample-actions">
                <button className="btn btn-secondary" onClick={() => onSelectEngineRun(comparison.newer.engine_run_id)}>
                  Return to latest report
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedEngineRun ? (
        <div className="report-shell">
          <div className="report-toolbar">
            <div className="report-toolbar-left">
              <span className="rtb-chip">{selectedEngineRun.load_classification}</span>
              <span className="rtb-chip">{selectedEngineRun.ontology_version}</span>
              <span className="rtb-chip">{selectedEngineRun.plan_task_count} tasks</span>
              {linkedPlanTitle ? <span className="rtb-chip">{linkedPlanTitle}</span> : null}
            </div>
            <div className="report-toolbar-right">
              <button className="btn btn-secondary" onClick={onGenerateEnhancedReport} disabled={loadingEnhancedReport}>
                {loadingEnhancedReport ? "Generating..." : "AI narrative"}
              </button>
              <span>{formatTimestamp(selectedEngineRun.created_at)}</span>
            </div>
          </div>

          {enhancedReport ? (
            <div className="focus-card">
              <p className="section-eyebrow">AI-enhanced narrative</p>
              <p className="history-detail report-markdown">{enhancedReport.markdown}</p>
              {enhancedReport.references.length ? (
                <>
                  <p className="section-eyebrow" style={{ marginTop: "var(--spacing-sm)" }}>
                    Grounding
                  </p>
                  <div className="dependency-list">
                    {enhancedReport.references.map((reference) => (
                      <span key={`${reference.type}-${reference.id ?? reference.label}`}>
                        {reference.type}: {reference.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="diagnostic-grid">
            <div className="diagnostic-column">
              <h3>Persisted report</h3>
              <p className="history-note">{selectedEngineRun.summary}</p>
              <div className="dependency-list">
                {selectedEngineRun.active_signal_names.slice(0, 6).map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            </div>
            <div className="diagnostic-column">
              <h3>Diagnostic spine</h3>
              <ul className="spine-list">
                {selectedEngineRun.diagnostic_spine.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="diagnostic-column">
              <h3>Investigation threads</h3>
              <ul className="spine-list">
                {selectedEngineRun.investigation_threads.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <h3>Verification briefs</h3>
              <ul className="spine-list">
                {selectedEngineRun.verification_briefs.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="diagnostic-grid">
            <div className="diagnostic-column">
              <h3>Trust surface</h3>
              {loadingEngineRunDetail ? (
                <p className="history-note">Loading persisted execution evidence...</p>
              ) : selectedEngineRunDetail ? (
                <>
                  <div className="dependency-list">
                    <span>{normalizedSignalCount} normalized signals</span>
                    <span>{diagnosticSnapshotKeys.length} diagnostic snapshot fields</span>
                    <span>{planSnapshotKeys.length} plan snapshot fields</span>
                    <span>{selectedEngineRunDetail.report_markdown ? "Persisted markdown" : "No persisted markdown"}</span>
                  </div>
                  {selectedEngineRunDetail.report_markdown ? (
                    <p className="history-note">{selectedEngineRunDetail.report_markdown.slice(0, 320)}</p>
                  ) : (
                    <p className="history-note">No persisted markdown report was stored for this run.</p>
                  )}
                </>
              ) : (
                <p className="history-note">No detailed engine-run evidence is available for this selection.</p>
              )}
            </div>
            <div className="diagnostic-column">
              <h3>AI trace</h3>
              {loadingEngineRunDetail ? (
                <p className="history-note">Loading AI trace...</p>
              ) : aiTraceEntries.length ? (
                <div className="dependency-list">
                  {aiTraceEntries.map(([key, value]) => (
                    <span key={key}>
                      {key}: {typeof value === "string" ? value : JSON.stringify(value)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="history-note">No AI trace metadata was persisted for this run.</p>
              )}
            </div>
          </div>

          <div className="report-history-list">
            {loadingReports ? (
              <div className="empty-state compact">
                <p>Loading report history...</p>
              </div>
            ) : (
              engineRunHistory.map((run) => (
                <button
                  className={`report-history-button ${selectedEngineRunId === run.engine_run_id ? "selected" : ""}`}
                  key={run.engine_run_id}
                  onClick={() => onSelectEngineRun(run.engine_run_id)}
                >
                  <strong>{formatTimestamp(run.created_at)}</strong>
                  <span>{run.load_classification}</span>
                  <span>{run.plan_task_count} tasks</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Run the engine after saving the assessment to generate the first persisted diagnostic readout.</p>
        </div>
      )}
    </SectionCard>
  );
}
