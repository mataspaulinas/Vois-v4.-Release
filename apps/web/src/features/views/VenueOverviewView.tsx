import { SectionCard } from "../../components/SectionCard";
import {
  AssessmentHistoryItem,
  AssessmentRecord,
  AuditEntryRecord,
  IntakePreviewResponse,
  PersistedEngineRunRecord,
  PlanExecutionSummary,
  PlanRecord,
  ProgressEntryRecord,
  Venue,
} from "../../lib/api";

type VenueOverviewViewProps = {
  venue: Venue;
  ontologyLabel: string;
  intakePreview: IntakePreviewResponse | null;
  savedAssessment: AssessmentRecord | null;
  assessmentHistory: AssessmentHistoryItem[];
  selectedEngineRun: PersistedEngineRunRecord | null;
  latestPlan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  progressEntries: ProgressEntryRecord[];
  auditEntries: AuditEntryRecord[];
  formatTimestamp: (isoTimestamp: string) => string;
  onOpenAssessment: () => void;
  onOpenReport: () => void;
  onOpenPlan: () => void;
};

export function VenueOverviewView({
  venue,
  ontologyLabel,
  intakePreview,
  savedAssessment,
  assessmentHistory,
  selectedEngineRun,
  latestPlan,
  executionSummary,
  progressEntries,
  auditEntries,
  formatTimestamp,
  onOpenAssessment,
  onOpenReport,
  onOpenPlan,
}: VenueOverviewViewProps) {
  const nextMove = describeVenueNextMove({
    savedAssessment,
    selectedEngineRun,
    latestPlan,
    executionSummary,
  });

  return (
    <div className="view-stack">
      <section className="venue-hero compact">
        <div>
          <p className="hero-badge">{venue.status}</p>
          <h1>{venue.name}</h1>
          <p className="hero-copy">
            {venue.concept ?? "Operational workspace"} {venue.location ? `| ${venue.location}` : ""}{" "}
            {venue.size_note ? `| ${venue.size_note}` : ""}
          </p>
        </div>
      </section>

      <div className="view-grid">
        <SectionCard
          eyebrow="Overview"
          title="Current operating picture"
          description="This is the fast read on where the venue stands right now."
        >
          <div className="readiness-list">
            <div className="readiness-row">
              <strong>Detected signals</strong>
              <span>{intakePreview?.detected_signals.length ?? 0}</span>
            </div>
            <div className="readiness-row">
              <strong>Assessment status</strong>
              <span>{savedAssessment ? "Saved and reviewable" : "No saved assessment yet"}</span>
            </div>
            <div className="readiness-row">
              <strong>Completion</strong>
              <span>{Math.round(executionSummary?.completion_percentage ?? 0)}%</span>
            </div>
            <div className="readiness-row">
              <strong>Ontology</strong>
              <span>{intakePreview?.ontology_version ?? ontologyLabel}</span>
            </div>
            <div className="readiness-row">
              <strong>Assessment history</strong>
              <span>{assessmentHistory.length}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Direction"
          title="What matters now"
          description="This is the current recommended move based on what the venue has, not a generic suggestion."
          actions={
            <>
              <button className="btn btn-secondary" onClick={onOpenAssessment}>
                Assessment
              </button>
              <button className="btn btn-secondary" onClick={onOpenReport}>
                Report
              </button>
              <button className="btn btn-primary" onClick={onOpenPlan}>
                Plan
              </button>
            </>
          }
        >
          <div className="focus-panel">
            <div className="focus-card focus-card-primary">
              <p className="section-eyebrow">Recommended next move</p>
              <h3>Go to the next leverage point</h3>
              <p>{nextMove}</p>
            </div>
            <div className="focus-card">
              <p className="section-eyebrow">Latest diagnostic</p>
              <div className="readiness-list">
                <div className="readiness-row">
                  <strong>Last report</strong>
                  <span>{selectedEngineRun ? formatTimestamp(selectedEngineRun.created_at) : "not generated"}</span>
                </div>
                <div className="readiness-row">
                  <strong>Load</strong>
                  <span>{selectedEngineRun?.load_classification ?? "unknown"}</span>
                </div>
                <div className="readiness-row">
                  <strong>Plan tasks</strong>
                  <span>{selectedEngineRun?.plan_task_count ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="view-grid">
        <SectionCard
          eyebrow="Execution"
          title="Execution pulse"
          description="Ready work, blocked work, and last movement should be visible in one glance."
        >
          <div className="timeline-split">
            <div>
              <h3 className="subsection-title">Ready now</h3>
              <ul className="spine-list">
                {(executionSummary?.next_executable_tasks ?? []).slice(0, 4).map((task) => (
                  <li key={task.task_id}>{task.title}</li>
                ))}
                {!executionSummary?.next_executable_tasks.length ? <li>No ready tasks.</li> : null}
              </ul>
            </div>
            <div>
              <h3 className="subsection-title">Blocked</h3>
              <ul className="spine-list">
                {(executionSummary?.blocked_tasks ?? []).slice(0, 4).map((task) => (
                  <li key={task.task_id}>
                    {task.title}: {task.blocking_dependency_ids.join(", ")}
                  </li>
                ))}
                {!executionSummary?.blocked_tasks.length ? <li>No blocked tasks.</li> : null}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Movement"
          title="Recent movement"
          description="Progress and audit together show whether the venue is moving or just discussing movement."
        >
          <div className="timeline-split">
            <div>
              <h3 className="subsection-title">Progress</h3>
              <div className="thread-list">
                {progressEntries.slice(0, 4).map((entry) => (
                  <div className="history-card" key={entry.id}>
                    <div className="thread-row">
                      <span>{formatTimestamp(entry.created_at)}</span>
                      <em>{entry.status}</em>
                    </div>
                    <p className="history-note">{entry.summary}</p>
                  </div>
                ))}
                {!progressEntries.length ? (
                  <div className="empty-state compact">
                    <p>No progress logged yet.</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <h3 className="subsection-title">Audit</h3>
              <div className="thread-list">
                {auditEntries.slice(0, 4).map((entry) => (
                  <div className="history-card" key={entry.id}>
                    <div className="thread-row">
                      <span>{formatTimestamp(entry.created_at)}</span>
                      <em>
                        {entry.entity_type}.{entry.action}
                      </em>
                    </div>
                    <p className="history-note">{entry.actor_name ?? "System"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function describeVenueNextMove({
  savedAssessment,
  selectedEngineRun,
  latestPlan,
  executionSummary,
}: {
  savedAssessment: AssessmentRecord | null;
  selectedEngineRun: PersistedEngineRunRecord | null;
  latestPlan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
}) {
  if (!savedAssessment) {
    return "Capture and save a fresh assessment first. The venue still needs a trustworthy picture of current reality.";
  }
  if (!selectedEngineRun) {
    return "The assessment exists, but the report is not current yet. Run the engine and generate the diagnostic readout.";
  }
  if (!latestPlan) {
    return "The report exists, but the execution surface is still incomplete. Move into the plan view and materialize the current tasks.";
  }
  if ((executionSummary?.next_executable_tasks.length ?? 0) > 0) {
    return "There is ready work available now. Open the plan and move the next executable task forward.";
  }
  if ((executionSummary?.blocked_tasks.length ?? 0) > 0) {
    return "Execution is bottlenecked. The best move is to clear the dependency block before adding new activity.";
  }
  return "The venue is stable enough to review progress quality, inspect the report again, or begin the next assessment cycle.";
}
