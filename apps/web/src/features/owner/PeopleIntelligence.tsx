import { useState } from "react";
import { FlightRiskEntry, OverloadEntry, TeamProfile } from "../../lib/api";

type PeopleIntelligenceProps = {
  teamProfiles: TeamProfile[];
  overloadMap: OverloadEntry[];
  flightRisk: FlightRiskEntry[];
  loading: boolean;
};

const RISK_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#6366F1",
};

export function PeopleIntelligence({ teamProfiles, overloadMap, flightRisk, loading }: PeopleIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<"profiles" | "overload" | "risk">("profiles");

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
            ORGANIZATION
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>People intelligence</h1>
        </div>
        <div style={{
          background: "#FFFFFF", borderRadius: 12, padding: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
          fontSize: 15, color: "#A3A3A3",
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
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
          ORGANIZATION
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>
          People intelligence
        </h1>
        <p style={{ fontSize: 15, color: "#737373", margin: "4px 0 0" }}>
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
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: isActive ? "none" : "1.5px solid #E5E5E5",
                background: isActive ? "#6C5CE7" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "#0A0A0A",
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
            background: "#FFFFFF", borderRadius: 12, padding: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
            fontSize: 15, color: "#A3A3A3",
          }}>
            No team members found for this venue.
          </div>
        ) : (
          <div style={{
            background: "#FFFFFF", borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                  {["Name", "Role", "Follow-ups", "Overdue", "Escalations", "Evidence", "Diary"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left", padding: "12px 16px",
                        fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.08em", color: "#A3A3A3",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamProfiles.map((p) => (
                  <tr key={p.user_id} style={{ borderBottom: "1px solid #F5F5F5" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0A0A0A" }}>{p.full_name}</td>
                    <td style={{ padding: "12px 16px", color: "#A3A3A3" }}>{p.role}</td>
                    <td style={{ padding: "12px 16px" }}>{p.follow_ups_completed}/{p.follow_ups_total}</td>
                    <td style={{ padding: "12px 16px", color: p.follow_ups_overdue > 0 ? "#EF4444" : "#0A0A0A" }}>
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
            background: "#FFFFFF", borderRadius: 12, padding: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
            fontSize: 15, color: "#A3A3A3",
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
                  borderLeft: `4px solid ${RISK_COLORS[entry.risk_level] ?? "#A3A3A3"}`,
                  borderRadius: 12,
                  background: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{entry.full_name}</span>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 999,
                    background: RISK_COLORS[entry.risk_level] ?? "#A3A3A3", color: "#FFFFFF",
                    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {entry.risk_level}
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#737373", fontSize: 13 }}>
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
            background: "#FFFFFF", borderRadius: 12, padding: 40,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
            fontSize: 15, color: "#A3A3A3",
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
                  borderLeft: `4px solid ${RISK_COLORS[entry.risk_level] ?? "#A3A3A3"}`,
                  borderRadius: 12,
                  background: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{entry.full_name}</span>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 999,
                    background: RISK_COLORS[entry.risk_level] ?? "#A3A3A3", color: "#FFFFFF",
                    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    flight risk
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: "#737373", fontSize: 13 }}>
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
