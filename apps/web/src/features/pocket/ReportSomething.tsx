import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";

type ReportSomethingProps = {
  venueId: string;
  onSubmitReport: (summary: string, detail: string | undefined, anonymous: boolean) => Promise<void>;
  submitting: boolean;
};

const sectionPadding: React.CSSProperties = { padding: 20 };

const sectionHeading: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#1a1a2e",
  marginBottom: 4,
};

const sectionDesc: React.CSSProperties = {
  fontSize: 14,
  color: "#666",
  marginBottom: 20,
  lineHeight: 1.4,
};

const labelStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#1a1a2e",
  marginBottom: 8,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1px solid #e0e0e0",
  padding: "0 16px",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e0e0e0",
  padding: 16,
  fontSize: 16,
  outline: "none",
  resize: "vertical",
  minHeight: 120,
  lineHeight: 1.5,
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 8,
  border: "none",
  background: "#6C5CE7",
  color: "#fff",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

const successCardStyle: React.CSSProperties = {
  background: "#ECFDF5",
  borderRadius: 16,
  padding: 20,
  textAlign: "center",
  border: "1px solid #10B981",
};

export function ReportSomething({ venueId, onSubmitReport, submitting }: ReportSomethingProps) {
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!summary.trim()) return;
    await onSubmitReport(summary.trim(), detail.trim() || undefined, anonymous);
    setSummary("");
    setDetail("");
    setAnonymous(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="pocket-view">
      <div style={sectionPadding}>
        <div style={sectionHeading}>Report something</div>
        <div style={sectionDesc}>
          Flag an issue, friction, or something that's not right. You can stay anonymous.
        </div>

        {submitted ? (
          <div style={successCardStyle}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#10B981" }}>
              Report submitted. Thank you for speaking up.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle} htmlFor="report-summary">What happened?</label>
              <input
                id="report-summary"
                type="text"
                style={inputStyle}
                placeholder="Brief summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="report-detail">More detail (optional)</label>
              <textarea
                id="report-detail"
                style={textareaStyle}
                placeholder="Describe what happened, when, and any context that would help..."
                rows={4}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 48,
              cursor: "pointer",
            }}
              onClick={() => setAnonymous(!anonymous)}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: anonymous ? "2px solid #6C5CE7" : "2px solid #ccc",
                background: anonymous ? "#6C5CE7" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}>
                {anonymous && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <input
                id="report-anonymous"
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                style={{ display: "none" }}
              />
              <label htmlFor="report-anonymous" style={{ fontSize: 16, color: "#555", cursor: "pointer" }}>
                Submit anonymously
              </label>
            </div>

            <button
              style={{
                ...primaryBtnStyle,
                opacity: !summary.trim() || submitting ? 0.5 : 1,
                cursor: !summary.trim() || submitting ? "not-allowed" : "pointer",
              }}
              onClick={handleSubmit}
              disabled={!summary.trim() || submitting}
            >
              {submitting ? "Submitting..." : "Submit report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
