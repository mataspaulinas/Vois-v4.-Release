import { SectionCard } from "../../components/SectionCard";
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
    <div className="view-stack">
      <SectionCard
        eyebrow="Owner"
        title="Delegation console"
        description="Active delegations with evidence status and follow-up tracking."
      >
        {loading ? (
          <div className="empty-state"><p>Loading delegations...</p></div>
        ) : delegations.length === 0 ? (
          <div className="empty-state"><p>No active delegations. Create follow-ups to delegate tasks.</p></div>
        ) : (
          <>
            {overdue.length > 0 ? (
              <div style={{ marginBottom: "var(--spacing-lg)" }}>
                <h4 style={{ color: "var(--sunrise)", marginBottom: "var(--spacing-sm)" }}>
                  Overdue ({overdue.length})
                </h4>
                {overdue.map((d) => (
                  <DelegationCard key={d.follow_up_id} delegation={d} formatTimestamp={formatTimestamp} />
                ))}
              </div>
            ) : null}

            {active.length > 0 ? (
              <div>
                <h4 style={{ color: "var(--text-secondary)", marginBottom: "var(--spacing-sm)" }}>
                  Active ({active.length})
                </h4>
                {active.map((d) => (
                  <DelegationCard key={d.follow_up_id} delegation={d} formatTimestamp={formatTimestamp} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}

function DelegationCard({ delegation, formatTimestamp }: { delegation: DelegationEntry; formatTimestamp: (iso: string) => string }) {
  return (
    <div
      style={{
        padding: "var(--spacing-md)",
        borderLeft: `3px solid ${delegation.is_overdue ? "var(--sunrise)" : "var(--sky)"}`,
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-raised)",
        marginBottom: "var(--spacing-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xs)" }}>
        <span style={{ fontWeight: 500 }}>{delegation.title}</span>
        <span className="status-pill" style={{ background: delegation.is_overdue ? "var(--sunrise)" : "var(--sky)", color: "white", fontSize: "0.7rem" }}>
          {delegation.status}
        </span>
      </div>
      {delegation.task_title ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "var(--spacing-xs)" }}>
          Task: {delegation.task_title}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "var(--spacing-md)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <span>Due: {formatTimestamp(delegation.due_at)}</span>
        <span>Evidence: {delegation.evidence_count}</span>
      </div>
    </div>
  );
}
