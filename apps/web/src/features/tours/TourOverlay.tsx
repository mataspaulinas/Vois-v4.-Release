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
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 10000,
        width: 380,
        maxWidth: "90vw",
        background: "#FFFFFF",
        border: "2px solid #6C5CE7",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(108,92,231,0.18), 0 1px 3px rgba(0,0,0,0.04)",
        padding: 20,
      }}
      role="dialog"
      aria-label="Tour step"
    >
      {/* Header with step counter and close */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          color: "#999",
        }}>
          Step {stepIndex + 1} of {totalSteps}
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#999",
            fontSize: 14,
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: 6,
            transition: "color 180ms ease",
            minWidth: 32,
            minHeight: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Dismiss tour"
        >
          Close
        </button>
      </div>

      {/* Step indicator dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i === stepIndex ? "#6C5CE7" : "#E0E0E0",
              transition: "background 180ms ease",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <h3 style={{
        margin: "0 0 8px 0",
        fontSize: 15,
        fontWeight: 600,
        color: "#1a1a1a",
      }}>
        {step.title}
      </h3>
      <p style={{
        margin: "0 0 16px 0",
        fontSize: 13,
        color: "#777",
        lineHeight: 1.5,
      }}>
        {step.body}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={onDismiss}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            color: "#777",
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 180ms ease",
            minHeight: 36,
          }}
        >
          Skip tour
        </button>
        <button
          onClick={onNext}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#6C5CE7",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            transition: "background 180ms ease",
            minHeight: 36,
          }}
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
