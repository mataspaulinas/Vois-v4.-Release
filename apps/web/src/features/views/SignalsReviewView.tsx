import { useMemo, useState } from "react";
import {
  IntakePreviewResponse,
  OntologyBundleResponse,
  OntologySignalRecord,
} from "../../lib/api";
import { Select } from "../../components/ui/Select";

type SignalsReviewViewProps = {
  intakePreview: IntakePreviewResponse | null;
  ontologyBundle: OntologyBundleResponse | null;
  rejectedSignalIds: Set<string>;
  manuallyAddedSignalIds: Set<string>;
  onToggleSignalRejection: (signalId: string) => void;
  onToggleManualSignal: (signalId: string) => void;
  onOpenAssessment: () => void;
  onOpenDiagnosis: () => void;
};

type FilterMode = "all" | "confirmed" | "rejected" | "manual";

import { ds } from "../../styles/tokens";

/* ── file-specific helpers ─────────────────────────────── */
const confidenceBadge = (level: string): React.CSSProperties => {
  const bg = level === "high" ? "rgba(16,185,129,0.1)" : level === "medium" ? "rgba(245,158,11,0.1)" : level === "low" ? "rgba(239,68,68,0.1)" : "var(--color-surface-subtle)";
  const color = level === "high" ? "var(--color-success)" : level === "medium" ? "var(--color-warning)" : level === "low" ? "var(--color-danger)" : "var(--color-text-muted)";
  return { background: bg, color };
};

export function SignalsReviewView({
  intakePreview,
  ontologyBundle,
  rejectedSignalIds,
  manuallyAddedSignalIds,
  onToggleSignalRejection,
  onToggleManualSignal,
  onOpenAssessment,
  onOpenDiagnosis,
}: SignalsReviewViewProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState("");

  const detectedSignals = intakePreview?.detected_signals ?? [];
  const detectedSignalIds = new Set(detectedSignals.map((s) => s.signal_id));

  // Build signal lookup from ontology bundle
  const signalLookup = useMemo(() => {
    if (!ontologyBundle) return new Map<string, { name: string; domain: string; description: string }>();
    const map = new Map<string, { name: string; domain: string; description: string }>();
    for (const signal of ontologyBundle.signals) {
      map.set(signal.id, { name: signal.name, domain: signal.domain, description: signal.description });
    }
    return map;
  }, [ontologyBundle]);

  // Build downstream impact map: signal -> failure modes -> response patterns -> blocks
  const signalImpact = useMemo(() => {
    if (!ontologyBundle) return new Map<string, { failureModes: string[]; responsePatterns: string[]; blocks: string[] }>();
    const fmLookup = new Map(ontologyBundle.failure_modes.map((fm) => [fm.id, fm.name]));
    const rpLookup = new Map(ontologyBundle.response_patterns.map((rp) => [rp.id, rp.name]));
    const blockLookup = new Map(ontologyBundle.blocks.map((b) => [b.id, b.name]));

    const sfMap = new Map<string, Set<string>>();
    for (const entry of ontologyBundle.signal_failure_map) {
      if (!sfMap.has(entry.signal_id)) sfMap.set(entry.signal_id, new Set());
      sfMap.get(entry.signal_id)!.add(entry.failure_mode_id);
    }

    const fpMap = new Map<string, Set<string>>();
    for (const entry of ontologyBundle.failure_pattern_map) {
      if (!fpMap.has(entry.failure_mode_id)) fpMap.set(entry.failure_mode_id, new Set());
      fpMap.get(entry.failure_mode_id)!.add(entry.response_pattern_id);
    }

    const pbMap = new Map<string, Set<string>>();
    for (const entry of ontologyBundle.pattern_block_map) {
      if (!pbMap.has(entry.response_pattern_id)) pbMap.set(entry.response_pattern_id, new Set());
      pbMap.get(entry.response_pattern_id)!.add(entry.block_id);
    }

    const impact = new Map<string, { failureModes: string[]; responsePatterns: string[]; blocks: string[] }>();
    for (const signalId of [...detectedSignalIds, ...manuallyAddedSignalIds]) {
      const fmIds = sfMap.get(signalId) ?? new Set<string>();
      const rpIds = new Set<string>();
      const blockIds = new Set<string>();
      for (const fmId of fmIds) {
        for (const rpId of fpMap.get(fmId) ?? []) {
          rpIds.add(rpId);
          for (const blockId of pbMap.get(rpId) ?? []) {
            blockIds.add(blockId);
          }
        }
      }
      impact.set(signalId, {
        failureModes: [...fmIds].map((id) => fmLookup.get(id) ?? id),
        responsePatterns: [...rpIds].map((id) => rpLookup.get(id) ?? id),
        blocks: [...blockIds].map((id) => blockLookup.get(id) ?? id),
      });
    }
    return impact;
  }, [ontologyBundle, detectedSignalIds, manuallyAddedSignalIds]);

  // Collect all domains for filter
  const allDomains = useMemo(() => {
    const domains = new Set<string>();
    for (const signal of detectedSignals) {
      const info = signalLookup.get(signal.signal_id);
      if (info?.domain) domains.add(info.domain);
    }
    for (const signalId of manuallyAddedSignalIds) {
      const info = signalLookup.get(signalId);
      if (info?.domain) domains.add(info.domain);
    }
    return [...domains].sort();
  }, [detectedSignals, manuallyAddedSignalIds, signalLookup]);

  // Build the unified signal list for the review
  const reviewSignals = useMemo(() => {
    type ReviewSignal = {
      signalId: string;
      name: string;
      domain: string;
      description: string;
      source: "ai" | "manual";
      confidence: string;
      evidenceSnippet: string;
      matchReasons: string[];
      rejected: boolean;
    };

    const signals: ReviewSignal[] = [];

    for (const detected of detectedSignals) {
      const info = signalLookup.get(detected.signal_id);
      signals.push({
        signalId: detected.signal_id,
        name: detected.signal_name ?? info?.name ?? detected.signal_id,
        domain: info?.domain ?? "unknown",
        description: info?.description ?? "",
        source: "ai",
        confidence: detected.confidence,
        evidenceSnippet: detected.evidence_snippet,
        matchReasons: detected.match_reasons,
        rejected: rejectedSignalIds.has(detected.signal_id),
      });
    }

    for (const signalId of manuallyAddedSignalIds) {
      if (detectedSignalIds.has(signalId)) continue;
      const info = signalLookup.get(signalId);
      signals.push({
        signalId,
        name: info?.name ?? signalId,
        domain: info?.domain ?? "unknown",
        description: info?.description ?? "",
        source: "manual",
        confidence: "manual",
        evidenceSnippet: "",
        matchReasons: [],
        rejected: false,
      });
    }

    return signals;
  }, [detectedSignals, manuallyAddedSignalIds, rejectedSignalIds, signalLookup, detectedSignalIds]);

  // Apply filters
  const filteredSignals = useMemo(() => {
    return reviewSignals.filter((signal) => {
      if (filterMode === "confirmed" && signal.rejected) return false;
      if (filterMode === "rejected" && !signal.rejected) return false;
      if (filterMode === "manual" && signal.source !== "manual") return false;
      if (domainFilter !== "all" && signal.domain !== domainFilter) return false;
      return true;
    });
  }, [reviewSignals, filterMode, domainFilter]);

  // Counts
  const confirmedCount = reviewSignals.filter((s) => !s.rejected).length;
  const rejectedCount = reviewSignals.filter((s) => s.rejected).length;
  const manualCount = reviewSignals.filter((s) => s.source === "manual").length;

  // Signal browse for manual additions
  const signalsByDomain = useMemo(() => {
    if (!ontologyBundle) return new Map<string, OntologyBundleResponse["signals"]>();
    const map = new Map<string, OntologyBundleResponse["signals"]>();
    const query = browseSearch.toLowerCase();
    for (const signal of ontologyBundle.signals) {
      if (query && !signal.name.toLowerCase().includes(query) && !signal.description.toLowerCase().includes(query)) {
        continue;
      }
      const domain = signal.domain || "uncategorized";
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain)!.push(signal);
    }
    return map;
  }, [ontologyBundle, browseSearch]);

  if (!intakePreview && manuallyAddedSignalIds.size === 0) {
    return (
      <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
        <section className="ui-card" style={{ padding: "32px 32px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="eyebrow">VENUE</p>
              <h2 className="section-title">No signals to review</h2>
              <p className="small-text" style={{ marginTop: 4 }}>Run AI intake from the Assessment page first, or manually add signals to begin review.</p>
            </div>
            <button className="btn btn-primary" onClick={onOpenAssessment}>Go to Assessment</button>
          </div>
          <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>
            The machine proposes, the human reviews. Start by capturing evidence in the Assessment page.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Summary strip ─────────────────────────── */}
      <section className="ui-card" style={{ padding: "32px 32px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="eyebrow">VENUE</p>
            <h1 className="page-title">Signal review</h1>
            <p className="small-text" style={{ marginTop: 8, maxWidth: 720 }}>
              Confirm or reject each signal before it drives downstream diagnosis. Reviewed signals become the authoritative interpreted set for this assessment cycle.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={onOpenAssessment}>Back to Assessment</button>
            <button className="btn btn-primary" style={{ opacity: confirmedCount === 0 ? 0.5 : 1 }} onClick={onOpenDiagnosis} disabled={confirmedCount === 0}>Continue to Diagnosis</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 24, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-surface-subtle)" }}>
            <span className="kv-label">Confirmed signals</span>
            <span className="kv-value" style={{ color: ds.success, fontWeight: 600 }}>{confirmedCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-surface-subtle)" }}>
            <span className="kv-label">Rejected signals</span>
            <span className="kv-value" style={{ opacity: 0.6 }}>{rejectedCount}</span>
          </div>
          {manualCount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-surface-subtle)" }}>
              <span className="kv-label">Manually added</span>
              <span className="kv-value">{manualCount}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span className="kv-label">Total proposed</span>
            <span className="kv-value">{reviewSignals.length}</span>
          </div>
        </div>
      </section>

      {/* ── Filters ───────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Select
          options={[
            { value: "all", label: `All signals (${reviewSignals.length})` },
            { value: "confirmed", label: `Confirmed (${confirmedCount})` },
            { value: "rejected", label: `Rejected (${rejectedCount})` },
            ...(manualCount > 0 ? [{ value: "manual", label: `Manual (${manualCount})` }] : []),
          ]}
          value={filterMode}
          onChange={(value) => setFilterMode(value as FilterMode)}
          aria-label="Filter signals"
          size="sm"
        />
        {allDomains.length > 1 && (
          <Select
            options={[
              { value: "all", label: "All domains" },
              ...allDomains.map((d) => ({ value: d, label: d.replace(/_/g, " ") })),
            ]}
            value={domainFilter}
            onChange={(value) => setDomainFilter(value)}
            aria-label="Filter by domain"
            size="sm"
          />
        )}
        <button className="btn btn-secondary" onClick={() => setBrowseOpen((v) => !v)}>
          {browseOpen ? "Close browse" : "Add signals manually"}
        </button>
      </div>

      {/* ── Signal review list ────────────────────── */}
      <section className="ui-card">
        <p className="eyebrow">REVIEWED SIGNALS</p>
        <h2 className="section-title">{filteredSignals.length} signal{filteredSignals.length !== 1 ? "s" : ""}</h2>
        <p className="small-text" style={{ marginTop: 4 }}>Each signal represents a detected operational condition. Confirm to include in downstream diagnosis, or reject to exclude.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          {filteredSignals.map((signal) => {
            const impact = signalImpact.get(signal.signalId);
            const isExpanded = expandedSignalId === signal.signalId;
            return (
              <article
                key={signal.signalId}
                className="ui-card"
                style={{
                  padding: "16px 20px",
                  opacity: signal.rejected ? 0.55 : 1,
                  borderLeft: signal.source === "manual" ? `3px solid ${ds.accent}` : signal.rejected ? `3px solid var(--color-border-strong)` : `3px solid ${ds.success}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{signal.name}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "capitalize" }}>{signal.domain.replace(/_/g, " ")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {signal.source === "ai" && !signal.rejected && (
                      <span className="ui-badge" style={confidenceBadge(signal.confidence)}>{signal.confidence}</span>
                    )}
                    {signal.source === "manual" && (
                      <span className="ui-badge" style={confidenceBadge("manual")}>manual</span>
                    )}
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        if (signal.source === "ai") {
                          onToggleSignalRejection(signal.signalId);
                        } else {
                          onToggleManualSignal(signal.signalId);
                        }
                      }}
                    >
                      {signal.rejected ? "Restore" : signal.source === "manual" ? "Remove" : "Reject"}
                    </button>
                    {impact && (
                      <button className="btn btn-sm" onClick={() => setExpandedSignalId(isExpanded ? null : signal.signalId)}>
                        {isExpanded ? "Hide impact" : "Show impact"}
                      </button>
                    )}
                  </div>
                </div>

                {!signal.rejected && signal.evidenceSnippet && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-secondary)", fontStyle: "italic", lineHeight: 1.45 }}>
                    &quot;{signal.evidenceSnippet}&quot;
                  </p>
                )}

                {!signal.rejected && signal.matchReasons.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {signal.matchReasons.map((reason) => (
                      <span key={reason} className="ui-badge ui-badge--muted">{reason}</span>
                    ))}
                  </div>
                )}

                {!signal.rejected && signal.description && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>{signal.description}</p>
                )}

                {/* Downstream impact panel */}
                {isExpanded && impact && !signal.rejected && (
                  <div style={{ marginTop: 16, padding: 16, background: "var(--color-surface-subtle)", borderRadius: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", display: "block", marginBottom: 10 }}>Downstream impact</span>
                    {impact.failureModes.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p className="eyebrow" style={{ marginBottom: 6 }}>FAILURE MODES</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {impact.failureModes.map((fm) => <span key={fm} className="ui-badge ui-badge--muted">{fm}</span>)}
                        </div>
                      </div>
                    )}
                    {impact.responsePatterns.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p className="eyebrow" style={{ marginBottom: 6 }}>RESPONSE PATTERNS</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {impact.responsePatterns.map((rp) => <span key={rp} className="ui-badge ui-badge--muted">{rp}</span>)}
                        </div>
                      </div>
                    )}
                    {impact.blocks.length > 0 && (
                      <div>
                        <p className="eyebrow" style={{ marginBottom: 6 }}>INTERVENTION BLOCKS</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {impact.blocks.map((b) => <span key={b} className="ui-badge ui-badge--muted">{b}</span>)}
                        </div>
                      </div>
                    )}
                    {impact.failureModes.length === 0 && impact.blocks.length === 0 && (
                      <p className="small-text" style={{ color: "var(--color-text-muted)" }}>No mapped downstream impact in current ontology.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {filteredSignals.length === 0 && (
            <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>No signals match the current filter.</p>
          )}
        </div>
      </section>

      {/* ── Signal browse for manual additions ────── */}
      {browseOpen && ontologyBundle && (
        <section className="ui-card">
          <p className="eyebrow">SIGNAL BROWSE</p>
          <h2 className="section-title">Add signals manually</h2>
          <p className="small-text" style={{ marginTop: 4 }}>Browse all {ontologyBundle.signals.length} signals grouped by domain.</p>

          <input
            type="text"
            placeholder="Search signals by name or description..."
            value={browseSearch}
            onChange={(e) => setBrowseSearch(e.target.value)}
            className="ui-input sm" style={{ marginTop: 16, marginBottom: 20 }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[...signalsByDomain.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, signals]) => (
              <div key={domain}>
                <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", textTransform: "capitalize" }}>
                  {domain.replace(/_/g, " ")}
                  <span style={{ fontWeight: 400, color: "var(--color-text-muted)", marginLeft: 8, fontSize: 13 }}>({signals.length})</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {signals.map((signal: OntologySignalRecord) => {
                    const isDetected = detectedSignalIds.has(signal.id);
                    const isAdded = manuallyAddedSignalIds.has(signal.id);
                    const isRejected = rejectedSignalIds.has(signal.id);
                    const isActive = isAdded || (isDetected && !isRejected);
                    return (
                      <article
                        key={signal.id}
                        className="ui-card"
                        style={{
                          padding: "10px 16px", cursor: "pointer",
                          border: isActive ? `1.5px solid ${ds.accent}` : "1px solid var(--color-border-subtle)",
                          background: isActive ? "rgba(108,92,231,0.04)" : "var(--color-surface)",
                          transition: "all 180ms ease",
                        }}
                        onClick={() => {
                          if (isDetected) {
                            onToggleSignalRejection(signal.id);
                          } else {
                            onToggleManualSignal(signal.id);
                          }
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>{signal.name}</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {isDetected && <span className="ui-badge" style={confidenceBadge("medium")}>AI</span>}
                            {isRejected && <span className="ui-badge" style={{ ...confidenceBadge("manual"), opacity: 0.5 }}>rejected</span>}
                            <span style={{
                              width: 18, height: 18, borderRadius: "50%",
                              background: isActive ? ds.accent : "var(--color-surface-subtle)",
                              border: `2px solid ${ds.accent}`,
                              display: "inline-block", flexShrink: 0,
                            }} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
            {signalsByDomain.size === 0 && (
              <p className="small-text" style={{ color: "var(--color-text-muted)" }}>No signals match your search.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
