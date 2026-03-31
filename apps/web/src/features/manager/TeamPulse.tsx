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
    critical: "var(--color-danger)",
    high: "var(--color-danger)",
    medium: "var(--color-warning)",
    low: "var(--color-info)",
  };

  const statCards: { value: number; label: string; accent?: string }[] = [
    { value: completedCount, label: "Completed", accent: "var(--color-success)" },
    { value: inProgressCount, label: "In progress", accent: "var(--color-accent)" },
    { value: blockedCount, label: "Blocked", accent: blockedCount > 0 ? "var(--color-danger)" : undefined },
    { value: frictionItems.length, label: "Friction flags", accent: frictionItems.length > 0 ? "var(--color-warning)" : undefined },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
      {/* ---- Page header ---- */}
      <div>
        <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 4 }}>
          EXECUTION
        </div>
        <h1 style={{ fontSize: "var(--text-page)", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Team pulse
        </h1>
        <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
          Who did what, where the friction is, and what needs attention.
        </p>
      </div>

      {loading ? (
        <div style={{
          background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
          fontSize: "var(--text-body)", color: "var(--color-text-muted)",
        }}>
          Loading team pulse...
        </div>
      ) : (
        <>
          {/* ---- Stat cards ---- */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {statCards.map((card) => (
              <div
                key={card.label}
                style={{
                  background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "20px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  borderLeft: card.accent ? `3px solid ${card.accent}` : undefined,
                }}
              >
                <div style={{ fontSize: "var(--text-page)", fontWeight: 700, color: "var(--color-text-primary)" }}>{card.value}</div>
                <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* ---- Friction flags ---- */}
          {frictionItems.length > 0 ? (
            <div style={{
              background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
                Friction flags
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {frictionItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 16px",
                      borderLeft: `3px solid ${SEVERITY_COLORS[item.severity] ?? "var(--color-text-muted)"}`,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{item.label}</div>
                    <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ---- Recent activity ---- */}
          {recentActivity.length > 0 ? (
            <div style={{
              background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
                Recent activity
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{entry.summary}</span>
                      <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", flexShrink: 0, marginLeft: 12 }}>
                        {formatTimestamp(entry.created_at)}
                      </span>
                    </div>
                    {entry.detail ? (
                      <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: 2 }}>{entry.detail}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
