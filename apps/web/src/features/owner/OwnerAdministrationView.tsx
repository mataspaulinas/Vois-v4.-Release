import { FormEvent, useMemo, useState } from "react";

import {
  OntologyMountSummary,
  OrganizationMember,
  ProvisionedLoginPacket,
  Venue,
  VenueCreatePayload,
} from "../../lib/api";

type OwnerAdministrationViewProps = {
  organizationName: string;
  organizationId: string;
  mounts: OntologyMountSummary[];
  venues: Venue[];
  members: OrganizationMember[];
  loadingMembers: boolean;
  working: boolean;
  latestLoginPacket: ProvisionedLoginPacket | null;
  error?: string | null;
  onCreateVenue: (payload: VenueCreatePayload) => Promise<void> | void;
  onCreateMember: (payload: {
    email: string;
    full_name: string;
    role: "owner" | "manager" | "barista" | "developer";
    venue_ids: string[];
  }) => Promise<void> | void;
  onUpdateMember: (
    memberId: string,
    payload: {
      full_name?: string;
      role?: "owner" | "manager" | "barista" | "developer";
      active?: boolean;
    }
  ) => Promise<void> | void;
  onResetMemberLogin: (memberId: string) => Promise<void> | void;
  onUpdateMemberVenueAccess: (memberId: string, venueIds: string[]) => Promise<void> | void;
  onOpenVenue: (venueId: string) => void;
  onLogout: () => void;
};

/* ---- Shared inline-style fragments ---- */
const card: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: 12, padding: "20px 24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4,
};
const sectionTitle: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px" };
const sectionDesc: React.CSSProperties = { fontSize: 13, color: "#737373", margin: "0 0 16px" };
const labelSpan: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #E5E5E5",
  padding: "0 14px", fontSize: 15, color: "#0A0A0A", outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "auto" as const };
const primaryBtn: React.CSSProperties = {
  background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8,
  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  background: "#FFFFFF", color: "#0A0A0A", border: "1.5px solid #E5E5E5", borderRadius: 8,
  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const emptyBox: React.CSSProperties = {
  background: "#FFFFFF", borderRadius: 12, padding: 40,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" as const,
  fontSize: 15, color: "#A3A3A3",
};

export function OwnerAdministrationView({
  organizationName,
  organizationId,
  mounts,
  venues,
  members,
  loadingMembers,
  working,
  latestLoginPacket,
  error,
  onCreateVenue,
  onCreateMember,
  onUpdateMember,
  onResetMemberLogin,
  onUpdateMemberVenueAccess,
  onOpenVenue,
  onLogout,
}: OwnerAdministrationViewProps) {
  const availableMounts = useMemo(
    () => mounts.filter((mount) => mount.status === "active" && mount.validation.mountable),
    [mounts]
  );
  const operatorCandidates = members.filter((member) => member.role === "manager" || member.role === "barista");
  const defaultMountId = availableMounts[0] ? `${availableMounts[0].ontology_id}@${availableMounts[0].version}` : "";

  const [venueName, setVenueName] = useState("");
  const [venueSlug, setVenueSlug] = useState("");
  const [venueConcept, setVenueConcept] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [selectedMount, setSelectedMount] = useState(defaultMountId);
  const [initialManagerUserId, setInitialManagerUserId] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "manager" | "barista" | "developer">("manager");
  const [memberVenueIds, setMemberVenueIds] = useState<string[]>([]);

  async function handleCreateVenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [ontologyId, ontologyVersion] = selectedMount.split("@", 2);
    await onCreateVenue({
      organization_id: organizationId,
      name: venueName.trim(),
      slug: venueSlug.trim(),
      ontology_binding: {
        ontology_id: ontologyId,
        ontology_version: ontologyVersion,
      },
      concept: venueConcept.trim() || null,
      location: venueLocation.trim() || null,
      initial_manager_user_id: initialManagerUserId || null,
      capacity_profile: {},
    });
    setVenueName("");
    setVenueSlug("");
    setVenueConcept("");
    setVenueLocation("");
    setInitialManagerUserId("");
  }

  async function handleCreateMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateMember({
      email: memberEmail.trim().toLowerCase(),
      full_name: memberName.trim(),
      role: memberRole,
      venue_ids: memberRole === "manager" || memberRole === "barista" ? memberVenueIds : [],
    });
    setMemberName("");
    setMemberEmail("");
    setMemberRole("manager");
    setMemberVenueIds([]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
      {/* ---- Page header ---- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={eyebrow}>ORGANIZATION</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{organizationName}</h1>
          <p style={{ fontSize: 15, color: "#737373", margin: "4px 0 0" }}>
            Create venues, provision operators, assign access, and rotate logins from inside VOIS.
          </p>
        </div>
        <button style={{ ...secondaryBtn, opacity: working ? 0.5 : 1 }} onClick={onLogout} disabled={working}>
          Sign out
        </button>
      </div>

      {/* ---- Summary cards ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <div style={{ ...card, borderLeft: "3px solid #6C5CE7" }}>
          <div style={eyebrow}>Workspace state</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "4px 0 6px" }}>
            {venues.length ? `${venues.length} venue${venues.length === 1 ? "" : "s"} live` : "No venues yet"}
          </h3>
          <p style={{ fontSize: 13, color: "#737373", margin: 0 }}>
            This workspace is real now. Add the first venue, then provision managers and baristas with explicit venue
            access instead of relying on demo data.
          </p>
        </div>
        <div style={card}>
          <div style={eyebrow}>Operator access</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "4px 0 6px" }}>
            {members.length} member{members.length === 1 ? "" : "s"}
          </h3>
          <p style={{ fontSize: 13, color: "#737373", margin: 0 }}>
            Owners act at organization scope. Managers and baristas need venue assignments to work.
          </p>
        </div>
        {latestLoginPacket ? (
          <div style={card}>
            <div style={eyebrow}>Latest login packet</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {([
                ["Email", latestLoginPacket.email],
                ["Temporary password", latestLoginPacket.temporary_password],
                ["Reset required", latestLoginPacket.reset_required ? "yes" : "no"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <strong style={{ color: "#0A0A0A" }}>{k}</strong>
                  <span style={{ color: "#737373" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p style={{ fontSize: 13, color: "#EF4444", margin: 0, padding: "0 4px" }}>{error}</p>
      ) : null}

      {/* ---- Two-column forms ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
        {/* Create venue */}
        <div style={card}>
          <div style={eyebrow}>VENUES</div>
          <h2 style={sectionTitle}>Create venue</h2>
          <p style={sectionDesc}>Every venue must bind to an ontology pack at creation time.</p>
          <form onSubmit={handleCreateVenue} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span style={labelSpan}>Name</span>
              <input style={inputStyle} value={venueName} onChange={(e) => setVenueName(e.target.value)} required
                onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
              />
            </label>
            <label>
              <span style={labelSpan}>Slug</span>
              <input style={inputStyle} value={venueSlug} onChange={(e) => setVenueSlug(e.target.value)} required
                onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
              />
            </label>
            <label>
              <span style={labelSpan}>Concept</span>
              <input style={inputStyle} value={venueConcept} onChange={(e) => setVenueConcept(e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
              />
            </label>
            <label>
              <span style={labelSpan}>Location</span>
              <input style={inputStyle} value={venueLocation} onChange={(e) => setVenueLocation(e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelSpan}>Ontology pack</span>
              <select style={selectStyle} value={selectedMount} onChange={(e) => setSelectedMount(e.target.value)} required>
                {availableMounts.map((mount) => (
                  <option key={`${mount.ontology_id}@${mount.version}`} value={`${mount.ontology_id}@${mount.version}`}>
                    {mount.display_name} ({mount.version})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span style={labelSpan}>Initial operator assignment</span>
              <select style={selectStyle} value={initialManagerUserId} onChange={(e) => setInitialManagerUserId(e.target.value)}>
                <option value="">No initial operator</option>
                {operatorCandidates.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <button
                type="submit"
                style={{ ...primaryBtn, opacity: working || !venueName.trim() || !venueSlug.trim() || !selectedMount ? 0.5 : 1 }}
                disabled={working || !venueName.trim() || !venueSlug.trim() || !selectedMount}
              >
                {working ? "Creating..." : "Create venue"}
              </button>
            </div>
          </form>

          {venues.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              {venues.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => onOpenVenue(venue.id)}
                  style={{
                    ...secondaryBtn, display: "flex", justifyContent: "space-between", width: "100%",
                    padding: "12px 16px", textAlign: "left",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <strong style={{ color: "#0A0A0A" }}>{venue.name}</strong>
                  <span style={{ color: "#A3A3A3", fontSize: 13 }}>{venue.location ?? venue.slug}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ ...emptyBox, padding: 20, marginTop: 16 }}>No venues exist yet.</div>
          )}
        </div>

        {/* Provision operator */}
        <div style={card}>
          <div style={eyebrow}>PEOPLE</div>
          <h2 style={sectionTitle}>Provision operator</h2>
          <p style={sectionDesc}>VOIS creates the login, applies the role claim, and stores the access model internally.</p>
          <form onSubmit={handleCreateMember} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span style={labelSpan}>Full name</span>
              <input style={inputStyle} value={memberName} onChange={(e) => setMemberName(e.target.value)} required
                onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
              />
            </label>
            <label>
              <span style={labelSpan}>Email</span>
              <input style={inputStyle} value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="manager@company.com" required
                onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
              />
            </label>
            <label>
              <span style={labelSpan}>Role</span>
              <select
                style={selectStyle}
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as "owner" | "manager" | "barista" | "developer")}
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="barista">Barista</option>
                <option value="developer">Developer</option>
              </select>
            </label>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={labelSpan}>Venue access</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {venues.map((venue) => (
                  <label key={venue.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0A0A0A", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={memberVenueIds.includes(venue.id)}
                      disabled={memberRole === "owner" || memberRole === "developer"}
                      onChange={(e) => {
                        setMemberVenueIds((current) =>
                          e.target.checked
                            ? [...current, venue.id]
                            : current.filter((v) => v !== venue.id)
                        );
                      }}
                      style={{ accentColor: "#6C5CE7" }}
                    />
                    <span>{venue.name}</span>
                  </label>
                ))}
                {!venues.length ? <p style={{ fontSize: 13, color: "#A3A3A3", margin: 0 }}>Create a venue before provisioning managers or baristas.</p> : null}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <button
                type="submit"
                style={{
                  ...primaryBtn,
                  opacity: working || !memberName.trim() || !memberEmail.trim() || ((memberRole === "manager" || memberRole === "barista") && memberVenueIds.length === 0) ? 0.5 : 1,
                }}
                disabled={
                  working ||
                  !memberName.trim() ||
                  !memberEmail.trim() ||
                  ((memberRole === "manager" || memberRole === "barista") && memberVenueIds.length === 0)
                }
              >
                {working ? "Provisioning..." : "Create operator"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ---- People and access ---- */}
      <div style={card}>
        <div style={eyebrow}>ACCESS</div>
        <h2 style={sectionTitle}>People and access</h2>
        <p style={sectionDesc}>Update roles, deactivate accounts, rotate passwords, and adjust venue assignments.</p>

        {loadingMembers ? (
          <div style={{ ...emptyBox, padding: 20 }}>Loading organization members...</div>
        ) : !members.length ? (
          <div style={{ ...emptyBox, padding: 20 }}>No members exist yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {members.map((member) => (
              <MemberAccessCard
                key={member.id}
                member={member}
                venues={venues}
                busy={working}
                onUpdateMember={onUpdateMember}
                onResetMemberLogin={onResetMemberLogin}
                onUpdateMemberVenueAccess={onUpdateMemberVenueAccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberAccessCard({
  member,
  venues,
  busy,
  onUpdateMember,
  onResetMemberLogin,
  onUpdateMemberVenueAccess,
}: {
  member: OrganizationMember;
  venues: Venue[];
  busy: boolean;
  onUpdateMember: (
    memberId: string,
    payload: {
      full_name?: string;
      role?: "owner" | "manager" | "barista" | "developer";
      active?: boolean;
    }
  ) => Promise<void> | void;
  onResetMemberLogin: (memberId: string) => Promise<void> | void;
  onUpdateMemberVenueAccess: (memberId: string, venueIds: string[]) => Promise<void> | void;
}) {
  const [fullName, setFullName] = useState(member.full_name);
  const [role, setRole] = useState(member.role);
  const [active, setActive] = useState(member.active);
  const [venueIds, setVenueIds] = useState(member.venue_access.map((assignment) => assignment.venue_id));

  const usesVenueAssignments = role === "manager" || role === "barista";

  return (
    <article style={{
      background: "#FAFAFA", borderRadius: 12, padding: "16px 20px",
      border: "1px solid #F0F0F0", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong style={{ fontSize: 15, color: "#0A0A0A" }}>{member.email}</strong>
          <p style={{ fontSize: 11, color: "#A3A3A3", margin: "2px 0 0" }}>
            {member.firebase_uid ?? "Firebase user will be created on provision."}
          </p>
        </div>
        <span style={{
          display: "inline-block", padding: "2px 10px", borderRadius: 999,
          background: active ? "#10B981" : "#A3A3A3", color: "#FFFFFF",
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        }}>
          {active ? "active" : "inactive"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>Name</span>
          <input
            style={{
              width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #E5E5E5",
              padding: "0 14px", fontSize: 15, color: "#0A0A0A", outline: "none", boxSizing: "border-box",
            }}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
          />
        </label>
        <label>
          <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>Role</span>
          <select
            style={{
              width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #E5E5E5",
              padding: "0 14px", fontSize: 15, color: "#0A0A0A", outline: "none", boxSizing: "border-box",
              appearance: "auto" as const,
            }}
            value={role}
            onChange={(e) => setRole(e.target.value as "owner" | "manager" | "barista" | "developer")}
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="barista">Barista</option>
            <option value="developer">Developer</option>
          </select>
        </label>
      </div>

      {usesVenueAssignments ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {venues.map((venue) => (
            <label key={venue.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0A0A0A", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={venueIds.includes(venue.id)}
                onChange={(e) => {
                  setVenueIds((current) =>
                    e.target.checked ? [...current, venue.id] : current.filter((v) => v !== venue.id)
                  );
                }}
                style={{ accentColor: "#6C5CE7" }}
              />
              <span>{venue.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#A3A3A3", margin: 0 }}>
          This role uses organization-level access and does not take venue assignments.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          style={{ ...secondaryBtn, opacity: busy ? 0.5 : 1 } as React.CSSProperties}
          onClick={() => setActive((current) => !current)}
          disabled={busy}
        >
          Mark {active ? "inactive" : "active"}
        </button>
        <button
          style={{ ...secondaryBtn, opacity: busy ? 0.5 : 1 } as React.CSSProperties}
          onClick={() => onResetMemberLogin(member.id)}
          disabled={busy}
        >
          Reset login
        </button>
        <button
          style={{
            ...primaryBtn,
            opacity: busy || !fullName.trim() || (usesVenueAssignments && venueIds.length === 0) ? 0.5 : 1,
          } as React.CSSProperties}
          onClick={async () => {
            await onUpdateMember(member.id, {
              full_name: fullName.trim(),
              role,
              active,
            });
            if (usesVenueAssignments) {
              await onUpdateMemberVenueAccess(member.id, venueIds);
            }
          }}
          disabled={busy || !fullName.trim() || (usesVenueAssignments && venueIds.length === 0)}
        >
          Save access
        </button>
      </div>
    </article>
  );
}
