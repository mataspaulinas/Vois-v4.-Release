type ErrorStateProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
  backLabel?: string;
  onBack?: () => void;
};

export function ErrorState({ title = "Something went wrong", description, onRetry, backLabel, onBack }: ErrorStateProps) {
  return (
    <div className="error-state">
      <h3 className="error-state__title">{title}</h3>
      <p className="error-state__description">{description}</p>
      <div className="error-state__actions">
        {onBack && (
          <button className="btn btn-secondary" onClick={onBack}>
            {backLabel ?? "Go back"}
          </button>
        )}
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
