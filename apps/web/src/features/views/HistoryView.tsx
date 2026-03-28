import { SectionCard } from "../../components/SectionCard";
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
    <SectionCard
      eyebrow="History"
      title="Assessment timeline"
      description="Every analyzed venue state becomes a reviewable operational record."
      actions={
        <>
          <button className="btn btn-secondary" onClick={onOpenAssessment}>
            New assessment
          </button>
          <button className="btn btn-primary" onClick={onOpenPlan}>
            Open plan
          </button>
        </>
      }
    >
      <div className="highlight-grid">
        <div className="focus-card focus-card-primary">
          <p className="section-eyebrow">Recorded snapshots</p>
          <h3>{assessments.length}</h3>
          <p>The venue timeline should show how operational reality changed over time, not just what the current state says.</p>
        </div>
        <div className="focus-card">
          <p className="section-eyebrow">Latest snapshot</p>
          <h3>{latestAssessment ? formatTimestamp(latestAssessment.created_at) : "None yet"}</h3>
          <p>
            {latestAssessment
              ? `${latestAssessment.selected_signal_count} signals, ${latestAssessment.plan_task_count} plan tasks.`
              : "Save the first assessment to create a durable operating timeline."}
          </p>
        </div>
        {comparison ? (
          <div className="focus-card">
            <p className="section-eyebrow">
              {comparison.mode === "selected_vs_latest" ? "Selected vs latest" : "Latest vs previous"}
            </p>
            <h3>{comparison.loadShift}</h3>
            <p>
              {comparison.signalDelta >= 0 ? "+" : ""}
              {comparison.signalDelta} signals, {comparison.taskDelta >= 0 ? "+" : ""}
              {comparison.taskDelta} plan tasks.
            </p>
          </div>
        ) : null}
      </div>

      {comparison ? (
        <div className="timeline-split comparison-grid">
          <div className="focus-card">
            <p className="section-eyebrow">Escalated or newly visible</p>
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
                <span>No resolved signals surfaced yet.</span>
              )}
            </div>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Comparison anchor</p>
            <div className="readiness-list compact-list">
              <div className="readiness-row">
                <strong>Newest snapshot</strong>
                <span>{formatTimestamp(comparison.newer.created_at)}</span>
              </div>
              <div className="readiness-row">
                <strong>Baseline snapshot</strong>
                <span>{formatTimestamp(comparison.baseline.created_at)}</span>
              </div>
            </div>
            <div className="sample-actions">
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

      {loading ? (
        <div className="empty-state">
          <p>Loading assessment history...</p>
        </div>
      ) : assessments.length ? (
        <div className="thread-list">
          {assessments.map((assessment) => (
            <div className={`history-card ${selectedAssessmentId === assessment.id ? "selected" : ""}`} key={assessment.id}>
              <div className="thread-row">
                <span>{formatTimestamp(assessment.created_at)}</span>
                <em>{assessment.plan_load_classification ?? "saved_only"}</em>
              </div>
              <p className="history-note">{assessment.notes ?? "No assessment notes captured."}</p>
              <div className="dependency-list">
                <span>{assessment.selected_signal_count} signals</span>
                <span>{assessment.plan_task_count} plan tasks</span>
                {assessment.ontology_id && (
                  <span style={{ opacity: 0.6 }}>{assessment.ontology_id}@{assessment.ontology_version}</span>
                )}
                {assessment.active_signal_names.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <div className="sample-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => onLoadAssessmentRecord(assessment.id)}
                  disabled={loadingAssessmentId === assessment.id}
                >
                  {loadingAssessmentId === assessment.id ? "Loading..." : "Load snapshot"}
                </button>
                {assessment.engine_run_id ? (
                  <button className="btn btn-secondary" onClick={() => onOpenReportRecord(assessment.engine_run_id!)}>
                    Open report
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No saved assessments yet. Analyze intake and save the first operational record.</p>
        </div>
      )}
    </SectionCard>
  );
}
