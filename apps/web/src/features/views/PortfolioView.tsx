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
  proactiveGreeting: string | null;
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
  onOpenReport: () => void;
  onOpenPlan: () => void;
  formatTimestamp: (isoTimestamp: string) => string;
  venueVelocities: ExecutionVelocity[];
};

export function PortfolioView({
  bootstrap,
  ontologyLabel,
  venues,
  portfolioSummary,
  proactiveGreeting,
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
  onOpenReport,
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
    <div className="view-stack">
      <section className="venue-hero">
        <div>
          <p className="hero-badge">Portfolio</p>
          <h1>{bootstrap.organization?.name ?? "Portfolio workspace"}</h1>
          <p className="hero-copy">
            {bootstrap.current_user.full_name} is signed in as{" "}
            {bootstrap.current_user.role.replace(/_/g, " ")}. Start from the portfolio, decide where pressure is real,
            and move into venue execution only when the operating signal justifies it.
          </p>
          {proactiveGreeting ? <p className="history-note">{proactiveGreeting}</p> : null}
        </div>
        <div className="stat-grid stat-grid-hero">
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

      <div className="view-grid">
        <SectionCard
          eyebrow="Portfolio"
          title="Venue control panel"
          description="Choose a venue and move directly into the live workspace without relying on seeded demo structure."
          actions={
            <div className="sample-actions">
              <button
                className={`status-pill ${attentionFilter === "all" ? "active" : ""}`}
                onClick={() => setAttentionFilter("all")}
              >
                All
              </button>
              {(portfolioSummary?.attention_breakdown ?? []).map((item) => (
                <button
                  key={item.attention_level}
                  className={`status-pill ${attentionFilter === item.attention_level ? "active" : ""}`}
                  onClick={() => setAttentionFilter(item.attention_level)}
                >
                  {item.attention_level} ({item.count})
                </button>
              ))}
            </div>
          }
        >
          {loadingPortfolio ? (
            <div className="empty-state">
              <p>Loading portfolio pulse...</p>
            </div>
          ) : (
            <div className="venue-card-grid">
              {visiblePulses.map((pulse) => (
                <article
                  key={pulse.venue_id}
                  className={`venue-selector-card portfolio-pulse-card attention-${pulse.attention_level} ${
                    activeVenue?.id === pulse.venue_id ? "selected" : ""
                  }`}
                >
                  <button className="portfolio-pulse-head" onClick={() => onOpenVenue(pulse.venue_id)}>
                    <div className="thread-row">
                      <span>{pulse.attention_level ?? pulse.status}</span>
                      <em>{pulse.status}</em>
                    </div>
                    <h3>{pulse.venue_name}</h3>
                    <p>{pulse.concept ?? "Service operation"}</p>
                  </button>
                  <div className="readiness-list compact-list">
                    <div className="readiness-row">
                      <strong>Next move</strong>
                      <span>{pulse.next_step_label}</span>
                    </div>
                    <div className="readiness-row">
                      <strong>Ready / blocked</strong>
                      <span>
                        {pulse.ready_task_count} / {pulse.blocked_task_count}
                      </span>
                    </div>
                    <div className="readiness-row">
                      <strong>Completion</strong>
                      <span>{Math.round(pulse.completion_percentage)}%</span>
                    </div>
                    <div className="readiness-row">
                      <strong>Last movement</strong>
                      <span>{pulse.latest_activity_at ? formatTimestamp(pulse.latest_activity_at) : "quiet"}</span>
                    </div>
                  </div>
                  <div className="dependency-list">
                    {pulse.location ? <span>{pulse.location}</span> : null}
                    {pulse.plan_load_classification ? <span>{pulse.plan_load_classification}</span> : null}
                    {pulse.latest_signal_count ? <span>{pulse.latest_signal_count} signals</span> : null}
                    {pulse.latest_plan_task_count ? <span>{pulse.latest_plan_task_count} tasks</span> : null}
                  </div>
                  <div className="sample-actions">
                    <button className="btn btn-secondary" onClick={() => onOpenVenue(pulse.venue_id)}>
                      Open
                    </button>
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
                <div className="empty-state">
                  <p>No venues match that attention filter right now.</p>
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Focus"
          title="Continue where you left off"
          description="The portfolio should tell you what deserves attention before you even open the venue."
        >
          <div className="focus-panel">
            <div className="focus-card focus-card-primary">
              <p className="section-eyebrow">Active venue</p>
              <h3>{activeVenue?.name ?? "No venue loaded"}</h3>
              <p>{nextStep}</p>
              {activeVenue ? (
                <div className="sample-actions">
                  <button className="btn btn-secondary" onClick={onOpenAssessment}>
                    Assessment
                  </button>
                  <button className="btn btn-secondary" onClick={onOpenReport}>
                    Report
                  </button>
                  <button className="btn btn-primary" onClick={onOpenPlan}>
                    Plan
                  </button>
                </div>
              ) : null}
            </div>
            <div className="focus-card">
              <p className="section-eyebrow">Current state</p>
              <div className="readiness-list">
                <div className="readiness-row">
                  <strong>Report state</strong>
                  <span>{selectedEngineRun ? selectedEngineRun.load_classification : "not run yet"}</span>
                </div>
                <div className="readiness-row">
                  <strong>Ready tasks</strong>
                  <span>{executionSummary?.next_executable_tasks.length ?? 0}</span>
                </div>
                <div className="readiness-row">
                  <strong>Latest plan</strong>
                  <span>{latestPlan ? latestPlan.title : "none yet"}</span>
                </div>
              </div>
            </div>
            <div className="focus-card">
              <p className="section-eyebrow">Recent movement</p>
              {portfolioSummary?.recent_activity?.length ? (
                <div className="thread-list compact-list">
                  {portfolioSummary.recent_activity.slice(0, 3).map((entry) => (
                    <div className="history-card compact-card" key={`${entry.venue_id}-${entry.created_at}`}>
                      <div className="thread-row">
                        <span>{entry.venue_name}</span>
                        <em>{formatTimestamp(entry.created_at)}</em>
                      </div>
                      <p className="history-note">{entry.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="history-note">No execution movement logged yet for the active venue.</p>
              )}
            </div>
          </div>
        </SectionCard>

        {venueVelocities.length > 0 ? (
          <SectionCard
            eyebrow="Execution"
            title="Venue velocity"
            description="How fast each venue is moving through its plan. Stalled venues need intervention."
          >
            <div className="venue-card-grid">
              {venueVelocities.map((v) => {
                const pulse = visiblePulses.find((p) => p.venue_id === v.venue_id);
                return (
                  <article
                    key={v.venue_id}
                    className={`venue-selector-card velocity-card velocity-${v.velocity_label}`}
                  >
                    <button className="portfolio-pulse-head" onClick={() => onOpenVenue(v.venue_id)}>
                      <div className="thread-row">
                        <span>{v.velocity_label}</span>
                        <em>{Math.round(v.completion_percentage)}%</em>
                      </div>
                      <h3>{pulse?.venue_name ?? v.venue_id}</h3>
                    </button>
                    <div className="readiness-list compact-list">
                      <div className="readiness-row">
                        <strong>Total tasks</strong>
                        <span>{v.total_tasks}</span>
                      </div>
                      <div className="readiness-row">
                        <strong>Completed</strong>
                        <span>{v.completed_tasks}</span>
                      </div>
                      <div className="readiness-row">
                        <strong>In progress</strong>
                        <span>{v.in_progress_tasks}</span>
                      </div>
                      <div className="readiness-row">
                        <strong>Blocked</strong>
                        <span>{v.blocked_tasks}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          eyebrow="Runtime"
          title="Platform posture"
          description="The home screen should also reassure you that the workspace itself is alive, grounded, and ready."
        >
          <div className="focus-panel">
            <div className="focus-card">
              <p className="section-eyebrow">Platform posture</p>
              <div className="readiness-list">
                {Object.entries(bootstrap.readiness).map(([key, value]) => (
                  <div className="readiness-row" key={key}>
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="focus-card">
              <p className="section-eyebrow">Attention map</p>
              {portfolioSummary?.attention_breakdown?.length ? (
                <div className="dependency-list">
                  {portfolioSummary.attention_breakdown.map((item) => (
                    <span key={item.attention_level}>
                      {item.attention_level}: {item.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="history-note">Attention breakdown will appear as the portfolio summary settles.</p>
              )}
            </div>
            <div className="focus-card">
              <p className="section-eyebrow">Portfolio notes</p>
              <ul className="spine-list">
                {(portfolioSummary?.portfolio_notes ?? ["Portfolio summary is still loading."]).map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>
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
  if (value === "assessment" || value === "history" || value === "plan" || value === "report" || value === "console") {
    return value;
  }
  return "overview";
}

function ctaFor(value: string) {
  switch (toVenueView(value)) {
    case "assessment":
      return "Go to assessment";
    case "report":
      return "Open report";
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
    return "The venue has assessment history but no current report loaded. Run the engine and generate the diagnostic read.";
  }
  if (!latestPlan) {
    return "A report exists, but the plan has not materialized cleanly yet. Open the report and move into execution.";
  }
  if ((executionSummary?.next_executable_tasks.length ?? 0) > 0) {
    return "There are ready tasks waiting. The fastest value now is to continue execution, not reopen diagnosis.";
  }
  if ((executionSummary?.blocked_tasks.length ?? 0) > 0) {
    return "Execution is bottlenecked. Open the plan and clear the blocking dependencies first.";
  }
  return "The venue is caught up enough to review progress, pressure-test the diagnosis, or start the next assessment cycle.";
}
