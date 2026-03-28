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
    <div className="role-workspace-shell">
      <header className="role-workspace-header">
        <div className="role-workspace-header-main">
          <p className="section-eyebrow">{roleLabel}</p>
          <h1>{title}</h1>
          {subtitle ? <p className="section-description role-workspace-subtitle">{subtitle}</p> : null}
          {organizationName ? <p className="role-workspace-meta">{organizationName}</p> : null}
        </div>

        <div className="role-workspace-toolbar">
          {onSelectVenue && venues.length ? (
            <label className="role-workspace-venue-picker">
              <span>Venue</span>
              <select
                value={activeVenueId ?? venues[0]?.id ?? ""}
                onChange={(event) => onSelectVenue(event.target.value)}
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {actions ? <div className="role-workspace-actions">{actions}</div> : null}
        </div>
      </header>

      {navItems.length ? (
        <nav className="role-workspace-nav" aria-label={`${roleLabel} navigation`}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`role-workspace-nav-item ${item.active ? "active" : ""}`}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="role-workspace-main">{children}</main>
    </div>
  );
}
