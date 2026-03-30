import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { DeepDrawer } from "../../components/DeepDrawer";
import { TransitionSuggestion } from "../../components/TransitionSuggestion";
import {
  AssessmentHistoryItem,
  AssessmentRecord,
  AuditEntryRecord,
  IntakePreviewResponse,
  PersistedEngineRunRecord,
  PlanExecutionSummary,
  PlanRecord,
  ProgressEntryRecord,
  Venue,
} from "../../lib/api";

type VenueOverviewViewProps = {
  venue: Venue;
  ontologyLabel: string;
  intakePreview: IntakePreviewResponse | null;
  savedAssessment: AssessmentRecord | null;
  assessmentHistory: AssessmentHistoryItem[];
  selectedEngineRun: PersistedEngineRunRecord | null;
  latestPlan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
  progressEntries: ProgressEntryRecord[];
  auditEntries: AuditEntryRecord[];
  formatTimestamp: (isoTimestamp: string) => string;
  onOpenAssessment: () => void;
  onOpenSignals: () => void;
  onOpenReport: () => void;
  onOpenPlan: () => void;
};

export function VenueOverviewView({
  venue,
  ontologyLabel,
  intakePreview,
  savedAssessment,
  assessmentHistory,
  selectedEngineRun,
  latestPlan,
  executionSummary,
  progressEntries,
  auditEntries,
  formatTimestamp,
  onOpenAssessment,
  onOpenSignals,
  onOpenReport,
  onOpenPlan,
}: VenueOverviewViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const nextMove = describeVenueNextMove({
    savedAssessment,
    selectedEngineRun,
    latestPlan,
    executionSummary,
  });

  const statusTone =
    venue.status === "active" ? "success" : venue.status === "critical" ? "danger" : "neutral";
  const statusColor =
    statusTone === "success" ? "#10B981" : statusTone === "danger" ? "#EF4444" : "#A3A3A3";

  const completionPct = Math.round(executionSummary?.completion_percentage ?? 0);
  const completionColor =
    completionPct >= 75 ? "#10B981" : completionPct >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "48px" }}>
      {/* ---- Page header ---- */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
          VENUE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>
            {venue.name}
          </h1>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: statusColor, fontWeight: 500,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
            {venue.status}
          </span>
        </div>
        <p style={{ fontSize: 15, color: "#737373", margin: "4px 0 0" }}>
          {[venue.concept, venue.location, venue.size_note].filter(Boolean).join(" \u00b7 ")}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={onOpenAssessment}
            style={{
              background: "#6C5CE7", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Start assessment
          </button>
          {[
            { label: "Signals", onClick: onOpenSignals },
            { label: "Report", onClick: onOpenReport },
            { label: "Plan", onClick: onOpenPlan },
          ].map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{
                background: "#fff", color: "#6C5CE7", border: "1.5px solid #6C5CE7",
                borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Health indicators row ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { label: "Detected signals", value: String(intakePreview?.detected_signals.length ?? 0), color: "#6366F1" },
          { label: "Assessment", value: savedAssessment ? "Saved" : "None", color: savedAssessment ? "#10B981" : "#F59E0B" },
          { label: "Completion", value: `${completionPct}%`, color: completionColor },
          { label: "Ontology", value: intakePreview?.ontology_version ?? ontologyLabel, color: "#6366F1" },
          { label: "History depth", value: String(assessmentHistory.length), color: "#6366F1" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "#FFFFFF", borderRadius: 12, padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `4px solid ${item.color}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ---- Two-column: Direction + Diagnostic ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Next move card */}
        <div style={{
          background: "#FFFFFF", borderRadius: 12, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: "4px solid #6C5CE7",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3" }}>
            Recommended next move
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A" }}>
            Go to the next leverage point
          </div>
          <p style={{ fontSize: 15, color: "#525252", margin: 0, lineHeight: 1.5 }}>
            {nextMove}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={onOpenAssessment} style={{ background: "#fff", color: "#6C5CE7", border: "1.5px solid #6C5CE7", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Assessment</button>
            <button onClick={onOpenSignals} style={{ background: "#fff", color: "#6C5CE7", border: "1.5px solid #6C5CE7", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Signals</button>
            <button onClick={onOpenReport} style={{ background: "#fff", color: "#6C5CE7", border: "1.5px solid #6C5CE7", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Report</button>
            <button onClick={onOpenPlan} style={{ background: "#6C5CE7", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Plan</button>
          </div>
        </div>

        {/* Latest diagnostic card */}
        <div style={{
          background: "#FFFFFF", borderRadius: 12, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 12 }}>
            Latest diagnostic
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Last report", value: selectedEngineRun ? formatTimestamp(selectedEngineRun.created_at) : "not generated" },
              { label: "Load", value: selectedEngineRun?.load_classification ?? "unknown" },
              { label: "Plan tasks", value: String(selectedEngineRun?.plan_task_count ?? 0) },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#525252" }}>{row.label}</span>
                <span style={{ fontSize: 15, color: "#0A0A0A" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Execution pulse ---- */}
      <div style={{
        background: "#FFFFFF", borderRadius: 12, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
          Execution
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>
          Execution pulse
        </div>
        <p style={{ fontSize: 13, color: "#737373", margin: "0 0 16px" }}>
          Ready work, blocked work, and last movement should be visible in one glance.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Ready now */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>Ready now</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {(executionSummary?.next_executable_tasks ?? []).slice(0, 4).map((task) => (
                <li key={task.task_id} style={{
                  fontSize: 13, color: "#525252", padding: "6px 12px",
                  background: "#F9FAFB", borderRadius: 8, borderLeft: "3px solid #10B981",
                }}>
                  {task.title}
                </li>
              ))}
              {!executionSummary?.next_executable_tasks.length ? (
                <li style={{ fontSize: 13, color: "#A3A3A3", fontStyle: "italic" }}>No ready tasks.</li>
              ) : null}
            </ul>
          </div>
          {/* Blocked */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>Blocked</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {(executionSummary?.blocked_tasks ?? []).slice(0, 4).map((task) => (
                <li key={task.task_id} style={{
                  fontSize: 13, color: "#525252", padding: "6px 12px",
                  background: "#FEF2F2", borderRadius: 8, borderLeft: "3px solid #EF4444",
                }}>
                  {task.title}: {task.blocking_dependency_ids.join(", ")}
                </li>
              ))}
              {!executionSummary?.blocked_tasks.length ? (
                <li style={{ fontSize: 13, color: "#A3A3A3", fontStyle: "italic" }}>No blocked tasks.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      {/* ---- Recent movement ---- */}
      <div style={{
        background: "#FFFFFF", borderRadius: 12, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A3A3A3", marginBottom: 4 }}>
          Movement
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>
          Recent movement
        </div>
        <p style={{ fontSize: 13, color: "#737373", margin: "0 0 16px" }}>
          Progress and audit together show whether the venue is moving or just discussing movement.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Progress */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>Progress</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {progressEntries.slice(0, 4).map((entry) => (
                <div key={entry.id} style={{
                  padding: "10px 14px", background: "#F9FAFB", borderRadius: 10,
                  borderLeft: "3px solid #6C5CE7",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A3A3A3", marginBottom: 4 }}>
                    <span>{formatTimestamp(entry.created_at)}</span>
                    <em style={{ fontStyle: "normal", fontWeight: 500, color: "#6C5CE7" }}>{entry.status}</em>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#525252" }}>{entry.summary}</p>
                </div>
              ))}
              {!progressEntries.length ? (
                <div style={{ fontSize: 13, color: "#A3A3A3", fontStyle: "italic" }}>No progress logged yet.</div>
              ) : null}
            </div>
          </div>
          {/* Audit */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", marginBottom: 8 }}>Audit</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditEntries.slice(0, 4).map((entry) => (
                <div key={entry.id} style={{
                  padding: "10px 14px", background: "#F9FAFB", borderRadius: 10,
                  borderLeft: "3px solid #6366F1",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A3A3A3", marginBottom: 4 }}>
                    <span>{formatTimestamp(entry.created_at)}</span>
                    <em style={{ fontStyle: "normal", fontWeight: 500, color: "#6366F1" }}>
                      {entry.entity_type}.{entry.action}
                    </em>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#525252" }}>{entry.actor_name ?? "System"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transition suggestion based on venue state */}
      {!savedAssessment && (
        <TransitionSuggestion
          message="No assessment saved yet. Start by capturing operational observations."
          actionLabel="Start assessment"
          onAction={onOpenAssessment}
        />
      )}

      {/* Deep drawer for history */}
      <DeepDrawer open={drawerOpen} title="Venue history" onClose={() => setDrawerOpen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assessmentHistory.length > 0 ? (
            assessmentHistory.slice(0, 5).map((a) => (
              <div key={a.id} style={{
                padding: "10px 14px", borderLeft: "4px solid #6C5CE7",
                borderRadius: 10, background: "#F9FAFB",
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#0A0A0A" }}>
                  {a.selected_signal_count} signals detected
                </div>
                <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 2 }}>
                  {formatTimestamp(a.created_at)}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#A3A3A3", fontSize: 13, margin: 0 }}>No assessment history yet.</p>
          )}
        </div>
      </DeepDrawer>
    </div>
  );
}

function describeVenueNextMove({
  savedAssessment,
  selectedEngineRun,
  latestPlan,
  executionSummary,
}: {
  savedAssessment: AssessmentRecord | null;
  selectedEngineRun: PersistedEngineRunRecord | null;
  latestPlan: PlanRecord | null;
  executionSummary: PlanExecutionSummary | null;
}) {
  if (!savedAssessment) {
    return "Capture and save a fresh assessment first. The venue still needs a trustworthy picture of current reality.";
  }
  if (!selectedEngineRun) {
    return "The assessment exists, but the report is not current yet. Run the engine and generate the diagnostic readout.";
  }
  if (!latestPlan) {
    return "The report exists, but the execution surface is still incomplete. Move into the plan view and materialize the current tasks.";
  }
  if ((executionSummary?.next_executable_tasks.length ?? 0) > 0) {
    return "There is ready work available now. Open the plan and move the next executable task forward.";
  }
  if ((executionSummary?.blocked_tasks.length ?? 0) > 0) {
    return "Execution is bottlenecked. The best move is to clear the dependency block before adding new activity.";
  }
  return "The venue is stable enough to review progress quality, inspect the report again, or begin the next assessment cycle.";
}
