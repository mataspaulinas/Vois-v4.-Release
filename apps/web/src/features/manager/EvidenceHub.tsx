import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { EvidenceRecord, PlanRecord } from "../../lib/api";

type EvidenceHubProps = {
  evidence: EvidenceRecord[];
  plan: PlanRecord | null;
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onCreateEvidence: (taskId: string | undefined) => void;
};

const TYPE_LABELS: Record<string, string> = {
  photo: "Photo",
  observation: "Observation",
  document: "Document",
  checklist: "Checklist",
  metric: "Metric",
};

export function EvidenceHub({
  evidence,
  plan,
  loading,
  formatTimestamp,
  onCreateEvidence,
}: EvidenceHubProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTaskId, setFilterTaskId] = useState<string>("all");

  const types = [...new Set(evidence.map((e) => e.evidence_type))];
  const tasks = plan?.tasks ?? [];

  const filtered = evidence.filter((ev) => {
    if (filterType !== "all" && ev.evidence_type !== filterType) return false;
    if (filterTaskId !== "all" && ev.task_id !== filterTaskId) return false;
    return true;
  });

  const taskLookup = new Map(tasks.map((t) => [t.id, t.title]));

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Evidence"
        title="Evidence hub"
        description="All evidence linked to tasks. Upload, categorize, and review proof of completion."
        actions={
          <button className="btn btn-primary" onClick={() => onCreateEvidence(undefined)}>
            Add evidence
          </button>
        }
      >
        {loading ? (
          <div className="empty-state"><p>Loading evidence...</p></div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select-input"
              >
                <option value="all">All types</option>
                {types.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
              <select
                value={filterTaskId}
                onChange={(e) => setFilterTaskId(e.target.value)}
                className="select-input"
              >
                <option value="all">All tasks</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <p>No evidence recorded yet. Attach photos, observations, or documents to tasks.</p>
              </div>
            ) : (
              <div className="evidence-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--spacing-md)" }}>
                {filtered.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: "var(--spacing-md)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-xs)" }}>
                      <span className="status-pill" style={{ background: "var(--leaf)", color: "white", fontSize: "0.7rem" }}>
                        {TYPE_LABELS[ev.evidence_type] ?? ev.evidence_type}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                        {formatTimestamp(ev.created_at)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{ev.title}</div>
                    {ev.description ? (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{ev.description}</div>
                    ) : null}
                    {ev.task_id ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "var(--spacing-xs)" }}>
                        Task: {taskLookup.get(ev.task_id) ?? ev.task_id}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
