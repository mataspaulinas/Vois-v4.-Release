import React from "react";
import { PortfolioSummaryResponse, PortfolioVenuePulse, Venue } from "../../lib/api";
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
  // Venue accordion
  venues: Venue[];
  activeVenueId: string | null;
  venuePulses: PortfolioVenuePulse[];
  onSelectVenue: (venueId: string) => void;
  // Sub-views
  activeVenueView: VenueSubview;
  activeReferenceView: ReferenceView;
  activeManagerView?: ManagerView;
  activePocketView?: PocketView;
  activeOwnerView?: OwnerView;
  // Actions
  onToggleCollapsed: () => void;
  onShowPortfolio: () => void;
  onSelectVenueView: (view: VenueSubview) => void;
  onSelectReferenceView: (view: ReferenceView) => void;
  onSelectManagerView?: (view: ManagerView) => void;
  onSelectPocketView?: (view: PocketView) => void;
  onSelectOwnerView?: (view: OwnerView) => void;
  onShowKnowledgeBase: () => void;
  onShowHelp: () => void;
  onShowSettings: () => void;
  onShowManager: () => void;
  onShowPocket: () => void;
  onShowOwner: () => void;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
  portfolioSummary: PortfolioSummaryResponse | null;
  onWidthChange?: (width: number) => void;
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
  { icon: "ask-help", label: "Ask manager", view: "help" },
  { icon: "report", label: "Report", view: "report" },
  { icon: "log", label: "Log", view: "log" },
];

const venueItems: NavItem<VenueSubview>[] = [
  { icon: "home", label: "Overview", view: "overview" },
  { icon: "assessment", label: "Assessment", view: "assessment" },
  { icon: "report", label: "Diagnosis", view: "diagnosis" },
  { icon: "plan", label: "Plan", view: "plan" },
  { icon: "history", label: "History", view: "history" },
];

const venueConsoleItem: NavItem<VenueSubview> = { icon: "developer", label: "Console", view: "console" };

const referenceItems: NavItem<ReferenceView>[] = [
  { icon: "block", label: "Blocks", view: "blocks" },
  { icon: "tool", label: "Tools", view: "tools" },
  { icon: "signal", label: "Signals", view: "signals" },
];

/* ── Helpers ── */

function getHealthDotColor(attentionLevel?: string): string {
  switch (attentionLevel) {
    case "urgent": return "var(--color-danger, #E74C3C)";
    case "needs_attention": return "var(--color-warning, #F59E0B)";
    case "steady": return "var(--color-success, #10B981)";
    case "dormant": return "var(--color-text-muted, #A3A3A3)";
    default: return "var(--color-success, #10B981)";
  }
}

/* ── Component ── */

export function Sidebar(props: SidebarProps) {
  const {
    collapsed,
    activeTopLevel,
    authRole,
    venues,
    activeVenueId,
    venuePulses,
    onSelectVenue,
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
    onShowHelp,
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

  /* ── Build sections ── */
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

  // Venues accordion
  const isSingleVenue = venues.length === 1;
  const activeVenues = venues.filter(v => v.status !== "archived");

  if (activeVenues.length > 0) {
    sections.push(
      <NavGroup
        key="venues"
        label={isSingleVenue ? activeVenues[0].name : "Venues"}
        collapsed={collapsed}
      >
        {activeVenues.map((venue) => {
          const isExpanded = venue.id === activeVenueId;
          const pulse = venuePulses.find(p => p.venue_id === venue.id);
          const dotColor = getHealthDotColor(pulse?.attention_level);

          return (
            <div key={venue.id}>
              {/* Venue row — only show as clickable row if multi-venue */}
              {!isSingleVenue && (
                <button
                  className={`sidebar__nav-item sidebar__venue-row ${isExpanded ? "active" : ""}`}
                  onClick={() => onSelectVenue(venue.id)}
                >
                  <span className="sidebar__venue-health-dot" style={{ background: dotColor }} />
                  {!collapsed && <span className="sidebar__nav-label">{venue.name}</span>}
                  {!collapsed && <span style={{ marginLeft: "auto", opacity: 0.5 }}><Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={10} /></span>}
                  {collapsed && <span className="sidebar__tooltip">{venue.name}</span>}
                </button>
              )}
              {/* Sub-views — show if expanded (or always if single venue) */}
              {(isExpanded || isSingleVenue) && !collapsed && (
                <div className="sidebar__sub-group">
                  {venueItems.map((item) => (
                    <SidebarNavItem
                      key={item.view}
                      icon={item.icon}
                      label={item.label}
                      active={activeTopLevel === "venue" && activeVenueView === item.view && venue.id === activeVenueId}
                      collapsed={collapsed}
                      onClick={() => {
                        if (venue.id !== activeVenueId) onSelectVenue(venue.id);
                        onSelectVenueView(item.view);
                      }}
                    />
                  ))}
                  {isDeveloper && (
                    <SidebarNavItem
                      icon={venueConsoleItem.icon}
                      label={venueConsoleItem.label}
                      active={activeTopLevel === "venue" && activeVenueView === "console" && venue.id === activeVenueId}
                      collapsed={collapsed}
                      onClick={() => {
                        if (venue.id !== activeVenueId) onSelectVenue(venue.id);
                        onSelectVenueView("console");
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </NavGroup>
    );
  }

  // Reference (Blocks/Tools/Signals — not for baristas) + Knowledge Base (everyone)
  {
    const refItems: React.ReactNode[] = [];
    if (!isBarista) {
      referenceItems.forEach((item) => {
        refItems.push(
          <SidebarNavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeTopLevel === "reference" && activeReferenceView === item.view}
            collapsed={collapsed}
            onClick={() => onSelectReferenceView(item.view)}
          />
        );
      });
    }
    refItems.push(
      <SidebarNavItem key="kb" icon="knowledge" label="Knowledge Base" active={activeTopLevel === "kb"} collapsed={collapsed} onClick={onShowKnowledgeBase} />
    );
    sections.push(
      <NavGroup key="reference" label={isBarista ? "Learn" : "Reference"} collapsed={collapsed}>
        {refItems}
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

      {/* ── Portfolio (standalone, not in a group) ── */}
      {venues.length > 1 && (isOwner || isDeveloper) && (
        <div className="sidebar__portfolio-item">
          <SidebarNavItem
            icon="chart-pie"
            label="Portfolio"
            active={activeTopLevel === "portfolio"}
            collapsed={collapsed}
            onClick={onShowPortfolio}
          />
        </div>
      )}

      {/* ── Scrollable middle ── */}
      <div className="sidebar__scroll">
        {sections}
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
          className={`sidebar__bottom-link ${activeTopLevel === "help" ? "active" : ""}`}
          onClick={onShowHelp}
        >
          <span className="sidebar__nav-icon"><Icon name="help" size={16} /></span>
          {!collapsed && <span className="sidebar__nav-label">Help</span>}
          {collapsed && <span className="sidebar__tooltip">Help</span>}
        </button>
        <button
          className={`sidebar__bottom-link ${copilotOpen ? "active" : ""}`}
          onClick={onToggleCopilot}
        >
          <span className="sidebar__nav-icon"><Icon name="copilot" size={16} /></span>
          {!collapsed && <span className="sidebar__nav-label">Copilot</span>}
          {collapsed && <span className="sidebar__tooltip">Copilot</span>}
        </button>
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

/* ── Nav group (label + items, collapsible with localStorage persistence) ── */

const COLLAPSED_GROUPS_KEY = "vois_sidebar_collapsed_groups";

function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function persistCollapsedGroups(groups: Set<string>) {
  try { localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...groups])); } catch {}
}

function NavGroup({ label, collapsed: sidebarCollapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(() => !loadCollapsedGroups().has(label));

  const toggle = React.useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      const groups = loadCollapsedGroups();
      if (next) { groups.delete(label); } else { groups.add(label); }
      persistCollapsedGroups(groups);
      return next;
    });
  }, [label]);

  if (sidebarCollapsed) {
    return <div>{children}</div>;
  }

  return (
    <div>
      <button
        className="sidebar__group-label"
        onClick={toggle}
        aria-expanded={open}
      >
        <span>{label}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={10} />
      </button>
      {open && children}
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
