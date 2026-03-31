import { PropsWithChildren, ReactNode } from "react";

import { Venue } from "../../lib/api";
import { Select } from "../../components/ui/Select";

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
        background: "var(--color-surface)",
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
              color: "var(--color-accent)",
              marginBottom: 4,
            }}>
              {roleLabel}
            </p>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              lineHeight: 1.3,
            }}>
              {title}
            </h1>
            {subtitle ? (
              <p style={{
                margin: "4px 0 0",
                fontSize: 15,
                color: "var(--color-text-muted)",
                lineHeight: 1.4,
              }}>
                {subtitle}
              </p>
            ) : null}
            {organizationName ? (
              <p style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--color-text-muted)",
              }}>
                {organizationName}
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {onSelectVenue && venues.length ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>Venue</span>
                <Select
                  options={venues.map((venue) => ({ value: venue.id, label: venue.name }))}
                  value={activeVenueId ?? venues[0]?.id ?? ""}
                  onChange={(value) => onSelectVenue(value)}
                  aria-label="Select venue"
                  size="sm"
                />
              </div>
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
            background: "var(--color-surface)",
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
                color: item.active ? "var(--color-accent)" : "var(--color-text-muted)",
                background: "transparent",
                border: "none",
                borderBottom: item.active ? "2px solid var(--color-accent)" : "2px solid transparent",
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
