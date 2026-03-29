import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SignalHeatmapGrid } from "./SignalHeatmapGrid";
import {
  AssessmentHistoryItem,
  OntologyBundleResponse,
  PortfolioVenuePulse,
  createSystemicFlag,
} from "../../lib/api";

type SignalIntelligenceMapProps = {
  bundle: OntologyBundleResponse | null;
  venuePulses: PortfolioVenuePulse[];
  assessmentHistory: AssessmentHistoryItem[];
  loading: boolean;
  venueId: string | null;
  onOpenVenue: (venueId: string) => void;
};

type Lens = "concentration" | "domains" | "chain" | "timeline" | "heatmap";

export function SignalIntelligenceMap({
  bundle,
  venuePulses,
  assessmentHistory,
  loading,
  venueId,
  onOpenVenue,
}: SignalIntelligenceMapProps) {
  // Persist intelligence view state to localStorage
  const stored = typeof window !== "undefined" ? (() => {
    try { return JSON.parse(localStorage.getItem("ois_intelligence_state") ?? "{}"); } catch { return {}; }
  })() : {};

  const [lens, setLens] = useState<Lens>(stored.lens ?? "concentration");
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(stored.selectedSignalId ?? null);

  // Save state on change
  useEffect(() => {
    localStorage.setItem("ois_intelligence_state", JSON.stringify({ lens, selectedSignalId }));
  }, [lens, selectedSignalId]);

  // Build signal concentration from assessment history
  const signalConcentration = useMemo(() => {
    const counts = new Map<string, number>();
    for (const assessment of assessmentHistory) {
      for (const name of assessment.active_signal_names) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, frequency: assessmentHistory.length ? count / assessmentHistory.length : 0 }));
  }, [assessmentHistory]);

  // Build domain distribution from ontology bundle
  const domainDistribution = useMemo(() => {
    if (!bundle) return [];
    const domains = new Map<string, { signalCount: number; fmCount: number; blockCount: number }>();
    for (const signal of bundle.signals) {
      const domain = signal.domain || "uncategorized";
      if (!domains.has(domain)) domains.set(domain, { signalCount: 0, fmCount: 0, blockCount: 0 });
      domains.get(domain)!.signalCount++;
    }
    for (const fm of bundle.failure_modes) {
      const domain = fm.domain || "uncategorized";
      if (!domains.has(domain)) domains.set(domain, { signalCount: 0, fmCount: 0, blockCount: 0 });
      domains.get(domain)!.fmCount++;
    }
    // Blocks don't have domains directly, count by response patterns that link to them
    return [...domains.entries()]
      .sort(([, a], [, b]) => b.signalCount - a.signalCount)
      .map(([domain, counts]) => ({ domain, ...counts }));
  }, [bundle]);

  // Build signal -> failure mode -> response pattern -> block chain for selected signal
  const selectedChain = useMemo(() => {
    if (!bundle || !selectedSignalId) return null;
    const signal = bundle.signals.find((s) => s.id === selectedSignalId);
    if (!signal) return null;

    const fmIds = bundle.signal_failure_map
      .filter((m) => m.signal_id === selectedSignalId)
      .sort((a, b) => b.weight - a.weight);
    const fmLookup = new Map(bundle.failure_modes.map((fm) => [fm.id, fm]));
    const rpLookup = new Map(bundle.response_patterns.map((rp) => [rp.id, rp]));
    const blockLookup = new Map(bundle.blocks.map((b) => [b.id, b]));

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
        return { id: rp.response_pattern_id, name: pattern?.name ?? rp.response_pattern_id, weight: rp.weight, blocks: blockIds };
      });
      return { id: m.failure_mode_id, name: fm?.name ?? m.failure_mode_id, weight: m.weight, responsePatterns };
    });

    return { signal, failureModes };
  }, [bundle, selectedSignalId]);

  // Assessment timeline lens
  const timelineData = useMemo(() => {
    return assessmentHistory
      .slice()
      .reverse()
      .map((a) => ({
        id: a.id,
        date: a.created_at,
        signalCount: a.selected_signal_count,
        taskCount: a.plan_task_count,
        load: a.plan_load_classification,
        ontology: a.ontology_id && a.ontology_version ? `${a.ontology_id}@${a.ontology_version}` : null,
        topSignals: a.active_signal_names,
      }));
  }, [assessmentHistory]);

  if (!bundle && !loading) {
    return (
      <SectionCard eyebrow="Intelligence" title="Signal intelligence map" description="Load an ontology bundle to explore signal patterns and relationships.">
        <div className="empty-state"><p>No ontology data available.</p></div>
      </SectionCard>
    );
  }

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Intelligence"
        title="Signal intelligence map"
        description="Explore operational signal patterns, domain concentration, causal chains, and assessment evolution. This is the advanced analytical surface."
      >
        {/* Lens selector */}
        <div style={{ display: "flex", gap: "var(--space-2, 8px)", marginBottom: "var(--space-4, 16px)", flexWrap: "wrap" }}>
          {([
            { id: "concentration" as Lens, label: "Signal concentration" },
            { id: "domains" as Lens, label: "Domain distribution" },
            { id: "chain" as Lens, label: "Causal chain" },
            { id: "timeline" as Lens, label: "Assessment timeline" },
            { id: "heatmap" as Lens, label: "Portfolio heatmap" },
          ]).map((l) => (
            <button
              key={l.id}
              className={`status-pill ${lens === l.id ? "active" : ""}`}
              onClick={() => setLens(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading intelligence data...</p></div>
        ) : null}
      </SectionCard>

      {/* ─── Concentration lens ─── */}
      {lens === "concentration" && !loading && (
        <SectionCard
          eyebrow="Concentration"
          title="Most frequent signals across assessment history"
          description="Signals that appear repeatedly across assessments indicate systemic patterns, not one-time events."
        >
          {signalConcentration.length ? (
            <div className="inference-list">
              {signalConcentration.slice(0, 20).map((item) => (
                <div className="inference-card" key={item.name} style={{ cursor: "pointer" }} onClick={() => {
                  const sig = bundle?.signals.find((s) => s.name === item.name);
                  if (sig) { setSelectedSignalId(sig.id); setLens("chain"); }
                }}>
                  <div className="inference-head">
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    <div style={{ display: "flex", gap: "var(--space-2, 8px)", alignItems: "center" }}>
                      <span className={`confidence-badge ${item.frequency > 0.5 ? "confidence-high" : item.frequency > 0.25 ? "confidence-medium" : "confidence-low"}`}>
                        {Math.round(item.frequency * 100)}%
                      </span>
                      <span style={{ fontSize: "var(--text-sm, 13px)", opacity: 0.6 }}>{item.count}× across {assessmentHistory.length} assessments</span>
                    </div>
                  </div>
                  {/* Visual bar + flag action */}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)", marginTop: "var(--space-2, 8px)" }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--surface-2, #f0f0f0)" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.round(item.frequency * 100)}%`,
                        background: item.frequency > 0.5 ? "var(--danger, #dc2626)" : item.frequency > 0.25 ? "var(--warning, #f59e0b)" : "var(--success, #16a34a)",
                        borderRadius: 2,
                      }} />
                    </div>
                    {venueId && item.frequency > 0.25 && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: "var(--text-xs, 11px)", padding: "2px 8px", whiteSpace: "nowrap" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const sig = bundle?.signals.find((s) => s.name === item.name);
                          createSystemicFlag(venueId, sig?.id ?? item.name, item.name, `Appears in ${Math.round(item.frequency * 100)}% of assessments`);
                        }}
                      >
                        Flag systemic
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><p>No assessment history to analyze. Run assessments to build signal concentration data.</p></div>
          )}

          {/* Cross-venue signal density */}
          {venuePulses.length > 1 ? (
            <div style={{ marginTop: "var(--space-4, 16px)" }}>
              <p className="section-eyebrow">Cross-venue signal density</p>
              <div className="venue-card-grid">
                {venuePulses.filter((p) => p.latest_signal_count > 0).sort((a, b) => b.latest_signal_count - a.latest_signal_count).map((pulse) => (
                  <div className="venue-selector-card" key={pulse.venue_id} style={{ cursor: "pointer" }} onClick={() => onOpenVenue(pulse.venue_id)}>
                    <h3>{pulse.venue_name}</h3>
                    <div className="readiness-list compact-list">
                      <div className="readiness-row">
                        <strong>Signals</strong>
                        <span>{pulse.latest_signal_count}</span>
                      </div>
                      <div className="readiness-row">
                        <strong>Tasks</strong>
                        <span>{pulse.latest_plan_task_count}</span>
                      </div>
                      <div className="readiness-row">
                        <strong>Load</strong>
                        <span>{pulse.plan_load_classification ?? "unknown"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>
      )}

      {/* ─── Domain distribution lens ─── */}
      {lens === "domains" && !loading && bundle && (
        <SectionCard
          eyebrow="Domains"
          title="Ontology domain distribution"
          description="How signals and failure modes are distributed across operational domains."
        >
          <div className="inference-list">
            {domainDistribution.map((item) => (
              <div className="inference-card" key={item.domain}>
                <div className="inference-head">
                  <h3 style={{ margin: 0, textTransform: "capitalize" }}>{item.domain.replace(/_/g, " ")}</h3>
                </div>
                <div className="dependency-list">
                  <span>{item.signalCount} signals</span>
                  <span>{item.fmCount} failure modes</span>
                </div>
                {/* Proportional bar */}
                <div style={{ height: 4, borderRadius: 2, background: "var(--surface-2, #f0f0f0)", marginTop: "var(--space-2, 8px)" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round((item.signalCount / Math.max(1, bundle.signals.length)) * 100)}%`,
                    background: "var(--ois-coral, #3b82f6)",
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ─── Causal chain lens ─── */}
      {lens === "chain" && !loading && bundle && (
        <SectionCard
          eyebrow="Causal chain"
          title={selectedChain ? `Chain: ${selectedChain.signal.name}` : "Select a signal to trace"}
          description="Trace from signal through failure modes, response patterns, and intervention blocks."
        >
          {/* Signal selector */}
          <div style={{ marginBottom: "var(--space-4, 16px)" }}>
            <select
              value={selectedSignalId ?? ""}
              onChange={(e) => setSelectedSignalId(e.target.value || null)}
              style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "6px 12px", fontSize: "var(--text-sm, 14px)", width: "100%", maxWidth: 400 }}
            >
              <option value="">Choose a signal to trace...</option>
              {bundle.signals.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>
              ))}
            </select>
          </div>

          {selectedChain ? (
            <div className="inference-list">
              {/* Signal */}
              <div className="focus-card focus-card-primary">
                <p className="section-eyebrow">Signal</p>
                <h3>{selectedChain.signal.name}</h3>
                <p style={{ opacity: 0.7 }}>{selectedChain.signal.description}</p>
                <div className="dependency-list">
                  <span>{selectedChain.signal.domain}</span>
                  <span>{selectedChain.signal.indicator_type}</span>
                </div>
              </div>

              {/* Failure modes */}
              {selectedChain.failureModes.map((fm) => (
                <div key={fm.id}>
                  <div className="focus-card" style={{ borderLeft: "3px solid var(--danger, #dc2626)" }}>
                    <p className="section-eyebrow">Failure mode (weight: {fm.weight})</p>
                    <h3>{fm.name}</h3>
                  </div>

                  {/* Response patterns */}
                  {fm.responsePatterns.map((rp) => (
                    <div key={rp.id} style={{ marginLeft: "var(--space-4, 16px)" }}>
                      <div className="focus-card" style={{ borderLeft: "3px solid var(--warning, #f59e0b)" }}>
                        <p className="section-eyebrow">Response pattern (weight: {rp.weight})</p>
                        <h3>{rp.name}</h3>
                      </div>

                      {/* Blocks */}
                      {rp.blocks.map((block: any) => (
                        <div key={block.id} style={{ marginLeft: "var(--space-4, 16px)" }}>
                          <div className="focus-card" style={{ borderLeft: "3px solid var(--success, #16a34a)" }}>
                            <p className="section-eyebrow">Intervention block</p>
                            <h3>{block.name}</h3>
                            <div className="dependency-list">
                              <span>{block.effort_hours}h effort</span>
                              {block.owner_role && <span>{block.owner_role}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {selectedChain.failureModes.length === 0 && (
                <div className="empty-state compact"><p>No downstream failure modes mapped for this signal in the current ontology.</p></div>
              )}
            </div>
          ) : (
            <div className="empty-state compact"><p>Select a signal above to trace its causal chain through the ontology.</p></div>
          )}
        </SectionCard>
      )}

      {/* ─── Timeline lens ─── */}
      {lens === "timeline" && !loading && (
        <SectionCard
          eyebrow="Timeline"
          title="Assessment evolution"
          description="How the venue's signal landscape and execution load changed over time."
        >
          {timelineData.length ? (
            <div className="thread-list">
              {timelineData.map((entry) => (
                <div className="history-card" key={entry.id}>
                  <div className="thread-row">
                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                    <em>{entry.load ?? "saved only"}</em>
                  </div>
                  <div className="readiness-list compact-list">
                    <div className="readiness-row">
                      <strong>Signals</strong>
                      <span>{entry.signalCount}</span>
                    </div>
                    <div className="readiness-row">
                      <strong>Plan tasks</strong>
                      <span>{entry.taskCount}</span>
                    </div>
                    {entry.ontology && (
                      <div className="readiness-row">
                        <strong>Ontology</strong>
                        <span style={{ opacity: 0.6 }}>{entry.ontology}</span>
                      </div>
                    )}
                  </div>
                  {entry.topSignals.length > 0 && (
                    <div className="dependency-list">
                      {entry.topSignals.map((name) => <span key={name}>{name}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><p>No assessment history to visualize. Run assessments to build timeline data.</p></div>
          )}
        </SectionCard>
      )}

      {/* ─── Heatmap lens ─── */}
      {lens === "heatmap" && (
        <SectionCard
          eyebrow="Heatmap"
          title="Signal-venue matrix"
          description="Cross-tabular view: rows are signals sorted by frequency, columns are venues. Cell intensity shows occurrence rate."
        >
          <SignalHeatmapGrid
            assessments={venuePulses.flatMap((pulse) =>
              assessmentHistory
                .filter(() => true) // all assessments contribute
                .map((a) => ({ venue_id: pulse.venue_id, signal_names: a.active_signal_names ?? [] }))
            )}
            venuePulses={venuePulses}
            onSelectSignal={(sigId) => {
              setSelectedSignalId(sigId);
              setLens("chain");
            }}
          />
        </SectionCard>
      )}
    </div>
  );
}
