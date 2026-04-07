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
  const allActivity = portfolioSummary?.recent_activity ?? [];
  const [activityExpanded, setActivityExpanded] = useState(false);
  const visibleActivity = activityExpanded ? allActivity : allActivity.slice(0, 3);
  const [compareOpen, setCompareOpen] = useState(false);
  const [commonSignalsExpanded, setCommonSignalsExpanded] = useState(false);

  // Common signals: signals appearing in 2+ venues
  const commonSignals = useMemo(() => {
    const freq = new Map<string, { count: number; name: string }>();
    for (const pulse of allPulses) {
      // Use latest_signal_count as a proxy — the actual signal IDs aren't in the pulse
      // But we can show venues that share high signal counts as a cross-venue pattern
    }
    // For now, derive from venue pulses: show venues with the most signals as "hot spots"
    return allPulses
      .filter(p => p.latest_signal_count > 0)
      .sort((a, b) => b.latest_signal_count - a.latest_signal_count)
      .slice(0, commonSignalsExpanded ? 20 : 5);
  }, [allPulses, commonSignalsExpanded]);

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
          {allPulses.length >= 2 && (
            <button
              style={{ ...pillStyle(compareOpen), display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => setCompareOpen(c => !c)}
            >
              <Icon name="metrics" size={12} /> Compare
            </button>
          )}
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
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 60px 60px 60px 80px 80px", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Venue</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Progress</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textAlign: "center" }}>Ready</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textAlign: "center" }}>Blocked</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textAlign: "center" }}>Signals</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Status</span>
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
                  <span style={{ fontSize: 11, color: attentionColor(pulse.attention_level), textTransform: "capitalize", fontWeight: 500 }}>{pulse.attention_level.replace(/_/g, " ")}</span>
                  <button
                    style={{
                      padding: "4px 10px", fontSize: 11, fontWeight: 500,
                      background: "transparent", border: "none", color: "var(--accent)",
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "color var(--motion-fast) var(--easing-standard)",
                    }}
                    onClick={(e) => { e.stopPropagation(); onOpenVenueWorkspace(pulse.venue_id, toVenueView(pulse.suggested_view)); }}
                  >
                    {ctaLabel(toVenueView(pulse.suggested_view))} →
                  </button>
                </div>
              );
            })}

            {!visiblePulses.length && (
              <p className="small-text" style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No venues match this filter.</p>
            )}
          </div>
        )}

        {/* Compare Venues table */}
        {compareOpen && allPulses.length >= 2 && (
          <div className="ui-card" style={{ marginTop: 16, padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Venue</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Completion</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Ready</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Blocked</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Signals</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Tasks</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Attention</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 500, fontSize: 11 }}>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {allPulses.map(pulse => (
                  <tr key={pulse.venue_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text-primary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...statusDot(attentionColor(pulse.attention_level)), width: 6, height: 6 }} />
                        {pulse.venue_name}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{Math.round(pulse.completion_percentage)}%</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--medium)" }}>{pulse.ready_task_count}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: pulse.blocked_task_count > 0 ? "var(--critical)" : undefined }}>{pulse.blocked_task_count}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{pulse.latest_signal_count}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{pulse.latest_plan_task_count}</td>
                    <td style={{ padding: "10px 12px", textTransform: "capitalize", fontSize: 12 }}>{pulse.attention_level.replace(/_/g, " ")}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>{pulse.latest_activity_at ? timeAgo(pulse.latest_activity_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Common Signals (venues with active signals) ── */}
      {commonSignals.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <p className="eyebrow">Signal hotspots</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {commonSignals.map(pulse => (
              <button
                key={pulse.venue_id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: "var(--r-full)", fontSize: 12,
                  background: "var(--critical-bg-subtle)", border: "1px solid var(--critical-border)",
                  color: "var(--text-primary)", cursor: "pointer",
                  transition: "background var(--motion-fast) var(--easing-standard)",
                }}
                onClick={() => onOpenVenueWorkspace(pulse.venue_id, "assessment")}
                title={`${pulse.venue_name}: ${pulse.latest_signal_count} active signals`}
              >
                <span style={{ ...statusDot(attentionColor(pulse.attention_level)), width: 6, height: 6 }} />
                {pulse.venue_name}
                <span style={{ fontWeight: 600, color: "var(--critical)" }}>{pulse.latest_signal_count}</span>
              </button>
            ))}
          </div>
          {allPulses.filter(p => p.latest_signal_count > 0).length > 5 && (
            <button
              style={{ ...pillStyle(false), marginTop: 8, fontSize: 11 }}
              onClick={() => setCommonSignalsExpanded(e => !e)}
            >
              {commonSignalsExpanded ? "Show less" : `+${allPulses.filter(p => p.latest_signal_count > 0).length - 5} more`}
            </button>
          )}
        </section>
      )}

      {/* ── Section 3: Activity Feed (expand/collapse) ── */}
      {allActivity.length > 0 && (
        <section>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Recent activity</p>
          <div className="activity-timeline">
            {visibleActivity.map((item, i) => (
              <div key={`${item.venue_id}-${i}`} className="activity-timeline__item">
                <span className="activity-timeline__venue">{item.venue_name}</span>
                <span className="activity-timeline__time">{timeAgo(item.created_at)}</span>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{item.summary}</p>
              </div>
            ))}
          </div>
          {allActivity.length > 3 && (
            <button
              style={{ ...pillStyle(false), marginTop: 8, fontSize: 11 }}
              onClick={() => setActivityExpanded(e => !e)}
            >
              {activityExpanded ? "Show less" : `+${allActivity.length - 3} more`}
            </button>
          )}
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
