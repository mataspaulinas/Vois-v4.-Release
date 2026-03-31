type WelcomeOverlayProps = {
  open: boolean;
  resumeVenueName?: string | null;
  resumeReason?: string | null;
  portfolioNotes?: string[];
  onEnterResume?: (() => void) | null;
  onEnterPortfolio: () => void;
  onEnterKnowledgeBase: () => void;
};

export function WelcomeOverlay({
  open,
  resumeVenueName,
  resumeReason,
  portfolioNotes = [],
  onEnterResume,
  onEnterPortfolio,
  onEnterKnowledgeBase,
}: WelcomeOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 16px",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.04)",
        padding: "40px 32px 32px",
        textAlign: "center",
      }}>
        <p style={{
          margin: "0 0 8px",
          fontSize: "var(--text-eyebrow)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          color: "var(--color-accent)",
        }}>
          vOIS
        </p>
        <h1
          id="welcome-title"
          style={{
            margin: "0 0 12px",
            fontSize: "var(--text-page)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            lineHeight: 1.3,
          }}
        >
          Your operation&apos;s best days are{" "}
          <span style={{ color: "var(--color-accent)" }}>ahead.</span>
        </h1>
        <p style={{
          margin: "0 0 28px",
          fontSize: "var(--text-body)",
          color: "var(--color-text-muted)",
          lineHeight: 1.5,
          maxWidth: 400,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          OIS helps service operators see clearly, act in sequence, and build real calm into the business.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {resumeVenueName && onEnterResume ? (
            <button
              onClick={onEnterResume}
              style={{
                width: "100%",
                maxWidth: 320,
                padding: "12px 24px",
                fontSize: "var(--text-body)",
                fontWeight: 600,
                color: "var(--color-surface)",
                background: "var(--color-accent)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "background 180ms ease",
                minHeight: 44,
              }}
            >
              Resume {resumeVenueName}
            </button>
          ) : (
            <button
              onClick={onEnterPortfolio}
              style={{
                width: "100%",
                maxWidth: 320,
                padding: "12px 24px",
                fontSize: "var(--text-body)",
                fontWeight: 600,
                color: "var(--color-surface)",
                background: "var(--color-accent)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "background 180ms ease",
                minHeight: 44,
              }}
            >
              Venues
            </button>
          )}
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
            <button
              onClick={onEnterPortfolio}
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: "var(--text-small)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 180ms ease",
                minHeight: 44,
              }}
            >
              Portfolio
            </button>
            <button
              onClick={onEnterKnowledgeBase}
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: "var(--text-small)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 180ms ease",
                minHeight: 44,
              }}
            >
              Knowledge Base
            </button>
          </div>
        </div>

        {/* Glance cards */}
        {(resumeReason || portfolioNotes.length) ? (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {resumeReason ? (
              <div style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-accent-soft)",
                border: "1px solid rgba(108,92,231,0.12)",
                textAlign: "left",
              }}>
                <p style={{
                  margin: "0 0 4px",
                  fontSize: "var(--text-eyebrow)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  color: "var(--color-accent)",
                }}>
                  Resume cue
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-small)", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  {resumeReason}
                </p>
              </div>
            ) : null}
            {portfolioNotes.slice(0, 2).map((note) => (
              <div
                key={note}
                style={{
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-subtle)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  textAlign: "left",
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--text-small)", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  {note}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <p style={{
          margin: "24px 0 0",
          fontSize: "var(--text-eyebrow)",
          color: "var(--color-text-muted)",
          letterSpacing: "0.4px",
          fontWeight: 500,
        }}>
          Structure creates freedom
        </p>
      </div>
    </div>
  );
}
