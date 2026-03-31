import React from "react";
import { PortfolioSummaryResponse } from "../../lib/api";
import Icon, { IconName } from "../../components/Icon";
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
  authRole: string | null;
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
  onWidthChange?: (width: number) => void;
  userName?: string;
};

/* ── Role-specific nav definitions ── */

type NavItem<V extends string = string> = { icon: IconName; label: string; view: V };

const ownerOrgItems: NavItem<OwnerView>[] = [
  { icon: "home", label: "Command Center", view: "command" },
  { icon: "delegation", label: "Delegations", view: "delegations" },
  { icon: "team", label: "People", view: "people" },
  { icon: "chart-line", label: "Intelligence", view: "intelligence" },
  { icon: "settings", label: "Administration", view: "administration" },
];

const managerWorkspaceItems: NavItem<ManagerView>[] = [
  { icon: "today", label: "Today", view: "today" },
  { icon: "execution", label: "Execution", view: "workspace" },
  { icon: "plan", label: "Plan", view: "plan" },
  { icon: "evidence", label: "Evidence", view: "evidence" },
  { icon: "team", label: "Team Pulse", view: "team" },
  { icon: "escalation", label: "Escalations", view: "escalations" },
];

const pocketShiftItems: NavItem<PocketView>[] = [
  { icon: "shift", label: "Shift", view: "shift" },
  { icon: "standards", label: "Standards", view: "standards" },
  { icon: "help", label: "Help", view: "help" },
  { icon: "report", label: "Report", view: "report" },
  { icon: "log", label: "Log", view: "log" },
];

const venueItems: NavItem<VenueSubview>[] = [
  { icon: "home", label: "Overview", view: "overview" },
  { icon: "assessment", label: "Assessment", view: "assessment" },
  { icon: "signals", label: "Signals", view: "signals" },
  { icon: "plan", label: "Plan", view: "plan" },
  { icon: "report", label: "Report", view: "report" },
  { icon: "history", label: "History", view: "history" },
];

const venueConsoleItem: NavItem<VenueSubview> = { icon: "developer", label: "Console", view: "console" };

const referenceItems: NavItem<ReferenceView>[] = [
  { icon: "block", label: "Blocks", view: "blocks" },
  { icon: "tool", label: "Tools", view: "tools" },
  { icon: "signal", label: "Signals", view: "signals" },
];

/* ── Helpers ── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

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
    userName,
  } = props;

  const isOwner = authRole === "owner";
  const isManager = authRole === "manager";
  const isBarista = authRole === "barista";
  const isDeveloper = authRole === "developer";
  const canSeePortfolio = isOwner || isDeveloper;
  const canSeeVenue = isOwner || isManager || isDeveloper;
  const showVenue = canSeeVenue && !!activeVenueName;

  /* ── Resize ── */
  const [sidebarWidth, setSidebarWidth] = React.useState(240);
  const [isResizing, setIsResizing] = React.useState(false);

  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(400, startWidth + (ev.clientX - startX)));
      setSidebarWidth(newWidth);
      props.onWidthChange?.(newWidth);
    };
    const onUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth, props.onWidthChange]);

  const effectiveWidth = collapsed ? 48 : sidebarWidth;

  /* ── Track which sections rendered (for dividers) ── */
  const sections: React.ReactNode[] = [];

  // Owner org
  if (isOwner) {
    sections.push(
      <NavGroup key="owner-org" label="Organization" collapsed={collapsed}>
        {ownerOrgItems.map((item) => (
          <SidebarNavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeTopLevel === "owner" && activeOwnerView === item.view}
            collapsed={collapsed}
            onClick={() => onSelectOwnerView?.(item.view)}
          />
        ))}
      </NavGroup>
    );
  }

  // Manager workspace
  if (isManager) {
    sections.push(
      <NavGroup key="manager-ws" label="Workspace" collapsed={collapsed}>
        {managerWorkspaceItems.map((item) => (
          <SidebarNavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeTopLevel === "manager" && activeManagerView === item.view}
            collapsed={collapsed}
            onClick={() => onSelectManagerView?.(item.view)}
          />
        ))}
      </NavGroup>
    );
  }

  // Barista shift
  if (isBarista) {
    sections.push(
      <NavGroup key="barista-shift" label="My Shift" collapsed={collapsed}>
        {pocketShiftItems.map((item) => (
          <SidebarNavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeTopLevel === "pocket" && activePocketView === item.view}
            collapsed={collapsed}
            onClick={() => onSelectPocketView?.(item.view)}
          />
        ))}
      </NavGroup>
    );
  }

  // Portfolio
  if (canSeePortfolio) {
    sections.push(
      <NavGroup key="portfolio" label="Portfolio" collapsed={collapsed}>
        <SidebarNavItem
          icon="chart-pie"
          label="Portfolio"
          active={activeTopLevel === "portfolio"}
          collapsed={collapsed}
          onClick={onShowPortfolio}
        />
      </NavGroup>
    );
  }

  // Venue
  if (showVenue) {
    sections.push(
      <NavGroup key="venue" label={`Venue: ${activeVenueName}`} collapsed={collapsed}>
        {venueItems.map((item) => (
          <SidebarNavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeTopLevel === "venue" && activeVenueView === item.view}
            collapsed={collapsed}
            onClick={() => onSelectVenueView(item.view)}
          />
        ))}
        {isDeveloper && (
          <SidebarNavItem
            icon={venueConsoleItem.icon}
            label={venueConsoleItem.label}
            active={activeTopLevel === "venue" && activeVenueView === "console"}
            collapsed={collapsed}
            onClick={() => onSelectVenueView("console")}
          />
        )}
      </NavGroup>
    );
  }

  // Reference
  if (!isBarista) {
    sections.push(
      <NavGroup key="reference" label="Reference" collapsed={collapsed}>
        {referenceItems.map((item) => (
          <SidebarNavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeTopLevel === "reference" && activeReferenceView === item.view}
            collapsed={collapsed}
            onClick={() => onSelectReferenceView(item.view)}
          />
        ))}
      </NavGroup>
    );
  }

  // Developer workspace shells
  if (isDeveloper) {
    sections.push(
      <NavGroup key="dev-ws" label="Workspace" collapsed={collapsed}>
        <SidebarNavItem icon="manager" label="Manager" active={activeTopLevel === "manager"} collapsed={collapsed} onClick={onShowManager} />
        {activeTopLevel === "manager" && !collapsed && onSelectManagerView && (
          <div className="sidebar__sub-group">
            {managerWorkspaceItems.map((item) => (
              <SidebarNavItem key={item.view} icon={item.icon} label={item.label} active={activeManagerView === item.view} collapsed={collapsed} onClick={() => onSelectManagerView(item.view)} />
            ))}
          </div>
        )}
        <SidebarNavItem icon="barista" label="Pocket" active={activeTopLevel === "pocket"} collapsed={collapsed} onClick={onShowPocket} />
        {activeTopLevel === "pocket" && !collapsed && onSelectPocketView && (
          <div className="sidebar__sub-group">
            {pocketShiftItems.map((item) => (
              <SidebarNavItem key={item.view} icon={item.icon} label={item.label} active={activePocketView === item.view} collapsed={collapsed} onClick={() => onSelectPocketView(item.view)} />
            ))}
          </div>
        )}
        <SidebarNavItem icon="owner" label="Owner" active={activeTopLevel === "owner"} collapsed={collapsed} onClick={onShowOwner} />
        {activeTopLevel === "owner" && !collapsed && onSelectOwnerView && (
          <div className="sidebar__sub-group">
            {ownerOrgItems.map((item) => (
              <SidebarNavItem key={item.view} icon={item.icon} label={item.label} active={activeOwnerView === item.view} collapsed={collapsed} onClick={() => onSelectOwnerView(item.view)} />
            ))}
          </div>
        )}
      </NavGroup>
    );
  }

  // Guidance
  sections.push(
    <NavGroup key="guidance" label="Guidance" collapsed={collapsed}>
      <SidebarNavItem icon="knowledge" label="Knowledge Base" active={activeTopLevel === "kb"} collapsed={collapsed} onClick={onShowKnowledgeBase} />
    </NavGroup>
  );

  // Interleave dividers between sections
  const scrollContent: React.ReactNode[] = [];
  sections.forEach((section, i) => {
    if (i > 0 && !collapsed) scrollContent.push(<div key={`div-${i}`} className="sidebar__divider" />);
    scrollContent.push(section);
  });

  const cn = ["sidebar", collapsed && "sidebar--collapsed", isResizing && "sidebar--resizing"].filter(Boolean).join(" ");

  return (
    <nav
      aria-label="Main navigation"
      className={cn}
      style={{ width: effectiveWidth, minWidth: collapsed ? 48 : 180 }}
    >
      {/* ── Brand ── */}
      <div className="sidebar__brand">
        <button
          className="sidebar__brand-logo"
          onClick={canSeePortfolio ? onShowPortfolio : undefined}
          title="VOIS"
          style={{ cursor: canSeePortfolio ? "pointer" : "default" }}
        >
          <span className="sidebar__brand-dot" />
          {!collapsed && <span className="sidebar__brand-text">VOIS</span>}
        </button>
        <button className="sidebar__collapse-btn" onClick={onToggleCollapsed} aria-label="Toggle sidebar">
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={14} />
        </button>
      </div>

      {/* ── Venue selector ── */}
      {showVenue && !collapsed && (
        <button className="sidebar__venue" title={activeVenueName ?? undefined}>
          <span className="sidebar__venue-dot" />
          <span className="sidebar__venue-name">{activeVenueName}</span>
          <span className="sidebar__venue-chevron">
            <Icon name="chevron-down" size={12} />
          </span>
        </button>
      )}

      {/* ── Scrollable middle ── */}
      <div className="sidebar__scroll">
        {scrollContent}

        {/* Pulse card */}
        {canSeePortfolio && !collapsed && portfolioSummary && (
          <div className="sidebar__pulse-card">
            <p className="sidebar__pulse-label">Portfolio pulse</p>
            <p className="sidebar__pulse-reason">
              {portfolioSummary.resume_reason ?? "Portfolio is ready."}
            </p>
            <div className="sidebar__pulse-stats">
              <span>{portfolioSummary.totals.ready_tasks} ready</span>
              <span>{portfolioSummary.totals.blocked_tasks} blocked</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom ── */}
      <div className="sidebar__bottom">
        <button
          className={`sidebar__bottom-link ${activeTopLevel === "settings" ? "active" : ""}`}
          onClick={onShowSettings}
        >
          <span className="sidebar__nav-icon"><Icon name="settings" size={16} /></span>
          {!collapsed && <span className="sidebar__nav-label">Settings</span>}
          {collapsed && <span className="sidebar__tooltip">Settings</span>}
        </button>
        <button
          className={`sidebar__bottom-link ${copilotOpen ? "active" : ""}`}
          onClick={onToggleCopilot}
        >
          <span className="sidebar__nav-icon"><Icon name="copilot" size={16} /></span>
          {!collapsed && <span className="sidebar__nav-label">Copilot</span>}
          {collapsed && <span className="sidebar__tooltip">Copilot</span>}
        </button>

        {/* User avatar */}
        {userName && (
          <div className="sidebar__user" title={userName}>
            <span className="sidebar__avatar">{getInitials(userName)}</span>
            {!collapsed && (
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{userName}</span>
                <span className="sidebar__user-role">{authRole ?? "user"}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Resize handle ── */}
      {!collapsed && (
        <div
          className={`sidebar__resize-handle ${isResizing ? "sidebar__resize-handle--active" : ""}`}
          onMouseDown={handleResizeStart}
        />
      )}
    </nav>
  );
}

/* ── Nav group (label + items) ── */

function NavGroup({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div>
      {!collapsed && <div className="sidebar__group-label">{label}</div>}
      {children}
    </div>
  );
}

/* ── Nav item ── */

function SidebarNavItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`sidebar__nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="sidebar__nav-icon">
        <Icon name={icon} size={16} />
      </span>
      {!collapsed && <span className="sidebar__nav-label">{label}</span>}
      {collapsed && <span className="sidebar__tooltip">{label}</span>}
    </button>
  );
}
