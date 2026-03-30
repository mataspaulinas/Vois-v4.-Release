import { PortfolioSummaryResponse } from "../../lib/api";
import {
  ManagerView,
  OwnerView,
  PocketView,
  ReferenceView,
  TopLevelView,
  VenueSubview,
} from "./types";

/* ── Props ── */

type SidebarProps = {
  collapsed: boolean;
  activeTopLevel: TopLevelView;
  authRole: string | null; // "owner" | "manager" | "barista" | "developer"
  activeVenueName: string | null;
  activeVenueView: VenueSubview;
  activeReferenceView: ReferenceView;
  activeManagerView?: ManagerView;
  activePocketView?: PocketView;
  activeOwnerView?: OwnerView;
  onToggleCollapsed: () => void;
  onShowPortfolio: () => void;
  onSelectVenueView: (view: VenueSubview) => void;
  onSelectReferenceView: (view: ReferenceView) => void;
  onSelectManagerView?: (view: ManagerView) => void;
  onSelectPocketView?: (view: PocketView) => void;
  onSelectOwnerView?: (view: OwnerView) => void;
  onShowKnowledgeBase: () => void;
  onShowSettings: () => void;
  onShowManager: () => void;
  onShowPocket: () => void;
  onShowOwner: () => void;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
  portfolioSummary: PortfolioSummaryResponse | null;
};

/* ── Role-specific nav definitions ── */

type NavItem<V extends string = string> = { code: string; label: string; view: V };

const ownerOrgItems: NavItem<OwnerView>[] = [
  { code: "CM", label: "Command Center", view: "command" },
  { code: "DL", label: "Delegations", view: "delegations" },
  { code: "PP", label: "People", view: "people" },
  { code: "IN", label: "Intelligence", view: "intelligence" },
  { code: "AD", label: "Administration", view: "administration" },
];

const managerWorkspaceItems: NavItem<ManagerView>[] = [
  { code: "TD", label: "Today", view: "today" },
  { code: "WS", label: "Execution", view: "workspace" },
  { code: "PL", label: "Plan", view: "plan" },
  { code: "EV", label: "Evidence", view: "evidence" },
  { code: "TM", label: "Team Pulse", view: "team" },
  { code: "ES", label: "Escalations", view: "escalations" },
];

const pocketShiftItems: NavItem<PocketView>[] = [
  { code: "SH", label: "Shift", view: "shift" },
  { code: "SD", label: "Standards", view: "standards" },
  { code: "HP", label: "Help", view: "help" },
  { code: "RP", label: "Report", view: "report" },
  { code: "LG", label: "Log", view: "log" },
];

const venueItems: NavItem<VenueSubview>[] = [
  { code: "OV", label: "Overview", view: "overview" },
  { code: "AS", label: "Assessment", view: "assessment" },
  { code: "SG", label: "Signals", view: "signals" },
  { code: "PL", label: "Plan", view: "plan" },
  { code: "RP", label: "Report", view: "report" },
  { code: "HI", label: "History", view: "history" },
];

const venueConsoleItem: NavItem<VenueSubview> = { code: "CO", label: "Console", view: "console" };

const referenceItems: NavItem<ReferenceView>[] = [
  { code: "BL", label: "Blocks", view: "blocks" },
  { code: "TL", label: "Tools", view: "tools" },
  { code: "SG", label: "Signals", view: "signals" },
];

/* ── Styles ── */

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--color-text-muted)",
  padding: "16px 12px 4px",
  userSelect: "none",
};

const itemStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  background: active ? "var(--color-accent-soft, rgba(0,122,255,0.08))" : "transparent",
  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left" as const,
  transition: "background var(--motion-fast, 120ms) var(--easing-standard, ease)",
});

const itemHoverBg = "#F0F0F0";

/* ── Component ── */

export function Sidebar(props: SidebarProps) {
  const {
    collapsed,
    activeTopLevel,
    authRole,
    activeVenueName,
    activeVenueView,
    activeReferenceView,
    activeManagerView,
    activePocketView,
    activeOwnerView,
    onToggleCollapsed,
    onShowPortfolio,
    onSelectVenueView,
    onSelectReferenceView,
    onSelectManagerView,
    onSelectPocketView,
    onSelectOwnerView,
    onShowKnowledgeBase,
    onShowSettings,
    onShowManager,
    onShowPocket,
    onShowOwner,
    onToggleCopilot,
    copilotOpen,
    portfolioSummary,
  } = props;

  const isOwner = authRole === "owner";
  const isManager = authRole === "manager";
  const isBarista = authRole === "barista";
  const isDeveloper = authRole === "developer";

  const canSeePortfolio = isOwner || isDeveloper;
  const canSeeVenue = isOwner || isManager || isDeveloper;
  const showVenue = canSeeVenue && !!activeVenueName;

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: collapsed ? 48 : 240,
        minWidth: collapsed ? 48 : 240,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg, var(--color-bg, #FAFAFA))",
        borderRight: "1px solid var(--border, var(--color-border, #E5E5E5))",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width var(--motion-fast, 120ms) var(--easing-standard, ease)",
      }}
    >
      {/* ── Brand ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: collapsed ? "12px 12px" : "12px 12px",
          minHeight: 48,
        }}
      >
        <button
          onClick={canSeePortfolio ? onShowPortfolio : undefined}
          title="VOIS"
          style={{
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 0 : 6,
            background: "none",
            border: "none",
            cursor: canSeePortfolio ? "pointer" : "default",
            padding: 0,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-accent)",
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>
              VOIS
            </span>
          )}
        </button>
        <button
          onClick={onToggleCollapsed}
          aria-label="Toggle sidebar"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            fontSize: 16,
            lineHeight: 1,
            transition: "background var(--motion-fast, 120ms) var(--easing-standard, ease)",
          }}
        >
          {collapsed ? "\u203A" : "\u2039"}
        </button>
      </div>

      {/* ── Owner: Organization section ── */}
      {isOwner && (
        <>
          <SectionLabel collapsed={collapsed}>Organization</SectionLabel>
          {ownerOrgItems.map((item) => (
            <SidebarItem
              key={item.view}
              code={item.code}
              label={item.label}
              active={activeTopLevel === "owner" && activeOwnerView === item.view}
              collapsed={collapsed}
              onClick={() => onSelectOwnerView?.(item.view)}
            />
          ))}
        </>
      )}

      {/* ── Manager: Workspace section ── */}
      {isManager && (
        <>
          <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>
          {managerWorkspaceItems.map((item) => (
            <SidebarItem
              key={item.view}
              code={item.code}
              label={item.label}
              active={activeTopLevel === "manager" && activeManagerView === item.view}
              collapsed={collapsed}
              onClick={() => onSelectManagerView?.(item.view)}
            />
          ))}
        </>
      )}

      {/* ── Barista: My Shift section ── */}
      {isBarista && (
        <>
          <SectionLabel collapsed={collapsed}>My Shift</SectionLabel>
          {pocketShiftItems.map((item) => (
            <SidebarItem
              key={item.view}
              code={item.code}
              label={item.label}
              active={activeTopLevel === "pocket" && activePocketView === item.view}
              collapsed={collapsed}
              onClick={() => onSelectPocketView?.(item.view)}
            />
          ))}
        </>
      )}

      {/* ── Developer: Portfolio section ── */}
      {isDeveloper && (
        <>
          <SectionLabel collapsed={collapsed}>Portfolio</SectionLabel>
          <SidebarItem
            code="PF"
            label="Portfolio"
            active={activeTopLevel === "portfolio"}
            collapsed={collapsed}
            onClick={onShowPortfolio}
          />
        </>
      )}

      {/* ── Owner: Portfolio section (no separate label, just Portfolio item) ── */}
      {isOwner && (
        <>
          <SectionLabel collapsed={collapsed}>Portfolio</SectionLabel>
          <SidebarItem
            code="PF"
            label="Portfolio"
            active={activeTopLevel === "portfolio"}
            collapsed={collapsed}
            onClick={onShowPortfolio}
          />
        </>
      )}

      {/* ── Venue section (owner, manager, developer) ── */}
      {showVenue && (
        <>
          <SectionLabel collapsed={collapsed}>
            {"Venue: " + activeVenueName}
          </SectionLabel>
          {venueItems.map((item) => (
            <SidebarItem
              key={item.view}
              code={item.code}
              label={item.label}
              active={activeTopLevel === "venue" && activeVenueView === item.view}
              collapsed={collapsed}
              onClick={() => onSelectVenueView(item.view)}
            />
          ))}
          {isDeveloper && (
            <SidebarItem
              code={venueConsoleItem.code}
              label={venueConsoleItem.label}
              active={activeTopLevel === "venue" && activeVenueView === "console"}
              collapsed={collapsed}
              onClick={() => onSelectVenueView("console")}
            />
          )}
        </>
      )}

      {/* ── Reference section (owner, manager, developer -- NOT barista) ── */}
      {!isBarista && (
        <>
          <SectionLabel collapsed={collapsed}>Reference</SectionLabel>
          {referenceItems.map((item) => (
            <SidebarItem
              key={item.view}
              code={item.code}
              label={item.label}
              active={activeTopLevel === "reference" && activeReferenceView === item.view}
              collapsed={collapsed}
              onClick={() => onSelectReferenceView(item.view)}
            />
          ))}
        </>
      )}

      {/* ── Developer: Workspace section (expandable role shells) ── */}
      {isDeveloper && (
        <>
          <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>

          {/* Manager shell */}
          <SidebarItem
            code="MG"
            label="Manager"
            active={activeTopLevel === "manager"}
            collapsed={collapsed}
            onClick={onShowManager}
          />
          {activeTopLevel === "manager" && !collapsed && onSelectManagerView && (
            <div style={{ paddingLeft: 12 }}>
              {managerWorkspaceItems.map((item) => (
                <SidebarItem
                  key={item.view}
                  code={item.code}
                  label={item.label}
                  active={activeManagerView === item.view}
                  collapsed={collapsed}
                  onClick={() => onSelectManagerView(item.view)}
                />
              ))}
            </div>
          )}

          {/* Pocket shell */}
          <SidebarItem
            code="PK"
            label="Pocket"
            active={activeTopLevel === "pocket"}
            collapsed={collapsed}
            onClick={onShowPocket}
          />
          {activeTopLevel === "pocket" && !collapsed && onSelectPocketView && (
            <div style={{ paddingLeft: 12 }}>
              {pocketShiftItems.map((item) => (
                <SidebarItem
                  key={item.view}
                  code={item.code}
                  label={item.label}
                  active={activePocketView === item.view}
                  collapsed={collapsed}
                  onClick={() => onSelectPocketView(item.view)}
                />
              ))}
            </div>
          )}

          {/* Owner shell */}
          <SidebarItem
            code="OW"
            label="Owner"
            active={activeTopLevel === "owner"}
            collapsed={collapsed}
            onClick={onShowOwner}
          />
          {activeTopLevel === "owner" && !collapsed && onSelectOwnerView && (
            <div style={{ paddingLeft: 12 }}>
              {ownerOrgItems.map((item) => (
                <SidebarItem
                  key={item.view}
                  code={item.code}
                  label={item.label}
                  active={activeOwnerView === item.view}
                  collapsed={collapsed}
                  onClick={() => onSelectOwnerView(item.view)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Guidance section ── */}
      <SectionLabel collapsed={collapsed}>Guidance</SectionLabel>
      <SidebarItem
        code="KB"
        label="Knowledge Base"
        active={activeTopLevel === "kb"}
        collapsed={collapsed}
        onClick={onShowKnowledgeBase}
      />

      {/* ── Portfolio pulse card (owner + developer only) ── */}
      {canSeePortfolio && !collapsed && portfolioSummary && (
        <div
          style={{
            margin: "12px 12px 0",
            padding: 12,
            background: "var(--color-bg-muted, #F5F5F5)",
            borderRadius: "var(--radius-sm, 6px)",
            fontSize: "var(--text-small, 13px)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-muted)",
              margin: "0 0 4px",
            }}
          >
            Portfolio pulse
          </p>
          <strong style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
            {portfolioSummary.resume_reason ?? "Portfolio is ready."}
          </strong>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 4,
              color: "var(--color-text-secondary)",
              fontSize: 11,
            }}
          >
            <span>{portfolioSummary.totals.ready_tasks} ready</span>
            <span>{portfolioSummary.totals.blocked_tasks} blocked</span>
          </div>
        </div>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── System section ── */}
      <SectionLabel collapsed={collapsed}>System</SectionLabel>
      <SidebarItem
        code="ST"
        label="Settings"
        active={activeTopLevel === "settings"}
        collapsed={collapsed}
        onClick={onShowSettings}
      />
      <SidebarItem
        code="AI"
        label="Copilot"
        active={copilotOpen}
        collapsed={collapsed}
        onClick={onToggleCopilot}
      />
      <div style={{ height: 12 }} />
    </nav>
  );
}

/* ── Section label component ── */

function SectionLabel({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) return null;
  return (
    <div style={sectionLabelStyle}>
      {children}
    </div>
  );
}

/* ── Sidebar item component ── */

function SidebarItem({
  code,
  label,
  active,
  collapsed,
  onClick,
}: {
  code: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={itemStyle(active)}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = itemHoverBg;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? "var(--color-accent-soft, rgba(0,122,255,0.08))"
          : "transparent";
      }}
    >
      <SbIcon code={code} active={active} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

/* ── Icon badge component ── */

function SbIcon({ code, active }: { code: string; active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 6,
        background: active ? "var(--color-accent)" : "#F0F0F0",
        color: active ? "var(--color-accent-foreground, #FFFFFF)" : "var(--color-text-secondary)",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--font-mono, monospace)",
        flexShrink: 0,
        transition:
          "background var(--motion-fast, 120ms) var(--easing-standard, ease), color var(--motion-fast, 120ms) var(--easing-standard, ease)",
      }}
    >
      {code}
    </span>
  );
}
