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
  onOpenSignalsReview: () => void;
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
  onOpenSignalsReview,
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

  // -- shared inline style helpers --
  const cardBase: React.CSSProperties = {
    background: "#FFFFFF", borderRadius: 12, padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };
  const eyebrowStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: "0 0 4px",
  };
  const descStyle: React.CSSProperties = {
    fontSize: 13, color: "#737373", margin: "0 0 16px", lineHeight: 1.5,
  };
  const btnPrimary: React.CSSProperties = {
    background: "#6C5CE7", color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
  const btnSecondary: React.CSSProperties = {
    background: "#fff", color: "#6C5CE7", border: "1.5px solid #6C5CE7",
    borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
  const btnSmSecondary: React.CSSProperties = {
    ...btnSecondary, padding: "4px 12px", fontSize: 11,
  };
  const rowStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 0", borderBottom: "1px solid #F3F4F6",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px", maxWidth: 960, margin: "0 auto" }}>
      {/* ---- Page header ---- */}
      <div>
        <div style={eyebrowStyle}>VENUE</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>
          Assessment
        </h1>
        <p style={{ fontSize: 15, color: "#737373", margin: "4px 0 0" }}>
          The operating loop: observe, infer, review, save, run.
        </p>
      </div>

      {/* ---- Assessment operating loop card ---- */}
      <div style={cardBase}>
        <div style={eyebrowStyle}>Flow</div>
        <div style={sectionTitle}>Assessment operating loop</div>
        <p style={descStyle}>
          The old app felt good because the path was obvious. This view is now organized around the actual loop.
        </p>

        {/* Loaded snapshot banner */}
        {loadedFromHistory && savedAssessment ? (
          <div style={{
            ...cardBase, borderLeft: "4px solid #6C5CE7", marginBottom: 16,
            background: "#F5F3FF", padding: "16px 20px",
          }}>
            <div style={{ ...eyebrowStyle, color: "#6C5CE7" }}>Loaded snapshot</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>
              {formatTimestamp(savedAssessment.created_at)}
            </div>
            <p style={{ fontSize: 13, color: "#525252", margin: 0 }}>
              This assessment was reloaded from the timeline so you can continue from a real saved operating record.
            </p>
          </div>
        ) : null}

        {/* Staged draft plan banner */}
        {reviewPlan?.status === "draft" ? (
          <div style={{
            ...cardBase, borderLeft: "4px solid #F59E0B", marginBottom: 16,
            background: "#FFFBEB", padding: "16px 20px",
          }}>
            <div style={{ ...eyebrowStyle, color: "#F59E0B" }}>Staged Draft</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>
              {reviewPlan.title}
            </div>
            <p style={{ fontSize: 13, color: "#525252", margin: "0 0 12px" }}>
              The engine has generated a preliminary intervention plan. Review the report and approve the draft to begin execution.
              {activePlan?.status === "active" ? " The current active plan remains live until you approve this draft." : ""}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnPrimary} onClick={() => onApprovePlan(reviewPlan.id)} disabled={busy}>
                Activate Operational Plan
              </button>
              <button style={btnSecondary} onClick={onOpenReport}>
                Review Draft Details
              </button>
            </div>
          </div>
        ) : null}

        {/* Journey strip */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stages.map((stage) => (
            <div
              key={stage.label}
              style={{
                flex: "1 1 140px", display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 14px", borderRadius: 10,
                background: stage.done ? "#F0FDF4" : "#F9FAFB",
                border: stage.done ? "1px solid #BBF7D0" : "1px solid #E5E7EB",
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff",
                background: stage.done ? "#10B981" : "#D1D5DB",
              }}>
                {stage.done ? "\u2713" : stage.label.slice(0, 1)}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{stage.label}</div>
                <div style={{ fontSize: 11, color: "#737373", lineHeight: 1.4 }}>{stage.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Two-column: Evidence + Signal intake ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Observed evidence -- wider canvas */}
        <div style={cardBase}>
          <div style={eyebrowStyle}>Assessment</div>
          <div style={sectionTitle}>Observed evidence</div>
          <p style={descStyle}>
            Paste what actually happened. OIS stages the evidence through AI intake first, then saves a reviewable assessment.
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={btnPrimary} onClick={onAnalyze} disabled={busy}>
              {analyzingIntake ? "Running AI intake..." : "Run AI intake"}
            </button>
            <button
              style={btnSecondary}
              onClick={onSaveAssessment}
              disabled={savingAssessment || analyzingIntake || runningEngine || inferredSignalCount === 0}
            >
              {savingAssessment ? "Saving..." : "Save assessment"}
            </button>
            <button
              style={btnSecondary}
              onClick={onRunEngine}
              disabled={runningEngine || analyzingIntake || savingAssessment || inferredSignalCount === 0}
            >
              {runningEngine ? "Running..." : "Run engine"}
            </button>
          </div>

          {/* Textarea -- focused layout */}
          <textarea
            value={intakeText}
            onChange={(event) => onIntakeChange(event.target.value)}
            placeholder="Paste reviews, audit notes, consultant observations, complaints, or field reports..."
            style={{
              width: "100%", minHeight: 220, resize: "vertical",
              fontFamily: "inherit", fontSize: 15, lineHeight: 1.6,
              padding: 16, borderRadius: 10,
              border: "1.5px solid #E5E7EB", background: "#FAFAFA",
              color: "#0A0A0A", outline: "none", boxSizing: "border-box",
            }}
          />
          <IntakeQualityBar text={intakeText} />

          {/* Sample notes */}
          {sampleIntakeNotes.length ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {sampleIntakeNotes.map((sample) => (
                <button
                  key={sample.id}
                  style={btnSmSecondary}
                  onClick={() => onLoadSample(sample.text)}
                  disabled={busy}
                >
                  Load {sample.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Inferred signal set */}
        <div style={cardBase}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={eyebrowStyle}>Signal Intake</div>
              <div style={sectionTitle}>Inferred signal set</div>
              <p style={{ ...descStyle, marginBottom: 0 }}>
                Review each AI-detected signal. Confirm or reject before saving.
              </p>
            </div>
            {intakePreview ? (
              <button style={btnSmSecondary} onClick={onOpenSignalsReview}>
                Open full review
              </button>
            ) : null}
          </div>

          {intakePreview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Intake posture */}
              <div style={{
                padding: "10px 14px", background: "#F5F3FF", borderRadius: 10,
                borderLeft: "3px solid #6C5CE7",
              }}>
                <div style={{ ...eyebrowStyle, color: "#6C5CE7", marginBottom: 6 }}>Intake posture</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    intakePreview.provider ?? "deterministic",
                    intakePreview.model ?? intakePreview.ontology_version,
                    intakePreview.venue_context?.venue_type,
                    intakePreview.venue_context?.team_size_note,
                  ].filter(Boolean).map((tag, i) => (
                    <span key={i} style={{
                      fontSize: 11, padding: "2px 10px", borderRadius: 24,
                      background: "#EDE9FE", color: "#6C5CE7", fontWeight: 500,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signal cards */}
              {intakePreview.detected_signals.map((signal) => {
                const rejected = rejectedSignalIds.has(signal.signal_id);
                return (
                  <div
                    key={signal.signal_id}
                    style={{
                      padding: "12px 14px", borderRadius: 10,
                      background: rejected ? "#FAFAFA" : "#FFFFFF",
                      border: rejected ? "1px solid #E5E7EB" : "1px solid #D1D5DB",
                      borderLeft: rejected ? "4px solid #D1D5DB" : "4px solid #10B981",
                      opacity: rejected ? 0.6 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rejected ? 0 : 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>{signal.signal_name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {!rejected && (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 24, fontWeight: 600,
                            background:
                              signal.confidence === "high" ? "#D1FAE5" :
                              signal.confidence === "medium" ? "#FEF3C7" : "#FEE2E2",
                            color:
                              signal.confidence === "high" ? "#065F46" :
                              signal.confidence === "medium" ? "#92400E" : "#991B1B",
                          }}>
                            {signal.confidence}
                          </span>
                        )}
                        <button
                          onClick={() => onToggleSignalRejection(signal.signal_id)}
                          title={rejected ? "Restore signal" : "Reject signal"}
                          style={{
                            fontSize: 11, padding: "2px 10px", borderRadius: 6, cursor: "pointer",
                            background: rejected ? "#F0FDF4" : "#FEF2F2",
                            color: rejected ? "#065F46" : "#991B1B",
                            border: rejected ? "1px solid #BBF7D0" : "1px solid #FECACA",
                            fontWeight: 500,
                          }}
                        >
                          {rejected ? "Restore" : "Reject"}
                        </button>
                      </div>
                    </div>
                    {!rejected && (
                      <>
                        <p style={{ fontSize: 13, color: "#525252", margin: "0 0 6px", fontStyle: "italic" }}>
                          &quot;{signal.evidence_snippet}&quot;
                        </p>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {signal.match_reasons.map((reason) => (
                            <span key={reason} style={{
                              fontSize: 11, padding: "1px 8px", borderRadius: 24,
                              background: "#F3F4F6", color: "#525252",
                            }}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Unmapped observations */}
              {intakePreview.unmapped_observations.length ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 6 }}>Unmapped observations</div>
                  <ul style={{ listStyle: "disc", paddingLeft: 20, margin: 0 }}>
                    {intakePreview.unmapped_observations.map((item) => (
                      <li key={item} style={{ fontSize: 13, color: "#525252", marginBottom: 3 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Quantitative evidence */}
              {intakePreview.quantitative_evidence?.length ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 6 }}>Quantitative evidence</div>
                  <ul style={{ listStyle: "disc", paddingLeft: 20, margin: 0 }}>
                    {intakePreview.quantitative_evidence.map((item) => (
                      <li key={`${item.label}-${item.value}-${item.evidence_snippet}`} style={{ fontSize: 13, color: "#525252", marginBottom: 3 }}>
                        {item.value}: {item.evidence_snippet}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#A3A3A3", fontSize: 13 }}>
              No inferred signals yet. Run AI intake to stage the diagnostic set.
            </div>
          )}
        </div>
      </div>

      {/* ---- Signal browse ---- */}
      {ontologyBundle && (
        <div style={cardBase}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={eyebrowStyle}>Signal Browse</div>
              <div style={sectionTitle}>Add signals manually</div>
              <p style={{ ...descStyle, marginBottom: 0 }}>
                Browse all {ontologyBundle.signals.length} signals grouped by domain. Toggle to include in the assessment alongside AI-detected signals.
              </p>
            </div>
            <button style={btnSecondary} onClick={() => setSignalBrowseOpen((v) => !v)}>
              {signalBrowseOpen ? "Collapse browse" : "Expand browse"}
            </button>
          </div>

          {manuallyAddedSignalIds.size > 0 && (
            <div style={{ ...rowStyle, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Manually added</span>
              <span style={{
                fontSize: 11, padding: "2px 10px", borderRadius: 24,
                background: "#EDE9FE", color: "#6C5CE7", fontWeight: 600,
              }}>
                {manuallyAddedSignalIds.size} signal{manuallyAddedSignalIds.size !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {signalBrowseOpen && (
            <>
              <input
                type="text"
                placeholder="Search signals by name or description..."
                value={signalSearch}
                onChange={(e) => setSignalSearch(e.target.value)}
                style={{
                  width: "100%", padding: "8px 14px", fontSize: 13,
                  border: "1.5px solid #E5E7EB", borderRadius: 8,
                  background: "#FAFAFA", color: "#0A0A0A",
                  outline: "none", marginBottom: 16, boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[...signalsByDomain.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([domain, signals]) => (
                  <div key={domain}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", textTransform: "capitalize" }}>
                        {domain.replace(/_/g, " ")}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "1px 8px", borderRadius: 24,
                        background: "#F3F4F6", color: "#737373", fontWeight: 500,
                      }}>
                        {signals.length}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {signals.map((signal: any) => {
                        const isDetected = detectedSignalIds.has(signal.id);
                        const isAdded = manuallyAddedSignalIds.has(signal.id);
                        const isRejected = rejectedSignalIds.has(signal.id);
                        const isActive = isAdded || (isDetected && !isRejected);
                        return (
                          <div
                            key={signal.id}
                            onClick={() => {
                              if (isDetected) {
                                onToggleSignalRejection(signal.id);
                              } else {
                                onToggleManualSignal(signal.id);
                              }
                            }}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                              background: isActive ? "#F5F3FF" : "#F9FAFB",
                              border: isActive ? "1px solid #C4B5FD" : "1px solid #E5E7EB",
                              transition: "all 0.1s ease",
                            }}
                          >
                            <span style={{ fontSize: 13, color: isActive ? "#0A0A0A" : "#737373" }}>
                              {signal.name}
                            </span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {isDetected && (
                                <span style={{
                                  fontSize: 11, padding: "1px 6px", borderRadius: 24,
                                  background: "#EDE9FE", color: "#6C5CE7", fontWeight: 600,
                                }}>
                                  AI
                                </span>
                              )}
                              {isRejected && (
                                <span style={{
                                  fontSize: 11, padding: "1px 6px", borderRadius: 24,
                                  background: "#F3F4F6", color: "#A3A3A3",
                                }}>
                                  rejected
                                </span>
                              )}
                              <span style={{
                                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                background: isActive ? "#6C5CE7" : "#E5E7EB",
                                border: "2px solid #6C5CE7",
                                display: "inline-block",
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {signalsByDomain.size === 0 && (
                  <p style={{ color: "#A3A3A3", fontSize: 13 }}>No signals match your search.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- Review gate ---- */}
      <div style={cardBase}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={eyebrowStyle}>Assessment State</div>
            <div style={sectionTitle}>Review gate</div>
            <p style={{ ...descStyle, marginBottom: 0 }}>
              Set effort parameters, review the signal count, then save the assessment before the engine fires.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={btnSecondary} onClick={onOpenHistory}>Open history</button>
            <button
              style={{ ...btnPrimary, opacity: latestEngineRunAt ? 1 : 0.5 }}
              onClick={onOpenReport}
              disabled={!latestEngineRunAt}
            >
              Open report
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Confirmed signals */}
          <div style={rowStyle}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Confirmed signals</span>
            <span style={{
              fontSize: 13, fontWeight: 600, padding: "2px 10px", borderRadius: 24,
              background: inferredSignalCount > 0 ? "#D1FAE5" : "#F3F4F6",
              color: inferredSignalCount > 0 ? "#065F46" : "#A3A3A3",
            }}>
              {inferredSignalCount}
            </span>
          </div>

          {/* Rejected signals */}
          {rejectedSignalIds.size > 0 && (
            <div style={rowStyle}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Rejected signals</span>
              <span style={{ fontSize: 13, color: "#A3A3A3" }}>{rejectedSignalIds.size} excluded</span>
            </div>
          )}

          {/* Manually added */}
          {manuallyAddedSignalIds.size > 0 && (
            <div style={rowStyle}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Manually added</span>
              <span style={{ fontSize: 13, color: "#0A0A0A" }}>{manuallyAddedSignalIds.size}</span>
            </div>
          )}

          {/* Ontology version */}
          <div style={rowStyle}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Ontology version</span>
            <span style={{ fontSize: 13, color: "#0A0A0A" }}>{intakePreview?.ontology_version ?? "pending"}</span>
          </div>

          {/* Management hours */}
          <div style={rowStyle}>
            <label htmlFor="mgmt-hours" style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>
              Management hours / week
            </label>
            <input
              id="mgmt-hours"
              type="number"
              min={1}
              max={80}
              value={managementHours}
              onChange={(e) => onManagementHoursChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: 72, textAlign: "right",
                background: "#FAFAFA", border: "1.5px solid #E5E7EB",
                borderRadius: 8, padding: "4px 8px",
                color: "#0A0A0A", fontSize: 13, outline: "none",
              }}
            />
          </div>

          {/* Weekly budget */}
          <div style={rowStyle}>
            <label htmlFor="weekly-budget" style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>
              Weekly effort budget (hours)
            </label>
            <input
              id="weekly-budget"
              type="number"
              min={1}
              max={168}
              value={weeklyBudget}
              onChange={(e) => onWeeklyBudgetChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: 72, textAlign: "right",
                background: "#FAFAFA", border: "1.5px solid #E5E7EB",
                borderRadius: 8, padding: "4px 8px",
                color: "#0A0A0A", fontSize: 13, outline: "none",
              }}
            />
          </div>

          {/* Status */}
          <div style={rowStyle}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Status</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: savedAssessment ? "#10B981" : "#F59E0B",
                display: "inline-block",
              }} />
              {savedAssessment ? "Saved and reviewable" : "Unsaved inference"}
            </span>
          </div>

          {/* Latest run */}
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>Latest run</span>
            <span style={{ fontSize: 13, color: "#0A0A0A" }}>
              {latestEngineRunAt ? formatTimestamp(latestEngineRunAt) : "not run yet"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntakeQualityBar({ text }: { text: string }) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const quality =
    wordCount === 0
      ? { level: "empty", label: "No input yet", hint: "Paste operational evidence to begin." }
      : wordCount < 30
        ? { level: "thin", label: "Thin input", hint: "Add more detail. Short inputs produce weak signal detection." }
        : wordCount < 80
          ? { level: "minimal", label: "Minimal", hint: "Acceptable, but richer observations improve diagnostic quality." }
          : wordCount < 200
            ? { level: "good", label: "Good depth", hint: "Enough detail for meaningful signal extraction." }
            : { level: "rich", label: "Rich input", hint: "Comprehensive evidence. Signal detection will be thorough." };

  const barWidth = Math.min(100, Math.round((wordCount / 200) * 100));
  const barColor =
    quality.level === "empty" ? "#D1D5DB"
      : quality.level === "thin" ? "#EF4444"
        : quality.level === "minimal" ? "#F59E0B"
          : "#10B981";

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A3A3A3", marginBottom: 4 }}>
        <span>{quality.label} ({wordCount} words)</span>
        <span>{quality.hint}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "#F3F4F6", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${barWidth}%`, background: barColor, borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}
