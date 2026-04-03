import type { VenueSubview, ManagerView, PocketView, OwnerView } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MobileTabStripProps = {
  visible: boolean;
  authRole: string | null; // "owner" | "manager" | "barista" | "developer"
  activeTopLevel: string;
  activeView: string; // managerView | pocketView | ownerView | venueView
  onSelectView: (view: string) => void;
  onSelectManagerView?: (view: string) => void;
  onSelectPocketView?: (view: string) => void;
  onSelectOwnerView?: (view: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Tab definitions per role / context                                 */
/* ------------------------------------------------------------------ */

type TabDef = { key: string; icon: string; label: string };

const OWNER_TABS: TabDef[] = [
  { key: "command",     icon: "CM", label: "Command" },
  { key: "delegations", icon: "DL", label: "Delegations" },
  { key: "people",      icon: "PE", label: "People" },
  { key: "venue",       icon: "VN", label: "Venue" },
  { key: "copilot",     icon: "CP", label: "Copilot" },
];

const MANAGER_TABS: TabDef[] = [
  { key: "today",   icon: "TD", label: "Today" },
  { key: "plan",    icon: "PL", label: "Plan" },
  { key: "team",    icon: "TM", label: "Team" },
  { key: "signals", icon: "SG", label: "Signals" },
  { key: "copilot", icon: "CP", label: "Copilot" },
];

const POCKET_TABS: TabDef[] = [
  { key: "shift",     icon: "SH", label: "Shift" },
  { key: "standards", icon: "SD", label: "Standards" },
  { key: "help",      icon: "HP", label: "Help" },
  { key: "report",    icon: "RP", label: "Report" },
  { key: "log",       icon: "LG", label: "Log" },
];

const VENUE_TABS: TabDef[] = [
  { key: "overview",   icon: "OV", label: "Overview" },
  { key: "assessment", icon: "AS", label: "Assessment" },
  { key: "diagnosis",  icon: "DG", label: "Diagnosis" },
  { key: "plan",       icon: "PL", label: "Plan" },
  { key: "history",    icon: "HS", label: "History" },
];

/* ------------------------------------------------------------------ */
/*  Resolve which tab set + handler to use                             */
/* ------------------------------------------------------------------ */

function resolveTabs(
  authRole: string | null,
  activeTopLevel: string,
): TabDef[] | null {
  if (authRole === "barista") return POCKET_TABS;
  if (authRole === "manager" && activeTopLevel === "manager") return MANAGER_TABS;
  if (authRole === "owner" && activeTopLevel === "owner") return OWNER_TABS;
  if (activeTopLevel === "venue") return VENUE_TABS;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Styles (design tokens)                                             */
/* ------------------------------------------------------------------ */

const ACCENT = "var(--color-accent)";
const MUTED = "var(--color-text-muted)";
const BORDER_COLOR = "var(--color-border-subtle)";

const barStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 64,
  background: "var(--color-surface)",
  borderTop: `1px solid ${BORDER_COLOR}`,
  /* display controlled by CSS class .mobile-tab-strip-bar */
  alignItems: "stretch",
  justifyContent: "space-around",
  zIndex: "var(--z-sticky, 50)" as unknown as number,
};

function buttonStyle(isActive: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    position: "relative",
    minWidth: 48,
    minHeight: 48,
    padding: "6px 4px",
    transition: "color 180ms ease",
    color: isActive ? ACCENT : MUTED,
  };
}

const indicatorStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: "20%",
  right: "20%",
  height: 3,
  borderRadius: "0 0 3px 3px",
  background: ACCENT,
};

function iconStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: 700,
    letterSpacing: "0.5px",
    lineHeight: 1,
  };
}

function labelStyle(isActive: boolean): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: isActive ? 600 : 400,
    lineHeight: 1,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MobileTabStrip({
  visible,
  authRole,
  activeTopLevel,
  activeView,
  onSelectView,
  onSelectManagerView,
  onSelectPocketView,
  onSelectOwnerView,
}: MobileTabStripProps) {
  if (!visible) return null;

  const tabs = resolveTabs(authRole, activeTopLevel);
  if (!tabs) return null;

  /* Pick the correct handler based on context */
  const handleSelect = (key: string) => {
    if (authRole === "barista" && onSelectPocketView) {
      onSelectPocketView(key);
    } else if (authRole === "manager" && activeTopLevel === "manager" && onSelectManagerView) {
      onSelectManagerView(key);
    } else if (authRole === "owner" && activeTopLevel === "owner" && onSelectOwnerView) {
      onSelectOwnerView(key);
    } else {
      onSelectView(key);
    }
  };

  return (
    <div className="mobile-tab-strip-bar" style={barStyle}>
      {tabs.map((tab) => {
        const isActive = activeView === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => handleSelect(tab.key)}
            style={buttonStyle(isActive)}
          >
            {isActive && <span style={indicatorStyle} />}
            <span style={iconStyle()}>{tab.icon}</span>
            <span style={labelStyle(isActive)}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
