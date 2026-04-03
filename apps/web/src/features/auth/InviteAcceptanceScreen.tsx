import { useEffect, useState } from "react";

import { acceptInvite, AuthSessionResponse, fetchInvitePreview, InvitePreview } from "../../lib/api";
import { AuthFrame } from "./AuthFrame";

type InviteAcceptanceScreenProps = {
  token: string;
  authSession: AuthSessionResponse | null;
  onNavigateToSignIn: (email?: string, inviteToken?: string) => void;
  onAccepted: () => Promise<void>;
  onSignOut: () => Promise<void> | void;
};

export function InviteAcceptanceScreen({
  token,
  authSession,
  onNavigateToSignIn,
  onAccepted,
  onSignOut,
}: InviteAcceptanceScreenProps) {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchInvitePreview(token)
      .then((payload) => {
        if (active) {
          setPreview(payload);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load invite");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(token);
      await onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  const currentEmail = authSession?.user.email?.toLowerCase() ?? null;
  const invitedEmail = preview?.email?.toLowerCase() ?? null;
  const emailMatches = Boolean(currentEmail && invitedEmail && currentEmail === invitedEmail);

  return (
    <AuthFrame
      badge="VOIS Invite"
      title={loading ? "Loading invite..." : "Join workspace"}
      subtitle={
        preview
          ? `You're joining ${preview.organization_name} as ${preview.role}.`
          : "Review workspace access before accepting it."
      }
    >
      {loading ? (
        <p className="auth-helper-copy">Loading invite details…</p>
      ) : error ? (
        <p className="auth-inline-error">{error}</p>
      ) : preview ? (
        <div className="auth-stack">
          <div className="auth-status-card">
            <p className="auth-helper-copy">
              <strong>Workspace:</strong> {preview.organization_name}
            </p>
            <p className="auth-helper-copy">
              <strong>Invited email:</strong> {preview.email}
            </p>
            <p className="auth-helper-copy">
              <strong>Role:</strong> {preview.role}
            </p>
            {preview.venue_names.length ? (
              <p className="auth-helper-copy">
                <strong>Venue access:</strong> {preview.venue_names.join(", ")}
              </p>
            ) : null}
            {preview.invited_by_name ? (
              <p className="auth-helper-copy">
                <strong>Invited by:</strong> {preview.invited_by_name}
              </p>
            ) : null}
            {preview.message ? <p className="auth-helper-copy">{preview.message}</p> : null}
          </div>

          {preview.token_status !== "pending" ? (
            <div className="auth-status-card">
              <p className="auth-helper-copy">
                This invite can no longer be accepted from this screen.
              </p>
              <div className="auth-actions">
                <button
                  type="button"
                  className="btn-secondary auth-action-button"
                  onClick={() => onNavigateToSignIn(preview.email)}
                >
                  Back to sign-in
                </button>
              </div>
            </div>
          ) : !authSession ? (
            <div className="auth-status-card">
              <p className="auth-helper-copy">
                Sign in with the invited email before accepting this workspace access.
              </p>
              <div className="auth-actions">
                <button
                  type="button"
                  className="btn-primary auth-action-button"
                  onClick={() => onNavigateToSignIn(preview.email, token)}
                >
                  Continue to sign-in
                </button>
              </div>
            </div>
          ) : !emailMatches ? (
            <div className="auth-status-card">
              <p className="auth-inline-error">
                Signed in as {authSession.user.email}, but this invite belongs to {preview.email}.
              </p>
              <div className="auth-actions">
                <button type="button" className="btn-secondary auth-action-button" onClick={() => void onSignOut()}>
                  Switch account
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-actions">
              <button type="button" className="btn-primary auth-action-button" disabled={busy} onClick={handleAccept}>
                {busy ? "Accepting..." : "Accept invite"}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </AuthFrame>
  );
}
