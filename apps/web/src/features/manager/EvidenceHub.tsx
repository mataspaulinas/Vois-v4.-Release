import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ContextInspector } from "../../components/ContextInspector";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { EvidenceRecord, PlanRecord } from "../../lib/api";

type EvidenceHubProps = {
  evidence: EvidenceRecord[];
  plan: PlanRecord | null;
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onCreateEvidence: (taskId: string | undefined) => void;
  onOpenWorkspace?: (taskId: string) => void;
};

const TYPE_LABELS: Record<string, string> = {
  photo: "Photo", observation: "Observation", document: "Document", checklist: "Checklist", metric: "Metric",
};

const TRUST_SCORES: Record<string, number> = {
  metric: 90, photo: 80, checklist: 70, document: 60, observation: 40,
};

function trustColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 50) return "var(--color-warning)";
  return "var(--color-text-muted)";
}

function trustLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 50) return "Adequate";
  return "Weak";
}

export function EvidenceHub({ evidence, plan, loading, formatTimestamp, onCreateEvidence, onOpenWorkspace }: EvidenceHubProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTaskId, setFilterTaskId] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const types = [...new Set(evidence.map((e) => e.evidence_type))];
  const tasks = plan?.tasks ?? [];
  const taskLookup = new Map(tasks.map((t) => [t.id, t.title]));

  const filtered = evidence.filter((ev) => {
    if (filterType !== "all" && ev.evidence_type !== filterType) return false;
    if (filterTaskId !== "all" && ev.task_id !== filterTaskId) return false;
    return true;
  });

  const selected = evidence.find((e) => e.id === selectedId) ?? null;
  const selectedTrustScore = selected ? (TRUST_SCORES[selected.evidence_type] ?? 50) + (selected.task_id ? 10 : 0) + (selected.description ? 5 : 0) : 0;

  return (
    <div className="page-layout">
      <SurfaceHeader
        title="Evidence"
        subtitle={`${evidence.length} item${evidence.length !== 1 ? "s" : ""} documented`}
        primaryAction={{ label: "Add evidence", onClick: () => onCreateEvidence(undefined) }}
      />
      <div className="page-layout__body">
        <PrimaryCanvas>
          {loading ? (
            <LoadingState variant="list" />
          ) : (
            <>
              {/* Filters */}
              <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="select-input">
                  <option value="all">All types</option>
                  {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                </select>
                <select value={filterTaskId} onChange={(e) => setFilterTaskId(e.target.value)} className="select-input">
                  <option value="all">All tasks</option>
                  {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  title="No evidence yet"
                  description="Attach photos, observations, or documents to tasks to build a trust trail."
                  actionLabel="Add evidence"
                  onAction={() => onCreateEvidence(undefined)}
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--spacing-md)" }}>
                  {filtered.map((ev) => {
                    const score = (TRUST_SCORES[ev.evidence_type] ?? 50) + (ev.task_id ? 10 : 0) + (ev.description ? 5 : 0);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedId(ev.id)}
                        style={{
                          padding: "var(--spacing-md)",
                          borderRadius: "var(--radius-md)",
                          background: selectedId === ev.id ? "var(--color-bg-muted)" : "var(--color-surface)",
                          border: "1px solid var(--color-border-subtle)",
                          cursor: "pointer",
                          transition: "background var(--motion-fast)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                          <span className="status-pill" style={{ background: trustColor(score), color: "white", fontSize: 10 }}>
                            {trustLabel(score)}
                          </span>
                          <span className="status-pill" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontSize: 10 }}>
                            {TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
                          </span>
                          <span style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginLeft: "auto" }}>
                            {formatTimestamp(ev.created_at)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{ev.title}</div>
                        {ev.description && <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>{ev.description}</div>}
                        {ev.task_id && (
                          <div style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)", marginTop: "var(--spacing-xs)" }}>
                            Task: {taskLookup.get(ev.task_id) ?? ev.task_id}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </PrimaryCanvas>

        {/* Inspector: selected evidence detail */}
        <ContextInspector open={selected !== null} title="Evidence detail" onClose={() => setSelectedId(null)}>
          {selected && (
            <div style={{ fontSize: "var(--text-small)" }}>
              <h4 style={{ margin: "0 0 var(--spacing-sm) 0" }}>{selected.title}</h4>
              {selected.description && <p style={{ color: "var(--color-text-secondary)", margin: "0 0 var(--spacing-md) 0" }}>{selected.description}</p>}

              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Type</span>
                  <span>{TYPE_LABELS[selected.evidence_type] ?? selected.evidence_type}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Trust score</span>
                  <span style={{ color: trustColor(selectedTrustScore), fontWeight: 600 }}>{selectedTrustScore}/100 ({trustLabel(selectedTrustScore)})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-4)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Linked to task</span>
                  <span>{selected.task_id ? "Yes" : "No"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Created</span>
                  <span>{formatTimestamp(selected.created_at)}</span>
                </div>
              </div>

              {selected.task_id && (
                <div style={{ marginBottom: "var(--spacing-md)" }}>
                  <h4 style={{ fontSize: "var(--text-small)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>Supports</h4>
                  <div>{taskLookup.get(selected.task_id) ?? selected.task_id}</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
                {selected.task_id && onOpenWorkspace && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onOpenWorkspace(selected.task_id!)}>Jump to task workspace</button>
                )}
              </div>
            </div>
          )}
        </ContextInspector>
      </div>
    </div>
  );
}
