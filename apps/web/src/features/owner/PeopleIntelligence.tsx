import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { FlightRiskEntry, OverloadEntry, TeamProfile } from "../../lib/api";

type PeopleIntelligenceProps = {
  teamProfiles: TeamProfile[];
  overloadMap: OverloadEntry[];
  flightRisk: FlightRiskEntry[];
  loading: boolean;
};

const RISK_COLORS: Record<string, string> = {
  high: "var(--sunrise)",
  medium: "var(--gold)",
  low: "var(--sky)",
};

export function PeopleIntelligence({ teamProfiles, overloadMap, flightRisk, loading }: PeopleIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "overload" | "risk">("profiles");

  if (loading) {
    return (
      <div className="view-stack">
        <SectionCard eyebrow="People" title="Loading...">
          <div className="empty-state"><p>Analyzing team data...</p></div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="People"
        title="People intelligence"
        description="Team profiles, workload analysis, and retention signals."
      >
        {/* Tab navigation */}
        <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
          {([
            ["profiles", "Team profiles"],
            ["overload", `Overload map (${overloadMap.length})`],
            ["risk", `Flight risk (${flightRisk.length})`],
          ] as [typeof activeTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              className={`btn btn-sm ${activeTab === tab ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Team profiles */}
        {activeTab === "profiles" ? (
          teamProfiles.length === 0 ? (
            <div className="empty-state"><p>No team members found for this venue.</p></div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Follow-ups</th>
                    <th>Overdue</th>
                    <th>Escalations</th>
                    <th>Evidence</th>
                    <th>Diary</th>
                  </tr>
                </thead>
                <tbody>
                  {teamProfiles.map((p) => (
                    <tr key={p.user_id}>
                      <td style={{ fontWeight: 500 }}>{p.full_name}</td>
                      <td className="text-muted">{p.role}</td>
                      <td>{p.follow_ups_completed}/{p.follow_ups_total}</td>
                      <td style={{ color: p.follow_ups_overdue > 0 ? "var(--sunrise)" : "inherit" }}>
                        {p.follow_ups_overdue}
                      </td>
                      <td>{p.escalations_created}</td>
                      <td>{p.evidence_submitted}</td>
                      <td>{p.diary_entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {/* Overload map */}
        {activeTab === "overload" ? (
          overloadMap.length === 0 ? (
            <div className="empty-state"><p>No overload indicators detected. Team workload appears balanced.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
              {overloadMap.map((entry) => (
                <div
                  key={entry.user_id}
                  style={{
                    padding: "var(--spacing-md)",
                    borderLeft: `4px solid ${RISK_COLORS[entry.risk_level] ?? "var(--muted)"}`,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-raised)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xs)" }}>
                    <span style={{ fontWeight: 500 }}>{entry.full_name}</span>
                    <span className="status-pill" style={{ background: RISK_COLORS[entry.risk_level], color: "white", fontSize: "0.7rem" }}>
                      {entry.risk_level}
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "var(--spacing-md)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {entry.risk_factors.map((factor, i) => (
                      <li key={i}>{factor}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* Flight risk */}
        {activeTab === "risk" ? (
          flightRisk.length === 0 ? (
            <div className="empty-state"><p>No flight risk indicators detected. Team engagement appears healthy.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
              {flightRisk.map((entry) => (
                <div
                  key={entry.user_id}
                  style={{
                    padding: "var(--spacing-md)",
                    borderLeft: `4px solid ${RISK_COLORS[entry.risk_level] ?? "var(--muted)"}`,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-raised)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-xs)" }}>
                    <span style={{ fontWeight: 500 }}>{entry.full_name}</span>
                    <span className="status-pill" style={{ background: RISK_COLORS[entry.risk_level], color: "white", fontSize: "0.7rem" }}>
                      flight risk
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "var(--spacing-md)", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    {entry.signals.map((signal, i) => (
                      <li key={i}>{signal}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : null}
      </SectionCard>
    </div>
  );
}
