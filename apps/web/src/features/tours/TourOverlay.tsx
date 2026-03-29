import { TourStepDef } from "./useTour";

type TourOverlayProps = {
  step: TourStepDef | null;
  stepIndex: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onDismiss: () => void;
};

export function TourOverlay({ step, stepIndex, totalSteps, isLast, onNext, onDismiss }: TourOverlayProps) {
  if (!step) return null;

  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 10000,
        width: 360, maxWidth: "90vw",
        background: "var(--bg, #fff)", border: "1px solid var(--border, #e0e0e0)",
        borderRadius: "var(--radius-lg, 12px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        padding: "var(--space-4, 16px)",
      }}
      role="dialog"
      aria-label="Tour step"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2, 8px)" }}>
        <span style={{ fontSize: "var(--text-xs, 11px)", opacity: 0.5 }}>
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: 16 }}
          aria-label="Dismiss tour"
        >
          x
        </button>
      </div>
      <h3 style={{ margin: "0 0 var(--space-2, 8px) 0", fontSize: "var(--text-body, 15px)" }}>{step.title}</h3>
      <p style={{ margin: "0 0 var(--space-3, 12px) 0", fontSize: "var(--text-sm, 13px)", opacity: 0.8, lineHeight: 1.5 }}>
        {step.body}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2, 8px)" }}>
        <button className="btn btn-secondary" onClick={onDismiss} style={{ fontSize: "var(--text-sm, 13px)" }}>
          Skip tour
        </button>
        <button className="btn btn-primary" onClick={onNext} style={{ fontSize: "var(--text-sm, 13px)" }}>
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
