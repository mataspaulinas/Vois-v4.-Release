import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AuthDiscoveryResponse,
  AuthEntryConfig,
  loginWithPasswordMode,
  discoverAuthRoute,
  AuthSessionResponse,
} from "../../lib/api";
import { AuthFrame } from "./AuthFrame";

type AuthRouterScreenProps = {
  entryConfig: AuthEntryConfig;
  initialEmail?: string;
  inviteToken?: string | null;
  onAuthenticated: (session: AuthSessionResponse) => Promise<void> | void;
  onNavigateToLocal: () => void;
  onNavigateToReset: (email?: string) => void;
  onNavigateToInvite: (token: string) => void;
};

export function AuthRouterScreen({
  entryConfig,
  initialEmail = "",
  inviteToken,
  onAuthenticated,
  onNavigateToLocal,
  onNavigateToReset,
  onNavigateToInvite,
}: AuthRouterScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<AuthDiscoveryResponse | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const resolvedWorkspaceHint = useMemo(() => discovery?.workspace_hint ?? null, [discovery]);

  async function handleDiscovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter your email to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await discoverAuthRoute(email.trim());
      setDiscovery(result);
      if (result.route === "invite_required" && inviteToken) {
        onNavigateToInvite(inviteToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to determine the sign-in method");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }
    if (!discovery?.password_mode) {
      setError("VOIS could not determine a password-capable sign-in path for this account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await loginWithPasswordMode({
        email: email.trim(),
        password,
        passwordMode: discovery.password_mode,
      });
      await onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      badge="VOIS"
      title="Sign in to VOIS"
      subtitle="Enter your work email and VOIS will route you to the right sign-in path for this workspace."
      footer={
        <div className="auth-footer-links">
          {entryConfig.local_auth_available ? (
            <button type="button" className="auth-inline-button" onClick={onNavigateToLocal}>
              Local access
            </button>
          ) : null}
          {entryConfig.support_url ? (
            <a className="auth-inline-link" href={entryConfig.support_url} target="_blank" rel="noreferrer">
              Support
            </a>
          ) : null}
          {entryConfig.status_url ? (
            <a className="auth-inline-link" href={entryConfig.status_url} target="_blank" rel="noreferrer">
              Status
            </a>
          ) : null}
        </div>
      }
    >
      {!discovery ? (
        <form className="auth-stack" onSubmit={handleDiscovery}>
          <label className="auth-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@workspace.com"
            />
          </label>
          {resolvedWorkspaceHint ? (
            <p className="auth-helper-copy">Workspace hint: {resolvedWorkspaceHint}</p>
          ) : null}
          {error ? <p className="auth-inline-error">{error}</p> : null}
          <div className="auth-actions">
            <button type="submit" className="btn-primary auth-action-button" disabled={busy}>
              {busy ? "Checking..." : "Continue"}
            </button>
          </div>
        </form>
      ) : discovery.route === "invite_required" ? (
        <div className="auth-stack">
          <div className="auth-status-card">
            <p className="auth-helper-copy">
              {discovery.message ?? "This email has a pending invite. Open the invite link to continue."}
            </p>
          </div>
          <div className="auth-actions">
            <button
              type="button"
              className="btn-secondary auth-action-button"
              onClick={() => {
                setDiscovery(null);
                setError(null);
              }}
            >
              Use another email
            </button>
          </div>
        </div>
      ) : discovery.route === "password" ? (
        <form className="auth-stack" onSubmit={handlePasswordSubmit}>
          <div className="auth-status-card">
            <p className="auth-helper-copy">
              <strong>{email}</strong>
              {resolvedWorkspaceHint ? ` • ${resolvedWorkspaceHint}` : ""}
            </p>
            <button
              type="button"
              className="auth-inline-button"
              onClick={() => {
                setDiscovery(null);
                setPassword("");
                setError(null);
              }}
            >
              Change email
            </button>
          </div>
          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-row">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {error ? <p className="auth-inline-error">{error}</p> : null}
          <div className="auth-actions">
            <button type="submit" className="btn-primary auth-action-button" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
            {entryConfig.password_reset_available ? (
              <button type="button" className="auth-inline-button" onClick={() => onNavigateToReset(email)}>
                Forgot password
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="auth-stack">
          <div className="auth-status-card">
            <p className="auth-helper-copy">
              {discovery.message ?? "VOIS could not present a safe sign-in path for this identity yet."}
            </p>
          </div>
          <div className="auth-actions">
            <button
              type="button"
              className="btn-secondary auth-action-button"
              onClick={() => {
                setDiscovery(null);
                setError(null);
              }}
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </AuthFrame>
  );
}
