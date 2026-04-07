import { SkinId, ThemeMode } from "./types";
import { NotificationBell } from "./NotificationBell";
import Icon from "../../components/Icon";

const SKIN_DOTS: { id: SkinId; color: string; label: string }[] = [
  { id: "ocean", color: "#2B7CB3", label: "Ocean" },
  { id: "forest", color: "#3D8B63", label: "Forest" },
  { id: "ember", color: "#E8720C", label: "Ember" },
  { id: "midnight", color: "#6C5CE7", label: "Midnight" },
  { id: "slate", color: "#64748B", label: "Slate" },
];

type TopBarProps = {
  authRole: string | null;
  theme: ThemeMode;
  skin: SkinId;
  onToggleTheme: () => void;
  onSelectSkin: (skin: SkinId) => void;
  onToggleCopilot: () => void;
  onLogout: () => void;
  copilotOpen: boolean;
  formatTimestamp: (iso: string) => string;
  onNavigateToVenue?: (venueId: string) => void;
};

export function TopBar({
  authRole,
  theme,
  skin,
  onToggleTheme,
  onSelectSkin,
  onToggleCopilot,
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
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 var(--spacing-16)",
        gap: "var(--spacing-8)",
      }}
    >
      {/* Skin dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
        {SKIN_DOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSkin(s.id)}
            title={s.label}
            aria-label={`${s.label} skin`}
            style={{
              width: skin === s.id ? 10 : 8,
              height: skin === s.id ? 10 : 8,
              borderRadius: "50%",
              background: s.color,
              border: "none",
              cursor: "pointer",
              padding: 0,
              opacity: skin === s.id ? 1 : 0.4,
              transition: "all var(--motion-fast) var(--easing-standard)",
              boxShadow: skin === s.id ? `0 0 0 2px var(--color-surface), 0 0 0 3px ${s.color}` : "none",
            }}
          />
        ))}
      </div>

      <NotificationBell authRole={authRole} formatTimestamp={formatTimestamp} onNavigateToVenue={onNavigateToVenue} />

      <button
        className="topbar-icon-btn"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        <Icon name={theme === "dark" ? "theme-light" : "theme-dark"} size={16} />
      </button>

      <button
        className={`topbar-icon-btn ${copilotOpen ? "active" : ""}`}
        onClick={onToggleCopilot}
        aria-label="Copilot"
        title="Copilot"
      >
        <Icon name="copilot" size={16} />
      </button>

      <button
        className="topbar-icon-btn"
        onClick={onLogout}
        aria-label="Sign out"
        title="Sign out"
      >
        <Icon name="back" size={16} />
      </button>
    </header>
  );
}
