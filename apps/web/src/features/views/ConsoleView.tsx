import { SectionCard } from "../../components/SectionCard";
import {
  AuditEntryRecord,
  IntakePreviewResponse,
  IntegrationEventRecord,
  IntegrationHealthSummary,
  PlanExecutionSummary,
} from "../../lib/api";

type ConsoleViewProps = {
  organizationSlug: string;
  ontologyLabel: string;
  readiness: Record<string, string>;
  intakePreview: IntakePreviewResponse | null;
  executionSummary: PlanExecutionSummary | null;
  integrationSummary: IntegrationHealthSummary | null;
  integrationEvents: IntegrationEventRecord[];
  loadingIntegrationEvents: boolean;
  retryingIntegrationEventId: string | null;
  onRetryIntegrationEvent: (eventId: string) => void;
  auditEntries: AuditEntryRecord[];
  loadingAudit: boolean;
  formatTimestamp: (isoTimestamp: string) => string;
};

export function ConsoleView({
  organizationSlug,
  ontologyLabel,
  readiness,
  intakePreview,
  executionSummary,
  integrationSummary,
  integrationEvents,
  loadingIntegrationEvents,
  retryingIntegrationEventId,
  onRetryIntegrationEvent,
  auditEntries,
  loadingAudit,
  formatTimestamp,
}: ConsoleViewProps) {
  const latestAudit = auditEntries[0] ?? null;
  const topProviderPressure = integrationSummary?.provider_pressure[0] ?? null;

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Console"
        title="Platform state"
        description="This is the advanced surface for auditability, ontology posture, and execution context."
      >
        <div className="highlight-grid">
          <div className="focus-card focus-card-primary">
            <p className="section-eyebrow">Runtime posture</p>
            <h3>{readiness.engine ?? readiness.platform ?? "Configured"}</h3>
            <p>The console is where platform truth, auditability, and execution context stay visible together.</p>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Latest audit turn</p>
            <h3>{latestAudit ? formatTimestamp(latestAudit.created_at) : "No events yet"}</h3>
            <p>{latestAudit ? `${latestAudit.entity_type}.${latestAudit.action}` : "Operational mutations will surface here as the workspace is used."}</p>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Connector health</p>
            <h3>
              {integrationSummary
                ? `${integrationSummary.overdue_retry_count} overdue / ${integrationSummary.stale_event_count} stale`
                : "Loading..."}
            </h3>
            <p>
              {integrationSummary
                ? `${integrationSummary.retryable_event_count} retryable event(s) across ${integrationSummary.counts_by_provider.length} provider surface(s).`
                : "Sensor-layer posture will appear here once integration summary is loaded."}
            </p>
          </div>
        </div>

        <div className="readiness-list">
          <div className="readiness-row">
            <strong>Organization</strong>
            <span>{organizationSlug}</span>
          </div>
          <div className="readiness-row">
            <strong>Ontology</strong>
            <span>{intakePreview?.ontology_version ?? ontologyLabel}</span>
          </div>
          <div className="readiness-row">
            <strong>Ready tasks</strong>
            <span>{executionSummary?.next_executable_tasks.length ?? 0}</span>
          </div>
          <div className="readiness-row">
            <strong>Blocked tasks</strong>
            <span>{executionSummary?.blocked_tasks.length ?? 0}</span>
          </div>
          <div className="readiness-row">
            <strong>Overdue retries</strong>
            <span>{integrationSummary?.overdue_retry_count ?? 0}</span>
          </div>
          <div className="readiness-row">
            <strong>Stale connector events</strong>
            <span>{integrationSummary?.stale_event_count ?? 0}</span>
          </div>
          <div className="readiness-row">
            <strong>Highest connector pressure</strong>
            <span>
              {topProviderPressure
                ? `${topProviderPressure.provider} (${topProviderPressure.overdue_retry_count} overdue, ${topProviderPressure.stale_event_count} stale)`
                : "None"}
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Sensors"
        title="Recent integration activity"
        description="This is the live external-signal stream entering the canonical event boundary, including retry posture and normalized signal hints."
      >
        {loadingIntegrationEvents ? (
          <div className="empty-state">
            <p>Loading connector activity...</p>
          </div>
        ) : integrationEvents.length ? (
          <div className="thread-list">
            {integrationEvents.map((event) => (
              <div className="history-card" key={event.id}>
                <div className="thread-row">
                  <span>{formatTimestamp(event.occurred_at ?? event.created_at)}</span>
                  <em>
                    {event.provider}.{event.event_type}
                  </em>
                </div>
                <p className="history-note">
                  status {event.status} · attempts {event.attempt_count}
                  {event.error_message ? ` · ${event.error_message}` : ""}
                </p>
                <div className="dependency-list">
                  <span>venue: {event.venue_id}</span>
                  <span>ingest: {event.ingest_mode}</span>
                  {event.normalized_signal_ids.slice(0, 3).map((signalId) => (
                    <span key={`${event.id}-${signalId}`}>{signalId}</span>
                  ))}
                  {event.next_retry_at ? <span>retry {formatTimestamp(event.next_retry_at)}</span> : null}
                  {isOverdueRetry(event) ? <span>overdue retry</span> : null}
                  {isStaleEvent(event) ? <span>stale</span> : null}
                </div>
                {isRetryableEvent(event) ? (
                  <div className="session-card-actions">
                    <button
                      className="btn-secondary auth-action-button"
                      onClick={() => onRetryIntegrationEvent(event.id)}
                      disabled={retryingIntegrationEventId === event.id}
                    >
                      {retryingIntegrationEventId === event.id ? "Retrying..." : "Replay event"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No integration events have been observed yet.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Audit"
        title="Immutable activity trail"
        description="Operational mutations and copilot turns are captured here as the platform hardens."
      >
        {loadingAudit ? (
          <div className="empty-state">
            <p>Loading audit trail...</p>
          </div>
        ) : (
          <div className="thread-list">
            {auditEntries.map((entry) => (
              <div className="history-card" key={entry.id}>
                <div className="thread-row">
                  <span>{formatTimestamp(entry.created_at)}</span>
                  <em>
                    {entry.entity_type}.{entry.action}
                  </em>
                </div>
                <p className="history-note">{(entry.actor_name ?? "System")} touched {entry.entity_type}</p>
                <div className="dependency-list">
                  {Object.entries(entry.payload)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <span key={`${entry.id}-${key}`}>
                        {key}: {String(value)}
                      </span>
                    ))}
                </div>
              </div>
            ))}
            {!auditEntries.length ? (
              <div className="empty-state">
                <p>No audit events captured yet.</p>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function isRetryableEvent(event: IntegrationEventRecord) {
  return ["received", "failed", "errored", "retry_scheduled", "processing"].includes(event.status.toLowerCase()) || Boolean(event.error_message) || Boolean(event.next_retry_at);
}

function isOverdueRetry(event: IntegrationEventRecord) {
  return Boolean(event.next_retry_at && new Date(event.next_retry_at).getTime() <= Date.now());
}

function isStaleEvent(event: IntegrationEventRecord) {
  const active = ["received", "failed", "errored", "retry_scheduled", "processing"].includes(event.status.toLowerCase()) || Boolean(event.error_message);
  if (!active) {
    return false;
  }
  const referenceTimestamp = event.last_attempted_at ?? event.occurred_at ?? event.created_at;
  return Date.now() - new Date(referenceTimestamp).getTime() >= 30 * 60 * 1000;
}
