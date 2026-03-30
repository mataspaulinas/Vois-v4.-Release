import { useEffect, useMemo, useState } from "react";
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

const lensOptions: { id: Lens; label: string }[] = [
  { id: "concentration", label: "Signal concentration" },
  { id: "domains", label: "Domain distribution" },
  { id: "chain", label: "Causal chain" },
  { id: "timeline", label: "Assessment timeline" },
  { id: "heatmap", label: "Portfolio heatmap" },
];

/* ── design tokens ─────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: "4px 0 0" },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: 0 },
  body: { fontSize: 15, color: "#525252", lineHeight: 1.55, margin: 0 },
  small: { fontSize: 13, color: "#737373", lineHeight: 1.5, margin: 0 },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" } as React.CSSProperties,
  accent: "#6C5CE7",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  btnPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 180ms ease" } as React.CSSProperties,
  btnSecondary: { background: "#FFFFFF", color: "#0A0A0A", border: "1px solid #E5E5E5", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 180ms ease" } as React.CSSProperties,
  pill: (active: boolean) => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 13,
    fontWeight: active ? 600 : 400, cursor: "pointer", minHeight: 32,
    border: active ? `1.5px solid #6C5CE7` : "1px solid rgba(0,0,0,0.08)",
    background: active ? "#6C5CE7" : "#FFFFFF",
    color: active ? "#FFFFFF" : "#525252",
    transition: "all 180ms ease",
  }) as React.CSSProperties,
  interactiveCard: {
    background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E5E5",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "14px 20px",
    cursor: "pointer", transition: "all 180ms ease",
  } as React.CSSProperties,
  grid: "#E5E5E5",
} as const;

const frequencyColor = (freq: number) => freq > 0.5 ? ds.danger : freq > 0.25 ? ds.warning : ds.success;

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
      <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
        <section style={ds.card}>
          <p style={ds.eyebrow}>VENUE</p>
          <h2 style={ds.sectionTitle}>Signal intelligence map</h2>
          <p style={{ ...ds.small, marginTop: 8 }}>Load an ontology bundle to explore signal patterns and relationships.</p>
          <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>No ontology data available.</p>
        </section>
      </div>
    );
  }

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Intelligence hero ─────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>VENUE</p>
        <h2 style={ds.sectionTitle}>Signal intelligence map</h2>
        <p style={{ ...ds.small, marginTop: 4, maxWidth: 720 }}>
          Explore operational signal patterns, domain concentration, causal chains, and assessment evolution.
        </p>

        {/* Lens selector */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {lensOptions.map((l) => (
            <button key={l.id} onClick={() => setLens(l.id)} style={ds.pill(lens === l.id)}>
              {l.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>Loading intelligence data...</p>
        ) : null}
      </section>

      {/* ── Concentration lens ────────────────────── */}
      {lens === "concentration" && !loading && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>CONCENTRATION</p>
          <h2 style={ds.sectionTitle}>Most frequent signals across assessment history</h2>
          <p style={{ ...ds.small, marginTop: 4, maxWidth: 720 }}>
            Signals that appear repeatedly across assessments indicate systemic patterns, not one-time events.
          </p>

          {signalConcentration.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              {signalConcentration.slice(0, 20).map((item) => (
                <div
                  key={item.name}
                  style={ds.interactiveCard}
                  onClick={() => {
                    const sig = bundle?.signals.find((s) => s.name === item.name);
                    if (sig) { setSelectedSignalId(sig.id); setLens("chain"); }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>{item.name}</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{
                        padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        color: "#FFFFFF", background: frequencyColor(item.frequency),
                      }}>
                        {Math.round(item.frequency * 100)}%
                      </span>
                      <span style={{ fontSize: 13, color: "#A3A3A3" }}>
                        {item.count}x across {assessmentHistory.length} assessments
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#F5F5F5" }}>
                      <div style={{
                        height: "100%", width: `${Math.round(item.frequency * 100)}%`,
                        background: frequencyColor(item.frequency), borderRadius: 2, transition: "width 180ms ease",
                      }} />
                    </div>
                    {venueId && item.frequency > 0.25 && (
                      <button
                        style={{ ...ds.btnSecondary, fontSize: 11, padding: "3px 12px", whiteSpace: "nowrap" }}
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
            <p style={{ ...ds.small, textAlign: "center", padding: 32, color: "#A3A3A3" }}>
              No assessment history to analyze. Run assessments to build signal concentration data.
            </p>
          )}

          {/* Cross-venue signal density */}
          {venuePulses.length > 1 ? (
            <div style={{ marginTop: 28 }}>
              <p style={{ ...ds.eyebrow, color: ds.accent, marginBottom: 12 }}>Cross-venue signal density</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {venuePulses.filter((p) => p.latest_signal_count > 0).sort((a, b) => b.latest_signal_count - a.latest_signal_count).map((pulse) => (
                  <div
                    key={pulse.venue_id}
                    style={ds.interactiveCard}
                    onClick={() => onOpenVenue(pulse.venue_id)}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", display: "block", marginBottom: 10 }}>
                      {pulse.venue_name}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#737373", fontWeight: 500 }}>Signals</span>
                        <span style={{ color: "#0A0A0A" }}>{pulse.latest_signal_count}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#737373", fontWeight: 500 }}>Tasks</span>
                        <span style={{ color: "#0A0A0A" }}>{pulse.latest_plan_task_count}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#737373", fontWeight: 500 }}>Load</span>
                        <span style={{ color: "#0A0A0A" }}>{pulse.plan_load_classification ?? "unknown"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* ── Domain distribution lens ──────────────── */}
      {lens === "domains" && !loading && bundle && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>DOMAINS</p>
          <h2 style={ds.sectionTitle}>Ontology domain distribution</h2>
          <p style={{ ...ds.small, marginTop: 4 }}>How signals and failure modes are distributed across operational domains.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            {domainDistribution.map((item) => (
              <div key={item.domain} style={{ ...ds.card, padding: "14px 20px" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", textTransform: "capitalize", display: "block", marginBottom: 6 }}>
                  {item.domain.replace(/_/g, " ")}
                </span>
                <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#737373", marginBottom: 10 }}>
                  <span>{item.signalCount} signals</span>
                  <span>{item.fmCount} failure modes</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#F5F5F5" }}>
                  <div style={{
                    height: "100%", width: `${Math.round((item.signalCount / Math.max(1, bundle.signals.length)) * 100)}%`,
                    background: ds.accent, borderRadius: 2, transition: "width 180ms ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Causal chain lens ─────────────────────── */}
      {lens === "chain" && !loading && bundle && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>CAUSAL CHAIN</p>
          <h2 style={ds.sectionTitle}>{selectedChain ? `Chain: ${selectedChain.signal.name}` : "Select a signal to trace"}</h2>
          <p style={{ ...ds.small, marginTop: 4 }}>Trace from signal through failure modes, response patterns, and intervention blocks.</p>

          {/* Signal selector */}
          <div style={{ marginTop: 16, marginBottom: 20 }}>
            <select
              value={selectedSignalId ?? ""}
              onChange={(e) => setSelectedSignalId(e.target.value || null)}
              style={{
                background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 8,
                padding: "8px 14px", fontSize: 13, width: "100%", maxWidth: 420,
                color: "#0A0A0A", minHeight: 36, cursor: "pointer",
              }}
            >
              <option value="">Choose a signal to trace...</option>
              {bundle.signals.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>
              ))}
            </select>
          </div>

          {selectedChain ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Signal node */}
              <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.15)" }}>
                <p style={{ ...ds.eyebrow, color: ds.accent, marginBottom: 4 }}>SIGNAL</p>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", display: "block" }}>{selectedChain.signal.name}</span>
                <p style={{ ...ds.small, marginTop: 4 }}>{selectedChain.signal.description}</p>
                <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#A3A3A3", marginTop: 8 }}>
                  <span>{selectedChain.signal.domain}</span>
                  <span>{selectedChain.signal.indicator_type}</span>
                </div>
              </div>

              {/* Failure modes */}
              {selectedChain.failureModes.map((fm) => (
                <div key={fm.id}>
                  <div style={{ padding: "14px 20px", borderRadius: 12, background: "#FFFFFF", borderLeft: `3px solid ${ds.danger}`, border: "1px solid #E5E5E5", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <p style={{ ...ds.eyebrow, color: ds.danger, marginBottom: 4 }}>FAILURE MODE (weight: {fm.weight})</p>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>{fm.name}</span>
                  </div>

                  {/* Response patterns */}
                  {fm.responsePatterns.map((rp) => (
                    <div key={rp.id} style={{ marginLeft: 20, marginTop: 10 }}>
                      <div style={{ padding: "14px 20px", borderRadius: 12, background: "#FFFFFF", borderLeft: `3px solid ${ds.warning}`, border: "1px solid #E5E5E5", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <p style={{ ...ds.eyebrow, color: ds.warning, marginBottom: 4 }}>RESPONSE PATTERN (weight: {rp.weight})</p>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>{rp.name}</span>
                      </div>

                      {/* Blocks */}
                      {rp.blocks.map((block: any) => (
                        <div key={block.id} style={{ marginLeft: 20, marginTop: 10 }}>
                          <div style={{ padding: "14px 20px", borderRadius: 12, background: "#FFFFFF", borderLeft: `3px solid ${ds.success}`, border: "1px solid #E5E5E5", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                            <p style={{ ...ds.eyebrow, color: ds.success, marginBottom: 4 }}>INTERVENTION BLOCK</p>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", display: "block", marginBottom: 6 }}>{block.name}</span>
                            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#A3A3A3" }}>
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
                <p style={{ ...ds.small, textAlign: "center", padding: 24, color: "#A3A3A3" }}>
                  No downstream failure modes mapped for this signal in the current ontology.
                </p>
              )}
            </div>
          ) : (
            <p style={{ ...ds.small, textAlign: "center", padding: 24, color: "#A3A3A3" }}>
              Select a signal above to trace its causal chain through the ontology.
            </p>
          )}
        </section>
      )}

      {/* ── Timeline lens ─────────────────────────── */}
      {lens === "timeline" && !loading && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>TIMELINE</p>
          <h2 style={ds.sectionTitle}>Assessment evolution</h2>
          <p style={{ ...ds.small, marginTop: 4 }}>How the venue's signal landscape and execution load changed over time.</p>

          {timelineData.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              {timelineData.map((entry) => (
                <div key={entry.id} style={{ ...ds.card, padding: "14px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A" }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 13, color: "#737373" }}>{entry.load ?? "saved only"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#737373", fontWeight: 500 }}>Signals</span>
                      <span style={{ color: "#0A0A0A" }}>{entry.signalCount}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#737373", fontWeight: 500 }}>Plan tasks</span>
                      <span style={{ color: "#0A0A0A" }}>{entry.taskCount}</span>
                    </div>
                    {entry.ontology && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#737373", fontWeight: 500 }}>Ontology</span>
                        <span style={{ color: "#A3A3A3" }}>{entry.ontology}</span>
                      </div>
                    )}
                  </div>
                  {entry.topSignals.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {entry.topSignals.map((name) => (
                        <span key={name} style={{ padding: "2px 10px", borderRadius: 10, background: "#F5F5F5", fontSize: 11, color: "#737373", fontWeight: 500 }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...ds.small, textAlign: "center", padding: 24, color: "#A3A3A3" }}>
              No assessment history to visualize. Run assessments to build timeline data.
            </p>
          )}
        </section>
      )}

      {/* ── Heatmap lens ──────────────────────────── */}
      {lens === "heatmap" && (
        <section style={ds.card}>
          <p style={ds.eyebrow}>HEATMAP</p>
          <h2 style={ds.sectionTitle}>Signal-venue matrix</h2>
          <p style={{ ...ds.small, marginTop: 4 }}>Cross-tabular view: rows are signals sorted by frequency, columns are venues. Cell intensity shows occurrence rate.</p>
          <div style={{ marginTop: 20 }}>
            <SignalHeatmapGrid
              assessments={venuePulses.flatMap((pulse) =>
                assessmentHistory
                  .filter(() => true)
                  .map((a) => ({ venue_id: pulse.venue_id, signal_names: a.active_signal_names ?? [] }))
              )}
              venuePulses={venuePulses}
              onSelectSignal={(sigId) => {
                setSelectedSignalId(sigId);
                setLens("chain");
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
