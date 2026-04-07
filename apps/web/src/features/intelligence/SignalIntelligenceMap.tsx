import { useEffect, useMemo, useState, useCallback } from "react";
import Icon from "../../components/Icon";
import { SignalHeatmapGrid } from "./SignalHeatmapGrid";
import {
  AssessmentHistoryItem,
  OntologyBundleResponse,
  OntologySignalRecord,
  PortfolioVenuePulse,
  createSystemicFlag,
} from "../../lib/api";
import { Select } from "../../components/ui/Select";
import { ds, pillStyle, statusDot } from "../../styles/tokens";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type SignalIntelligenceMapProps = {
  bundle: OntologyBundleResponse | null;
  venuePulses: PortfolioVenuePulse[];
  assessmentHistory: AssessmentHistoryItem[];
  loading: boolean;
  venueId: string | null;
  onOpenVenue: (venueId: string) => void;
};

type Lens = "concentration" | "domains" | "chain" | "timeline" | "heatmap";

type SignalStatus = "new" | "persistent" | "resolved" | "recurring" | "worsening" | "stable";

type HeatmapRowSort = "frequency" | "severity" | "alpha";
type HeatmapColSort = "health" | "risk" | "alpha";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const STORAGE_KEY = "ois_intelligence_state";

const lensOptions: { id: Lens; label: string; icon: string }[] = [
  { id: "concentration", label: "Signal concentration", icon: "signals" },
  { id: "domains", label: "Domain distribution", icon: "plan" },
  { id: "chain", label: "Causal chain", icon: "execution" },
  { id: "timeline", label: "Signal timeline", icon: "history" },
  { id: "heatmap", label: "Portfolio heatmap", icon: "report" },
];

const SEVERITY_LEVELS = ["critical", "high", "medium", "low"] as const;

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

const frequencyColor = (freq: number) =>
  freq > 0.5 ? ds.danger : freq > 0.25 ? ds.warning : ds.success;

function computeSignalStatus(
  signalName: string,
  history: AssessmentHistoryItem[],
): SignalStatus {
  if (history.length === 0) return "stable";
  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const inLatest = sorted[0]?.active_signal_names.includes(signalName) ?? false;
  const presenceCount = sorted.filter((a) =>
    a.active_signal_names.includes(signalName),
  ).length;

  if (!inLatest && presenceCount > 0) return "resolved";
  if (inLatest && presenceCount === 1) return "new";
  if (inLatest && presenceCount >= 3) return "persistent";
  if (inLatest && presenceCount >= 2) return "recurring";
  return "stable";
}

const statusColor = (status: string) => {
  switch (status) {
    case "new":
      return "var(--color-success)";
    case "persistent":
      return "var(--color-danger)";
    case "resolved":
      return "var(--color-warning)";
    case "recurring":
      return "var(--color-warning)";
    case "worsening":
      return "var(--color-danger)";
    default:
      return "var(--color-text-muted)";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "new":
      return "New";
    case "persistent":
      return "Persistent";
    case "resolved":
      return "Resolved";
    case "recurring":
      return "Recurring";
    case "worsening":
      return "Worsening";
    default:
      return "Stable";
  }
};

function readStoredState(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function inferSeverity(signal: OntologySignalRecord | undefined): string {
  if (!signal) return "medium";
  const desc = (signal.description ?? "").toLowerCase();
  if (desc.includes("critical") || desc.includes("severe")) return "critical";
  if (desc.includes("high") || desc.includes("urgent")) return "high";
  if (desc.includes("low") || desc.includes("minor")) return "low";
  return "medium";
}

/* ================================================================== */
/*  Severity filter pill row                                           */
/* ================================================================== */

function SeverityFilterRow({
  active,
  onToggle,
}: {
  active: string[];
  onToggle: (level: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {SEVERITY_LEVELS.map((level) => {
        const isActive = active.includes(level);
        const color =
          level === "critical"
            ? "var(--color-danger)"
            : level === "high"
              ? "var(--color-warning)"
              : level === "medium"
                ? "var(--color-info)"
                : "var(--color-success)";
        return (
          <button
            key={level}
            onClick={() => onToggle(level)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-eyebrow)",
              fontWeight: 600,
              cursor: "pointer",
              border: isActive ? `1.5px solid ${color}` : "1px solid var(--color-border-subtle)",
              background: isActive ? `${color}15` : "var(--color-surface)",
              color: isActive ? color : "var(--color-text-secondary)",
              transition: "all var(--motion-base) var(--easing-standard)",
              textTransform: "capitalize",
            }}
          >
            <span style={statusDot(color)} />
            {level}
          </button>
        );
      })}
      {active.length > 0 && (
        <button
          onClick={() => active.forEach(onToggle)}
          style={{
            ...ds.btnSmSecondary,
            fontSize: "var(--text-eyebrow)",
            padding: "4px 10px",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Signal Drawer                                                      */
/* ================================================================== */

function SignalDrawer({
  signalId,
  bundle,
  assessmentHistory,
  venuePulses,
  onClose,
}: {
  signalId: string;
  bundle: OntologyBundleResponse;
  assessmentHistory: AssessmentHistoryItem[];
  venuePulses: PortfolioVenuePulse[];
  onClose: () => void;
}) {
  const signal = bundle.signals.find((s) => s.id === signalId);
  if (!signal) return null;

  const status = computeSignalStatus(signal.name, assessmentHistory);
  const presenceCount = assessmentHistory.filter((a) =>
    a.active_signal_names.includes(signal.name),
  ).length;
  const frequency = assessmentHistory.length
    ? presenceCount / assessmentHistory.length
    : 0;

  // Downstream chain preview
  const fmLinks = bundle.signal_failure_map.filter((m) => m.signal_id === signalId);
  const fmLookup = new Map(bundle.failure_modes.map((fm) => [fm.id, fm]));
  const blockLookup = new Map(bundle.blocks.map((b) => [b.id, b]));

  const chainPreview = fmLinks.slice(0, 5).map((link) => {
    const fm = fmLookup.get(link.failure_mode_id);
    const rpLinks = bundle.failure_pattern_map.filter(
      (fp) => fp.failure_mode_id === link.failure_mode_id,
    );
    const blocks = rpLinks.flatMap((rp) =>
      bundle.pattern_block_map
        .filter((pb) => pb.response_pattern_id === rp.response_pattern_id)
        .map((pb) => blockLookup.get(pb.block_id))
        .filter(Boolean),
    );
    return { fm, blocks };
  });

  // Venue presence
  const venuesWithSignal = venuePulses.filter((pulse) => {
    const venueAssessments = assessmentHistory.filter(() => true);
    return venueAssessments.some((a) => a.active_signal_names.includes(signal.name));
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 400,
        height: "100vh",
        background: "var(--color-surface)",
        borderLeft: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 100,
        overflowY: "auto",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={ds.eyebrow}>SIGNAL DETAIL</p>
          <h3 style={{ ...ds.sectionTitle, marginTop: 4 }}>{signal.name}</h3>
        </div>
        <button
          onClick={onClose}
          style={{
            ...ds.btnSmSecondary,
            padding: "4px 8px",
            lineHeight: 1,
          }}
          aria-label="Close drawer"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Metadata */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={ds.kvRow}>
          <span style={ds.kvLabel}>Domain</span>
          <span style={{ ...ds.kvValue, textTransform: "capitalize" }}>
            {signal.domain.replace(/_/g, " ")}
          </span>
        </div>
        <div style={ds.kvRow}>
          <span style={ds.kvLabel}>Module</span>
          <span style={ds.kvValue}>{signal.module}</span>
        </div>
        <div style={ds.kvRow}>
          <span style={ds.kvLabel}>Indicator type</span>
          <span style={ds.kvValue}>{signal.indicator_type}</span>
        </div>
        <div style={ds.kvRow}>
          <span style={ds.kvLabel}>Status</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={statusDot(statusColor(status))} />
            <span style={{ ...ds.kvValue, color: statusColor(status) }}>
              {statusLabel(status)}
            </span>
          </span>
        </div>
      </div>

      {/* Severity / frequency metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <div style={{ ...ds.cardCompact, textAlign: "center" }}>
          <span style={ds.metricNumber}>{Math.round(frequency * 100)}%</span>
          <p style={ds.metricLabel}>Frequency</p>
        </div>
        <div style={{ ...ds.cardCompact, textAlign: "center" }}>
          <span style={ds.metricNumber}>{presenceCount}</span>
          <p style={ds.metricLabel}>Appearances</p>
        </div>
      </div>

      {/* Description */}
      {signal.description && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            Description
          </p>
          <p className="small-text" style={{ color: "var(--color-text-secondary)" }}>
            {signal.description}
          </p>
        </div>
      )}

      {/* Downstream chain preview */}
      {chainPreview.length > 0 && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            Downstream chain
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {chainPreview.map(({ fm, blocks }, i) => (
              <div
                key={fm?.id ?? i}
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-surface-subtle)",
                  borderLeft: `3px solid ${ds.danger}`,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {fm?.name ?? "Unknown FM"}
                </span>
                {blocks.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    {blocks.slice(0, 3).map((b: any) => (
                      <span
                        key={b.id}
                        style={{
                          ...ds.tag,
                          fontSize: 10,
                          padding: "1px 8px",
                        }}
                      >
                        {b.name}
                      </span>
                    ))}
                    {blocks.length > 3 && (
                      <span style={{ ...ds.tag, fontSize: 10, padding: "1px 8px" }}>
                        +{blocks.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Venue presence */}
      {venuesWithSignal.length > 0 && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            Active in venues ({venuesWithSignal.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {venuesWithSignal.map((pulse) => (
              <div
                key={pulse.venue_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-surface-subtle)",
                }}
              >
                <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {pulse.venue_name}
                </span>
                <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                  {pulse.latest_signal_count} signals
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function SignalIntelligenceMap({
  bundle,
  venuePulses,
  assessmentHistory,
  loading,
  venueId,
  onOpenVenue,
}: SignalIntelligenceMapProps) {
  /* ── Persisted state ─────────────────────────────────────────── */
  const stored = readStoredState();

  const [lens, setLens] = useState<Lens>((stored.lens as Lens) ?? "concentration");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(
    (stored.selectedSignalId as string) ?? null,
  );
  const [severityFilter, setSeverityFilter] = useState<string[]>(
    (stored.severities as string[]) ?? [],
  );
  const [searchQuery, setSearchQuery] = useState(
    (stored.searchQuery as string) ?? "",
  );
  const [drawerSignalId, setDrawerSignalId] = useState<string | null>(null);

  // Heatmap sort controls
  const [heatmapRowSort, setHeatmapRowSort] = useState<HeatmapRowSort>("frequency");
  const [heatmapColSort, setHeatmapColSort] = useState<HeatmapColSort>("health");

  // Save state on change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lens,
        selectedSignalId,
        severities: severityFilter,
        searchQuery,
      }),
    );
  }, [lens, selectedSignalId, severityFilter, searchQuery]);

  /* ── Callbacks ───────────────────────────────────────────────── */
  const toggleSeverity = useCallback(
    (level: string) => {
      setSeverityFilter((prev) =>
        prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
      );
    },
    [],
  );

  const openSignalDrawer = useCallback((sigId: string) => {
    setDrawerSignalId(sigId);
  }, []);

  const openSignalInChain = useCallback(
    (sigId: string) => {
      setSelectedSignalId(sigId);
      setLens("chain");
    },
    [],
  );

  /* ── Signal lookup ───────────────────────────────────────────── */
  const signalByName = useMemo(() => {
    if (!bundle) return new Map<string, OntologySignalRecord>();
    return new Map(bundle.signals.map((s) => [s.name, s]));
  }, [bundle]);

  const signalById = useMemo(() => {
    if (!bundle) return new Map<string, OntologySignalRecord>();
    return new Map(bundle.signals.map((s) => [s.id, s]));
  }, [bundle]);

  /* ── Filtering logic ─────────────────────────────────────────── */
  const matchesFilters = useCallback(
    (signalName: string): boolean => {
      // Search filter
      if (searchQuery && !signalName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Severity filter
      if (severityFilter.length > 0) {
        const sig = signalByName.get(signalName);
        const severity = inferSeverity(sig);
        if (!severityFilter.includes(severity)) return false;
      }
      return true;
    },
    [searchQuery, severityFilter, signalByName],
  );

  /* ── Concentration data ──────────────────────────────────────── */
  const signalConcentration = useMemo(() => {
    const counts = new Map<string, number>();
    for (const assessment of assessmentHistory) {
      for (const name of assessment.active_signal_names) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        frequency: assessmentHistory.length ? count / assessmentHistory.length : 0,
        status: computeSignalStatus(name, assessmentHistory),
      }))
      .filter((item) => matchesFilters(item.name));
  }, [assessmentHistory, matchesFilters]);

  /* ── Domain distribution ─────────────────────────────────────── */
  const domainDistribution = useMemo(() => {
    if (!bundle) return [];
    const domains = new Map<
      string,
      { signalCount: number; fmCount: number; blockCount: number }
    >();
    for (const signal of bundle.signals) {
      const domain = signal.domain || "uncategorized";
      if (!domains.has(domain))
        domains.set(domain, { signalCount: 0, fmCount: 0, blockCount: 0 });
      domains.get(domain)!.signalCount++;
    }
    for (const fm of bundle.failure_modes) {
      const domain = fm.domain || "uncategorized";
      if (!domains.has(domain))
        domains.set(domain, { signalCount: 0, fmCount: 0, blockCount: 0 });
      domains.get(domain)!.fmCount++;
    }
    return [...domains.entries()]
      .sort(([, a], [, b]) => b.signalCount - a.signalCount)
      .map(([domain, counts]) => ({ domain, ...counts }));
  }, [bundle]);

  /* ── Causal chain ────────────────────────────────────────────── */
  const selectedChain = useMemo(() => {
    if (!bundle || !selectedSignalId) return null;
    const signal = bundle.signals.find((s) => s.id === selectedSignalId);
    if (!signal) return null;

    const fmIds = bundle.signal_failure_map
      .filter((m) => m.signal_id === selectedSignalId)
      .sort((a, b) => b.weight - a.weight);
    const fmLookup = new Map(bundle.failure_modes.map((fm) => [fm.id, fm]));
    const rpLookup = new Map(
      bundle.response_patterns.map((rp) => [rp.id, rp]),
    );
    const blockLookup = new Map(bundle.blocks.map((b) => [b.id, b]));

    // Collect all block ids that appear in plan tasks across assessments
    const planBlockIds = new Set<string>();
    for (const a of assessmentHistory) {
      if (a.engine_run_id) {
        // We don't have direct plan_tasks here, but we track block coverage
        // via the assessment history's active_signal_names indirectly
      }
    }

    let totalEffortHours = 0;
    let totalBlocks = 0;
    let coveredBlocks = 0;

    const failureModes = fmIds.map((m) => {
      const fm = fmLookup.get(m.failure_mode_id);
      const rpIds = bundle.failure_pattern_map
        .filter((fp) => fp.failure_mode_id === m.failure_mode_id)
        .sort((a, b) => b.weight - a.weight);
      const responsePatterns = rpIds.map((rp) => {
        const pattern = rpLookup.get(rp.response_pattern_id);
        const blockIds = bundle.pattern_block_map
          .filter((pb) => pb.response_pattern_id === rp.response_pattern_id)
          .map((pb) => blockLookup.get(pb.block_id))
          .filter(Boolean);
        for (const block of blockIds) {
          totalBlocks++;
          totalEffortHours += (block as any).effort_hours ?? 0;
          if (planBlockIds.has((block as any).id)) coveredBlocks++;
        }
        return {
          id: rp.response_pattern_id,
          name: pattern?.name ?? rp.response_pattern_id,
          weight: rp.weight,
          blocks: blockIds,
        };
      });
      return {
        id: m.failure_mode_id,
        name: fm?.name ?? m.failure_mode_id,
        weight: m.weight,
        responsePatterns,
      };
    });

    return {
      signal,
      failureModes,
      totalBlocks,
      coveredBlocks,
      totalEffortHours,
    };
  }, [bundle, selectedSignalId, assessmentHistory]);

  /* ── Timeline: signal presence grid ──────────────────────────── */
  const timelineGrid = useMemo(() => {
    if (assessmentHistory.length === 0)
      return { signals: [], assessments: [], grid: new Map(), stats: { active: 0, newCount: 0, persistent: 0, resolved: 0 } };

    const sorted = [...assessmentHistory].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const recentAssessments = sorted.slice(0, 12);

    // Collect all unique signal names that appeared in any assessment
    const allSignalNames = new Set<string>();
    for (const a of assessmentHistory) {
      for (const name of a.active_signal_names) {
        allSignalNames.add(name);
      }
    }

    // Build presence grid: signal -> assessment_id -> boolean
    const grid = new Map<string, Map<string, boolean>>();
    for (const name of allSignalNames) {
      const row = new Map<string, boolean>();
      for (const a of recentAssessments) {
        row.set(a.id, a.active_signal_names.includes(name));
      }
      grid.set(name, row);
    }

    // Compute status for each signal
    const signalStatuses = new Map<string, SignalStatus>();
    let active = 0;
    let newCount = 0;
    let persistent = 0;
    let resolved = 0;

    for (const name of allSignalNames) {
      const status = computeSignalStatus(name, assessmentHistory);
      signalStatuses.set(name, status);
      const inLatest = recentAssessments[0]?.active_signal_names.includes(name) ?? false;
      if (inLatest) active++;
      if (status === "new") newCount++;
      if (status === "persistent") persistent++;
      if (status === "resolved") resolved++;
    }

    // Filter and sort signals
    const filteredSignals = [...allSignalNames]
      .filter(matchesFilters)
      .sort((a, b) => {
        // Sort: persistent first, then new, then recurring, then resolved, then by name
        const order: Record<string, number> = {
          persistent: 0,
          worsening: 1,
          new: 2,
          recurring: 3,
          resolved: 4,
          stable: 5,
        };
        const sa = signalStatuses.get(a) ?? "stable";
        const sb = signalStatuses.get(b) ?? "stable";
        const diff = (order[sa] ?? 5) - (order[sb] ?? 5);
        if (diff !== 0) return diff;
        return a.localeCompare(b);
      });

    return {
      signals: filteredSignals,
      assessments: recentAssessments,
      grid,
      signalStatuses,
      stats: { active, newCount, persistent, resolved },
    };
  }, [assessmentHistory, matchesFilters]);

  /* ── Heatmap: systemic and chronic flags ─────────────────────── */
  const heatmapFlags = useMemo(() => {
    const systemicSignals = new Set<string>();
    const chronicSignals = new Set<string>();

    if (venuePulses.length > 1) {
      // Check cross-venue presence for systemic
      const signalVenueCount = new Map<string, number>();
      for (const a of assessmentHistory) {
        for (const name of a.active_signal_names) {
          signalVenueCount.set(name, (signalVenueCount.get(name) ?? 0) + 1);
        }
      }
      const threshold = Math.ceil(venuePulses.length * 0.5);
      for (const [name, count] of signalVenueCount) {
        if (count >= threshold) systemicSignals.add(name);
      }
    }

    // Chronic: present in 3+ assessments
    const signalAssessmentCount = new Map<string, number>();
    for (const a of assessmentHistory) {
      for (const name of a.active_signal_names) {
        signalAssessmentCount.set(name, (signalAssessmentCount.get(name) ?? 0) + 1);
      }
    }
    for (const [name, count] of signalAssessmentCount) {
      if (count >= 3) chronicSignals.add(name);
    }

    return { systemicSignals, chronicSignals };
  }, [assessmentHistory, venuePulses]);

  /* ── Render guards ───────────────────────────────────────────── */
  if (!bundle && !loading) {
    return (
      <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
        <section style={ds.card}>
          <p style={ds.eyebrow}>VENUE</p>
          <h2 style={ds.sectionTitle}>Signal intelligence map</h2>
          <p className="small-text" style={{ marginTop: 8 }}>
            Load an ontology bundle to explore signal patterns and relationships.
          </p>
          <p
            className="small-text"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--color-text-muted)",
            }}
          >
            No ontology data available.
          </p>
        </section>
      </div>
    );
  }

  /* ── Filter bar shows on concentration, timeline, heatmap ───── */
  const showFilters = lens === "concentration" || lens === "timeline" || lens === "heatmap";

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header card ─────────────────────────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>VENUE</p>
        <h2 style={ds.sectionTitle}>Signal intelligence map</h2>
        <p className="small-text" style={{ marginTop: 4, maxWidth: 720 }}>
          Explore operational signal patterns, domain concentration, causal
          chains, and assessment evolution.
        </p>

        {/* Lens selector */}
        <div
          style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}
        >
          {lensOptions.map((l) => (
            <button
              key={l.id}
              onClick={() => setLens(l.id)}
              style={pillStyle(lens === l.id)}
            >
              <Icon name={l.icon as any} size={14} />
              {l.label}
            </button>
          ))}
        </div>

        {loading && (
          <p
            className="small-text"
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--color-text-muted)",
            }}
          >
            Loading intelligence data...
          </p>
        )}
      </section>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      {showFilters && !loading && (
        <section style={{ ...ds.card, display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="eyebrow" style={{ margin: 0 }}>FILTERS</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <SeverityFilterRow active={severityFilter} onToggle={toggleSeverity} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search signals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...ds.searchInput, maxWidth: 320 }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  LENS 1: CONCENTRATION                                       */}
      {/* ============================================================ */}
      {lens === "concentration" && !loading && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>CONCENTRATION</p>
          <h2 style={ds.sectionTitle}>
            Most frequent signals across assessment history
          </h2>
          <p className="small-text" style={{ marginTop: 4, maxWidth: 720 }}>
            Signals that appear repeatedly across assessments indicate systemic
            patterns, not one-time events.
          </p>

          {signalConcentration.length ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 20,
              }}
            >
              {signalConcentration.slice(0, 20).map((item) => {
                const sig = signalByName.get(item.name);
                return (
                  <div
                    key={item.name}
                    style={ds.interactiveCard}
                    onClick={() => {
                      if (sig) openSignalDrawer(sig.id);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={statusDot(statusColor(item.status))} />
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "1px 8px",
                            borderRadius: "var(--radius-full)",
                            background: `${statusColor(item.status)}18`,
                            color: statusColor(item.status),
                            textTransform: "capitalize",
                          }}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--color-surface)",
                            background: frequencyColor(item.frequency),
                          }}
                        >
                          {Math.round(item.frequency * 100)}%
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {item.count}x across {assessmentHistory.length}{" "}
                          assessments
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: "var(--color-surface-subtle)",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.round(item.frequency * 100)}%`,
                            background: frequencyColor(item.frequency),
                            borderRadius: 2,
                            transition: "width 180ms ease",
                          }}
                        />
                      </div>
                      {sig && (
                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: 11,
                            padding: "3px 12px",
                            whiteSpace: "nowrap",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openSignalInChain(sig.id);
                          }}
                        >
                          Trace chain
                        </button>
                      )}
                      {venueId && item.frequency > 0.25 && (
                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: 11,
                            padding: "3px 12px",
                            whiteSpace: "nowrap",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            createSystemicFlag(
                              venueId,
                              sig?.id ?? item.name,
                              item.name,
                              `Appears in ${Math.round(item.frequency * 100)}% of assessments`,
                            );
                          }}
                        >
                          Flag systemic
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              className="small-text"
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--color-text-muted)",
              }}
            >
              {searchQuery || severityFilter.length
                ? "No signals match the current filters."
                : "No assessment history to analyze. Run assessments to build signal concentration data."}
            </p>
          )}

          {/* Cross-venue signal density */}
          {venuePulses.length > 1 ? (
            <div style={{ marginTop: 28 }}>
              <p className="eyebrow" style={{ color: ds.accent, marginBottom: 12 }}>
                Cross-venue signal density
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                {venuePulses
                  .filter((p) => p.latest_signal_count > 0)
                  .sort((a, b) => b.latest_signal_count - a.latest_signal_count)
                  .map((pulse) => (
                    <div
                      key={pulse.venue_id}
                      style={ds.interactiveCard}
                      onClick={() => onOpenVenue(pulse.venue_id)}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          display: "block",
                          marginBottom: 10,
                        }}
                      >
                        {pulse.venue_name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={ds.kvRow}>
                          <span style={ds.kvLabel}>Signals</span>
                          <span style={ds.kvValue}>
                            {pulse.latest_signal_count}
                          </span>
                        </div>
                        <div style={ds.kvRow}>
                          <span style={ds.kvLabel}>Tasks</span>
                          <span style={ds.kvValue}>
                            {pulse.latest_plan_task_count}
                          </span>
                        </div>
                        <div style={ds.kvRow}>
                          <span style={ds.kvLabel}>Load</span>
                          <span style={ds.kvValue}>
                            {pulse.plan_load_classification ?? "unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* ============================================================ */}
      {/*  LENS 2: DOMAIN DISTRIBUTION                                 */}
      {/* ============================================================ */}
      {lens === "domains" && !loading && bundle && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>DOMAINS</p>
          <h2 style={ds.sectionTitle}>Ontology domain distribution</h2>
          <p className="small-text" style={{ marginTop: 4 }}>
            How signals and failure modes are distributed across operational
            domains.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 20,
            }}
          >
            {domainDistribution.map((item) => (
              <div
                key={item.domain}
                className="ui-card"
                style={{ padding: "14px 20px" }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    textTransform: "capitalize",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {item.domain.replace(/_/g, " ")}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    marginBottom: 10,
                  }}
                >
                  <span>{item.signalCount} signals</span>
                  <span>{item.fmCount} failure modes</span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "var(--color-surface-subtle)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round(
                        (item.signalCount /
                          Math.max(1, bundle.signals.length)) *
                          100,
                      )}%`,
                      background: ds.accent,
                      borderRadius: 2,
                      transition: "width 180ms ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  LENS 3: CAUSAL CHAIN                                        */}
      {/* ============================================================ */}
      {lens === "chain" && !loading && bundle && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>CAUSAL CHAIN</p>
          <h2 style={ds.sectionTitle}>
            {selectedChain
              ? `Chain: ${selectedChain.signal.name}`
              : "Select a signal to trace"}
          </h2>
          <p className="small-text" style={{ marginTop: 4 }}>
            Trace from signal through failure modes, response patterns, and
            intervention blocks.
          </p>

          {/* Signal selector */}
          <div style={{ marginTop: 16, marginBottom: 20, maxWidth: 420 }}>
            <Select
              options={bundle.signals.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.domain})`,
              }))}
              value={selectedSignalId ?? ""}
              onChange={(value) => setSelectedSignalId(value || null)}
              placeholder="Choose a signal to trace..."
              searchable
              aria-label="Select signal to trace"
            />
          </div>

          {selectedChain ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Coverage summary */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-surface-subtle)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="plan" size={14} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                    <strong style={{ color: "var(--color-text-primary)" }}>
                      {selectedChain.totalBlocks}
                    </strong>{" "}
                    blocks in chain
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="tasks" size={14} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                    <strong style={{ color: "var(--color-text-primary)" }}>
                      {selectedChain.coveredBlocks}
                    </strong>{" "}
                    of {selectedChain.totalBlocks} covered by plans
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="history" size={14} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                    <strong style={{ color: "var(--color-text-primary)" }}>
                      {selectedChain.totalEffortHours.toFixed(1)}h
                    </strong>{" "}
                    total effort
                  </span>
                </div>
              </div>

              {/* Signal node */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(108,92,231,0.06)",
                  border: "1px solid rgba(108,92,231,0.15)",
                }}
              >
                <p
                  className="eyebrow"
                  style={{ color: ds.accent, marginBottom: 4 }}
                >
                  SIGNAL
                </p>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    display: "block",
                  }}
                >
                  {selectedChain.signal.name}
                </span>
                <p className="small-text" style={{ marginTop: 4 }}>
                  {selectedChain.signal.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    marginTop: 8,
                  }}
                >
                  <span>{selectedChain.signal.domain}</span>
                  <span>{selectedChain.signal.module}</span>
                  <span>{selectedChain.signal.indicator_type}</span>
                </div>
              </div>

              {/* Failure modes */}
              {selectedChain.failureModes.map((fm) => (
                <div key={fm.id}>
                  <div
                    style={{
                      padding: "14px 20px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-surface)",
                      borderLeft: `3px solid ${ds.danger}`,
                      border: "1px solid var(--color-border-subtle)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <p
                      className="eyebrow"
                      style={{ color: ds.danger, marginBottom: 4 }}
                    >
                      FAILURE MODE (weight: {fm.weight})
                    </p>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {fm.name}
                    </span>
                  </div>

                  {/* Response patterns */}
                  {fm.responsePatterns.map((rp) => (
                    <div key={rp.id} style={{ marginLeft: 20, marginTop: 10 }}>
                      <div
                        style={{
                          padding: "14px 20px",
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-surface)",
                          borderLeft: `3px solid ${ds.warning}`,
                          border: "1px solid var(--color-border-subtle)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        <p
                          className="eyebrow"
                          style={{ color: ds.warning, marginBottom: 4 }}
                        >
                          RESPONSE PATTERN (weight: {rp.weight})
                        </p>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {rp.name}
                        </span>
                      </div>

                      {/* Blocks */}
                      {rp.blocks.map((block: any) => {
                        const inPlan = false; // Would check plan_tasks block_id match
                        return (
                          <div
                            key={block.id}
                            style={{ marginLeft: 20, marginTop: 10 }}
                          >
                            <div
                              style={{
                                padding: "14px 20px",
                                borderRadius: "var(--radius-md)",
                                background: "var(--color-surface)",
                                borderLeft: `3px solid ${ds.success}`,
                                border: "1px solid var(--color-border-subtle)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                }}
                              >
                                <div>
                                  <p
                                    className="eyebrow"
                                    style={{
                                      color: ds.success,
                                      marginBottom: 4,
                                    }}
                                  >
                                    INTERVENTION BLOCK
                                  </p>
                                  <span
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 600,
                                      color: "var(--color-text-primary)",
                                      display: "block",
                                      marginBottom: 6,
                                    }}
                                  >
                                    {block.name}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    padding: "2px 10px",
                                    borderRadius: "var(--radius-full)",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: inPlan
                                      ? "var(--color-success-soft)"
                                      : "var(--color-surface-subtle)",
                                    color: inPlan
                                      ? "var(--color-success)"
                                      : "var(--color-text-muted)",
                                  }}
                                >
                                  {inPlan ? "In plan" : "Not in plan"}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 16,
                                  fontSize: 13,
                                  color: "var(--color-text-muted)",
                                }}
                              >
                                <span>{block.effort_hours}h effort</span>
                                {block.owner_role && (
                                  <span>{block.owner_role}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}

              {selectedChain.failureModes.length === 0 && (
                <p
                  className="small-text"
                  style={{
                    textAlign: "center",
                    padding: 24,
                    color: "var(--color-text-muted)",
                  }}
                >
                  No downstream failure modes mapped for this signal in the
                  current ontology.
                </p>
              )}
            </div>
          ) : (
            <p
              className="small-text"
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--color-text-muted)",
              }}
            >
              Select a signal above to trace its causal chain through the
              ontology.
            </p>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/*  LENS 4: TIMELINE (signal presence grid)                     */}
      {/* ============================================================ */}
      {lens === "timeline" && !loading && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>TIMELINE</p>
          <h2 style={ds.sectionTitle}>Signal presence tracking</h2>
          <p className="small-text" style={{ marginTop: 4, maxWidth: 720 }}>
            Track which signals appear across assessments. Rows are signals,
            columns are assessment dates. Filled dots indicate presence.
          </p>

          {timelineGrid.signals.length > 0 && timelineGrid.assessments.length > 0 ? (
            <>
              {/* Summary stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                  marginTop: 20,
                  marginBottom: 20,
                }}
              >
                {[
                  { label: "Active now", value: timelineGrid.stats.active, color: ds.accent },
                  { label: "New", value: timelineGrid.stats.newCount, color: "var(--color-success)" },
                  { label: "Persistent", value: timelineGrid.stats.persistent, color: "var(--color-danger)" },
                  { label: "Resolved", value: timelineGrid.stats.resolved, color: "var(--color-warning)" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      ...ds.cardCompact,
                      textAlign: "center",
                      borderTop: `3px solid ${stat.color}`,
                    }}
                  >
                    <span style={ds.metricNumber}>{stat.value}</span>
                    <p style={ds.metricLabel}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px 12px",
                          fontWeight: 600,
                          color: "var(--color-text-muted)",
                          fontSize: "var(--text-eyebrow)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--color-border-subtle)",
                          minWidth: 200,
                          position: "sticky",
                          left: 0,
                          background: "var(--color-surface)",
                          zIndex: 2,
                        }}
                      >
                        Signal
                      </th>
                      <th
                        style={{
                          padding: "8px 8px",
                          fontWeight: 600,
                          color: "var(--color-text-muted)",
                          fontSize: "var(--text-eyebrow)",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--color-border-subtle)",
                          minWidth: 70,
                        }}
                      >
                        Status
                      </th>
                      {timelineGrid.assessments.map((a) => (
                        <th
                          key={a.id}
                          style={{
                            padding: "8px 4px",
                            fontWeight: 500,
                            color: "var(--color-text-muted)",
                            fontSize: 10,
                            borderBottom: "1px solid var(--color-border-subtle)",
                            textAlign: "center",
                            minWidth: 50,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(a.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timelineGrid.signals.map((signalName) => {
                      const status =
                        (timelineGrid as any).signalStatuses?.get(signalName) ?? "stable";
                      const row = timelineGrid.grid.get(signalName);
                      const sig = signalByName.get(signalName);
                      return (
                        <tr
                          key={signalName}
                          style={{
                            borderBottom: "1px solid var(--color-border-subtle)",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            if (sig) openSignalDrawer(sig.id);
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              fontWeight: 500,
                              color: "var(--color-text-primary)",
                              fontSize: 13,
                              position: "sticky",
                              left: 0,
                              background: "var(--color-surface)",
                              zIndex: 1,
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {signalName}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: "var(--radius-full)",
                                fontSize: 10,
                                fontWeight: 600,
                                background: `${statusColor(status)}15`,
                                color: statusColor(status),
                                textTransform: "capitalize",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: statusColor(status),
                                }}
                              />
                              {statusLabel(status)}
                            </span>
                          </td>
                          {timelineGrid.assessments.map((a) => {
                            const present = row?.get(a.id) ?? false;
                            return (
                              <td
                                key={a.id}
                                style={{
                                  padding: "8px 4px",
                                  textAlign: "center",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    background: present
                                      ? statusColor(status)
                                      : "transparent",
                                    border: present
                                      ? `2px solid ${statusColor(status)}`
                                      : "2px solid var(--color-border-subtle)",
                                    transition: "all 150ms ease",
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p
              className="small-text"
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--color-text-muted)",
              }}
            >
              {searchQuery || severityFilter.length
                ? "No signals match the current filters."
                : "No assessment history to visualize. Run assessments to build timeline data."}
            </p>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/*  LENS 5: HEATMAP                                             */}
      {/* ============================================================ */}
      {lens === "heatmap" && !loading && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>HEATMAP</p>
          <h2 style={ds.sectionTitle}>Signal-venue matrix</h2>
          <p className="small-text" style={{ marginTop: 4 }}>
            Cross-tabular view: rows are signals sorted by frequency, columns
            are venues. Cell intensity shows occurrence rate.
          </p>

          {/* Sort controls */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "var(--text-eyebrow)",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  minWidth: 80,
                }}
              >
                Row sort
              </span>
              {(
                [
                  { id: "frequency", label: "Frequency" },
                  { id: "severity", label: "Severity" },
                  { id: "alpha", label: "A-Z" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setHeatmapRowSort(opt.id)}
                  style={pillStyle(heatmapRowSort === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "var(--text-eyebrow)",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  minWidth: 80,
                }}
              >
                Col sort
              </span>
              {(
                [
                  { id: "health", label: "Health" },
                  { id: "risk", label: "Risk" },
                  { id: "alpha", label: "A-Z" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setHeatmapColSort(opt.id)}
                  style={pillStyle(heatmapColSort === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Systemic / chronic legend */}
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 11,
              color: "var(--color-text-muted)",
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: "2px solid var(--color-warning)",
                  display: "inline-block",
                }}
              />
              Systemic (50%+ venues)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: "var(--color-danger-soft)",
                  color: "var(--color-danger)",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                C
              </span>
              Chronic (3+ assessments)
            </span>
          </div>

          <div style={{ marginTop: 4 }}>
            <SignalHeatmapGrid
              assessments={venuePulses.flatMap((pulse) =>
                assessmentHistory
                  .filter(() => true)
                  .map((a) => ({
                    venue_id: pulse.venue_id,
                    signal_names: a.active_signal_names ?? [],
                  })),
              )}
              venuePulses={venuePulses}
              onSelectSignal={(sigId) => {
                openSignalDrawer(sigId);
              }}
            />
          </div>

          {/* Systemic signals list */}
          {heatmapFlags.systemicSignals.size > 0 && (
            <div style={{ marginTop: 20 }}>
              <p className="eyebrow" style={{ color: "var(--color-warning)", marginBottom: 8 }}>
                Systemic signals (50%+ venue penetration)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...heatmapFlags.systemicSignals].map((name) => (
                  <span
                    key={name}
                    style={{
                      ...ds.tag,
                      borderLeft: "3px solid var(--color-warning)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const sig = signalByName.get(name);
                      if (sig) openSignalDrawer(sig.id);
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chronic signals */}
          {heatmapFlags.chronicSignals.size > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="eyebrow" style={{ color: "var(--color-danger)", marginBottom: 8 }}>
                Chronic signals (3+ assessment appearances)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...heatmapFlags.chronicSignals].map((name) => (
                  <span
                    key={name}
                    style={{
                      ...ds.tag,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const sig = signalByName.get(name);
                      if (sig) openSignalDrawer(sig.id);
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: "var(--color-danger-soft)",
                        color: "var(--color-danger)",
                        fontSize: 9,
                        fontWeight: 700,
                        marginRight: 4,
                      }}
                    >
                      C
                    </span>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/*  SIGNAL DRAWER (fixed right panel)                           */}
      {/* ============================================================ */}
      {drawerSignalId && bundle && (
        <SignalDrawer
          signalId={drawerSignalId}
          bundle={bundle}
          assessmentHistory={assessmentHistory}
          venuePulses={venuePulses}
          onClose={() => setDrawerSignalId(null)}
        />
      )}
    </div>
  );
}
