import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";

type ReportSomethingProps = {
  venueId: string;
  onSubmitReport: (summary: string, detail: string | undefined, anonymous: boolean) => Promise<void>;
  submitting: boolean;
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
      <SectionCard
        eyebrow="Report"
        title="Report something"
        description="Flag an issue, friction, or something that's not right. You can stay anonymous."
      >
        {submitted ? (
          <div className="empty-state" style={{ color: "var(--leaf)" }}>
            <p>Report submitted. Thank you for speaking up.</p>
          </div>
        ) : (
          <div className="pocket-form">
            <div className="pocket-field">
              <label className="pocket-label" htmlFor="report-summary">What happened?</label>
              <input
                id="report-summary"
                type="text"
                className="form-control"
                placeholder="Brief summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                style={{ fontSize: "1rem" }}
              />
            </div>

            <div className="pocket-field">
              <label className="pocket-label" htmlFor="report-detail">More detail (optional)</label>
              <textarea
                id="report-detail"
                className="form-control"
                placeholder="Describe what happened, when, and any context that would help..."
                rows={4}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                style={{ fontSize: "1rem", resize: "vertical" }}
              />
            </div>

            <div className="pocket-field" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <input
                id="report-anonymous"
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              <label htmlFor="report-anonymous" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                Submit anonymously
              </label>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!summary.trim() || submitting}
              style={{ width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", fontSize: "1rem", minHeight: 44 }}
            >
              {submitting ? "Submitting..." : "Submit report"}
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
