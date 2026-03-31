import { PortfolioSummaryResponse, Venue } from "../../lib/api";
import { NotificationBell } from "./NotificationBell";
import { SkinId, ThemeMode } from "./types";
import Icon from "../../components/Icon";
import { Select } from "../../components/ui/Select";

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
          <Select
            options={[
              { value: "__portfolio__", label: "Portfolio" },
              ...venues.map((venue) => ({ value: venue.id, label: venue.name })),
            ]}
            value={activeVenue?.id ?? "__portfolio__"}
            onChange={(value) => {
              if (value === "__portfolio__") {
                onShowPortfolio();
                return;
              }
              onSelectVenue(value);
            }}
            aria-label="Select venue"
            size="sm"
          />
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
          <Icon name="search" size={14} color="var(--color-text-muted)" />
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
          {theme === "dark" ? <Icon name="theme-light" size={16} /> : <Icon name="theme-dark" size={16} />}
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
          aria-label="Copilot"
          title="Copilot"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-sm)",
            border: copilotOpen ? "1px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
            background: copilotOpen ? "var(--color-accent-soft)" : "var(--color-surface)",
            color: "var(--color-accent)",
            cursor: "pointer",
            transition: `all var(--motion-fast) var(--easing-standard)`,
          }}
        >
          <Icon name="copilot" size={16} />
        </button>
      </div>
    </header>
  );
}
