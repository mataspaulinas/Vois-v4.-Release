import { FormEvent, useMemo, useState } from "react";

import {
  OntologyMountSummary,
  OrganizationMember,
  ProvisionedLoginPacket,
  Venue,
  VenueCreatePayload,
} from "../../lib/api";
import { SectionCard } from "../../components/SectionCard";

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
    <div className="view-stack">
      <SectionCard
        eyebrow="Organization"
        title={organizationName}
        description="Create venues, provision operators, assign access, and rotate logins from inside VOIS."
        actions={
          <button className="btn btn-secondary" onClick={onLogout} disabled={working}>
            Sign out
          </button>
        }
      >
        <div className="organization-admin-summary">
          <div className="focus-card focus-card-primary">
            <p className="section-eyebrow">Workspace state</p>
            <h3>{venues.length ? `${venues.length} venue${venues.length === 1 ? "" : "s"} live` : "No venues yet"}</h3>
            <p>
              This workspace is real now. Add the first venue, then provision managers and baristas with explicit venue
              access instead of relying on demo data.
            </p>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Operator access</p>
            <h3>{members.length} member{members.length === 1 ? "" : "s"}</h3>
            <p>Owners act at organization scope. Managers and baristas need venue assignments to work.</p>
          </div>
          {latestLoginPacket ? (
            <div className="focus-card">
              <p className="section-eyebrow">Latest login packet</p>
              <div className="readiness-list">
                <div className="readiness-row">
                  <strong>Email</strong>
                  <span>{latestLoginPacket.email}</span>
                </div>
                <div className="readiness-row">
                  <strong>Temporary password</strong>
                  <span>{latestLoginPacket.temporary_password}</span>
                </div>
                <div className="readiness-row">
                  <strong>Reset required</strong>
                  <span>{latestLoginPacket.reset_required ? "yes" : "no"}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {error ? <p className="setup-inline-error">{error}</p> : null}
      </SectionCard>

      <div className="view-grid">
        <SectionCard
          eyebrow="Venues"
          title="Create venue"
          description="Every venue must bind to an ontology pack at creation time."
        >
          <form className="setup-form-grid" onSubmit={handleCreateVenue}>
            <label className="auth-field">
              <span>Name</span>
              <input value={venueName} onChange={(event) => setVenueName(event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Slug</span>
              <input value={venueSlug} onChange={(event) => setVenueSlug(event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Concept</span>
              <input value={venueConcept} onChange={(event) => setVenueConcept(event.target.value)} />
            </label>
            <label className="auth-field">
              <span>Location</span>
              <input value={venueLocation} onChange={(event) => setVenueLocation(event.target.value)} />
            </label>
            <label className="auth-field auth-field-span-2">
              <span>Ontology pack</span>
              <select value={selectedMount} onChange={(event) => setSelectedMount(event.target.value)} required>
                {availableMounts.map((mount) => (
                  <option key={`${mount.ontology_id}@${mount.version}`} value={`${mount.ontology_id}@${mount.version}`}>
                    {mount.display_name} ({mount.version})
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field auth-field-span-2">
              <span>Initial operator assignment</span>
              <select value={initialManagerUserId} onChange={(event) => setInitialManagerUserId(event.target.value)}>
                <option value="">No initial operator</option>
                {operatorCandidates.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name} ({member.role})
                  </option>
                ))}
              </select>
            </label>
            <div className="auth-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={working || !venueName.trim() || !venueSlug.trim() || !selectedMount}
              >
                {working ? "Creating..." : "Create venue"}
              </button>
            </div>
          </form>

          {venues.length ? (
            <div className="owner-admin-list">
              {venues.map((venue) => (
                <button key={venue.id} className="owner-admin-list-item" onClick={() => onOpenVenue(venue.id)}>
                  <strong>{venue.name}</strong>
                  <span>{venue.location ?? venue.slug}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <p>No venues exist yet.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="People"
          title="Provision operator"
          description="VOIS creates the login, applies the role claim, and stores the access model internally."
        >
          <form className="setup-form-grid" onSubmit={handleCreateMember}>
            <label className="auth-field">
              <span>Full name</span>
              <input value={memberName} onChange={(event) => setMemberName(event.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="manager@company.com"
                required
              />
            </label>
            <label className="auth-field">
              <span>Role</span>
              <select
                value={memberRole}
                onChange={(event) =>
                  setMemberRole(event.target.value as "owner" | "manager" | "barista" | "developer")
                }
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="barista">Barista</option>
                <option value="developer">Developer</option>
              </select>
            </label>
            <div className="auth-field auth-field-span-2">
              <span>Venue access</span>
              <div className="owner-admin-checkbox-grid">
                {venues.map((venue) => (
                  <label key={venue.id} className="owner-admin-checkbox">
                    <input
                      type="checkbox"
                      checked={memberVenueIds.includes(venue.id)}
                      disabled={memberRole === "owner" || memberRole === "developer"}
                      onChange={(event) => {
                        setMemberVenueIds((current) =>
                          event.target.checked
                            ? [...current, venue.id]
                            : current.filter((value) => value !== venue.id)
                        );
                      }}
                    />
                    <span>{venue.name}</span>
                  </label>
                ))}
                {!venues.length ? <p className="history-note">Create a venue before provisioning managers or baristas.</p> : null}
              </div>
            </div>
            <div className="auth-actions">
              <button
                type="submit"
                className="btn btn-primary"
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
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Access"
        title="People and access"
        description="Update roles, deactivate accounts, rotate passwords, and adjust venue assignments."
      >
        {loadingMembers ? (
          <div className="empty-state compact">
            <p>Loading organization members...</p>
          </div>
        ) : !members.length ? (
          <div className="empty-state compact">
            <p>No members exist yet.</p>
          </div>
        ) : (
          <div className="owner-member-grid">
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
      </SectionCard>
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
    <article className="owner-member-card">
      <div className="thread-row">
        <div>
          <strong>{member.email}</strong>
          <p className="history-note">{member.firebase_uid ?? "Firebase user will be created on provision."}</p>
        </div>
        <span className={`status-pill ${active ? "active" : ""}`}>{active ? "active" : "inactive"}</span>
      </div>

      <div className="setup-form-grid owner-member-form">
        <label className="auth-field">
          <span>Name</span>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>
        <label className="auth-field">
          <span>Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "owner" | "manager" | "barista" | "developer")}
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="barista">Barista</option>
            <option value="developer">Developer</option>
          </select>
        </label>
      </div>

      {usesVenueAssignments ? (
        <div className="owner-admin-checkbox-grid">
          {venues.map((venue) => (
            <label key={venue.id} className="owner-admin-checkbox">
              <input
                type="checkbox"
                checked={venueIds.includes(venue.id)}
                onChange={(event) => {
                  setVenueIds((current) =>
                    event.target.checked ? [...current, venue.id] : current.filter((value) => value !== venue.id)
                  );
                }}
              />
              <span>{venue.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="history-note">This role uses organization-level access and does not take venue assignments.</p>
      )}

      <div className="sample-actions">
        <button
          className="btn btn-secondary"
          onClick={() => setActive((current) => !current)}
          disabled={busy}
        >
          Mark {active ? "inactive" : "active"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onResetMemberLogin(member.id)}
          disabled={busy}
        >
          Reset login
        </button>
        <button
          className="btn btn-primary"
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
