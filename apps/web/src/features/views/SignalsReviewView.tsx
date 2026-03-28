import { useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import {
  IntakePreviewResponse,
  OntologyBundleResponse,
  OntologySignalRecord,
} from "../../lib/api";

type SignalsReviewViewProps = {
  intakePreview: IntakePreviewResponse | null;
  ontologyBundle: OntologyBundleResponse | null;
  rejectedSignalIds: Set<string>;
  manuallyAddedSignalIds: Set<string>;
  onToggleSignalRejection: (signalId: string) => void;
  onToggleManualSignal: (signalId: string) => void;
  onOpenAssessment: () => void;
  onOpenReport: () => void;
};

type FilterMode = "all" | "confirmed" | "rejected" | "manual";

export function SignalsReviewView({
  intakePreview,
  ontologyBundle,
  rejectedSignalIds,
  manuallyAddedSignalIds,
  onToggleSignalRejection,
  onToggleManualSignal,
  onOpenAssessment,
  onOpenReport,
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

  // Build downstream impact map: signal → failure modes → response patterns → blocks
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
      <div className="view-stack">
        <SectionCard
          eyebrow="Signals Review"
          title="No signals to review"
          description="Run AI intake from the Assessment page first, or manually add signals to begin review."
          actions={
            <button className="btn btn-primary" onClick={onOpenAssessment}>
              Go to Assessment
            </button>
          }
        >
          <div className="empty-state">
            <p>The machine proposes, the human reviews. Start by capturing evidence in the Assessment page.</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="view-stack">
      {/* Summary strip */}
      <SectionCard
        eyebrow="Signals Review"
        title="The machine proposes, the human reviews"
        description="Confirm or reject each signal before it drives downstream diagnosis. Reviewed signals become the authoritative interpreted set for this assessment cycle."
        actions={
          <>
            <button className="btn btn-secondary" onClick={onOpenAssessment}>
              Back to Assessment
            </button>
            <button className="btn btn-primary" onClick={onOpenReport} disabled={confirmedCount === 0}>
              Continue to Report
            </button>
          </>
        }
      >
        <div className="readiness-list">
          <div className="readiness-row">
            <strong>Confirmed signals</strong>
            <span style={{ color: "var(--success, #16a34a)" }}>{confirmedCount}</span>
          </div>
          <div className="readiness-row">
            <strong>Rejected signals</strong>
            <span style={{ opacity: 0.6 }}>{rejectedCount}</span>
          </div>
          {manualCount > 0 && (
            <div className="readiness-row">
              <strong>Manually added</strong>
              <span>{manualCount}</span>
            </div>
          )}
          <div className="readiness-row">
            <strong>Total proposed</strong>
            <span>{reviewSignals.length}</span>
          </div>
        </div>
      </SectionCard>

      {/* Filters */}
      <div className="filter-strip" style={{ display: "flex", gap: "var(--space-3, 12px)", flexWrap: "wrap", padding: "0 var(--space-4, 16px)" }}>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
          style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 12px", fontSize: "var(--text-sm, 14px)" }}
        >
          <option value="all">All signals ({reviewSignals.length})</option>
          <option value="confirmed">Confirmed ({confirmedCount})</option>
          <option value="rejected">Rejected ({rejectedCount})</option>
          {manualCount > 0 && <option value="manual">Manual ({manualCount})</option>}
        </select>
        {allDomains.length > 1 && (
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 12px", fontSize: "var(--text-sm, 14px)" }}
          >
            <option value="all">All domains</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>{d.replace(/_/g, " ")}</option>
            ))}
          </select>
        )}
        <button className="btn btn-secondary" onClick={() => setBrowseOpen((v) => !v)}>
          {browseOpen ? "Close browse" : "Add signals manually"}
        </button>
      </div>

      {/* Signal review list */}
      <div className="view-grid">
        <SectionCard
          eyebrow="Reviewed Signals"
          title={`${filteredSignals.length} signal${filteredSignals.length !== 1 ? "s" : ""}`}
          description="Each signal represents a detected operational condition. Confirm to include in downstream diagnosis, or reject to exclude."
        >
          <div className="inference-list">
            {filteredSignals.map((signal) => {
              const impact = signalImpact.get(signal.signalId);
              const isExpanded = expandedSignalId === signal.signalId;
              return (
                <article
                  className={`inference-card${signal.rejected ? " inference-card-rejected" : ""}${signal.source === "manual" ? " inference-card-selected" : ""}`}
                  key={signal.signalId}
                >
                  <div className="inference-head">
                    <div style={{ flex: 1 }}>
                      <h3 style={{ opacity: signal.rejected ? 0.45 : 1, margin: 0 }}>{signal.name}</h3>
                      <span style={{ fontSize: "var(--text-xs, 11px)", opacity: 0.6, textTransform: "capitalize" }}>
                        {signal.domain.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)" }}>
                      {signal.source === "ai" && !signal.rejected && (
                        <span className={`confidence-badge confidence-${signal.confidence}`}>{signal.confidence}</span>
                      )}
                      {signal.source === "manual" && (
                        <span className="confidence-badge" style={{ fontSize: "var(--text-xs, 11px)" }}>manual</span>
                      )}
                      <button
                        className={`btn btn-secondary${signal.rejected ? "" : " btn-destructive-subtle"}`}
                        style={{ padding: "2px 10px", fontSize: "var(--text-xs, 11px)" }}
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
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "2px 10px", fontSize: "var(--text-xs, 11px)" }}
                          onClick={() => setExpandedSignalId(isExpanded ? null : signal.signalId)}
                        >
                          {isExpanded ? "Hide impact" : "Show impact"}
                        </button>
                      )}
                    </div>
                  </div>

                  {!signal.rejected && signal.evidenceSnippet && (
                    <p className="evidence-quote">&quot;{signal.evidenceSnippet}&quot;</p>
                  )}

                  {!signal.rejected && signal.matchReasons.length > 0 && (
                    <div className="dependency-list">
                      {signal.matchReasons.map((reason) => (
                        <span key={reason}>{reason}</span>
                      ))}
                    </div>
                  )}

                  {!signal.rejected && signal.description && (
                    <p style={{ fontSize: "var(--text-sm, 13px)", opacity: 0.7, marginTop: "var(--space-2, 8px)" }}>
                      {signal.description}
                    </p>
                  )}

                  {/* Downstream impact panel */}
                  {isExpanded && impact && !signal.rejected && (
                    <div style={{ marginTop: "var(--space-3, 12px)", padding: "var(--space-3, 12px)", background: "var(--surface-2, #f8f8f8)", borderRadius: "var(--radius-sm, 4px)" }}>
                      <p style={{ fontWeight: 600, fontSize: "var(--text-sm, 13px)", marginBottom: "var(--space-2, 8px)" }}>
                        Downstream impact
                      </p>
                      {impact.failureModes.length > 0 && (
                        <div style={{ marginBottom: "var(--space-2, 8px)" }}>
                          <p style={{ fontSize: "var(--text-xs, 11px)", fontWeight: 600, opacity: 0.6 }}>Failure modes</p>
                          <div className="dependency-list">
                            {impact.failureModes.map((fm) => <span key={fm}>{fm}</span>)}
                          </div>
                        </div>
                      )}
                      {impact.responsePatterns.length > 0 && (
                        <div style={{ marginBottom: "var(--space-2, 8px)" }}>
                          <p style={{ fontSize: "var(--text-xs, 11px)", fontWeight: 600, opacity: 0.6 }}>Response patterns</p>
                          <div className="dependency-list">
                            {impact.responsePatterns.map((rp) => <span key={rp}>{rp}</span>)}
                          </div>
                        </div>
                      )}
                      {impact.blocks.length > 0 && (
                        <div>
                          <p style={{ fontSize: "var(--text-xs, 11px)", fontWeight: 600, opacity: 0.6 }}>Intervention blocks</p>
                          <div className="dependency-list">
                            {impact.blocks.map((b) => <span key={b}>{b}</span>)}
                          </div>
                        </div>
                      )}
                      {impact.failureModes.length === 0 && impact.blocks.length === 0 && (
                        <p style={{ fontSize: "var(--text-sm, 13px)", opacity: 0.5 }}>No mapped downstream impact in current ontology.</p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {filteredSignals.length === 0 && (
              <div className="empty-state compact">
                <p>No signals match the current filter.</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Signal browse for manual additions */}
      {browseOpen && ontologyBundle && (
        <SectionCard
          eyebrow="Signal Browse"
          title="Add signals manually"
          description={`Browse all ${ontologyBundle.signals.length} signals grouped by domain.`}
        >
          <input
            type="text"
            className="intake-textarea"
            style={{ minHeight: "unset", height: "var(--space-10, 40px)", marginBottom: "var(--space-4, 16px)" }}
            placeholder="Search signals by name or description..."
            value={browseSearch}
            onChange={(e) => setBrowseSearch(e.target.value)}
          />
          <div className="inference-list">
            {[...signalsByDomain.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, signals]) => (
              <div key={domain} className="diagnostic-column">
                <h3 style={{ textTransform: "capitalize", marginBottom: "var(--space-2, 8px)" }}>
                  {domain.replace(/_/g, " ")}
                  <span style={{ fontWeight: "normal", opacity: 0.6, marginLeft: "var(--space-2, 8px)", fontSize: "var(--text-sm, 13px)" }}>
                    ({signals.length})
                  </span>
                </h3>
                <div className="inference-list" style={{ gap: "var(--space-2, 8px)" }}>
                  {signals.map((signal: OntologySignalRecord) => {
                    const isDetected = detectedSignalIds.has(signal.id);
                    const isAdded = manuallyAddedSignalIds.has(signal.id);
                    const isRejected = rejectedSignalIds.has(signal.id);
                    const isActive = isAdded || (isDetected && !isRejected);
                    return (
                      <article
                        key={signal.id}
                        className={`inference-card${isActive ? " inference-card-selected" : ""}${isDetected && !isAdded ? " inference-card-ai" : ""}`}
                        style={{ padding: "var(--space-2, 8px) var(--space-3, 12px)", cursor: "pointer" }}
                        onClick={() => {
                          if (isDetected) {
                            onToggleSignalRejection(signal.id);
                          } else {
                            onToggleManualSignal(signal.id);
                          }
                        }}
                      >
                        <div className="inference-head">
                          <span style={{ fontSize: "var(--text-sm, 13px)", opacity: isActive ? 1 : 0.7 }}>{signal.name}</span>
                          <div style={{ display: "flex", gap: "var(--space-2, 8px)", alignItems: "center" }}>
                            {isDetected && (
                              <span className="confidence-badge confidence-medium" style={{ fontSize: "var(--text-xs, 11px)" }}>AI</span>
                            )}
                            {isRejected && (
                              <span className="confidence-badge" style={{ fontSize: "var(--text-xs, 11px)", opacity: 0.5 }}>rejected</span>
                            )}
                            <span style={{
                              width: 18, height: 18, borderRadius: "50%",
                              background: isActive ? "var(--ois-coral, #e74c3c)" : "var(--surface-2, #f5f5f5)",
                              border: "2px solid var(--ois-coral, #e74c3c)",
                              display: "inline-block",
                              flexShrink: 0,
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
              <p style={{ opacity: 0.5 }}>No signals match your search.</p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
