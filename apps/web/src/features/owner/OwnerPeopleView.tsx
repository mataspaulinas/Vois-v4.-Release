import { FormEvent, useState } from "react";
import {
  FlightRiskEntry,
  OrganizationMember,
  OverloadEntry,
  ProvisionedLoginPacket,
  TeamProfile,
  Venue,
} from "../../lib/api";
import { PeopleIntelligence } from "./PeopleIntelligence";
import { ds, pillStyle } from "../../styles/tokens";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OwnerPeopleViewProps = {
  // Team Health data
  teamProfiles: TeamProfile[];
  overloadMap: OverloadEntry[];
  flightRisk: FlightRiskEntry[];
  loadingHealth: boolean;
  // Access Management data
  members: OrganizationMember[];
  venues: Venue[];
  loadingMembers: boolean;
  working: boolean;
  latestLoginPacket: ProvisionedLoginPacket | null;
  onCreateMember: (payload: {
    full_name: string;
    email: string;
    role: "owner" | "manager" | "barista" | "developer";
    venue_ids: string[];
  }) => Promise<void> | void;
  onUpdateMember: (
    memberId: string,
    payload: { full_name?: string; role?: "owner" | "manager" | "barista" | "developer"; active?: boolean }
  ) => Promise<void> | void;
  onResetMemberLogin: (memberId: string) => Promise<void> | void;
  onUpdateMemberVenueAccess: (
    memberId: string,
    venueIds: string[]
  ) => Promise<void> | void;
};

/* ------------------------------------------------------------------ */
/*  Inline style fragments                                             */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "var(--radius-md)",
  padding: "20px 24px",
  boxShadow: "var(--shadow-sm)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: "var(--radius-sm)",
  border: "1.5px solid var(--color-border-subtle)",
  padding: "0 12px",
  fontSize: "var(--text-body)",
  color: "var(--color-text-primary)",
  background: "var(--bg-input)",
  outline: "none",
  boxSizing: "border-box" as const,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto" as const,
};

const labelText: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-small)",
  fontWeight: 500,
  color: "var(--color-text-primary)",
  marginBottom: 4,
};

const ROLE_COLORS: Record<string, string> = {
  owner: "var(--color-accent)",
  manager: "var(--color-success)",
  barista: "var(--color-info)",
  developer: "var(--lavender)",
};

/* ------------------------------------------------------------------ */
/*  MemberAccessPanel                                                  */
/* ------------------------------------------------------------------ */

type MemberAccessPanelProps = {
  members: OrganizationMember[];
  venues: Venue[];
  loadingMembers: boolean;
  working: boolean;
  latestLoginPacket: ProvisionedLoginPacket | null;
  onCreateMember: OwnerPeopleViewProps["onCreateMember"];
  onUpdateMember: OwnerPeopleViewProps["onUpdateMember"];
  onResetMemberLogin: OwnerPeopleViewProps["onResetMemberLogin"];
  onUpdateMemberVenueAccess: OwnerPeopleViewProps["onUpdateMemberVenueAccess"];
};

function MemberAccessPanel({
  members,
  venues,
  loadingMembers,
  working,
  latestLoginPacket,
  onCreateMember,
  onUpdateMember,
  onResetMemberLogin,
  onUpdateMemberVenueAccess,
}: MemberAccessPanelProps) {
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "manager" | "barista" | "developer">("manager");
  const [memberVenueIds, setMemberVenueIds] = useState<string[]>([]);
  const [editingVenues, setEditingVenues] = useState<string | null>(null);
  const [editVenueIds, setEditVenueIds] = useState<string[]>([]);

  async function handleCreateMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onCreateMember({
      full_name: memberName.trim(),
      email: memberEmail.trim().toLowerCase(),
      role: memberRole,
      venue_ids:
        memberRole === "manager" || memberRole === "barista"
          ? memberVenueIds
          : [],
    });
    setMemberName("");
    setMemberEmail("");
    setMemberRole("manager");
    setMemberVenueIds([]);
  }

  function venueNameById(id: string): string {
    return venues.find((v) => v.id === id)?.name ?? id.slice(0, 8);
  }

  function toggleVenueId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  }

  if (loadingMembers) {
    return (
      <div
        style={{
          ...card,
          textAlign: "center" as const,
          padding: 40,
          color: "var(--color-text-muted)",
          fontSize: "var(--text-body)",
        }}
      >
        Loading members...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ---- Credentials card ---- */}
      {latestLoginPacket && (
        <div
          style={{
            ...card,
            borderLeft: "3px solid var(--color-success)",
            background: "var(--color-success-soft)",
          }}
        >
          <p style={ds.eyebrow}>New login provisioned</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4px 12px",
              marginTop: 8,
              fontSize: "var(--text-small)",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
              Email
            </span>
            <span style={{ fontWeight: 600 }}>{latestLoginPacket.email}</span>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
              Temporary password
            </span>
            <code
              style={{
                fontWeight: 600,
                fontFamily: "monospace",
                background: "var(--color-surface)",
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {latestLoginPacket.temporary_password}
            </code>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>
              Login URL
            </span>
            <a
              href={latestLoginPacket.invite_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--color-accent)", fontWeight: 500 }}
            >
              {latestLoginPacket.invite_url}
            </a>
          </div>
        </div>
      )}

      {/* ---- Member cards grid ---- */}
      {members.length === 0 ? (
        <div
          style={{
            ...card,
            textAlign: "center" as const,
            padding: 40,
            color: "var(--color-text-muted)",
            fontSize: "var(--text-body)",
          }}
        >
          No members yet. Provision an operator below.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                ...card,
                opacity: m.active ? 1 : 0.6,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Name + role badge row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "var(--text-body)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {m.full_name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--text-small)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {m.email}
                  </p>
                </div>
                <span
                  style={{
                    ...ds.tag,
                    background: ROLE_COLORS[m.role] ?? "var(--color-surface-subtle)",
                    color: "var(--white)",
                    fontSize: "var(--text-eyebrow)",
                  }}
                >
                  {m.role}
                </span>
              </div>

              {/* Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "var(--text-small)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: m.active
                      ? "var(--color-success)"
                      : "var(--color-text-muted)",
                  }}
                />
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {m.active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Venue access */}
              {editingVenues === m.id ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: "var(--text-small)",
                  }}
                >
                  <span style={labelText}>Venue access</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {venues.map((v) => (
                      <label
                        key={v.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "var(--text-eyebrow)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editVenueIds.includes(v.id)}
                          onChange={() =>
                            setEditVenueIds(toggleVenueId(editVenueIds, v.id))
                          }
                        />
                        {v.name}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      style={ds.btnSmPrimary}
                      disabled={working}
                      onClick={async () => {
                        await onUpdateMemberVenueAccess(m.id, editVenueIds);
                        setEditingVenues(null);
                      }}
                    >
                      Save
                    </button>
                    <button
                      style={ds.btnSmSecondary}
                      onClick={() => setEditingVenues(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "var(--text-small)" }}>
                  <span
                    style={{
                      color: "var(--color-text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Venues:{" "}
                  </span>
                  {m.venue_access.length > 0
                    ? m.venue_access.map((va) => venueNameById(va.venue_id)).join(", ")
                    : "None"}
                  <button
                    style={{
                      ...ds.btnSmSecondary,
                      marginLeft: 8,
                      padding: "2px 8px",
                    }}
                    onClick={() => {
                      setEditingVenues(m.id);
                      setEditVenueIds(m.venue_access.map((va) => va.venue_id));
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: "auto",
                  paddingTop: 6,
                  borderTop: "1px solid var(--color-border-subtle)",
                }}
              >
                <button
                  style={ds.btnSmSecondary}
                  disabled={working}
                  onClick={() =>
                    onUpdateMember(m.id, { active: !m.active })
                  }
                >
                  {m.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  style={ds.btnSmSecondary}
                  disabled={working}
                  onClick={() => onResetMemberLogin(m.id)}
                >
                  Reset login
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Provision new operator form ---- */}
      <div style={card}>
        <p style={ds.eyebrow}>Provision new operator</p>
        <form
          onSubmit={handleCreateMember}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div>
            <span style={labelText}>Full name</span>
            <input
              style={inputStyle}
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <span style={labelText}>Email</span>
            <input
              style={inputStyle}
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="jane@cafe.com"
              required
            />
          </div>
          <div>
            <span style={labelText}>Role</span>
            <select
              style={selectStyle}
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as "owner" | "manager" | "barista" | "developer")}
            >
              <option value="manager">Manager</option>
              <option value="barista">Barista</option>
              <option value="owner">Owner</option>
              <option value="developer">Developer</option>
            </select>
          </div>
          <div>
            <span style={labelText}>Venue access</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {venues.map((v) => (
                <label
                  key={v.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "var(--text-small)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={memberVenueIds.includes(v.id)}
                    onChange={() =>
                      setMemberVenueIds(toggleVenueId(memberVenueIds, v.id))
                    }
                  />
                  {v.name}
                </label>
              ))}
              {venues.length === 0 && (
                <span
                  style={{
                    fontSize: "var(--text-small)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  No venues available
                </span>
              )}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="submit"
              style={{ ...ds.btnPrimary, opacity: working ? 0.5 : 1 }}
              disabled={working}
            >
              Provision operator
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  OwnerPeopleView                                                    */
/* ------------------------------------------------------------------ */

export function OwnerPeopleView({
  teamProfiles,
  overloadMap,
  flightRisk,
  loadingHealth,
  members,
  venues,
  loadingMembers,
  working,
  latestLoginPacket,
  onCreateMember,
  onUpdateMember,
  onResetMemberLogin,
  onUpdateMemberVenueAccess,
}: OwnerPeopleViewProps) {
  const [activeTab, setActiveTab] = useState<"health" | "access">("health");

  return (
    <div
      style={{
        padding: 48,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Header */}
      <div>
        <p className="eyebrow">People</p>
        <p
          className="small-text"
          style={{ color: "var(--text-muted)", marginTop: 2 }}
        >
          Team health, capacity, and access management
        </p>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          style={pillStyle(activeTab === "health")}
          onClick={() => setActiveTab("health")}
        >
          Team Health
        </button>
        <button
          style={pillStyle(activeTab === "access")}
          onClick={() => setActiveTab("access")}
        >
          Access Management ({members.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "health" && (
        <PeopleIntelligence
          teamProfiles={teamProfiles}
          overloadMap={overloadMap}
          flightRisk={flightRisk}
          loading={loadingHealth}
        />
      )}

      {activeTab === "access" && (
        <MemberAccessPanel
          members={members}
          venues={venues}
          loadingMembers={loadingMembers}
          working={working}
          latestLoginPacket={latestLoginPacket}
          onCreateMember={onCreateMember}
          onUpdateMember={onUpdateMember}
          onResetMemberLogin={onResetMemberLogin}
          onUpdateMemberVenueAccess={onUpdateMemberVenueAccess}
        />
      )}
    </div>
  );
}
