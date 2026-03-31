import { useState } from "react";
import { FlightRiskEntry, OverloadEntry, TeamProfile } from "../../lib/api";

type PeopleIntelligenceProps = {
  teamProfiles: TeamProfile[];
  overloadMap: OverloadEntry[];
  flightRisk: FlightRiskEntry[];
  loading: boolean;
};

const RISK_COLORS: Record<string, string> = {
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-info)",
};

export function PeopleIntelligence({ teamProfiles, overloadMap, flightRisk, loading }: PeopleIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "overload" | "risk">("profiles");

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
        <div>
          <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 4 }}>
            ORGANIZATION
          </div>
          <h1 style={{ fontSize: "var(--text-page)", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>People intelligence</h1>
        </div>
        <div style={{
          background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
          fontSize: "var(--text-body)", color: "var(--color-text-muted)",
        }}>
          Analyzing team data...
        </div>
      </div>
    );
  }

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "profiles", label: "Team profiles" },
    { key: "overload", label: `Overload map (${overloadMap.length})` },
    { key: "risk", label: `Flight risk (${flightRisk.length})` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
      {/* ---- Page header ---- */}
      <div>
        <div style={{ fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: 4 }}>
          ORGANIZATION
        </div>
        <h1 style={{ fontSize: "var(--text-page)", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          People intelligence
        </h1>
        <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
          Team profiles, workload analysis, and retention signals.
        </p>
      </div>

      {/* ---- Tab bar ---- */}
      <div style={{ display: "flex", gap: 8 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "8px 18px", borderRadius: "var(--radius-sm)", fontSize: "var(--text-small)", fontWeight: 600,
                border: isActive ? "none" : "1.5px solid var(--color-border-subtle)",
                background: isActive ? "var(--color-accent)" : "var(--color-surface)",
                color: isActive ? "var(--color-surface)" : "var(--color-text-primary)",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ---- Team profiles ---- */}
      {activeTab === "profiles" ? (
        teamProfiles.length === 0 ? (
          <div style={{
            background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
            fontSize: "var(--text-body)", color: "var(--color-text-muted)",
          }}>
            No team members found for this venue.
          </div>
        ) : (
          <div style={{
            background: "var(--color-surface)", borderRadius: "var(--radius-md)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-body)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Role", "Follow-ups", "Overdue", "Escalations", "Evidence", "Diary"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left", padding: "12px 16px",
                        fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.08em", color: "var(--color-text-muted)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamProfiles.map((p) => (
                  <tr key={p.user_id} style={{ borderBottom: "1px solid var(--color-surface-subtle)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--color-text-primary)" }}>{p.full_name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>{p.role}</td>
                    <td style={{ padding: "12px 16px" }}>{p.follow_ups_completed}/{p.follow_ups_total}</td>
                    <td style={{ padding: "12px 16px", color: p.follow_ups_overdue > 0 ? "var(--color-danger)" : "var(--color-text-primary)" }}>
                      {p.follow_ups_overdue}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{p.escalations_created}</td>
                    <td style={{ padding: "12px 16px" }}>{p.evidence_submitted}</td>
                    <td style={{ padding: "12px 16px" }}>{p.diary_entries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {/* ---- Overload map ---- */}
      {activeTab === "overload" ? (
        overloadMap.length === 0 ? (
          <div style={{
            background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
            fontSize: "var(--text-body)", color: "var(--color-text-muted)",
          }}>
            No overload indicators detected. Team workload appears balanced.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {overloadMap.map((entry) => (
              <div
                key={entry.user_id}
                style={{
                  padding: "16px 20px",
                  borderLeft: `4px solid ${RISK_COLORS[entry.risk_level] ?? "var(--color-text-muted)"}`,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{entry.full_name}</span>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: "var(--radius-full)",
                    background: RISK_COLORS[entry.risk_level] ?? "var(--color-text-muted)", color: "var(--color-surface)",
                    fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {entry.risk_level}
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
                  {entry.risk_factors.map((factor, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{factor}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* ---- Flight risk ---- */}
      {activeTab === "risk" ? (
        flightRisk.length === 0 ? (
          <div style={{
            background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
            fontSize: "var(--text-body)", color: "var(--color-text-muted)",
          }}>
            No flight risk indicators detected. Team engagement appears healthy.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {flightRisk.map((entry) => (
              <div
                key={entry.user_id}
                style={{
                  padding: "16px 20px",
                  borderLeft: `4px solid ${RISK_COLORS[entry.risk_level] ?? "var(--color-text-muted)"}`,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--color-text-primary)" }}>{entry.full_name}</span>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: "var(--radius-full)",
                    background: RISK_COLORS[entry.risk_level] ?? "var(--color-text-muted)", color: "var(--color-surface)",
                    fontSize: "var(--text-eyebrow)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    flight risk
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>
                  {entry.signals.map((signal, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{signal}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
