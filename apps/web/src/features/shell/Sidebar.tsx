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
        <button className="sb-logo" onClick={onShowPortfolio} title="Portfolio">
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-accent)",
              marginRight: collapsed ? 0 : 6,
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
          className="sb-collapse-btn"
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
            transition: `background var(--motion-fast) var(--easing-standard)`,
          }}
        >
          {collapsed ? "\u203A" : "\u2039"}
        </button>
      </div>

      {canSeePortfolio ? (
        <>
          <div className="sidebar-section-label">Portfolio</div>
          <button
            className={`sidebar-item ${activeTopLevel === "portfolio" ? "active" : ""}`}
            onClick={onShowPortfolio}
            title={collapsed ? "Portfolio" : undefined}
          >
            <SbIcon code="PF" active={activeTopLevel === "portfolio"} />
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
              title={collapsed ? titleCase(view) : undefined}
            >
              <SbIcon code={venueIcon(view)} active={activeVenueView === view} />
              <span className="sb-label">{titleCase(view)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="sidebar-section-label sidebar-section--secondary">Reference</div>
      {referenceViews.map((view) => (
        <button
          key={view}
          className={`sidebar-item ${
            activeTopLevel === "reference" && activeReferenceView === view ? "active" : ""
          }`}
          onClick={() => onSelectReferenceView(view)}
          title={collapsed ? titleCase(view) : undefined}
        >
          <SbIcon
            code={referenceIcon(view)}
            active={activeTopLevel === "reference" && activeReferenceView === view}
          />
          <span className="sb-label">{titleCase(view)}</span>
        </button>
      ))}

      <div className="sidebar-section-label">Execution</div>
      {canSeeManager ? (
        <button
          className={`sidebar-item ${activeTopLevel === "manager" ? "active" : ""}`}
          onClick={onShowManager}
          title={collapsed ? "Manager shell" : undefined}
        >
          <SbIcon code="MG" active={activeTopLevel === "manager"} />
          <span className="sb-label">Manager shell</span>
        </button>
      ) : null}
      {canSeePocket ? (
        <button
          className={`sidebar-item ${activeTopLevel === "pocket" ? "active" : ""}`}
          onClick={onShowPocket}
          title={collapsed ? "Pocket shell" : undefined}
        >
          <SbIcon code="PK" active={activeTopLevel === "pocket"} />
          <span className="sb-label">Pocket shell</span>
        </button>
      ) : null}
      {canSeeOwner ? (
        <button
          className={`sidebar-item ${activeTopLevel === "owner" ? "active" : ""}`}
          onClick={onShowOwner}
          title={collapsed ? "Owner shell" : undefined}
        >
          <SbIcon code="OW" active={activeTopLevel === "owner"} />
          <span className="sb-label">Owner shell</span>
        </button>
      ) : null}

      <div className="sidebar-section-label sidebar-section--secondary">Guidance</div>
      <button
        className={`sidebar-item ${activeTopLevel === "kb" ? "active" : ""}`}
        onClick={onShowKnowledgeBase}
        title={collapsed ? "Knowledge Base" : undefined}
      >
        <SbIcon code="KB" active={activeTopLevel === "kb"} />
        <span className="sb-label">Knowledge Base</span>
      </button>

      {!collapsed && portfolioSummary ? (
        <div
          className="sidebar-pulse-card"
          style={{
            margin: "var(--spacing-12) var(--spacing-12) 0",
            padding: "var(--spacing-12)",
            background: "var(--color-bg-muted)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-small)",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-eyebrow)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-muted)",
              margin: "0 0 var(--spacing-4)",
            }}
          >
            Portfolio pulse
          </p>
          <strong style={{ fontSize: "var(--text-small)", color: "var(--color-text-primary)" }}>
            {portfolioSummary.resume_reason ?? "Portfolio is ready."}
          </strong>
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-8)",
              marginTop: "var(--spacing-4)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--text-eyebrow)",
            }}
          >
            <span>{portfolioSummary.totals.ready_tasks} ready</span>
            <span>{portfolioSummary.totals.blocked_tasks} blocked</span>
          </div>
        </div>
      ) : null}

      <div className="sb-spacer" />

      <div className="sidebar-section-label sidebar-section--secondary">System</div>
      <button
        className={`sidebar-item ${activeTopLevel === "settings" ? "active" : ""}`}
        onClick={onShowSettings}
        title={collapsed ? "Settings" : undefined}
      >
        <SbIcon code="ST" active={activeTopLevel === "settings"} />
        <span className="sb-label">Settings</span>
      </button>
      <button
        className={`sidebar-item ${copilotOpen ? "active" : ""}`}
        onClick={onToggleCopilot}
        title={collapsed ? "Copilot" : undefined}
      >
        <SbIcon code="AI" active={copilotOpen} />
        <span className="sb-label">Copilot</span>
      </button>
    </nav>
  );
}

/* ── Icon badge component ── */

function SbIcon({ code, active }: { code: string; active: boolean }) {
  return (
    <span
      className="sb-icon"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 6,
        background: active ? "var(--color-accent)" : "#F0F0F0",
        color: active ? "var(--color-accent-foreground)" : "var(--color-text-secondary)",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
        transition: `background var(--motion-fast) var(--easing-standard), color var(--motion-fast) var(--easing-standard)`,
      }}
    >
      {code}
    </span>
  );
}

/* ── Helpers ── */

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

function venueIcon(view: VenueSubview) {
  switch (view) {
    case "overview":
      return "OV";
    case "assessment":
      return "AS";
    case "signals":
      return "SG";
    case "plan":
      return "PL";
    case "report":
      return "RP";
    case "history":
      return "HI";
    case "console":
      return "CO";
    default:
      return "??";
  }
}
