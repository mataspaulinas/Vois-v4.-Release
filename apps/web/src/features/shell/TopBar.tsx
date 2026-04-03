import { useCallback, useEffect, useRef, useState } from "react";
import { PortfolioSummaryResponse, Venue } from "../../lib/api";
import { NotificationBell } from "./NotificationBell";
import { SkinId, ThemeMode } from "./types";
import Icon from "../../components/Icon";
import { Select } from "../../components/ui/Select";

type TopBarProps = {
  venues: Venue[];
  activeVenue: Venue | null;
  portfolioSummary: PortfolioSummaryResponse | null;
  authRole: string | null;
  theme: ThemeMode;
  skin: SkinId;
  userName: string;
  authMode: string;
  onSelectVenue: (venueId: string) => void;
  onShowPortfolio: () => void;
  onToggleTheme: () => void;
  onSelectSkin: (skin: SkinId) => void;
  onToggleCopilot: () => void;
  onOpenSearch: () => void;
  onShowSettings: () => void;
  onLogout: () => void;
  copilotOpen: boolean;
  formatTimestamp: (iso: string) => string;
  onNavigateToVenue?: (venueId: string) => void;
};

export function TopBar({
  venues,
  activeVenue,
  authRole,
  theme,
  userName,
  authMode,
  onSelectVenue,
  onShowPortfolio,
  onToggleTheme,
  onToggleCopilot,
  onOpenSearch,
  onShowSettings,
  onLogout,
  copilotOpen,
  formatTimestamp,
  onNavigateToVenue,
}: TopBarProps) {
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
      {/* ── Left: venue selector ── */}
      <div className="topbar-left" style={{ display: "flex", alignItems: "center" }}>
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

      {/* ── Center: spacer ── */}
      <div className="topbar-center" />

      {/* ── Right: actions ── */}
      <div
        className="topbar-right"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-8)",
        }}
      >
        {/* Search pill → opens command palette */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="topbar-search-pill"
          aria-label="Open search"
        >
          <Icon name="search" size={14} color="var(--color-text-muted)" />
          <span>Search or Cmd+K</span>
        </button>

        <NotificationBell authRole={authRole} formatTimestamp={formatTimestamp} onNavigateToVenue={onNavigateToVenue} />

        {/* User menu */}
        <UserMenu
          userName={userName}
          authRole={authRole}
          authMode={authMode}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onShowSettings={onShowSettings}
          onLogout={onLogout}
        />

        {/* Copilot button */}
        <button
          className={`topbar-icon-btn ${copilotOpen ? "active" : ""}`}
          onClick={onToggleCopilot}
          aria-label="Copilot"
          title="Copilot"
        >
          <Icon name="copilot" size={16} />
        </button>
      </div>
    </header>
  );
}

/* ── User Menu ── */

function UserMenu({
  userName,
  authRole,
  authMode,
  theme,
  onToggleTheme,
  onShowSettings,
  onLogout,
}: {
  userName: string;
  authRole: string | null;
  authMode: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onShowSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`topbar-user-pill ${open ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
      >
        <span className="topbar-user-avatar">{initials}</span>
        <span className="topbar-user-name">{userName}</span>
        <Icon name="chevron-down" size={12} />
      </button>

      {open && (
        <div className="topbar-user-dropdown">
          {/* Header */}
          <div className="topbar-user-dropdown__header">
            <span className="topbar-user-dropdown__name">{userName}</span>
            <span className="topbar-user-dropdown__role">{authRole ?? "user"}</span>
          </div>

          <div className="topbar-user-dropdown__divider" />

          {/* Theme toggle */}
          <button
            className="topbar-user-dropdown__item"
            onClick={() => { onToggleTheme(); }}
          >
            <Icon name={theme === "dark" ? "theme-light" : "theme-dark"} size={16} />
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          {/* Settings */}
          <button
            className="topbar-user-dropdown__item"
            onClick={() => { onShowSettings(); setOpen(false); }}
          >
            <Icon name="settings" size={16} />
            <span>Settings</span>
          </button>

          <div className="topbar-user-dropdown__divider" />

          {/* Logout */}
          <button
            className="topbar-user-dropdown__item topbar-user-dropdown__item--danger"
            onClick={() => { onLogout(); setOpen(false); }}
          >
            <Icon name="back" size={16} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
