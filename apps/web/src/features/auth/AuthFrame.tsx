import { ReactNode } from "react";

type AuthFrameProps = {
  badge?: string;
  title: string;
  subtitle: string;
  environmentLabel?: string | null;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthFrame({
  badge = "VOIS Auth",
  title,
  subtitle,
  environmentLabel,
  children,
  footer,
}: AuthFrameProps) {
  return (
    <div className="app-shell loading-screen fatal-screen auth-entry-shell">
      <div className="fatal-card auth-entry-card">
        <div className="auth-entry-header">
          <div className="auth-entry-header__copy">
            <p className="hero-badge">{badge}</p>
            <h1>{title}</h1>
            <p className="hero-copy">{subtitle}</p>
          </div>
          {environmentLabel ? <span className="auth-mode-pill">{environmentLabel}</span> : null}
        </div>
        <div className="auth-entry-body">{children}</div>
        {footer ? <div className="auth-entry-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
