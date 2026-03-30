import { PropsWithChildren, ReactNode } from "react";

import { Venue } from "../../lib/api";

type RoleWorkspaceNavItem = {
  key: string;
  label: string;
  active?: boolean;
  onClick: () => void;
};

type RoleWorkspaceFrameProps = PropsWithChildren<{
  roleLabel: string;
  title: string;
  subtitle?: string;
  organizationName?: string | null;
  venues?: Venue[];
  activeVenueId?: string | null;
  onSelectVenue?: (venueId: string) => void;
  navItems?: RoleWorkspaceNavItem[];
  actions?: ReactNode;
}>;

export function RoleWorkspaceFrame({
  roleLabel,
  title,
  subtitle,
  organizationName,
  venues = [],
  activeVenueId = null,
  onSelectVenue,
  navItems = [],
  actions,
  children,
}: RoleWorkspaceFrameProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100%" }}>
      {/* Header */}
      <header style={{
        padding: "20px 24px 16px",
        background: "#FFFFFF",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <p style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "#6C5CE7",
              marginBottom: 4,
            }}>
              {roleLabel}
            </p>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              lineHeight: 1.3,
            }}>
              {title}
            </h1>
            {subtitle ? (
              <p style={{
                margin: "4px 0 0",
                fontSize: 15,
                color: "#777",
                lineHeight: 1.4,
              }}>
                {subtitle}
              </p>
            ) : null}
            {organizationName ? (
              <p style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#999",
              }}>
                {organizationName}
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {onSelectVenue && venues.length ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#777", fontWeight: 500 }}>Venue</span>
                <select
                  value={activeVenueId ?? venues[0]?.id ?? ""}
                  onChange={(event) => onSelectVenue(event.target.value)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#FFFFFF",
                    color: "#1a1a1a",
                    minHeight: 36,
                    cursor: "pointer",
                    transition: "border-color 180ms ease",
                  }}
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {actions ? <div style={{ display: "flex", gap: 8 }}>{actions}</div> : null}
          </div>
        </div>
      </header>

      {/* Navigation */}
      {navItems.length ? (
        <nav
          aria-label={`${roleLabel} navigation`}
          style={{
            display: "flex",
            gap: 2,
            padding: "0 24px",
            background: "#FFFFFF",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: item.active ? 600 : 400,
                color: item.active ? "#6C5CE7" : "#777",
                background: "transparent",
                border: "none",
                borderBottom: item.active ? "2px solid #6C5CE7" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 180ms ease",
                minHeight: 44,
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      {/* Content */}
      <main style={{ flex: 1, padding: "20px 24px" }}>
        {children}
      </main>
    </div>
  );
}
