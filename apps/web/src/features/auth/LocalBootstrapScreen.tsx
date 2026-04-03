import { FormEvent, useState } from "react";

import { AuthFrame } from "./AuthFrame";

type LocalBootstrapScreenProps = {
  environmentLabel: string;
  initialEmail?: string;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onNavigateToAuth: () => void;
};

export function LocalBootstrapScreen({
  environmentLabel,
  initialEmail = "",
  onLogin,
  onNavigateToAuth,
}: LocalBootstrapScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onLogin({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      badge="Local build"
      title="Local access"
      subtitle="This route is only for explicit non-production password sign-in."
      environmentLabel={environmentLabel}
      footer={
        <div className="auth-footer-links">
          <button type="button" className="auth-inline-button" onClick={onNavigateToAuth}>
            Use standard sign-in
          </button>
        </div>
      }
    >
      <form className="auth-stack" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            placeholder="owner@vois.local"
          />
        </label>
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
        </div>
      </form>
    </AuthFrame>
  );
}
