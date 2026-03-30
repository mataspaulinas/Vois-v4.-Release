import { useState } from "react";

type ShiftReadinessCheckProps = {
  venueName: string;
  onComplete: (answers: { stationReady: boolean; carryOver: string | null; equipmentOk: boolean }) => void;
  onDismiss: () => void;
};

/* Pocket design tokens */
const ACCENT = "#6C5CE7";
const ACCENT_LIGHT = "#f0eeff";
const GREEN = "#27ae60";
const GREEN_LIGHT = "#eafaf1";
const RADIUS = 16;

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: RADIUS + 4,
  padding: 28,
  maxWidth: 420,
  width: "100%",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
};

const questionStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 18,
  color: "#222",
  marginBottom: 16,
  lineHeight: 1.4,
};

const btnRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
};

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 52,
        fontSize: 16,
        fontWeight: 600,
        borderRadius: 12,
        border: selected ? `2px solid ${ACCENT}` : "2px solid #e0e0e0",
        background: selected ? ACCENT : "#fff",
        color: selected ? "#fff" : "#333",
        cursor: "pointer",
        transition: "all 0.15s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
}

/* Step progress dots */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i <= current ? ACCENT : "#ddd",
            transition: "background 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

/* Completion checkmark */
function ReadyMark() {
  return (
    <div style={{
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: GREEN_LIGHT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ShiftReadinessCheck({ venueName, onComplete, onDismiss }: ShiftReadinessCheckProps) {
  const [step, setStep] = useState(0);
  const [stationReady, setStationReady] = useState<boolean | null>(null);
  const [carryOver, setCarryOver] = useState("");
  const [hasCarryOver, setHasCarryOver] = useState<boolean | null>(null);
  const [equipmentOk, setEquipmentOk] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);

  function handleFinish() {
    setFinished(true);
    setTimeout(() => {
      onComplete({
        stationReady: stationReady ?? true,
        carryOver: hasCarryOver ? carryOver.trim() || null : null,
        equipmentOk: equipmentOk ?? true,
      });
    }, 1200);
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <h3 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "#222",
          }}>
            Shift readiness
          </h3>
          <p style={{
            color: "#888",
            margin: "6px 0 0 0",
            fontSize: 15,
            lineHeight: 1.4,
          }}>
            Quick check before starting at {venueName}
          </p>
        </div>

        {/* Finished state */}
        {finished ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <ReadyMark />
            <p style={{ fontSize: 18, fontWeight: 600, color: GREEN, margin: 0 }}>
              You are all set
            </p>
            <p style={{ fontSize: 14, color: "#888", margin: "8px 0 0" }}>
              Have a great shift.
            </p>
          </div>
        ) : (
          <>
            <StepDots current={step} total={3} />

            {/* Step 0: Station ready */}
            {step === 0 && (
              <div>
                <p style={questionStyle}>Is your station set up and ready?</p>
                <div style={btnRowStyle}>
                  <ChoiceButton
                    label="Yes"
                    selected={stationReady === true}
                    onClick={() => { setStationReady(true); setStep(1); }}
                  />
                  <ChoiceButton
                    label="Not yet"
                    selected={stationReady === false}
                    onClick={() => { setStationReady(false); setStep(1); }}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Carry-over */}
            {step === 1 && (
              <div>
                <p style={questionStyle}>Any carry-over issues from the last shift?</p>
                <div style={{ ...btnRowStyle, marginBottom: 12 }}>
                  <ChoiceButton
                    label="No, all clear"
                    selected={hasCarryOver === false}
                    onClick={() => { setHasCarryOver(false); setStep(2); }}
                  />
                  <ChoiceButton
                    label="Yes"
                    selected={hasCarryOver === true}
                    onClick={() => setHasCarryOver(true)}
                  />
                </div>
                {hasCarryOver && (
                  <div>
                    <textarea
                      value={carryOver}
                      onChange={(e) => setCarryOver(e.target.value)}
                      placeholder="Brief note about what carried over..."
                      rows={3}
                      style={{
                        width: "100%",
                        fontSize: 16,
                        padding: 14,
                        borderRadius: 12,
                        border: "2px solid #e0e0e0",
                        resize: "vertical",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        marginBottom: 12,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => setStep(2)}
                      style={{
                        width: "100%",
                        minHeight: 48,
                        fontSize: 16,
                        fontWeight: 600,
                        borderRadius: 12,
                        border: "none",
                        background: ACCENT,
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Equipment */}
            {step === 2 && (
              <div>
                <p style={questionStyle}>Equipment working properly?</p>
                <div style={btnRowStyle}>
                  <ChoiceButton
                    label="All good"
                    selected={equipmentOk === true}
                    onClick={() => { setEquipmentOk(true); handleFinish(); }}
                  />
                  <ChoiceButton
                    label="Issue noted"
                    selected={equipmentOk === false}
                    onClick={() => { setEquipmentOk(false); handleFinish(); }}
                  />
                </div>
              </div>
            )}

            {/* Skip button */}
            <button
              onClick={onDismiss}
              style={{
                display: "block",
                width: "100%",
                marginTop: 24,
                padding: "14px 0",
                background: "none",
                border: "none",
                color: "#999",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500,
                minHeight: 48,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Skip readiness check
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const READINESS_KEY = "ois_shift_readiness_date";

export function shouldShowReadinessCheck(): boolean {
  const last = localStorage.getItem(READINESS_KEY);
  if (!last) return true;
  const today = new Date().toISOString().slice(0, 10);
  return last !== today;
}

export function markReadinessComplete(): void {
  localStorage.setItem(READINESS_KEY, new Date().toISOString().slice(0, 10));
}
