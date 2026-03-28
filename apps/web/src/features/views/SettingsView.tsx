import { SectionCard } from "../../components/SectionCard";
import { SkinId, ThemeMode } from "../shell/types";
import {
  OrganizationBackupReadiness,
  OrganizationDeleteReadiness,
  AuthManagedSessionRecord,
  AuthSecurityPosture,
  AuthSessionInventory,
  OrganizationExportSummary,
} from "../../lib/api";

type SettingsViewProps = {
  theme: ThemeMode;
  skin: SkinId;
  sidebarCollapsed: boolean;
  currentSurfaceLabel: string;
  authUserName: string;
  authUserEmail: string;
  authUserRole: string;
  authenticationMode: string;
  sessionActive: boolean;
  sessionInventoryAvailable: boolean;
  sessionInventory: AuthSessionInventory | null;
  sessionInventoryScope: "self" | "organization";
  loadingSessionInventory: boolean;
  revokingSessionId: string | null;
  securityPosture: AuthSecurityPosture | null;
  loadingSecurityPosture: boolean;
  exportSummary: OrganizationExportSummary | null;
  backupReadiness: OrganizationBackupReadiness | null;
  deleteReadiness: OrganizationDeleteReadiness | null;
  loadingExportSummary: boolean;
  loadingBackupReadiness: boolean;
  loadingDeleteReadiness: boolean;
  exportingOrganization: boolean;
  loginEmail: string;
  loginPassword: string;
  loginBusy: boolean;
  logoutBusy: boolean;
  onToggleTheme: () => void;
  onSelectSkin: (skin: SkinId) => void;
  onToggleSidebar: () => void;
  onResetWelcome: () => void;
  onRestoreDefaults: () => void;
  onLoginEmailChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onSessionInventoryScopeChange: (scope: "self" | "organization") => void;
  onRevokeSession: (sessionId: string) => void;
  onGenerateOrganizationExport: () => void;
};

const skins: SkinId[] = ["ocean", "forest", "ember", "midnight"];

export function SettingsView({
  theme,
  skin,
  sidebarCollapsed,
  currentSurfaceLabel,
  authUserName,
  authUserEmail,
  authUserRole,
  authenticationMode,
  sessionActive,
  sessionInventoryAvailable,
  sessionInventory,
  sessionInventoryScope,
  loadingSessionInventory,
  revokingSessionId,
  securityPosture,
  loadingSecurityPosture,
  exportSummary,
  backupReadiness,
  deleteReadiness,
  loadingExportSummary,
  loadingBackupReadiness,
  loadingDeleteReadiness,
  exportingOrganization,
  loginEmail,
  loginPassword,
  loginBusy,
  logoutBusy,
  onToggleTheme,
  onSelectSkin,
  onToggleSidebar,
  onResetWelcome,
  onRestoreDefaults,
  onLoginEmailChange,
  onLoginPasswordChange,
  onLogin,
  onLogout,
  onSessionInventoryScopeChange,
  onRevokeSession,
  onGenerateOrganizationExport,
}: SettingsViewProps) {
  const canInspectOrganizationSessions = authUserRole === "owner" || authUserRole === "developer";
  const canGenerateOrganizationExport = authUserRole === "owner";
  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Settings"
        title="Workspace preferences"
        description="These preferences are local to your browser and exist to make the shell feel like home again."
      >
        <div className="settings-grid">
          <button className="setting-tile" onClick={onToggleTheme}>
            <strong>Theme</strong>
            <span>{theme}</span>
          </button>
          <button className="setting-tile" onClick={onToggleSidebar}>
            <strong>Sidebar</strong>
            <span>{sidebarCollapsed ? "collapsed" : "expanded"}</span>
          </button>
          <div className="focus-card">
            <strong>Current surface</strong>
            <span>{currentSurfaceLabel}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Skins"
        title="Color system"
        description="The reset now starts from a cooler neutral baseline with a small set of restrained alternates."
      >
        <div className="skin-selector-grid">
          {skins.map((skinId) => (
            <button
              key={skinId}
              className={`skin-selector-card skin-selector-card--${skinId} ${skin === skinId ? "selected" : ""}`}
              onClick={() => onSelectSkin(skinId)}
            >
              <strong>{skinId}</strong>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Trust posture"
        title="Session and provider policy"
        description="This is the live security stance of the current workspace, not just documentation."
      >
        <div className="settings-grid settings-grid-compact">
          <div className="focus-card">
            <strong>Authentication mode</strong>
            <span>{securityPosture?.authentication_mode ?? authenticationMode}</span>
          </div>
          <div className={`focus-card ${securityPosture?.auth_ready ? "focus-card-primary" : ""}`}>
            <strong>Auth readiness</strong>
            <span>
              {loadingSecurityPosture
                ? "Loading..."
                : securityPosture
                  ? securityPosture.auth_ready
                    ? "Ready"
                    : securityPosture.auth_missing_configuration.length
                      ? `Missing ${securityPosture.auth_missing_configuration.join(", ")}`
                      : "Not ready"
                  : "Unavailable"}
            </span>
          </div>
          <div className="focus-card">
            <strong>Legacy header path</strong>
            <span>{securityPosture?.legacy_header_auth_enabled ? "enabled" : "disabled"}</span>
          </div>
          <div className="focus-card">
            <strong>AI requested</strong>
            <span>
              {loadingSecurityPosture
                ? "Loading..."
                : securityPosture
                  ? `${securityPosture.ai_provider} / ${securityPosture.ai_model}`
                  : "Unavailable"}
            </span>
          </div>
          <div className={`focus-card ${securityPosture?.ai_provider_effective === "mock" ? "" : "focus-card-primary"}`}>
            <strong>AI runtime</strong>
            <span>
              {loadingSecurityPosture
                ? "Loading..."
                : securityPosture
                  ? `${securityPosture.ai_provider_effective} / ${securityPosture.ai_mode}`
                  : "Unavailable"}
            </span>
          </div>
          <div className={`focus-card ${securityPosture?.ai_live_activation_ready ? "focus-card-primary" : ""}`}>
            <strong>Live activation</strong>
            <span>
              {loadingSecurityPosture
                ? "Loading..."
                : !securityPosture
                  ? "Unavailable"
                  : securityPosture.ai_live_activation_ready
                    ? securityPosture.ai_live_provider_supported
                      ? "Ready"
                      : "Configured, not implemented"
                    : securityPosture.ai_missing_configuration.length
                      ? `Missing ${securityPosture.ai_missing_configuration.join(", ")}`
                      : "Not ready"}
            </span>
          </div>
          <div className="focus-card">
            <strong>Secret backend</strong>
            <span>{loadingSecurityPosture ? "Loading..." : securityPosture?.ai_secret_backend ?? "Unavailable"}</span>
          </div>
          <div className="focus-card">
            <strong>Cookie posture</strong>
            <span>
              {loadingSecurityPosture || !securityPosture
                ? "Loading..."
                : `${securityPosture.session_cookie_samesite} / ${securityPosture.session_cookie_secure ? "secure" : "local-http"}`}
            </span>
          </div>
          <div className="focus-card">
            <strong>Data residency default</strong>
            <span>{loadingSecurityPosture ? "Loading..." : securityPosture?.default_data_residency ?? "Unavailable"}</span>
          </div>
        </div>
        {securityPosture ? (
          <div className="auth-action-panel">
            <p className="auth-helper-copy">{securityPosture.ai_runtime_note}</p>
            <div className="dependency-list">
              <span>fallback enabled: {securityPosture.ai_mock_fallback_enabled ? "yes" : "no"}</span>
              <span>fallback active: {securityPosture.ai_mock_fallback_active ? "yes" : "no"}</span>
              <span>live supported: {securityPosture.ai_live_provider_supported ? "yes" : "no"}</span>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        eyebrow="Data portability"
        title="Organization export and recovery posture"
        description="Enterprise trust includes portability, backup readiness, and knowing exactly what still blocks a clean recovery story."
      >
        <div className="settings-grid settings-grid-compact">
          <div className={`focus-card ${exportSummary?.export_ready ? "focus-card-primary" : ""}`}>
            <strong>Export posture</strong>
            <span>
              {loadingExportSummary
                ? "Loading..."
                : exportSummary
                  ? exportSummary.export_ready
                    ? "Ready"
                    : "Not ready"
                  : "Unavailable"}
            </span>
          </div>
          <div className={`focus-card ${backupReadiness?.backup_ready ? "focus-card-primary" : ""}`}>
            <strong>Backup posture</strong>
            <span>
              {loadingBackupReadiness
                ? "Loading..."
                : backupReadiness
                  ? backupReadiness.backup_ready
                    ? "Operationally clear"
                    : backupReadiness.snapshot_export_ready
                      ? "Manual snapshot only"
                      : "Not ready"
                  : "Unavailable"}
            </span>
          </div>
          <div className={`focus-card ${deleteReadiness?.delete_ready ? "" : "focus-card-primary"}`}>
            <strong>Delete posture</strong>
            <span>
              {loadingDeleteReadiness
                ? "Loading..."
                : deleteReadiness
                  ? deleteReadiness.delete_ready
                    ? "Operationally clear"
                    : "Blocked"
                  : "Unavailable"}
            </span>
          </div>
          <div className="focus-card">
            <strong>Structured records</strong>
            <span>
              {loadingExportSummary
                ? "Loading..."
                : exportSummary
                  ? Object.values(exportSummary.entity_counts).reduce((total, count) => total + count, 0)
                  : "Unavailable"}
            </span>
          </div>
          <div className="focus-card">
            <strong>Restore posture</strong>
            <span>
              {loadingBackupReadiness
                ? "Loading..."
                : backupReadiness
                  ? backupReadiness.restore_supported
                    ? "Supported"
                    : "Not implemented"
                  : "Unavailable"}
            </span>
          </div>
          <div className="focus-card">
            <strong>File content</strong>
            <span>
              {loadingExportSummary
                ? "Loading..."
                : exportSummary
                  ? exportSummary.includes_file_content
                    ? "Included"
                    : "Metadata only"
                  : "Unavailable"}
            </span>
          </div>
          <div className={`focus-card ${backupReadiness?.file_binary_backup_ready ? "focus-card-primary" : ""}`}>
            <strong>File backup</strong>
            <span>
              {loadingBackupReadiness
                ? "Loading..."
                : backupReadiness
                  ? backupReadiness.file_binary_backup_ready
                    ? "Covered"
                    : `${backupReadiness.upload_backend} gap`
                  : "Unavailable"}
            </span>
          </div>
          <div className="focus-card">
            <strong>Delete blockers</strong>
            <span>
              {loadingDeleteReadiness
                ? "Loading..."
                : deleteReadiness
                  ? deleteReadiness.blocking_conditions.length
                  : "Unavailable"}
            </span>
          </div>
        </div>
        <div className="auth-action-panel">
          <p className="auth-helper-copy">
            {exportSummary?.notes[0] ??
              "Exports are currently JSON snapshots of structured tenant state for portability, auditability, and later delete/export posture."}
          </p>
          {backupReadiness ? (
            <p className="auth-helper-copy">{backupReadiness.notes[0]}</p>
          ) : null}
          {deleteReadiness ? (
            <p className="auth-helper-copy">{deleteReadiness.notes[0]}</p>
          ) : null}
          {exportSummary ? (
            <div className="dependency-list">
              {Object.entries(exportSummary.entity_counts)
                .slice(0, 6)
                .map(([key, count]) => (
                  <span key={`export-${key}`}>
                    {key.replace(/_/g, " ")}: {count}
                  </span>
                ))}
            </div>
          ) : null}
          {deleteReadiness?.blocking_conditions.length ? (
            <div className="dependency-list">
              {deleteReadiness.blocking_conditions.map((item) => (
                <span key={`delete-${item}`}>{item}</span>
              ))}
            </div>
          ) : null}
          {backupReadiness?.blocking_conditions.length ? (
            <div className="dependency-list">
              {backupReadiness.blocking_conditions.map((item) => (
                <span key={`backup-${item}`}>{item}</span>
              ))}
            </div>
          ) : null}
          {canGenerateOrganizationExport ? (
            <button className="btn-secondary auth-action-button" onClick={onGenerateOrganizationExport} disabled={exportingOrganization}>
              {exportingOrganization ? "Generating export..." : "Generate export snapshot"}
            </button>
          ) : (
            <span className="auth-hint">Organization export generation is limited to admin roles.</span>
          )}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Access"
        title="Operator session"
        description="The shell now expects a real Firebase-backed identity. That is what gives audit, tenancy, and uploads a trustworthy operator context."
      >
        <div className="auth-session-layout">
          <div className={`focus-card ${sessionActive ? "focus-card-primary" : ""}`}>
            <strong>{authUserName}</strong>
            <span>{authUserEmail}</span>
            <span className="auth-meta-row">
              <span className={`auth-mode-pill ${sessionActive ? "active" : ""}`}>
                {securityPosture?.authentication_mode ?? authenticationMode}
              </span>
              <span>{authUserRole.replace(/_/g, " ")}</span>
            </span>
          </div>

          {sessionActive ? (
            <div className="auth-action-panel">
              <p className="auth-helper-copy">
                You are signed in with a governed Firebase identity. VOIS is now reading the backend-enforced auth path
                instead of relying on local bootstrap shortcuts.
              </p>
              <button className="btn-secondary auth-action-button" onClick={onLogout} disabled={logoutBusy}>
                {logoutBusy ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <div className="auth-action-panel">
              <p className="auth-helper-copy">
                You are currently signed out. Use your real Firebase account to exercise the governed auth layer.
              </p>
              <div className="auth-form-grid">
                <label className="auth-field">
                  <span>Email</span>
                  <input
                    className="progress-input"
                    value={loginEmail}
                    onChange={(event) => onLoginEmailChange(event.target.value)}
                    placeholder="operator@ois.local"
                    autoComplete="username"
                  />
                </label>
                <label className="auth-field">
                  <span>Password</span>
                  <input
                    className="progress-input"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => onLoginPasswordChange(event.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </label>
              </div>
              <div className="auth-actions">
                <button className="btn-primary auth-action-button" onClick={onLogin} disabled={loginBusy}>
                  {loginBusy ? "Signing in..." : "Sign in"}
                </button>
                <span className="auth-hint">Use your real Firebase password for this role account.</span>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Session inventory"
        title="Active operator sessions"
        description="This is where enterprise trust starts to feel real: who is signed in, how recently they were seen, and which sessions can be closed cleanly."
      >
        {sessionActive ? (
          <>
            {sessionInventoryAvailable ? (
              <>
                <div className="settings-row-actions">
                  <div className="pill-toggle-group" role="tablist" aria-label="Session scope">
                    <button
                      className={`pill-toggle ${sessionInventoryScope === "self" ? "active" : ""}`}
                      onClick={() => onSessionInventoryScopeChange("self")}
                    >
                      My sessions
                    </button>
                    {canInspectOrganizationSessions ? (
                      <button
                        className={`pill-toggle ${sessionInventoryScope === "organization" ? "active" : ""}`}
                        onClick={() => onSessionInventoryScopeChange("organization")}
                      >
                        Organization
                      </button>
                    ) : null}
                  </div>
                  <span className="auth-hint">
                    {loadingSessionInventory
                      ? "Refreshing session inventory..."
                      : sessionInventory
                        ? `${sessionInventory.sessions.length} session(s)`
                        : "No session inventory loaded yet."}
                  </span>
                </div>

                <div className="session-list">
                  {sessionInventory?.sessions.length ? (
                    sessionInventory.sessions.map((session) => (
                      <SessionInventoryCard
                        key={session.id}
                        session={session}
                        revoking={revokingSessionId === session.id}
                        onRevoke={onRevokeSession}
                      />
                    ))
                  ) : (
                    <div className="focus-card">
                      <strong>No sessions visible</strong>
                      <span>The inventory is empty or still loading.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="focus-card">
                <strong>Token-based auth is active</strong>
                <span>
                  This rollout is using Firebase ID tokens directly. Managed server-session inventory will stay empty
                  until VOIS adds backend session cookies as a later phase.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="focus-card">
            <strong>Session inventory needs a real session</strong>
            <span>Sign in first so session management and revocation work through the governed path.</span>
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Session memory"
        title="Restore the shell"
        description="These controls help you get the homecoming feel back quickly without touching browser storage by hand."
      >
        <div className="settings-grid">
          <button className="setting-tile" onClick={onResetWelcome}>
            <strong>Replay landing</strong>
            <span>Show the welcome overlay again</span>
          </button>
          <button className="setting-tile" onClick={onRestoreDefaults}>
            <strong>Restore defaults</strong>
            <span>Reset theme, skin, sidebar, and route memory</span>
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

type SessionInventoryCardProps = {
  session: AuthManagedSessionRecord;
  revoking: boolean;
  onRevoke: (sessionId: string) => void;
};

function SessionInventoryCard({ session, revoking, onRevoke }: SessionInventoryCardProps) {
  const statusLabel = session.revoked_at ? "revoked" : session.is_active ? "active" : "expired";
  return (
    <div className={`session-card ${session.is_current ? "session-card-current" : ""}`}>
      <div className="session-card-main">
        <strong>{session.user_full_name}</strong>
        <span>{session.user_email}</span>
        <span className="auth-meta-row">
          <span className={`auth-mode-pill ${session.is_active ? "active" : ""}`}>{statusLabel}</span>
          <span>{session.is_current ? "current session" : `expires ${formatCompactDate(session.expires_at)}`}</span>
        </span>
        <span className="session-meta-copy">
          Last seen {formatCompactDate(session.last_seen_at ?? session.created_at)}. Issued by {session.issued_by_name ?? "unknown"}.
        </span>
      </div>
      <div className="session-card-actions">
        <button className="btn-secondary auth-action-button" onClick={() => onRevoke(session.id)} disabled={revoking}>
          {revoking ? "Revoking..." : session.is_current ? "Sign out this session" : "Revoke"}
        </button>
      </div>
    </div>
  );
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
