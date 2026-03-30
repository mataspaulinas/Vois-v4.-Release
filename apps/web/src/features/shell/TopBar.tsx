import { PortfolioSummaryResponse, Venue } from "../../lib/api";
import { NotificationBell } from "./NotificationBell";
import { SkinId, ThemeMode } from "./types";

type TopBarProps = {
  venues: Venue[];
  activeVenue: Venue | null;
  portfolioSummary: PortfolioSummaryResponse | null;
  theme: ThemeMode;
  skin: SkinId;
  userName: string;
  authMode: string;
  onSelectVenue: (venueId: string) => void;
  onShowPortfolio: () => void;
  onToggleTheme: () => void;
  onSelectSkin: (skin: SkinId) => void;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
  formatTimestamp: (iso: string) => string;
  onNavigateToVenue?: (venueId: string) => void;
};

const skins: SkinId[] = ["ocean", "forest", "ember", "midnight"];

export function TopBar({
  venues,
  activeVenue,
  portfolioSummary,
  theme,
  skin,
  userName,
  authMode,
  onSelectVenue,
  onShowPortfolio,
  onToggleTheme,
  onSelectSkin,
  onToggleCopilot,
  copilotOpen,
  formatTimestamp,
  onNavigateToVenue,
}: TopBarProps) {
  /* keep heartbeat value computed (even if not displayed) so no logic changes */
  const heartbeat = portfolioSummary
    ? `${portfolioSummary.totals.ready_tasks} ready · ${portfolioSummary.totals.blocked_tasks} blocked · ${portfolioSummary.totals.progress_entries} logs`
    : "Workspace heartbeat loading";

  return (
    <header
      className="topbar"
      style={{
        height: "var(--topbar-height)",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border-subtle)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        padding: "0 var(--spacing-16)",
        gap: "var(--spacing-16)",
      }}
    >
      {/* ── Left: breadcrumb ── */}
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          className="breadcrumb-link"
          onClick={onShowPortfolio}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-small)",
            color: "var(--color-accent)",
            fontWeight: 500,
            padding: 0,
            fontFamily: "var(--font-sans)",
          }}
        >
          Portfolio
        </button>
        {activeVenue ? (
          <>
            <span
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--text-small)",
                margin: "0 2px",
              }}
            >
              /
            </span>
            <span
              style={{
                fontSize: "var(--text-small)",
                color: "var(--color-text-primary)",
                fontWeight: 500,
              }}
            >
              {activeVenue.name}
            </span>
          </>
        ) : null}
      </div>

      {/* ── Center: venue selector ── */}
      <div
        className="topbar-center"
        style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <div className="topbar-venue-selector">
          <select
            className="topbar-venue-select"
            value={activeVenue?.id ?? "__portfolio__"}
            onChange={(event) => {
              if (event.target.value === "__portfolio__") {
                onShowPortfolio();
                return;
              }
              onSelectVenue(event.target.value);
            }}
            aria-label="Select venue"
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: `var(--color-surface) url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A3A3A3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 12px center`,
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 32px 6px 12px",
              fontSize: "var(--text-card)",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              minWidth: 180,
              outline: "none",
              transition: `border-color var(--motion-fast) var(--easing-standard)`,
            }}
          >
            <option value="__portfolio__">Portfolio</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div
        className="topbar-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-8)",
        }}
      >
        {/* Search pill (visual placeholder) */}
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: 200,
            padding: "6px 16px",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-xl)",
            background: "var(--color-surface)",
            color: "var(--color-text-muted)",
            fontSize: "var(--text-small)",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: `border-color var(--motion-fast) var(--easing-standard)`,
          }}
          aria-label="Open search"
        >
          <span style={{ opacity: 0.5 }}>&#x2315;</span>
          Search or Cmd+K
        </button>

        <NotificationBell formatTimestamp={formatTimestamp} onNavigateToVenue={onNavigateToVenue} />

        {/* Theme toggle (icon-only circle button) */}
        <button
          className="topbar-theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--color-text-secondary)",
            padding: 0,
            transition: `background var(--motion-fast) var(--easing-standard)`,
          }}
        >
          {theme === "dark" ? "\u2600" : "\u263E"}
        </button>

        {/* Session pill (user name only) */}
        <div
          className="topbar-session-pill"
          title={`${userName} \u00B7 ${authMode.replace(/_/g, " ")}`}
          style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-xl)",
            background: "var(--color-bg-muted)",
            fontSize: "var(--text-card)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            lineHeight: 1.4,
          }}
        >
          {userName}
        </div>

        {/* Copilot button */}
        <button
          className={`topbar-btn ${copilotOpen ? "active" : ""}`}
          onClick={onToggleCopilot}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-sm)",
            border: copilotOpen ? "1px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
            background: copilotOpen ? "var(--color-accent-soft)" : "var(--color-surface)",
            color: "var(--color-accent)",
            fontSize: "var(--text-small)",
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            transition: `all var(--motion-fast) var(--easing-standard)`,
          }}
        >
          Copilot
        </button>
      </div>
    </header>
  );
}
