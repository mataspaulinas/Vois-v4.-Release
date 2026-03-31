import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { ShiftDiaryEntry } from "../../lib/api";

type MyLogProps = {
  entries: ShiftDiaryEntry[];
  loading: boolean;
  formatTimestamp: (iso: string) => string;
  onCreateEntry: (summary: string, detail: string | undefined) => Promise<void>;
  submitting: boolean;
};

const sectionPadding: React.CSSProperties = { padding: 20 };

const sectionHeading: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "var(--color-text-primary)",
  marginBottom: 4,
};

const sectionDesc: React.CSSProperties = {
  fontSize: 14,
  color: "var(--color-text-muted)",
  marginBottom: 20,
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid var(--color-border-subtle)",
  padding: "0 16px",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--color-border-subtle)",
  padding: 16,
  fontSize: 16,
  outline: "none",
  resize: "vertical",
  minHeight: 72,
  lineHeight: 1.5,
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 8,
  border: "none",
  background: "var(--color-accent)",
  color: "var(--color-surface)",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

const entryCardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const entryHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const entryTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "var(--color-text-primary)",
  lineHeight: 1.3,
};

const timestampStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--color-text-muted)",
  whiteSpace: "nowrap",
  flexShrink: 0,
  paddingTop: 2,
};

const entryDetailStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: 16,
  marginTop: 8,
  lineHeight: 1.4,
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
      <div style={sectionPadding}>
        <div style={sectionHeading}>My log</div>
        <div style={sectionDesc}>
          Keep track of what you did during your shift.
        </div>

        {/* Add entry form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            style={inputStyle}
            placeholder="What did you do?"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <textarea
            style={textareaStyle}
            placeholder="Notes (optional)"
            rows={2}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <button
            style={{
              ...primaryBtnStyle,
              opacity: !summary.trim() || submitting ? 0.5 : 1,
              cursor: !summary.trim() || submitting ? "not-allowed" : "pointer",
            }}
            onClick={handleAdd}
            disabled={!summary.trim() || submitting}
          >
            {submitting ? "Adding..." : "Add to log"}
          </button>
        </div>

        {/* Entries */}
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: 16 }}>
            Loading diary...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: 16 }}>
            No entries yet. Start logging what you do during your shift.
          </div>
        ) : (
          <div>
            {entries.map((entry) => (
              <div key={entry.id} style={entryCardStyle}>
                <div style={entryHeaderStyle}>
                  <span style={entryTitleStyle}>{entry.summary}</span>
                  <span style={timestampStyle}>
                    {formatTimestamp(entry.created_at)}
                  </span>
                </div>
                {entry.detail ? (
                  <p style={entryDetailStyle}>
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
