import { SectionCard } from "../../components/SectionCard";
import {
  EscalationRecord,
  FollowUpRecord,
  PlanRecord,
  ProgressEntryRecord,
} from "../../lib/api";

type TeamPulseProps = {
  followUps: FollowUpRecord[];
  escalations: EscalationRecord[];
  progressEntries: ProgressEntryRecord[];
  plan: PlanRecord | null;
  loading: boolean;
  formatTimestamp: (iso: string) => string;
};

export function TeamPulse({
  followUps,
  escalations,
  progressEntries,
  plan,
  loading,
  formatTimestamp,
}: TeamPulseProps) {
  const tasks = plan?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;
  const overdueFollowUps = followUps.filter((fu) => fu.is_overdue);
  const openEscalations = escalations.filter((e) => e.status === "open");

  // Recent activity from progress entries
  const recentActivity = progressEntries.slice(0, 15);

  // Friction flags: overdue follow-ups + open escalations + blocked tasks
  const frictionItems: { label: string; severity: string; detail: string }[] = [];
  for (const fu of overdueFollowUps) {
    frictionItems.push({
      label: `Overdue: ${fu.title}`,
      severity: "high",
      detail: `Due ${formatTimestamp(fu.due_at)}. Assigned to: ${fu.assigned_to ?? "unassigned"}.`,
    });
  }
  for (const esc of openEscalations) {
    frictionItems.push({
      label: `Escalation: ${esc.reason.slice(0, 60)}`,
      severity: esc.severity === "critical" || esc.severity === "high" ? "critical" : "medium",
      detail: `Severity: ${esc.severity}. Created ${formatTimestamp(esc.created_at)}.`,
    });
  }
  for (const task of tasks.filter((t) => t.status === "blocked")) {
    frictionItems.push({
      label: `Blocked: ${task.title}`,
      severity: "medium",
      detail: "Task cannot proceed until dependencies are cleared.",
    });
  }

  const SEVERITY_COLORS: Record<string, string> = {
    critical: "var(--sunrise)",
    high: "var(--sunrise)",
    medium: "var(--gold)",
    low: "var(--sky)",
  };

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Team"
        title="Team pulse"
        description="Who did what, where the friction is, and what needs attention."
      >
        {loading ? (
          <div className="empty-state"><p>Loading team pulse...</p></div>
        ) : (
          <>
            <div className="highlight-grid">
              <div className="focus-card">
                <div className="focus-card-value">{completedCount}</div>
                <div className="focus-card-label">Completed</div>
              </div>
              <div className="focus-card">
                <div className="focus-card-value">{inProgressCount}</div>
                <div className="focus-card-label">In progress</div>
              </div>
              <div className="focus-card" style={{ borderLeft: blockedCount > 0 ? "3px solid var(--sunrise)" : undefined }}>
                <div className="focus-card-value">{blockedCount}</div>
                <div className="focus-card-label">Blocked</div>
              </div>
              <div className="focus-card" style={{ borderLeft: frictionItems.length > 0 ? "3px solid var(--gold)" : undefined }}>
                <div className="focus-card-value">{frictionItems.length}</div>
                <div className="focus-card-label">Friction flags</div>
              </div>
            </div>

            {/* Friction flags */}
            {frictionItems.length > 0 ? (
              <div style={{ marginTop: "var(--spacing-lg)" }}>
                <h4 style={{ marginBottom: "var(--spacing-sm)", color: "var(--text-secondary)" }}>Friction flags</h4>
                {frictionItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "var(--spacing-sm) var(--spacing-md)",
                      borderLeft: `3px solid ${SEVERITY_COLORS[item.severity] ?? "var(--muted)"}`,
                      marginBottom: "var(--spacing-xs)",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-raised)",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Recent activity */}
            {recentActivity.length > 0 ? (
              <div style={{ marginTop: "var(--spacing-lg)" }}>
                <h4 style={{ marginBottom: "var(--spacing-sm)", color: "var(--text-secondary)" }}>Recent activity</h4>
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "var(--spacing-xs) var(--spacing-sm)",
                      marginBottom: "var(--spacing-xs)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{entry.summary}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatTimestamp(entry.created_at)}</span>
                    </div>
                    {entry.detail ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{entry.detail}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
