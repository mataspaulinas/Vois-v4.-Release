import { FormEvent, useMemo, useState } from "react";

import { OntologyMountSummary, OwnerClaimPayload } from "../../lib/api";
import { SectionCard } from "../../components/SectionCard";

type OwnerSetupViewProps = {
  ownerName: string;
  ownerEmail: string;
  statusMessage?: string | null;
  mounts: OntologyMountSummary[];
  submitting: boolean;
  error?: string | null;
  onClaim: (payload: OwnerClaimPayload) => Promise<void> | void;
  onLogout: () => void;
};

export function OwnerSetupView({
  ownerName,
  ownerEmail,
  statusMessage,
  mounts,
  submitting,
  error,
  onClaim,
  onLogout,
}: OwnerSetupViewProps) {
  const availableMounts = useMemo(
    () => mounts.filter((mount) => mount.status === "active" && mount.validation.mountable),
    [mounts]
  );
  const defaultMountId = availableMounts[0] ? `${availableMounts[0].ontology_id}@${availableMounts[0].version}` : "";

  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [region, setRegion] = useState("europe");
  const [dataResidency, setDataResidency] = useState("eu-central");
  const [venueName, setVenueName] = useState("");
  const [venueSlug, setVenueSlug] = useState("");
  const [venueConcept, setVenueConcept] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [selectedMount, setSelectedMount] = useState(defaultMountId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [ontologyId, ontologyVersion] = selectedMount.split("@", 2);
    await onClaim({
      organization_name: organizationName.trim(),
      organization_slug: organizationSlug.trim(),
      region,
      data_residency: dataResidency,
      first_venue:
        venueName.trim() && venueSlug.trim() && ontologyId && ontologyVersion
          ? {
              name: venueName.trim(),
              slug: venueSlug.trim(),
              concept: venueConcept.trim() || null,
              location: venueLocation.trim() || null,
              ontology_binding: {
                ontology_id: ontologyId,
                ontology_version: ontologyVersion,
              },
              capacity_profile: {},
            }
          : null,
    });
  }

  return (
    <div className="setup-shell">
      <div className="setup-hero">
        <p className="hero-badge">Owner setup</p>
        <h1>Claim your workspace</h1>
        <p className="hero-copy">
          {ownerName} ({ownerEmail}) is authenticated, but VOIS has not been claimed yet. Create the organization for
          this workspace and optionally attach the first venue now.
        </p>
        {statusMessage ? <p className="history-note">{statusMessage}</p> : null}
      </div>

      <SectionCard
        eyebrow="Setup"
        title="Create the first real workspace"
        description="This replaces the old seeded demo boot. VOIS stays empty until an owner claims it."
        actions={
          <button className="btn btn-secondary" onClick={onLogout} disabled={submitting}>
            Sign out
          </button>
        }
      >
        <form className="setup-form-grid" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Organization name</span>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Your operating group"
              required
            />
          </label>

          <label className="auth-field">
            <span>Organization slug</span>
            <input
              value={organizationSlug}
              onChange={(event) => setOrganizationSlug(event.target.value)}
              placeholder="your-operating-group"
              required
            />
          </label>

          <label className="auth-field">
            <span>Region</span>
            <input value={region} onChange={(event) => setRegion(event.target.value)} />
          </label>

          <label className="auth-field">
            <span>Data residency</span>
            <input value={dataResidency} onChange={(event) => setDataResidency(event.target.value)} />
          </label>

          <div className="setup-divider">
            <p className="section-eyebrow">Optional first venue</p>
            <p className="section-description">
              You can claim the organization first and add venues later, or create the first venue right now.
            </p>
          </div>

          <label className="auth-field">
            <span>Venue name</span>
            <input
              value={venueName}
              onChange={(event) => setVenueName(event.target.value)}
              placeholder="First venue"
            />
          </label>

          <label className="auth-field">
            <span>Venue slug</span>
            <input
              value={venueSlug}
              onChange={(event) => setVenueSlug(event.target.value)}
              placeholder="first-venue"
            />
          </label>

          <label className="auth-field">
            <span>Concept</span>
            <input
              value={venueConcept}
              onChange={(event) => setVenueConcept(event.target.value)}
              placeholder="Concept or service model"
            />
          </label>

          <label className="auth-field">
            <span>Location</span>
            <input
              value={venueLocation}
              onChange={(event) => setVenueLocation(event.target.value)}
              placeholder="City / site"
            />
          </label>

          <label className="auth-field auth-field-span-2">
            <span>Ontology pack</span>
            <select value={selectedMount} onChange={(event) => setSelectedMount(event.target.value)} disabled={!availableMounts.length}>
              {availableMounts.length ? (
                availableMounts.map((mount) => (
                  <option key={`${mount.ontology_id}@${mount.version}`} value={`${mount.ontology_id}@${mount.version}`}>
                    {mount.display_name} ({mount.version})
                  </option>
                ))
              ) : (
                <option value="">No mountable ontology packs available</option>
              )}
            </select>
          </label>

          {error ? <p className="setup-inline-error">{error}</p> : null}

          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                submitting ||
                !organizationName.trim() ||
                !organizationSlug.trim() ||
                (!!venueName.trim() && (!venueSlug.trim() || !selectedMount))
              }
            >
              {submitting ? "Claiming workspace..." : "Claim owner workspace"}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
