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
    <div className="landing-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="landing-stage">
        <p className="landing-kicker">vOIS</p>
        <h1 id="welcome-title" className="landing-hero-headline">
          Your operation&apos;s best days are <span className="landing-hero-accent">ahead.</span>
        </h1>
        <p className="landing-hero-sub">
          OIS helps service operators see clearly, act in sequence, and build real calm into the business.
        </p>
        <div className="landing-ctas">
          {resumeVenueName && onEnterResume ? (
            <button className="btn-landing-primary" onClick={onEnterResume}>
              Resume {resumeVenueName}
            </button>
          ) : (
            <button className="btn-landing-primary" onClick={onEnterPortfolio}>
              Venues
            </button>
          )}
          <button className="btn-landing-secondary" onClick={onEnterPortfolio}>
            Portfolio
          </button>
          <button className="btn-landing-secondary" onClick={onEnterKnowledgeBase}>
            Knowledge Base
          </button>
        </div>
        {resumeReason || portfolioNotes.length ? (
          <div className="landing-glance">
            {resumeReason ? (
              <div className="landing-glance-card landing-glance-card-primary">
                <p className="section-eyebrow">Resume cue</p>
                <p>{resumeReason}</p>
              </div>
            ) : null}
            {portfolioNotes.slice(0, 2).map((note) => (
              <div className="landing-glance-card" key={note}>
                <p>{note}</p>
              </div>
            ))}
          </div>
        ) : null}
        <p className="landing-motto">Structure creates freedom</p>
      </div>
    </div>
  );
}
