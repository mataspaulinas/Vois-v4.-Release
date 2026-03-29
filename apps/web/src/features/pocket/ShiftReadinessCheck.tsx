import { useState } from "react";

type ShiftReadinessCheckProps = {
  venueName: string;
  onComplete: (answers: { stationReady: boolean; carryOver: string | null; equipmentOk: boolean }) => void;
  onDismiss: () => void;
};

export function ShiftReadinessCheck({ venueName, onComplete, onDismiss }: ShiftReadinessCheckProps) {
  const [step, setStep] = useState(0);
  const [stationReady, setStationReady] = useState<boolean | null>(null);
  const [carryOver, setCarryOver] = useState("");
  const [hasCarryOver, setHasCarryOver] = useState<boolean | null>(null);
  const [equipmentOk, setEquipmentOk] = useState<boolean | null>(null);

  function handleFinish() {
    onComplete({
      stationReady: stationReady ?? true,
      carryOver: hasCarryOver ? carryOver.trim() || null : null,
      equipmentOk: equipmentOk ?? true,
    });
  }

  return (
    <div className="shift-readiness-overlay">
      <div className="shift-readiness-card">
        <h3 style={{ margin: "0 0 var(--spacing-xs) 0" }}>Shift readiness</h3>
        <p style={{ color: "var(--color-text-muted)", margin: "0 0 var(--spacing-lg) 0", fontSize: "var(--text-small)" }}>
          Quick check before starting at {venueName}
        </p>

        {step === 0 && (
          <div className="shift-readiness-step">
            <p style={{ fontWeight: 500, marginBottom: "var(--spacing-md)" }}>Is your station set up and ready?</p>
            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <button className={`btn ${stationReady === true ? "btn-primary" : "btn-secondary"}`} onClick={() => { setStationReady(true); setStep(1); }}>Yes</button>
              <button className={`btn ${stationReady === false ? "btn-primary" : "btn-secondary"}`} onClick={() => { setStationReady(false); setStep(1); }}>Not yet</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="shift-readiness-step">
            <p style={{ fontWeight: 500, marginBottom: "var(--spacing-md)" }}>Any carry-over issues from the last shift?</p>
            <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-sm)" }}>
              <button className={`btn ${hasCarryOver === false ? "btn-primary" : "btn-secondary"}`} onClick={() => { setHasCarryOver(false); setStep(2); }}>No, all clear</button>
              <button className={`btn ${hasCarryOver === true ? "btn-primary" : "btn-secondary"}`} onClick={() => setHasCarryOver(true)}>Yes</button>
            </div>
            {hasCarryOver && (
              <div>
                <textarea
                  value={carryOver}
                  onChange={(e) => setCarryOver(e.target.value)}
                  placeholder="Brief note about what carried over..."
                  rows={2}
                  className="input-text"
                  style={{ width: "100%", marginBottom: "var(--spacing-sm)" }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => setStep(2)}>Continue</button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="shift-readiness-step">
            <p style={{ fontWeight: 500, marginBottom: "var(--spacing-md)" }}>Equipment working properly?</p>
            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <button className={`btn ${equipmentOk === true ? "btn-primary" : "btn-secondary"}`} onClick={() => { setEquipmentOk(true); handleFinish(); }}>All good</button>
              <button className={`btn ${equipmentOk === false ? "btn-primary" : "btn-secondary"}`} onClick={() => { setEquipmentOk(false); handleFinish(); }}>Issue noted</button>
            </div>
          </div>
        )}

        <button
          className="shift-readiness-skip"
          onClick={onDismiss}
          style={{ marginTop: "var(--spacing-lg)", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "var(--text-small)" }}
        >
          Skip readiness check
        </button>
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
