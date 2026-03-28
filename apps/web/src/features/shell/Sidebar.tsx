import { PortfolioSummaryResponse } from "../../lib/api";
import { ReferenceView, TopLevelView, VenueSubview } from "./types";

type SidebarProps = {
  collapsed: boolean;
  activeTopLevel: TopLevelView;
  authRole: string | null;
  activeVenueName: string | null;
  activeVenueView: VenueSubview;
  activeReferenceView: ReferenceView;
  onToggleCollapsed: () => void;
  onShowPortfolio: () => void;
  onSelectVenueView: (view: VenueSubview) => void;
  onSelectReferenceView: (view: ReferenceView) => void;
  onShowKnowledgeBase: () => void;
  onShowSettings: () => void;
  onShowManager: () => void;
  onShowPocket: () => void;
  onShowOwner: () => void;
  onToggleCopilot: () => void;
  copilotOpen: boolean;
  portfolioSummary: PortfolioSummaryResponse | null;
};

const venueViews: VenueSubview[] = ["overview", "assessment", "signals", "plan", "report", "history", "console"];
const referenceViews: ReferenceView[] = ["blocks", "tools", "signals"];

export function Sidebar({
  collapsed,
  activeTopLevel,
  authRole,
  activeVenueName,
  activeVenueView,
  activeReferenceView,
  onToggleCollapsed,
  onShowPortfolio,
  onSelectVenueView,
  onSelectReferenceView,
  onShowKnowledgeBase,
  onShowSettings,
  onShowManager,
  onShowPocket,
  onShowOwner,
  onToggleCopilot,
  copilotOpen,
  portfolioSummary,
}: SidebarProps) {
  const canSeePortfolio = authRole === "owner" || authRole === "developer";
  const canSeeManager = authRole === "owner" || authRole === "manager";
  const canSeePocket = authRole === "owner" || authRole === "manager" || authRole === "barista";
  const canSeeOwner = authRole === "owner";
  return (
    <nav className={`sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main navigation">
      <div className="sb-brand">
        <button className="sb-logo" onClick={onShowPortfolio}>
          OIS
        </button>
        <button className="sb-collapse-btn" onClick={onToggleCollapsed} aria-label="Toggle sidebar">
          {collapsed ? ">" : "<"}
        </button>
      </div>

      {canSeePortfolio ? (
        <>
          <div className="sidebar-section-label">Portfolio</div>
          <button
            className={`sidebar-item ${activeTopLevel === "portfolio" ? "active" : ""}`}
            onClick={onShowPortfolio}
          >
            <span className="sb-icon">PF</span>
            <span className="sb-label">Portfolio</span>
          </button>
        </>
      ) : null}

      {activeTopLevel === "venue" && activeVenueName && (authRole === "owner" || authRole === "manager" || authRole === "developer") ? (
        <div className="venue-nav">
          <div className="sidebar-section-label">{activeVenueName}</div>
          {venueViews.map((view) => (
            <button
              key={view}
              className={`venue-nav-item ${activeVenueView === view ? "active" : ""}`}
              onClick={() => onSelectVenueView(view)}
            >
              <span className="sb-label">{titleCase(view)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="sidebar-section-label">Reference</div>
      {referenceViews.map((view) => (
        <button
          key={view}
          className={`sidebar-item ${
            activeTopLevel === "reference" && activeReferenceView === view ? "active" : ""
          }`}
          onClick={() => onSelectReferenceView(view)}
        >
          <span className="sb-icon">{referenceIcon(view)}</span>
          <span className="sb-label">{titleCase(view)}</span>
        </button>
      ))}

      <div className="sidebar-section-label">Execution</div>
      {canSeeManager ? (
        <button
          className={`sidebar-item ${activeTopLevel === "manager" ? "active" : ""}`}
          onClick={onShowManager}
        >
          <span className="sb-icon">MG</span>
          <span className="sb-label">Manager shell</span>
        </button>
      ) : null}
      {canSeePocket ? (
        <button
          className={`sidebar-item ${activeTopLevel === "pocket" ? "active" : ""}`}
          onClick={onShowPocket}
        >
          <span className="sb-icon">PK</span>
          <span className="sb-label">Pocket shell</span>
        </button>
      ) : null}
      {canSeeOwner ? (
        <button
          className={`sidebar-item ${activeTopLevel === "owner" ? "active" : ""}`}
          onClick={onShowOwner}
        >
          <span className="sb-icon">OW</span>
          <span className="sb-label">Owner shell</span>
        </button>
      ) : null}

      <div className="sidebar-section-label">Guidance</div>
      <button className={`sidebar-item ${activeTopLevel === "kb" ? "active" : ""}`} onClick={onShowKnowledgeBase}>
        <span className="sb-icon">KB</span>
        <span className="sb-label">Knowledge Base</span>
      </button>

      {!collapsed && portfolioSummary ? (
        <div className="sidebar-pulse-card">
          <p className="section-eyebrow">Portfolio pulse</p>
          <strong>{portfolioSummary.resume_reason ?? "Portfolio is ready."}</strong>
          <div className="dependency-list">
            <span>{portfolioSummary.totals.ready_tasks} ready</span>
            <span>{portfolioSummary.totals.blocked_tasks} blocked</span>
          </div>
        </div>
      ) : null}

      <div className="sb-spacer" />

      <div className="sidebar-section-label">System</div>
      <button
        className={`sidebar-item ${activeTopLevel === "settings" ? "active" : ""}`}
        onClick={onShowSettings}
      >
        <span className="sb-icon">ST</span>
        <span className="sb-label">Settings</span>
      </button>
      <button className={`sidebar-item ${copilotOpen ? "active" : ""}`} onClick={onToggleCopilot}>
        <span className="sb-icon">AI</span>
        <span className="sb-label">vOIS</span>
      </button>
    </nav>
  );
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function referenceIcon(view: ReferenceView) {
  switch (view) {
    case "blocks":
      return "BL";
    case "tools":
      return "TL";
    case "signals":
      return "SG";
  }
}
