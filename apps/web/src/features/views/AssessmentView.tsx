import { useState, useMemo } from "react";
import { SectionCard } from "../../components/SectionCard";
import { AssessmentRecord, IntakePreviewResponse, OntologyBundleResponse } from "../../lib/api";

type SampleIntakeNote = {
  id: string;
  label: string;
  text: string;
};

type AssessmentViewProps = {
  intakeText: string;
  intakePreview: IntakePreviewResponse | null;
  inferredSignalCount: number;
  rejectedSignalIds: Set<string>;
  manuallyAddedSignalIds: Set<string>;
  ontologyBundle: OntologyBundleResponse | null;
  managementHours: number;
  weeklyBudget: number;
  savedAssessment: AssessmentRecord | null;
  latestEngineRunAt: string | null;
  loadedFromHistory: boolean;
  sampleIntakeNotes: SampleIntakeNote[];
  analyzingIntake: boolean;
  savingAssessment: boolean;
  runningEngine: boolean;
  onIntakeChange: (value: string) => void;
  onLoadSample: (value: string) => void;
  onAnalyze: () => void;
  onSaveAssessment: () => void;
  onRunEngine: () => void;
  onToggleSignalRejection: (signalId: string) => void;
  onToggleManualSignal: (signalId: string) => void;
  onManagementHoursChange: (hours: number) => void;
  onWeeklyBudgetChange: (budget: number) => void;
  formatTimestamp: (isoTimestamp: string) => string;
  onOpenHistory: () => void;
  onOpenReport: () => void;
  reviewPlan: { id: string; status: string; title: string } | null;
  activePlan: { id: string; status: string; title: string } | null;
  onApprovePlan: (planId: string) => void;
};

export function AssessmentView({
  intakeText,
  intakePreview,
  inferredSignalCount,
  rejectedSignalIds,
  manuallyAddedSignalIds,
  ontologyBundle,
  managementHours,
  weeklyBudget,
  savedAssessment,
  latestEngineRunAt,
  loadedFromHistory,
  sampleIntakeNotes,
  analyzingIntake,
  savingAssessment,
  runningEngine,
  onIntakeChange,
  onLoadSample,
  onAnalyze,
  onSaveAssessment,
  onRunEngine,
  onToggleSignalRejection,
  onToggleManualSignal,
  onManagementHoursChange,
  onWeeklyBudgetChange,
  formatTimestamp,
  onOpenHistory,
  onOpenReport,
  reviewPlan,
  activePlan,
  onApprovePlan,
}: AssessmentViewProps) {
  const [signalBrowseOpen, setSignalBrowseOpen] = useState(false);
  const [signalSearch, setSignalSearch] = useState("");

  const detectedSignalIds = new Set((intakePreview?.detected_signals ?? []).map((s) => s.signal_id));

  // Group bundle signals by domain for browse
  const signalsByDomain = useMemo(() => {
    if (!ontologyBundle) return new Map<string, any[]>();
    const map = new Map<string, any[]>();
    const query = signalSearch.toLowerCase();
    for (const signal of ontologyBundle.signals) {
      if (query && !signal.name.toLowerCase().includes(query) && !signal.description.toLowerCase().includes(query)) {
        continue;
      }
      const domain = signal.domain || "uncategorized";
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain)!.push(signal);
    }
    return map;
  }, [ontologyBundle, signalSearch]);

  const stages = [
    { label: "Observe", done: intakeText.trim().length > 0, note: "Raw operational evidence captured." },
    { label: "Infer", done: (intakePreview?.detected_signals.length ?? 0) > 0 || manuallyAddedSignalIds.size > 0, note: "Signals identified from evidence." },
    { label: "Review", done: inferredSignalCount > 0, note: "Signal set confirmed for assessment." },
    { label: "Save", done: Boolean(savedAssessment), note: "Assessment confirmed and reviewable." },
    { label: "Run", done: Boolean(latestEngineRunAt), note: "Diagnostic report generated." },
  ];

  const busy = analyzingIntake || savingAssessment || runningEngine;

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Flow"
        title="Assessment operating loop"
        description="The old app felt good because the path was obvious. This view is now organized around the actual loop."
      >
        {loadedFromHistory && savedAssessment ? (
          <div className="focus-card focus-card-primary">
            <p className="section-eyebrow">Loaded snapshot</p>
            <h3>{formatTimestamp(savedAssessment.created_at)}</h3>
            <p>This assessment was reloaded from the timeline so you can continue from a real saved operating record.</p>
          </div>
        ) : null}
        {reviewPlan?.status === "draft" ? (
          <div className="focus-card" style={{ borderLeft: "4px solid var(--gold)", marginBottom: "var(--spacing-md)" }}>
            <p className="section-eyebrow">Staged Draft</p>
            <h3>{reviewPlan.title}</h3>
            <p>
              The engine has generated a preliminary intervention plan. Review the report and approve the draft to begin execution.
              {activePlan?.status === "active" ? " The current active plan remains live until you approve this draft." : ""}
            </p>
            <div style={{ marginTop: "var(--spacing-md)", display: "flex", gap: "var(--spacing-sm)" }}>
              <button className="btn btn-primary" onClick={() => onApprovePlan(reviewPlan.id)} disabled={busy}>
                Activate Operational Plan
              </button>
              <button className="btn btn-secondary" onClick={onOpenReport}>
                Review Draft Details
              </button>
            </div>
          </div>
        ) : null}
        <div className="journey-strip">
          {stages.map((stage) => (
            <div className={`journey-step ${stage.done ? "done" : ""}`} key={stage.label}>
              <span className="journey-step-index">{stage.done ? "OK" : stage.label.slice(0, 1)}</span>
              <div>
                <strong>{stage.label}</strong>
                <p>{stage.note}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="view-grid">
        <SectionCard
          eyebrow="Assessment"
          title="Observed evidence"
          description="Paste what actually happened. OIS stages the evidence through AI intake first, then saves a reviewable assessment."
          actions={
            <>
              <button className="btn btn-primary" onClick={onAnalyze} disabled={busy}>
                {analyzingIntake ? "Running AI intake..." : "Run AI intake"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={onSaveAssessment}
                disabled={savingAssessment || analyzingIntake || runningEngine || inferredSignalCount === 0}
              >
                {savingAssessment ? "Saving..." : "Save assessment"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={onRunEngine}
                disabled={runningEngine || analyzingIntake || savingAssessment || inferredSignalCount === 0}
              >
                {runningEngine ? "Running..." : "Run engine"}
              </button>
            </>
          }
        >
          <div className="intake-panel">
            <textarea
              className="intake-textarea"
              value={intakeText}
              onChange={(event) => onIntakeChange(event.target.value)}
              placeholder="Paste reviews, audit notes, consultant observations, complaints, or field reports..."
            />
            {sampleIntakeNotes.length ? (
              <div className="sample-actions">
                {sampleIntakeNotes.map((sample) => (
                  <button
                    key={sample.id}
                    className="btn btn-secondary"
                    onClick={() => onLoadSample(sample.text)}
                    disabled={busy}
                  >
                    Load {sample.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Signal Intake"
          title="Inferred signal set"
          description="Review each AI-detected signal. Confirm or reject before saving. Add signals manually via browse."
        >
          {intakePreview ? (
            <div className="inference-list">
              <div className="focus-card">
                <p className="section-eyebrow">Intake posture</p>
                <div className="dependency-list">
                  <span>{intakePreview.provider ?? "deterministic"} </span>
                  <span>{intakePreview.model ?? intakePreview.ontology_version}</span>
                  {intakePreview.venue_context?.venue_type ? <span>{intakePreview.venue_context.venue_type}</span> : null}
                  {intakePreview.venue_context?.team_size_note ? <span>{intakePreview.venue_context.team_size_note}</span> : null}
                </div>
              </div>
              {intakePreview.detected_signals.map((signal) => {
                const rejected = rejectedSignalIds.has(signal.signal_id);
                return (
                  <article
                    className={`inference-card${rejected ? " inference-card-rejected" : ""}`}
                    key={signal.signal_id}
                  >
                    <div className="inference-head">
                      <h3 style={{ opacity: rejected ? 0.45 : 1 }}>{signal.signal_name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        {!rejected && (
                          <span className={`confidence-badge confidence-${signal.confidence}`}>{signal.confidence}</span>
                        )}
                        <button
                          className={`btn btn-secondary${rejected ? "" : " btn-destructive-subtle"}`}
                          style={{ padding: "2px 10px", fontSize: "var(--text-xs)" }}
                          onClick={() => onToggleSignalRejection(signal.signal_id)}
                          title={rejected ? "Restore signal" : "Reject signal"}
                        >
                          {rejected ? "Restore" : "Reject"}
                        </button>
                      </div>
                    </div>
                    {!rejected && (
                      <>
                        <p className="evidence-quote">&quot;{signal.evidence_snippet}&quot;</p>
                        <div className="dependency-list">
                          {signal.match_reasons.map((reason) => (
                            <span key={reason}>{reason}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
              {intakePreview.unmapped_observations.length ? (
                <div className="diagnostic-column">
                  <h3>Unmapped observations</h3>
                  <ul className="spine-list">
                    {intakePreview.unmapped_observations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {intakePreview.quantitative_evidence?.length ? (
                <div className="diagnostic-column">
                  <h3>Quantitative evidence</h3>
                  <ul className="spine-list">
                    {intakePreview.quantitative_evidence.map((item) => (
                      <li key={`${item.label}-${item.value}-${item.evidence_snippet}`}>
                        {item.value}: {item.evidence_snippet}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <p>No inferred signals yet. Run AI intake to stage the diagnostic set.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Signal browse — domain-grouped browse for full ontology */}
      {ontologyBundle && (
        <SectionCard
          eyebrow="Signal Browse"
          title="Add signals manually"
          description={`Browse all ${ontologyBundle.signals.length} signals grouped by domain. Toggle to include in the assessment alongside AI-detected signals.`}
          actions={
            <button
              className="btn btn-secondary"
              onClick={() => setSignalBrowseOpen((v) => !v)}
            >
              {signalBrowseOpen ? "Collapse browse" : "Expand browse"}
            </button>
          }
        >
          {manuallyAddedSignalIds.size > 0 && (
            <div className="readiness-row" style={{ marginBottom: "var(--space-3)" }}>
              <strong>Manually added</strong>
              <span>{manuallyAddedSignalIds.size} signal{manuallyAddedSignalIds.size !== 1 ? "s" : ""}</span>
            </div>
          )}
          {signalBrowseOpen && (
            <>
              <input
                type="text"
                className="intake-textarea"
                style={{ minHeight: "unset", height: "var(--space-10)", marginBottom: "var(--space-4)" }}
                placeholder="Search signals by name or description..."
                value={signalSearch}
                onChange={(e) => setSignalSearch(e.target.value)}
              />
              <div className="inference-list">
                {[...signalsByDomain.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, signals]) => (
                  <div key={domain} className="diagnostic-column">
                    <h3 style={{ textTransform: "capitalize", marginBottom: "var(--space-2)" }}>
                      {domain.replace(/_/g, " ")}
                      <span style={{ fontWeight: "normal", opacity: 0.6, marginLeft: "var(--space-2)", fontSize: "var(--text-sm)" }}>
                        ({signals.length})
                      </span>
                    </h3>
                    <div className="inference-list" style={{ gap: "var(--space-2)" }}>
                      {signals.map((signal: any) => {
                        const isDetected = detectedSignalIds.has(signal.id);
                        const isAdded = manuallyAddedSignalIds.has(signal.id);
                        const isRejected = rejectedSignalIds.has(signal.id);
                        const isActive = isAdded || (isDetected && !isRejected);
                        return (
                          <article
                            key={signal.id}
                            className={`inference-card${isActive ? " inference-card-selected" : ""}${isDetected && !isAdded ? " inference-card-ai" : ""}`}
                            style={{ padding: "var(--space-2) var(--space-3)", cursor: "pointer" }}
                            onClick={() => {
                              if (isDetected) {
                                // For AI-detected: use rejection toggle
                                onToggleSignalRejection(signal.id);
                              } else {
                                onToggleManualSignal(signal.id);
                              }
                            }}
                          >
                            <div className="inference-head">
                              <span style={{ fontSize: "var(--text-sm)", opacity: isActive ? 1 : 0.7 }}>{signal.name}</span>
                              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                                {isDetected && (
                                  <span className="confidence-badge confidence-medium" style={{ fontSize: "var(--text-xs)" }}>AI</span>
                                )}
                                {isRejected && (
                                  <span className="confidence-badge" style={{ fontSize: "var(--text-xs)", opacity: 0.5 }}>rejected</span>
                                )}
                                <span style={{
                                  width: 18, height: 18, borderRadius: "50%",
                                  background: isActive ? "var(--ois-coral)" : "var(--surface-2)",
                                  border: "2px solid var(--ois-coral)",
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
            </>
          )}
        </SectionCard>
      )}

      <SectionCard
        eyebrow="Assessment State"
        title="Review gate"
        description="Set effort parameters, review the signal count, then save the assessment before the engine fires."
        actions={
          <>
            <button className="btn btn-secondary" onClick={onOpenHistory}>
              Open history
            </button>
            <button
              className="btn btn-primary"
              onClick={onOpenReport}
              disabled={!latestEngineRunAt}
            >
              Open report
            </button>
          </>
        }
      >
        <div className="readiness-list">
          <div className="readiness-row">
            <strong>Confirmed signals</strong>
            <span>{inferredSignalCount}</span>
          </div>
          {rejectedSignalIds.size > 0 && (
            <div className="readiness-row">
              <strong>Rejected signals</strong>
              <span style={{ opacity: 0.6 }}>{rejectedSignalIds.size} excluded</span>
            </div>
          )}
          {manuallyAddedSignalIds.size > 0 && (
            <div className="readiness-row">
              <strong>Manually added</strong>
              <span>{manuallyAddedSignalIds.size}</span>
            </div>
          )}
          <div className="readiness-row">
            <strong>Ontology version</strong>
            <span>{intakePreview?.ontology_version ?? "pending"}</span>
          </div>
          <div className="readiness-row">
            <label htmlFor="mgmt-hours" style={{ fontWeight: "bold" }}>Management hours / week</label>
            <input
              id="mgmt-hours"
              type="number"
              min={1}
              max={80}
              value={managementHours}
              onChange={(e) => onManagementHoursChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: 72,
                textAlign: "right",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 8px",
                color: "var(--text-primary)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
          <div className="readiness-row">
            <label htmlFor="weekly-budget" style={{ fontWeight: "bold" }}>Weekly effort budget (hours)</label>
            <input
              id="weekly-budget"
              type="number"
              min={1}
              max={168}
              value={weeklyBudget}
              onChange={(e) => onWeeklyBudgetChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: 72,
                textAlign: "right",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 8px",
                color: "var(--text-primary)",
                fontSize: "var(--text-sm)",
              }}
            />
          </div>
          <div className="readiness-row">
            <strong>Status</strong>
            <span>{savedAssessment ? "Saved and reviewable" : "Unsaved inference"}</span>
          </div>
          <div className="readiness-row">
            <strong>Latest run</strong>
            <span>{latestEngineRunAt ? formatTimestamp(latestEngineRunAt) : "not run yet"}</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
