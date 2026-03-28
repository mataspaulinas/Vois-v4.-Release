import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { ShiftDiaryEntry } from "../../lib/api";

type MyLogProps = {
  entries: ShiftDiaryEntry[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onCreateEntry: (summary: string, detail: string | undefined) => Promise<void>;
  submitting: boolean;
};

export function MyLog({ entries, loading, formatTimestamp, onCreateEntry, submitting }: MyLogProps) {
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");

  async function handleAdd() {
    if (!summary.trim()) return;
    await onCreateEntry(summary.trim(), detail.trim() || undefined);
    setSummary("");
    setDetail("");
  }

  return (
    <div className="pocket-view">
      <SectionCard
        eyebrow="Diary"
        title="My log"
        description="Keep track of what you did during your shift."
      >
        {/* Add entry form */}
        <div className="pocket-form" style={{ marginBottom: "var(--spacing-lg)" }}>
          <div className="pocket-field">
            <input
              type="text"
              className="form-control"
              placeholder="What did you do?"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ fontSize: "1rem" }}
            />
          </div>
          <div className="pocket-field">
            <textarea
              className="form-control"
              placeholder="Notes (optional)"
              rows={2}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              style={{ fontSize: "1rem", resize: "vertical" }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!summary.trim() || submitting}
            style={{ width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", fontSize: "1rem", minHeight: 44 }}
          >
            {submitting ? "Adding..." : "Add to log"}
          </button>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="empty-state"><p>Loading diary...</p></div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p>No entries yet. Start logging what you do during your shift.</p>
          </div>
        ) : (
          <div className="pocket-task-list">
            {entries.map((entry) => (
              <div key={entry.id} className="pocket-task-card">
                <div className="pocket-task-header">
                  <span className="pocket-task-title">{entry.summary}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {formatTimestamp(entry.created_at)}
                  </span>
                </div>
                {entry.detail ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "var(--spacing-xs)", lineHeight: 1.4 }}>
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
