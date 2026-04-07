import { useMemo, useState } from "react";
import Icon from "../../components/Icon";
import {
  BootstrapResponse,
  ExecutionVelocity,
  PortfolioSummaryResponse,
  PortfolioVenuePulse,
  PersistedEngineRunRecord,
  PlanExecutionSummary,
  PlanRecord,
  ProgressEntryRecord,
  Venue,
} from "../../lib/api";
import { VenueSubview } from "../shell/types";
import { ds, pillStyle, statusDot } from "../../styles/tokens";

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

/* ── Helper functions ── */

const attentionColor = (level: string) => {
  switch (level) {
    case "urgent": return "var(--critical)";
    case "needs_attention": return "var(--high)";
    case "steady": return "var(--medium)";
    case "dormant": return "var(--text-muted)";
    default: return "var(--text-muted)";
  }
};

const velocityColor = (label: string) => {
  switch (label) {
    case "stalled": return "var(--critical)";
    case "slow": return "var(--high)";
    case "steady": return "var(--medium)";
    case "fast": return "var(--low)";
    default: return "var(--text-muted)";
  }
};

function toVenueView(suggested: string): VenueSubview {
  const valid: VenueSubview[] = ["assessment", "signals", "history", "plan", "diagnosis", "console", "overview"];
  if (suggested === "report") return "diagnosis";
  return valid.includes(suggested as VenueSubview) ? (suggested as VenueSubview) : "overview";
}

function ctaLabel(view: string): string {
  switch (view) {
    case "assessment": return "Assessment";
    case "signals": return "Signals";
    case "diagnosis": return "Diagnosis";
    case "plan": return "Plan";
    case "history": return "History";
    default: return "Overview";
  }
}

function fallbackPulse(venue: Venue): PortfolioVenuePulse {
  return {
    venue_id: venue.id, venue_name: venue.name, status: venue.status,
    concept: venue.concept, location: venue.location,
    latest_assessment_at: null, latest_engine_run_at: null,
    latest_plan_title: null, plan_load_classification: null,
    latest_signal_count: 0, latest_plan_task_count: 0,
    completion_percentage: 0, ready_task_count: 0, blocked_task_count: 0,
    progress_entry_count: 0, latest_progress_summary: null,
    latest_activity_at: null, suggested_view: "overview",
    attention_level: "steady", next_step_label: "Open the venue workspace.",
  };
}

function timeAgo(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function computeResumeVenue(
  summary: PortfolioSummaryResponse | null,
  pulses: PortfolioVenuePulse[]
): { venueId: string; venueName: string; reason: string; suggestedView: string; attentionLevel: string } | null {
  if (!pulses.length) return null;

  // Prefer API-provided resume venue
  if (summary?.resume_venue_id) {
    const pulse = pulses.find(p => p.venue_id === summary.resume_venue_id);
    if (pulse) {
      return {
        venueId: pulse.venue_id,
        venueName: pulse.venue_name,
        reason: summary.resume_reason || pulse.next_step_label,
        suggestedView: pulse.suggested_view,
        attentionLevel: pulse.attention_level,
      };
    }
  }

  // Compute from highest-attention pulse
  const priority = ["urgent", "needs_attention", "steady", "dormant"];
  const sorted = [...pulses].sort((a, b) =>
    priority.indexOf(a.attention_level) - priority.indexOf(b.attention_level)
  );
  const top = sorted[0];
  return {
    venueId: top.venue_id,
    venueName: top.venue_name,
    reason: top.next_step_label,
    suggestedView: top.suggested_view,
    attentionLevel: top.attention_level,
  };
}

/* ── Component ── */

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
  const [systemHealthOpen, setSystemHealthOpen] = useState(false);

  const summaryVenues = portfolioSummary?.venue_pulses ?? [];
  const allPulses = useMemo(() =>
    summaryVenues.length ? summaryVenues : venues.map(fallbackPulse),
    [summaryVenues, venues]
  );
  const visiblePulses = useMemo(() =>
    attentionFilter === "all" ? allPulses : allPulses.filter(p => p.attention_level === attentionFilter),
    [attentionFilter, allPulses]
  );
  const resumeVenue = useMemo(() => computeResumeVenue(portfolioSummary, allPulses), [portfolioSummary, allPulses]);
  const velocityMap = useMemo(() => {
    const map = new Map<string, ExecutionVelocity>();
    venueVelocities.forEach(v => map.set(v.venue_id, v));
    return map;
  }, [venueVelocities]);

  const issueCount = (bootstrap.configuration_issues?.length ?? 0);
  const recentActivity = portfolioSummary?.recent_activity?.slice(0, 8) ?? [];

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Section 1: Morning Briefing ── */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p className="eyebrow">{bootstrap.organization?.name ?? "Portfolio"}</p>
            <p className="small-text" style={{ color: "var(--text-muted)", marginTop: 2 }}>
              {venues.length} venue{venues.length !== 1 ? "s" : ""} · {bootstrap.current_user.role.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {resumeVenue && (
          <div className="morning-briefing">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ ...statusDot(attentionColor(resumeVenue.attentionLevel)), width: 8, height: 8 }} />
              <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>{resumeVenue.venueName}</strong>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{resumeVenue.reason}</p>
            <button
              className="morning-briefing__cta"
              onClick={() => onOpenVenueWorkspace(resumeVenue.venueId, toVenueView(resumeVenue.suggestedView))}
            >
              Go to {ctaLabel(toVenueView(resumeVenue.suggestedView))}
              <Icon name="forward" size={14} />
            </button>
          </div>
        )}

        {!resumeVenue && !loadingPortfolio && (
          <div className="morning-briefing">
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No venues require attention right now.</p>
          </div>
        )}

        {loadingPortfolio && !resumeVenue && (
          <div className="morning-briefing" style={{ opacity: 0.6 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Loading portfolio...</p>
          </div>
        )}
      </section>

      {/* ── Section 2: Venue Fleet ── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <p className="eyebrow" style={{ marginRight: 8 }}>Venues</p>
          {/* Filter pills */}
          <button style={pillStyle(attentionFilter === "all")} onClick={() => setAttentionFilter("all")}>
            All ({allPulses.length})
          </button>
          {(portfolioSummary?.attention_breakdown ?? []).map(bucket => (
            <button
              key={bucket.attention_level}
              style={pillStyle(attentionFilter === bucket.attention_level)}
              onClick={() => setAttentionFilter(bucket.attention_level)}
            >
              <span style={{ ...statusDot(attentionColor(bucket.attention_level)), width: 6, height: 6, display: "inline-block" }} />
              {bucket.attention_level.replace(/_/g, " ")} ({bucket.count})
            </button>
          ))}
        </div>

        {loadingPortfolio ? (
          <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading venues...</p>
        ) : (
          <div className="venue-fleet-table">
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 100px repeat(3,50px) 80px auto", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
              <span className="small-text" style={{ color: "var(--text-muted)" }}>Venue</span>
              <span className="small-text" style={{ color: "var(--text-muted)" }}>Progress</span>
              <span className="small-text" style={{ color: "var(--text-muted)", textAlign: "center" }}>Ready</span>
              <span className="small-text" style={{ color: "var(--text-muted)", textAlign: "center" }}>Blocked</span>
              <span className="small-text" style={{ color: "var(--text-muted)", textAlign: "center" }}>Signals</span>
              <span className="small-text" style={{ color: "var(--text-muted)" }}>Status</span>
              <span />
            </div>

            {visiblePulses.map((pulse, index) => {
              const velocity = velocityMap.get(pulse.venue_id);
              const barColor = velocity ? velocityColor(velocity.velocity_label) : "var(--medium)";
              return (
                <div
                  key={pulse.venue_id}
                  className="venue-fleet-row"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => onOpenVenue(pulse.venue_id)}
                >
                  <div className="venue-fleet-row__name">
                    <span style={{ ...statusDot(attentionColor(pulse.attention_level)), width: 8, height: 8, flexShrink: 0 }} />
                    <span>{pulse.venue_name}</span>
                  </div>
                  <div className="venue-fleet-progress">
                    <div className="venue-fleet-progress__fill" style={{ width: `${Math.round(pulse.completion_percentage)}%`, background: barColor }} />
                  </div>
                  <span className="venue-fleet-row__metric">{pulse.ready_task_count}</span>
                  <span className="venue-fleet-row__metric" style={{ color: pulse.blocked_task_count > 0 ? "var(--critical)" : undefined }}>{pulse.blocked_task_count}</span>
                  <span className="venue-fleet-row__metric">{pulse.latest_signal_count}</span>
                  <span className="ui-badge ui-badge--muted" style={{ fontSize: 10, textTransform: "capitalize" }}>{pulse.attention_level.replace(/_/g, " ")}</span>
                  <button
                    className="morning-briefing__cta"
                    style={{ padding: "4px 10px", fontSize: 11, marginTop: 0 }}
                    onClick={(e) => { e.stopPropagation(); onOpenVenueWorkspace(pulse.venue_id, toVenueView(pulse.suggested_view)); }}
                  >
                    {ctaLabel(toVenueView(pulse.suggested_view))}
                  </button>
                </div>
              );
            })}

            {!visiblePulses.length && (
              <p className="small-text" style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No venues match this filter.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Section 3: Activity Feed ── */}
      {recentActivity.length > 0 && (
        <section>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Recent activity</p>
          <div className="activity-timeline">
            {recentActivity.map((item, i) => (
              <div key={`${item.venue_id}-${i}`} className="activity-timeline__item">
                <span className="activity-timeline__venue">{item.venue_name}</span>
                <span className="activity-timeline__time">{timeAgo(item.created_at)}</span>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{item.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 4: System Health ── */}
      <section>
        <button
          className="system-health-summary"
          onClick={() => setSystemHealthOpen(prev => !prev)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...statusDot(issueCount > 0 ? "var(--high)" : "var(--medium)"), width: 8, height: 8 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
              System{issueCount > 0 ? `: ${issueCount} issue${issueCount !== 1 ? "s" : ""}` : ": OK"}
            </span>
          </div>
          <Icon name={systemHealthOpen ? "chevron-up" : "chevron-down"} size={14} />
        </button>

        {systemHealthOpen && (
          <div className="system-health-detail">
            {/* Readiness */}
            {bootstrap.readiness && Object.keys(bootstrap.readiness).length > 0 && (
              <div className="ui-card" style={{ padding: "12px 16px" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Readiness</p>
                {Object.entries(bootstrap.readiness).map(([key, value]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                    <span style={{ color: "var(--text-muted)" }}>{key}</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attention breakdown */}
            {(portfolioSummary?.attention_breakdown?.length ?? 0) > 0 && (
              <div className="ui-card" style={{ padding: "12px 16px" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Attention breakdown</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {portfolioSummary!.attention_breakdown.map(b => (
                    <span key={b.attention_level} className="ui-badge ui-badge--muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...statusDot(attentionColor(b.attention_level)), width: 6, height: 6 }} />
                      {b.attention_level.replace(/_/g, " ")}: {b.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio notes */}
            {(portfolioSummary?.portfolio_notes?.length ?? 0) > 0 && (
              <div className="ui-card" style={{ padding: "12px 16px" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Notes</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {portfolioSummary!.portfolio_notes.map((note, i) => (
                    <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Configuration issues */}
            {issueCount > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bootstrap.configuration_issues.map((issue, i) => (
                  <div key={i} style={{ borderLeft: "4px solid var(--critical)", paddingLeft: 14, padding: "10px 14px", background: "var(--critical-bg-subtle)", borderRadius: 8 }}>
                    <p className="small-text" style={{ color: "var(--text-secondary)" }}>{issue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
