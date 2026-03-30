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

/* ── design tokens ─────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: "4px 0 0" },
  body: { fontSize: 15, color: "#525252", lineHeight: 1.55, margin: 0 },
  small: { fontSize: 13, color: "#737373", lineHeight: 1.5, margin: 0 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: 0 },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" } as React.CSSProperties,
  metricNumber: { fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#0A0A0A", margin: 0, lineHeight: 1.1 },
  accent: "#6C5CE7",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  btnSecondary: { background: "#FFFFFF", color: "#0A0A0A", border: "1px solid #E5E5E5", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  countPill: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#F5F5F5", color: "#737373" } as React.CSSProperties,
  statusDot: (color: string) => ({ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }) as React.CSSProperties,
} as const;

const eventStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "processed" || s === "completed") return ds.success;
  if (s === "failed" || s === "errored") return ds.danger;
  if (s === "retry_scheduled" || s === "processing") return ds.warning;
  return "#A3A3A3";
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
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Page header ────────────────────────── */}
      <div>
        <p style={ds.eyebrow}>SYSTEM</p>
        <h1 style={ds.pageTitle}>Console</h1>
      </div>

      {/* ── Platform state ─────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Console</p>
        <h2 style={ds.sectionTitle}>Platform state</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>This is the advanced surface for auditability, ontology posture, and execution context.</p>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ ...ds.card, borderLeft: `4px solid ${ds.accent}` }}>
            <p style={ds.eyebrow}>Runtime posture</p>
            <p style={{ ...ds.metricNumber, marginTop: 8, fontSize: 20 }}>{readiness.engine ?? readiness.platform ?? "Configured"}</p>
            <p style={{ ...ds.small, marginTop: 6 }}>The console is where platform truth, auditability, and execution context stay visible together.</p>
          </div>
          <div style={ds.card}>
            <p style={ds.eyebrow}>Latest audit turn</p>
            <p style={{ ...ds.metricNumber, marginTop: 8, fontSize: latestAudit ? 16 : 36, fontFamily: latestAudit ? "inherit" : "'JetBrains Mono', monospace" }}>
              {latestAudit ? formatTimestamp(latestAudit.created_at) : "No events yet"}
            </p>
            <p style={{ ...ds.small, marginTop: 6 }}>
              {latestAudit ? `${latestAudit.entity_type}.${latestAudit.action}` : "Operational mutations will surface here as the workspace is used."}
            </p>
          </div>
          <div style={ds.card}>
            <p style={ds.eyebrow}>Connector health</p>
            <p style={{ ...ds.metricNumber, marginTop: 8, fontSize: 18 }}>
              {integrationSummary
                ? `${integrationSummary.overdue_retry_count} overdue / ${integrationSummary.stale_event_count} stale`
                : "Loading..."}
            </p>
            <p style={{ ...ds.small, marginTop: 6 }}>
              {integrationSummary
                ? `${integrationSummary.retryable_event_count} retryable event(s) across ${integrationSummary.counts_by_provider.length} provider surface(s).`
                : "Sensor-layer posture will appear here once integration summary is loaded."}
            </p>
          </div>
        </div>

        {/* Readiness list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {([
            ["Organization", organizationSlug],
            ["Ontology", intakePreview?.ontology_version ?? ontologyLabel],
            ["Ready tasks", String(executionSummary?.next_executable_tasks.length ?? 0)],
            ["Blocked tasks", String(executionSummary?.blocked_tasks.length ?? 0)],
            ["Overdue retries", String(integrationSummary?.overdue_retry_count ?? 0)],
            ["Stale connector events", String(integrationSummary?.stale_event_count ?? 0)],
            ["Highest connector pressure", topProviderPressure
              ? `${topProviderPressure.provider} (${topProviderPressure.overdue_retry_count} overdue, ${topProviderPressure.stale_event_count} stale)`
              : "None"],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#737373", fontWeight: 500 }}>{label}</span>
              <span style={{ color: "#0A0A0A", fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Integration events ─────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Sensors</p>
        <h2 style={ds.sectionTitle}>Recent integration activity</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>This is the live external-signal stream entering the canonical event boundary, including retry posture and normalized signal hints.</p>

        {loadingIntegrationEvents ? (
          <p style={{ ...ds.small, textAlign: "center", padding: 32 }}>Loading connector activity...</p>
        ) : integrationEvents.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {integrationEvents.map((event) => (
              <div key={event.id} style={{ ...ds.card, padding: "14px 18px", borderLeft: `4px solid ${eventStatusColor(event.status)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>
                    {formatTimestamp(event.occurred_at ?? event.created_at)}
                  </span>
                  <span style={{ fontSize: 11, color: "#A3A3A3" }}>
                    {event.provider}.{event.event_type}
                  </span>
                </div>
                <p style={{ ...ds.small, marginBottom: 8 }}>
                  status {event.status} -- attempts {event.attempt_count}
                  {event.error_message ? ` -- ${event.error_message}` : ""}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: isRetryableEvent(event) ? 10 : 0 }}>
                  <span style={ds.countPill}>venue: {event.venue_id}</span>
                  <span style={ds.countPill}>ingest: {event.ingest_mode}</span>
                  {event.normalized_signal_ids.slice(0, 3).map((signalId) => (
                    <span key={`${event.id}-${signalId}`} style={ds.countPill}>{signalId}</span>
                  ))}
                  {event.next_retry_at ? <span style={{ ...ds.countPill, background: "#FFFBEB", color: ds.warning }}>retry {formatTimestamp(event.next_retry_at)}</span> : null}
                  {isOverdueRetry(event) ? <span style={{ ...ds.countPill, background: "#FEF2F2", color: ds.danger }}>overdue retry</span> : null}
                  {isStaleEvent(event) ? <span style={{ ...ds.countPill, background: "#FEF2F2", color: ds.danger }}>stale</span> : null}
                </div>
                {isRetryableEvent(event) ? (
                  <button
                    style={ds.btnSecondary}
                    onClick={() => onRetryIntegrationEvent(event.id)}
                    disabled={retryingIntegrationEventId === event.id}
                  >
                    {retryingIntegrationEventId === event.id ? "Retrying..." : "Replay event"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ ...ds.small, textAlign: "center", padding: 32 }}>No integration events have been observed yet.</p>
        )}
      </section>

      {/* ── Audit trail ────────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Audit</p>
        <h2 style={ds.sectionTitle}>Immutable activity trail</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>Operational mutations and copilot turns are captured here as the platform hardens.</p>

        {loadingAudit ? (
          <p style={{ ...ds.small, textAlign: "center", padding: 32 }}>Loading audit trail...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {auditEntries.map((entry) => (
              <div key={entry.id} style={{ ...ds.card, padding: "14px 18px", borderLeft: "4px solid #E5E5E5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{formatTimestamp(entry.created_at)}</span>
                  <span style={{ fontSize: 11, color: "#A3A3A3" }}>{entry.entity_type}.{entry.action}</span>
                </div>
                <p style={{ ...ds.small, marginBottom: 8 }}>{(entry.actor_name ?? "System")} touched {entry.entity_type}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(entry.payload).slice(0, 4).map(([key, value]) => (
                    <span key={`${entry.id}-${key}`} style={ds.countPill}>{key}: {String(value)}</span>
                  ))}
                </div>
              </div>
            ))}
            {!auditEntries.length ? (
              <p style={{ ...ds.small, textAlign: "center", padding: 32 }}>No audit events captured yet.</p>
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
