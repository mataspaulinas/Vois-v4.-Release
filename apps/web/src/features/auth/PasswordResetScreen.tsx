import { FormEvent, useMemo, useState } from "react";

import { completePasswordReset, requestPasswordReset } from "../../lib/api";
import { AuthFrame } from "./AuthFrame";

type PasswordResetScreenProps = {
  initialEmail?: string;
  token?: string | null;
  environmentLabel?: string | null;
  supportUrl?: string | null;
  onNavigateToAuth: (email?: string) => void;
};

export function PasswordResetScreen({
  initialEmail = "",
  token,
  environmentLabel,
  supportUrl,
  onNavigateToAuth,
}: PasswordResetScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deliveryLink, setDeliveryLink] = useState<string | null>(null);
  const isCompletion = Boolean(token);

  const subtitle = useMemo(() => {
    if (isCompletion) {
      return "Choose a new password for this password-capable account.";
    }
    return "Recover access without exposing provider or environment internals on the main sign-in screen.";
  }, [isCompletion]);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter the email address for the account you want to recover.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    setDeliveryLink(null);
    try {
      const result = await requestPasswordReset(email.trim());
      setSuccessMessage(result.message);
      setDeliveryLink(result.reset_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start password recovery");
    } finally {
      setBusy(false);
    }
  }

  async function handleCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    if (!newPassword.trim()) {
      setError("Enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await completePasswordReset(token, newPassword);
      setSuccessMessage(result.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      badge="VOIS Recovery"
      title={isCompletion ? "Reset password" : "Forgot password"}
      subtitle={subtitle}
      environmentLabel={environmentLabel ?? undefined}
      footer={
        <div className="auth-footer-links">
          <button type="button" className="auth-inline-button" onClick={() => onNavigateToAuth(email)}>
            Back to sign-in
          </button>
          {supportUrl ? (
            <a className="auth-inline-link" href={supportUrl} target="_blank" rel="noreferrer">
              Support
            </a>
          ) : null}
        </div>
      }
    >
      {isCompletion ? (
        <form className="auth-stack" onSubmit={handleCompletion}>
          <label className="auth-field">
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Create a new password"
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Repeat the new password"
            />
          </label>
          {error ? <p className="auth-inline-error">{error}</p> : null}
          {successMessage ? <p className="auth-inline-success">{successMessage}</p> : null}
          <div className="auth-actions">
            <button type="submit" className="btn-primary auth-action-button" disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      ) : (
        <form className="auth-stack" onSubmit={handleRequest}>
          <label className="auth-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@workspace.com"
            />
          </label>
          {error ? <p className="auth-inline-error">{error}</p> : null}
          {successMessage ? <p className="auth-inline-success">{successMessage}</p> : null}
          {deliveryLink ? (
            <a className="auth-inline-link" href={deliveryLink}>
              Open reset link
            </a>
          ) : null}
          <div className="auth-actions">
            <button type="submit" className="btn-primary auth-action-button" disabled={busy}>
              {busy ? "Sending..." : "Continue"}
            </button>
          </div>
        </form>
      )}
    </AuthFrame>
  );
}
