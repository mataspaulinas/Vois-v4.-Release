import { FormEvent, useMemo, useState } from "react";

import { OntologyMountSummary, OwnerClaimPayload } from "../../lib/api";

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

/* ---- Shared inline-style fragments ---- */
const labelSpan: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #E5E5E5",
  padding: "0 14px", fontSize: 15, color: "#0A0A0A", outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "auto" as const };

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
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px", maxWidth: 720, margin: "0 auto" }}>
      {/* ---- Hero header ---- */}
      <div style={{ textAlign: "center" as const }}>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 999,
          background: "#6C5CE7", color: "#FFFFFF",
          fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 12,
        }}>
          SETUP
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: "0 0 8px" }}>
          Claim your workspace
        </h1>
        <p style={{ fontSize: 15, color: "#737373", margin: 0, lineHeight: 1.5 }}>
          {ownerName} ({ownerEmail}) is authenticated, but VOIS has not been claimed yet. Create the organization for
          this workspace and optionally attach the first venue now.
        </p>
        {statusMessage ? (
          <p style={{ fontSize: 13, color: "#A3A3A3", marginTop: 8 }}>{statusMessage}</p>
        ) : null}
      </div>

      {/* ---- Main form card ---- */}
      <div style={{
        background: "#FFFFFF", borderRadius: 12, padding: "24px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
              SETUP
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px" }}>
              Create the first real workspace
            </h2>
            <p style={{ fontSize: 13, color: "#737373", margin: 0 }}>
              This replaces the old seeded demo boot. VOIS stays empty until an owner claims it.
            </p>
          </div>
          <button
            style={{
              background: "#FFFFFF", color: "#0A0A0A", border: "1.5px solid #E5E5E5", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              opacity: submitting ? 0.5 : 1, flexShrink: 0,
            }}
            onClick={onLogout}
            disabled={submitting}
          >
            Sign out
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span style={labelSpan}>Organization name</span>
            <input
              style={inputStyle}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your operating group"
              required
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>
          <label>
            <span style={labelSpan}>Organization slug</span>
            <input
              style={inputStyle}
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
              placeholder="your-operating-group"
              required
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>
          <label>
            <span style={labelSpan}>Region</span>
            <input style={inputStyle} value={region} onChange={(e) => setRegion(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>
          <label>
            <span style={labelSpan}>Data residency</span>
            <input style={inputStyle} value={dataResidency} onChange={(e) => setDataResidency(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>

          {/* ---- Divider ---- */}
          <div style={{ gridColumn: "1 / -1", padding: "12px 0 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
              Optional first venue
            </div>
            <p style={{ fontSize: 13, color: "#737373", margin: 0 }}>
              You can claim the organization first and add venues later, or create the first venue right now.
            </p>
          </div>

          <label>
            <span style={labelSpan}>Venue name</span>
            <input style={inputStyle} value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="First venue"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>
          <label>
            <span style={labelSpan}>Venue slug</span>
            <input style={inputStyle} value={venueSlug} onChange={(e) => setVenueSlug(e.target.value)} placeholder="first-venue"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>
          <label>
            <span style={labelSpan}>Concept</span>
            <input style={inputStyle} value={venueConcept} onChange={(e) => setVenueConcept(e.target.value)} placeholder="Concept or service model"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>
          <label>
            <span style={labelSpan}>Location</span>
            <input style={inputStyle} value={venueLocation} onChange={(e) => setVenueLocation(e.target.value)} placeholder="City / site"
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6C5CE7"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5"; }}
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            <span style={labelSpan}>Ontology pack</span>
            <select
              style={selectStyle}
              value={selectedMount}
              onChange={(e) => setSelectedMount(e.target.value)}
              disabled={!availableMounts.length}
            >
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

          {error ? (
            <p style={{ gridColumn: "1 / -1", fontSize: 13, color: "#EF4444", margin: 0 }}>{error}</p>
          ) : null}

          <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <button
              type="submit"
              style={{
                background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8,
                padding: "10px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                opacity:
                  submitting ||
                  !organizationName.trim() ||
                  !organizationSlug.trim() ||
                  (!!venueName.trim() && (!venueSlug.trim() || !selectedMount))
                    ? 0.5
                    : 1,
              }}
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
      </div>
    </div>
  );
}
