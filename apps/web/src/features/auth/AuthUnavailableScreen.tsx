import { AuthFrame } from "./AuthFrame";

type AuthUnavailableScreenProps = {
  title?: string;
  message: string;
  supportUrl?: string | null;
  statusUrl?: string | null;
  localAuthPath?: string | null;
  onRetry?: () => void;
};

export function AuthUnavailableScreen({
  title = "Sign-in is unavailable",
  message,
  supportUrl,
  statusUrl,
  localAuthPath,
  onRetry,
}: AuthUnavailableScreenProps) {
  return (
    <AuthFrame
      badge="VOIS Auth"
      title={title}
      subtitle={message}
      footer={
        <div className="auth-footer-links">
          {onRetry ? (
            <button type="button" className="btn-secondary auth-action-button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
          {statusUrl ? (
            <a className="auth-inline-link" href={statusUrl} target="_blank" rel="noreferrer">
              Status
            </a>
          ) : null}
          {supportUrl ? (
            <a className="auth-inline-link" href={supportUrl} target="_blank" rel="noreferrer">
              Support
            </a>
          ) : null}
          {localAuthPath ? (
            <a className="auth-inline-link" href={localAuthPath}>
              Local access
            </a>
          ) : null}
        </div>
      }
    >
      <div className="auth-status-card">
        <p className="auth-helper-copy">
          VOIS could not present a safe sign-in method for this environment. Check provider configuration, then try
          again.
        </p>
      </div>
    </AuthFrame>
  );
}
