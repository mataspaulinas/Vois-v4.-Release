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

/* ── design tokens ─────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: "4px 0 0" },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: 0 },
  body: { fontSize: 15, color: "#525252", lineHeight: 1.55, margin: 0 },
  small: { fontSize: 13, color: "#737373", lineHeight: 1.5, margin: 0 },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" } as React.CSSProperties,
  accent: "#6C5CE7",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  btnSecondary: { background: "#FFFFFF", color: "#0A0A0A", border: "1px solid #E5E5E5", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 180ms ease" } as React.CSSProperties,
  tag: { display: "inline-block", padding: "2px 10px", borderRadius: 10, background: "#F5F5F5", fontSize: 11, color: "#737373", fontWeight: 500 } as React.CSSProperties,
  rowLabel: { fontSize: 13, fontWeight: 600, color: "#0A0A0A" } as React.CSSProperties,
  rowValue: { fontSize: 13, color: "#525252" } as React.CSSProperties,
} as const;

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
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Hero ─────────────────────────────────── */}
      <section style={{ ...ds.card, padding: "32px 32px 28px" }}>
        <p style={ds.eyebrow}>SYSTEM</p>
        <h1 style={ds.pageTitle}>Platform state</h1>
        <p style={{ ...ds.small, marginTop: 8, maxWidth: 720 }}>
          Advanced surface for auditability, ontology posture, and execution context.
        </p>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
          <div style={{ ...ds.card, background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.12)" }}>
            <p style={{ ...ds.eyebrow, marginBottom: 6 }}>Runtime posture</p>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", display: "block" }}>
              {readiness.engine ?? readiness.platform ?? "Configured"}
            </span>
            <p style={{ ...ds.small, marginTop: 4 }}>Platform truth, auditability, and execution context stay visible together.</p>
          </div>
          <div style={ds.card}>
            <p style={{ ...ds.eyebrow, marginBottom: 6 }}>Latest audit turn</p>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", display: "block" }}>
              {latestAudit ? formatTimestamp(latestAudit.created_at) : "No events yet"}
            </span>
            <p style={{ ...ds.small, marginTop: 4 }}>
              {latestAudit ? `${latestAudit.entity_type}.${latestAudit.action}` : "Operational mutations will surface here as the workspace is used."}
            </p>
          </div>
          <div style={ds.card}>
            <p style={{ ...ds.eyebrow, marginBottom: 6 }}>Connector health</p>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", display: "block" }}>
              {integrationSummary
                ? `${integrationSummary.overdue_retry_count} overdue / ${integrationSummary.stale_event_count} stale`
                : "Loading..."}
            </span>
            <p style={{ ...ds.small, marginTop: 4 }}>
              {integrationSummary
                ? `${integrationSummary.retryable_event_count} retryable event(s) across ${integrationSummary.counts_by_provider.length} provider surface(s).`
                : "Sensor-layer posture will appear here once integration summary is loaded."}
            </p>
          </div>
        </div>

        {/* Readiness rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 24, borderTop: "1px solid #E5E5E5", paddingTop: 16 }}>
          {([
            ["Organization", organizationSlug],
            ["Ontology", intakePreview?.ontology_version ?? ontologyLabel],
            ["Ready tasks", String(executionSummary?.next_executable_tasks.length ?? 0)],
            ["Blocked tasks", String(executionSummary?.blocked_tasks.length ?? 0)],
            ["Overdue retries", String(integrationSummary?.overdue_retry_count ?? 0)],
            ["Stale connector events", String(integrationSummary?.stale_event_count ?? 0)],
            ["Highest connector pressure", topProviderPressure ? `${topProviderPressure.provider} (${topProviderPressure.overdue_retry_count} overdue, ${topProviderPressure.stale_event_count} stale)` : "None"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F5F5" }}>
              <span style={ds.rowLabel}>{label}</span>
              <span style={ds.rowValue}>{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sensors ──────────────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>SENSORS</p>
        <h2 style={ds.sectionTitle}>Recent integration activity</h2>
        <p style={{ ...ds.small, marginTop: 4, maxWidth: 720 }}>
          Live external-signal stream entering the canonical event boundary, including retry posture and normalized signal hints.
        </p>

        {loadingIntegrationEvents ? (
          <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>Loading connector activity...</p>
        ) : integrationEvents.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            {integrationEvents.map((event) => (
              <div key={event.id} style={{ ...ds.card, padding: "14px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#0A0A0A", fontWeight: 500 }}>{formatTimestamp(event.occurred_at ?? event.created_at)}</span>
                  <span style={{ color: "#737373" }}>{event.provider}.{event.event_type}</span>
                </div>
                <p style={{ ...ds.small, margin: "0 0 8px" }}>
                  status {event.status} -- attempts {event.attempt_count}
                  {event.error_message ? ` -- ${event.error_message}` : ""}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={ds.tag}>venue: {event.venue_id}</span>
                  <span style={ds.tag}>ingest: {event.ingest_mode}</span>
                  {event.normalized_signal_ids.slice(0, 3).map((signalId) => (
                    <span key={`${event.id}-${signalId}`} style={ds.tag}>{signalId}</span>
                  ))}
                  {event.next_retry_at ? <span style={ds.tag}>retry {formatTimestamp(event.next_retry_at)}</span> : null}
                  {isOverdueRetry(event) ? <span style={{ ...ds.tag, background: "rgba(239,68,68,0.08)", color: ds.danger }}>overdue retry</span> : null}
                  {isStaleEvent(event) ? <span style={{ ...ds.tag, background: "rgba(245,158,11,0.08)", color: ds.warning }}>stale</span> : null}
                </div>
                {isRetryableEvent(event) ? (
                  <div style={{ marginTop: 10 }}>
                    <button
                      style={{ ...ds.btnSecondary, fontSize: 11, padding: "4px 12px" }}
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
          <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>No integration events have been observed yet.</p>
        )}
      </section>

      {/* ── Audit ────────────────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>AUDIT</p>
        <h2 style={ds.sectionTitle}>Immutable activity trail</h2>
        <p style={{ ...ds.small, marginTop: 4 }}>Operational mutations and copilot turns are captured here as the platform hardens.</p>

        {loadingAudit ? (
          <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>Loading audit trail...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            {auditEntries.map((entry) => (
              <div key={entry.id} style={{ ...ds.card, padding: "14px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#0A0A0A", fontWeight: 500 }}>{formatTimestamp(entry.created_at)}</span>
                  <span style={{ color: "#737373" }}>{entry.entity_type}.{entry.action}</span>
                </div>
                <p style={{ ...ds.small, margin: "0 0 8px" }}>{(entry.actor_name ?? "System")} touched {entry.entity_type}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(entry.payload)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <span key={`${entry.id}-${key}`} style={ds.tag}>{key}: {String(value)}</span>
                    ))}
                </div>
              </div>
            ))}
            {!auditEntries.length ? (
              <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>No audit events captured yet.</p>
            ) : null}
          </div>
        )}
      </section>
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
