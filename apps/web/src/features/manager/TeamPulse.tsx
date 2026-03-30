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
    critical: "#EF4444",
    high: "#EF4444",
    medium: "#F59E0B",
    low: "#6366F1",
  };

  const statCards: { value: number; label: string; accent?: string }[] = [
    { value: completedCount, label: "Completed", accent: "#10B981" },
    { value: inProgressCount, label: "In progress", accent: "#6C5CE7" },
    { value: blockedCount, label: "Blocked", accent: blockedCount > 0 ? "#EF4444" : undefined },
    { value: frictionItems.length, label: "Friction flags", accent: frictionItems.length > 0 ? "#F59E0B" : undefined },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
      {/* ---- Page header ---- */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
          EXECUTION
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>
          Team pulse
        </h1>
        <p style={{ fontSize: 15, color: "#737373", margin: "4px 0 0" }}>
          Who did what, where the friction is, and what needs attention.
        </p>
      </div>

      {loading ? (
        <div style={{
          background: "#FFFFFF", borderRadius: 12, padding: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
          fontSize: 15, color: "#A3A3A3",
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
                  background: "#FFFFFF", borderRadius: 12, padding: "20px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  borderLeft: card.accent ? `3px solid ${card.accent}` : undefined,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A" }}>{card.value}</div>
                <div style={{ fontSize: 13, color: "#A3A3A3", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* ---- Friction flags ---- */}
          {frictionItems.length > 0 ? (
            <div style={{
              background: "#FFFFFF", borderRadius: 12, padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 16px" }}>
                Friction flags
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {frictionItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 16px",
                      borderLeft: `3px solid ${SEVERITY_COLORS[item.severity] ?? "#A3A3A3"}`,
                      borderRadius: 8,
                      background: "#FAFAFA",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: "#737373", marginTop: 2 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ---- Recent activity ---- */}
          {recentActivity.length > 0 ? (
            <div style={{
              background: "#FFFFFF", borderRadius: 12, padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 16px" }}>
                Recent activity
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    style={{ padding: "8px 12px", borderRadius: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{entry.summary}</span>
                      <span style={{ fontSize: 13, color: "#A3A3A3", flexShrink: 0, marginLeft: 12 }}>
                        {formatTimestamp(entry.created_at)}
                      </span>
                    </div>
                    {entry.detail ? (
                      <div style={{ fontSize: 13, color: "#737373", marginTop: 2 }}>{entry.detail}</div>
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
