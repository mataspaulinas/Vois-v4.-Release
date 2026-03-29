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
  const heartbeat = portfolioSummary
    ? `${portfolioSummary.totals.ready_tasks} ready · ${portfolioSummary.totals.blocked_tasks} blocked · ${portfolioSummary.totals.progress_entries} logs`
    : "Workspace heartbeat loading";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <div className="topbar-health">Operational Intelligence System</div>
          <div className="topbar-health-meta">{heartbeat}</div>
        </div>
      </div>

      <div className="topbar-center">
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
          >
            <option value="__portfolio__">Portfolio</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>
        <div className="breadcrumb-bar">
          <button className="breadcrumb-link" onClick={onShowPortfolio}>
            Portfolio
          </button>
          {activeVenue ? (
            <>
              <span className="breadcrumb-sep">{">"}</span>
              <span className="breadcrumb-current">{activeVenue.name}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-session-pill" title={`Authentication mode: ${authMode}`}>
          <strong>{userName}</strong>
          <span>{authMode.replace(/_/g, " ")}</span>
        </div>
        <button className="topbar-theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <div className="topbar-skin-dots" aria-label="Choose skin">
          {skins.map((skinId) => (
            <button
              key={skinId}
              className={`skin-dot skin-dot--${skinId} ${skin === skinId ? "active" : ""}`}
              onClick={() => onSelectSkin(skinId)}
              aria-label={`Switch to ${skinId} skin`}
              title={skinId}
            />
          ))}
        </div>
        <NotificationBell formatTimestamp={formatTimestamp} onNavigateToVenue={onNavigateToVenue} />
        <button className={`topbar-btn ${copilotOpen ? "active" : ""}`} onClick={onToggleCopilot}>
          vOIS
        </button>
      </div>
    </header>
  );
}
