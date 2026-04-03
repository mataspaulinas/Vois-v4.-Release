import { useMemo, useState } from "react";

import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import {
  BootstrapResponse,
  ExecutionVelocity,
  PortfolioSummaryResponse,
  PersistedEngineRunRecord,
  PlanExecutionSummary,
  PlanRecord,
  ProgressEntryRecord,
  Venue,
} from "../../lib/api";
import { VenueSubview } from "../shell/types";

type PortfolioViewProps = {
  bootstrap: BootstrapResponse;
  ontologyLabel: string;
  venues: Venue[];
  portfolioSummary: PortfolioSummaryResponse | null;
  activeVenue: Venue | null;
  loadingPortfolio: boolean;
  assessmentCount: number;
  selectedEngineRun: PersistedEngineRunRecord | null;
  latestPlan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  progressEntries: ProgressEntryRecord[];
  onOpenVenue: (venueId: string) => void;
  onOpenVenueWorkspace: (venueId: string, view: VenueSubview) => void;
  onOpenAssessment: () => void;
  onOpenDiagnosis: () => void;
  onOpenPlan: () => void;
  formatTimestamp: (isoTimestamp: string) => string;
  venueVelocities: ExecutionVelocity[];
};

import { ds, pillStyle, statusDot } from "../../styles/tokens";

const attentionColor = (level: string) => {
  switch (level) {
    case "urgent": return ds.danger;
    case "needs_attention": return ds.warning;
    case "steady": return ds.success;
    case "dormant": return "var(--color-text-muted)";
    default: return "var(--color-text-muted)";
  }
};

const velocityColor = (label: string) => {
  switch (label) {
    case "stalled": return ds.danger;
    case "slow": return ds.warning;
    case "steady": return ds.success;
    case "fast": return ds.info;
    default: return "var(--color-text-muted)";
  }
};

export function PortfolioView({
  bootstrap,
  ontologyLabel,
  venues,
  portfolioSummary,
  activeVenue,
  loadingPortfolio,
  assessmentCount,
  selectedEngineRun,
  latestPlan,
  executionSummary,
  progressEntries,
  onOpenVenue,
  onOpenVenueWorkspace,
  onOpenAssessment,
  onOpenDiagnosis,
  onOpenPlan,
  formatTimestamp,
  venueVelocities,
}: PortfolioViewProps) {
  const [attentionFilter, setAttentionFilter] = useState<string>("all");
  const nextStep = describeNextStep({
    assessmentCount,
    selectedEngineRun,
    latestPlan,
    executionSummary,
  });
  const summaryVenues = portfolioSummary?.venue_pulses ?? [];
  const visiblePulses = useMemo(() => {
    const source = summaryVenues.length ? summaryVenues : venues.map((venue) => fallbackPulse(venue));
    if (attentionFilter === "all") {
      return source;
    }
    return source.filter((pulse) => pulse.attention_level === attentionFilter);
  }, [attentionFilter, summaryVenues, venues]);

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Hero ─────────────────────────────────── */}
      <section className="ui-card" style={{ padding: "32px 32px 28px" }}>
        <p className="eyebrow">ORGANIZATION</p>
        <h1 className="page-title">{bootstrap.organization?.name ?? "Portfolio workspace"}</h1>
        <p className="body-text" style={{ marginTop: 8, maxWidth: 720 }}>
          {bootstrap.current_user.full_name} is signed in as{" "}
          {bootstrap.current_user.role.replace(/_/g, " ")}. Start from the portfolio, decide where pressure is real,
          and move into venue execution only when the operating signal justifies it.
        </p>

        {/* Metric strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginTop: 24 }}>
          <StatCard label="Venues" value={String(portfolioSummary?.totals.venues ?? venues.length)} />
          <StatCard label="Assessments" value={String(portfolioSummary?.totals.assessments ?? assessmentCount)} tone="neutral" />
          <StatCard label="Ontology" value={ontologyLabel} tone="neutral" />
          <StatCard
            label="Ready tasks"
            value={String(portfolioSummary?.totals.ready_tasks ?? executionSummary?.next_executable_tasks.length ?? 0)}
            tone="success"
          />
          <StatCard
            label="Progress logs"
            value={String(portfolioSummary?.totals.progress_entries ?? progressEntries.length)}
            tone="neutral"
          />
        </div>
      </section>

      {/* ── Venue control panel ──────────────────── */}
      <section className="ui-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2 className="section-title">Venue control panel</h2>
            <p className="small-text" style={{ marginTop: 4 }}>Choose a venue and move directly into the live workspace without relying on seeded demo structure.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={pillStyle(attentionFilter === "all")} onClick={() => setAttentionFilter("all")}>All</button>
            {(portfolioSummary?.attention_breakdown ?? []).map((item) => (
              <button
                key={item.attention_level}
                style={pillStyle(attentionFilter === item.attention_level)}
                onClick={() => setAttentionFilter(item.attention_level)}
              >
                <span style={statusDot(attentionColor(item.attention_level))} />
                {item.attention_level} <span className="ui-badge ui-badge--muted">{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        {loadingPortfolio ? (
          <p className="small-text" style={{ textAlign: "center", padding: 32 }}>Loading portfolio pulse...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {visiblePulses.map((pulse) => (
              <article
                key={pulse.venue_id}
                className="ui-card"
                style={{
                  padding: 0,
                  borderLeft: `4px solid ${attentionColor(pulse.attention_level)}`,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  cursor: "pointer",
                  ...(activeVenue?.id === pulse.venue_id ? { boxShadow: `0 0 0 2px ${ds.accent}` } : {}),
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08)${activeVenue?.id === pulse.venue_id ? `, 0 0 0 2px ${ds.accent}` : ""}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = activeVenue?.id === pulse.venue_id ? `0 0 0 2px ${ds.accent}` : "0 1px 3px rgba(0,0,0,0.04)"; }}
              >
                <button
                  onClick={() => onOpenVenue(pulse.venue_id)}
                  style={{ all: "unset", display: "block", width: "100%", padding: "16px 20px 12px", cursor: "pointer", boxSizing: "border-box" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", color: attentionColor(pulse.attention_level) }}>
                      {pulse.attention_level ?? pulse.status}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{pulse.status}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{pulse.venue_name}</h3>
                  <p className="small-text" style={{ marginTop: 2 }}>{pulse.concept ?? "Service operation"}</p>
                </button>

                <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {([
                    ["Next move", pulse.next_step_label],
                    ["Ready / blocked", `${pulse.ready_task_count} / ${pulse.blocked_task_count}`],
                    ["Completion", `${Math.round(pulse.completion_percentage)}%`],
                    ["Last movement", pulse.latest_activity_at ? formatTimestamp(pulse.latest_activity_at) : "quiet"],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{label}</span>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: "0 20px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pulse.location ? <span className="ui-badge ui-badge--muted">{pulse.location}</span> : null}
                  {pulse.plan_load_classification ? <span className="ui-badge ui-badge--muted">{pulse.plan_load_classification}</span> : null}
                  {pulse.latest_signal_count ? <span className="ui-badge ui-badge--muted">{pulse.latest_signal_count} signals</span> : null}
                  {pulse.latest_plan_task_count ? <span className="ui-badge ui-badge--muted">{pulse.latest_plan_task_count} tasks</span> : null}
                </div>

                <div style={{ display: "flex", gap: 8, padding: "0 20px 16px" }}>
                  <button className="btn btn-secondary" onClick={() => onOpenVenue(pulse.venue_id)}>Open</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => onOpenVenueWorkspace(pulse.venue_id, toVenueView(pulse.suggested_view))}
                  >
                    {ctaFor(pulse.suggested_view)}
                  </button>
                </div>
              </article>
            ))}
            {!visiblePulses.length ? (
              <p className="small-text" style={{ textAlign: "center", padding: 32, gridColumn: "1 / -1" }}>
                No venues match that attention filter right now.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Focus panel ──────────────────────────── */}
      <section className="ui-card">
        <p className="eyebrow">Focus</p>
        <h2 className="section-title">Continue where you left off</h2>
        <p className="small-text" style={{ marginTop: 4, marginBottom: 20 }}>The portfolio should tell you what deserves attention before you even open the venue.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* Active venue */}
          <div className="ui-card" style={{ borderLeft: `4px solid ${ds.accent}` }}>
            <p className="eyebrow">Active venue</p>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)", margin: "6px 0 4px" }}>{activeVenue?.name ?? "No venue loaded"}</h3>
            <p className="small-text">{nextStep}</p>
            {activeVenue ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={onOpenAssessment}>Assessment</button>
                <button className="btn btn-secondary" onClick={onOpenDiagnosis}>Diagnosis</button>
                <button className="btn btn-primary" onClick={onOpenPlan}>Plan</button>
              </div>
            ) : null}
          </div>

          {/* Current state */}
          <div className="ui-card">
            <p className="eyebrow">Current state</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {([
                ["Diagnosis state", selectedEngineRun ? selectedEngineRun.load_classification : "not run yet"],
                ["Ready tasks", String(executionSummary?.next_executable_tasks.length ?? 0)],
                ["Latest plan", latestPlan ? latestPlan.title : "none yet"],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{label}</span>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent movement */}
          <div className="ui-card">
            <p className="eyebrow">Recent movement</p>
            {portfolioSummary?.recent_activity?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {portfolioSummary.recent_activity.slice(0, 3).map((entry) => (
                  <div key={`${entry.venue_id}-${entry.created_at}`} style={{ borderLeft: "3px solid var(--color-border-subtle)", paddingLeft: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)" }}>
                      <span style={{ fontWeight: 600 }}>{entry.venue_name}</span>
                      <span>{formatTimestamp(entry.created_at)}</span>
                    </div>
                    <p className="small-text" style={{ marginTop: 2 }}>{entry.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="small-text" style={{ marginTop: 10 }}>No execution movement logged yet for the active venue.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Venue velocity ───────────────────────── */}
      {venueVelocities.length > 0 ? (
        <section className="ui-card">
          <p className="eyebrow">Execution</p>
          <h2 className="section-title">Venue velocity</h2>
          <p className="small-text" style={{ marginTop: 4, marginBottom: 20 }}>How fast each venue is moving through its plan. Stalled venues need intervention.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {venueVelocities.map((v) => {
              const pulse = visiblePulses.find((p) => p.venue_id === v.venue_id);
              return (
                <article
                  key={v.venue_id}
                  className="ui-card"
                  style={{
                    padding: 0,
                    borderLeft: `4px solid ${velocityColor(v.velocity_label)}`,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                >
                  <button
                    onClick={() => onOpenVenue(v.venue_id)}
                    style={{ all: "unset", display: "block", width: "100%", padding: "16px 20px 12px", cursor: "pointer", boxSizing: "border-box" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", color: velocityColor(v.velocity_label) }}>
                        {v.velocity_label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{Math.round(v.completion_percentage)}%</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{pulse?.venue_name ?? v.venue_id}</h3>
                  </button>
                  <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {([
                      ["Total tasks", String(v.total_tasks)],
                      ["Completed", String(v.completed_tasks)],
                      ["In progress", String(v.in_progress_tasks)],
                      ["Blocked", String(v.blocked_tasks)],
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{label}</span>
                        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Configuration issues ─────────────────── */}
      {bootstrap.configuration_issues.length > 0 ? (
        <section className="ui-card">
          <p className="eyebrow">Configuration</p>
          <h2 className="section-title">Issues requiring attention</h2>
          <p className="small-text" style={{ marginTop: 4, marginBottom: 20 }}>These issues may prevent normal venue operation until resolved.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bootstrap.configuration_issues.map((issue) => (
              <div key={issue} style={{ borderLeft: `4px solid ${ds.danger}`, paddingLeft: 14, padding: "10px 14px", background: "var(--color-danger-soft)", borderRadius: 8 }}>
                <p className="small-text" style={{ color: "var(--color-text-primary)" }}>{issue}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Platform posture ─────────────────────── */}
      <section className="ui-card">
        <p className="eyebrow">Runtime</p>
        <h2 className="section-title">Platform posture</h2>
        <p className="small-text" style={{ marginTop: 4, marginBottom: 20 }}>The home screen should also reassure you that the workspace itself is alive, grounded, and ready.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div className="ui-card">
            <p className="eyebrow">Platform posture</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {Object.entries(bootstrap.readiness).map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{key}</span>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ui-card">
            <p className="eyebrow">Attention map</p>
            {portfolioSummary?.attention_breakdown?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {portfolioSummary.attention_breakdown.map((item) => (
                  <span key={item.attention_level} className="ui-badge ui-badge--muted" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
                    <span style={statusDot(attentionColor(item.attention_level))} />
                    {item.attention_level}: {item.count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="small-text" style={{ marginTop: 10 }}>Attention breakdown will appear as the portfolio summary settles.</p>
            )}
          </div>

          <div className="ui-card">
            <p className="eyebrow">Portfolio notes</p>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {(portfolioSummary?.portfolio_notes ?? ["Portfolio summary is still loading."]).map((note) => (
                <li key={note} style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function fallbackPulse(venue: Venue) {
  return {
    venue_id: venue.id,
    venue_name: venue.name,
    status: venue.status,
    concept: venue.concept,
    location: venue.location,
    latest_assessment_at: null,
    latest_engine_run_at: null,
    latest_plan_title: null,
    plan_load_classification: null,
    latest_signal_count: 0,
    latest_plan_task_count: 0,
    completion_percentage: 0,
    ready_task_count: 0,
    blocked_task_count: 0,
    progress_entry_count: 0,
    latest_progress_summary: null,
    latest_activity_at: null,
    suggested_view: "overview",
    attention_level: "steady",
    next_step_label: "Open the venue workspace.",
  };
}

function toVenueView(value: string): VenueSubview {
  if (value === "assessment" || value === "signals" || value === "history" || value === "plan" || value === "diagnosis" || value === "console") {
    return value;
  }
  if (value === "report") {
    return "diagnosis";
  }
  return "overview";
}

function ctaFor(value: string) {
  switch (toVenueView(value)) {
    case "assessment":
      return "Go to assessment";
    case "signals":
      return "Review signals";
    case "diagnosis":
      return "Open diagnosis";
    case "plan":
      return "Open plan";
    case "history":
      return "View history";
    case "console":
      return "Open console";
    default:
      return "Open overview";
  }
}

function describeNextStep({
  assessmentCount,
  selectedEngineRun,
  latestPlan,
  executionSummary,
}: {
  assessmentCount: number;
  selectedEngineRun: PersistedEngineRunRecord | null;
  latestPlan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
}) {
  if (!assessmentCount) {
    return "No assessment saved yet. Start by capturing what is actually happening in the venue.";
  }
  if (!selectedEngineRun) {
    return "The venue has assessment history but no current diagnosis loaded. Run the engine and generate the diagnostic read.";
  }
  if (!latestPlan) {
    return "A diagnosis exists, but the plan has not materialized cleanly yet. Open the diagnosis and move into execution.";
  }
  if ((executionSummary?.next_executable_tasks.length ?? 0) > 0) {
    return "There are ready tasks waiting. The fastest value now is to continue execution, not reopen diagnosis.";
  }
  if ((executionSummary?.blocked_tasks.length ?? 0) > 0) {
    return "Execution is bottlenecked. Open the plan and clear the blocking dependencies first.";
  }
  return "The venue is caught up enough to review progress, pressure-test the diagnosis, or start the next assessment cycle.";
}
