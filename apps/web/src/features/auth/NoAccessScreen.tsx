import { AuthFrame } from "./AuthFrame";

type NoAccessScreenProps = {
  email: string;
  message: string;
  onSignOut: () => void;
  supportUrl?: string | null;
};

export function NoAccessScreen({ email, message, onSignOut, supportUrl }: NoAccessScreenProps) {
  return (
    <AuthFrame
      badge="VOIS Access"
      title="No workspace access yet"
      subtitle="This identity is authenticated, but VOIS cannot open a workspace for it."
      footer={
        <div className="auth-footer-links">
          <button type="button" className="btn-secondary auth-action-button" onClick={onSignOut}>
            Sign out
          </button>
          {supportUrl ? (
            <a className="auth-inline-link" href={supportUrl} target="_blank" rel="noreferrer">
              Contact support
            </a>
          ) : null}
        </div>
      }
    >
      <div className="auth-status-card">
        <p className="auth-helper-copy">
          Signed in as <strong>{email}</strong>.
        </p>
        <p className="auth-helper-copy">{message}</p>
      </div>
    </AuthFrame>
  );
}
