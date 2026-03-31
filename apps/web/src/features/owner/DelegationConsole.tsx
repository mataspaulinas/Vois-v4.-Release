import { DelegationEntry } from "../../lib/api";

type DelegationConsoleProps = {
  delegations: DelegationEntry[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
};

export function DelegationConsole({ delegations, loading, formatTimestamp }: DelegationConsoleProps) {
  const overdue = delegations.filter((d) => d.is_overdue);
  const active = delegations.filter((d) => !d.is_overdue);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
      {/* ---- Page header ---- */}
      <div>
        <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 4 }}>
          ORGANIZATION
        </div>
        <h1 style={{ fontSize: "var(--text-page)", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Delegation console
        </h1>
        <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
          Active delegations with evidence status and follow-up tracking.
        </p>
      </div>

      {loading ? (
        <div style={{
          background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
          fontSize: "var(--text-body)", color: "var(--color-text-muted)",
        }}>
          Loading delegations...
        </div>
      ) : delegations.length === 0 ? (
        <div style={{
          background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
          fontSize: "var(--text-body)", color: "var(--color-text-muted)",
        }}>
          No active delegations. Create follow-ups to delegate tasks.
        </div>
      ) : (
        <>
          {/* ---- Overdue ---- */}
          {overdue.length > 0 ? (
            <div style={{
              background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-danger)", margin: "0 0 16px" }}>
                Overdue ({overdue.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {overdue.map((d) => (
                  <DelegationCard key={d.follow_up_id} delegation={d} formatTimestamp={formatTimestamp} />
                ))}
              </div>
            </div>
          ) : null}

          {/* ---- Active ---- */}
          {active.length > 0 ? (
            <div style={{
              background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "20px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <h2 style={{ fontSize: "var(--text-section)", fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 16px" }}>
                Active ({active.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {active.map((d) => (
                  <DelegationCard key={d.follow_up_id} delegation={d} formatTimestamp={formatTimestamp} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function DelegationCard({ delegation, formatTimestamp }: { delegation: DelegationEntry; formatTimestamp: (iso: string) => string }) {
  const borderColor = delegation.is_overdue ? "var(--color-danger)" : "var(--color-accent)";
  const pillBg = delegation.is_overdue ? "var(--color-danger)" : "var(--color-accent)";

  return (
    <div
      style={{
        padding: "16px 20px",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "var(--radius-sm)",
        background: "var(--color-surface-subtle)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{delegation.title}</span>
        <span style={{
          display: "inline-block", padding: "2px 10px", borderRadius: "var(--radius-full)",
          background: pillBg, color: "var(--color-surface)", fontSize: "var(--text-eyebrow)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {delegation.status}
        </span>
      </div>
      {delegation.task_title ? (
        <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", margin: "0 0 6px" }}>
          Task: {delegation.task_title}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 16, fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
        <span>Due: {formatTimestamp(delegation.due_at)}</span>
        <span>Evidence: {delegation.evidence_count}</span>
      </div>
    </div>
  );
}
