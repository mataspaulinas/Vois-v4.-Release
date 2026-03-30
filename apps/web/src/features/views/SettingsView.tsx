import { SectionCard } from "../../components/SectionCard";
import { SkinId, ThemeMode } from "../shell/types";
import {
  OrganizationBackupReadiness,
  OrganizationDeleteReadiness,
  AuthManagedSessionRecord,
  AuthSecurityPosture,
  AuthSessionInventory,
  OntologyBundleResponse,
  OrganizationExportSummary,
  VenueOntologyBindingRecord,
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
  ontologyBundle: OntologyBundleResponse | null;
  venueBindings: VenueOntologyBindingRecord[];
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

/* ── design tokens ─────────────────────────────────── */
const ds = {
  eyebrow: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A3A3A3", margin: 0 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#0A0A0A", margin: "4px 0 0" },
  body: { fontSize: 15, color: "#525252", lineHeight: 1.55, margin: 0 },
  small: { fontSize: 13, color: "#737373", lineHeight: 1.5, margin: 0 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: "#0A0A0A", margin: 0 },
  card: { background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "20px 24px" } as React.CSSProperties,
  accent: "#6C5CE7",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
  btnPrimary: { background: "#6C5CE7", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  btnSecondary: { background: "#FFFFFF", color: "#0A0A0A", border: "1px solid #E5E5E5", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  countPill: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#F5F5F5", color: "#737373" } as React.CSSProperties,
  statusDot: (color: string) => ({ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }) as React.CSSProperties,
  kvRow: { display: "flex", justifyContent: "space-between", fontSize: 13 } as React.CSSProperties,
  kvLabel: { color: "#737373", fontWeight: 500 },
  kvValue: { color: "#0A0A0A", fontWeight: 500 },
  input: { width: "100%", padding: "8px 12px", fontSize: 14, border: "1px solid #E5E5E5", borderRadius: 8, background: "#FAFAFA", outline: "none", boxSizing: "border-box" as const },
  pill: (active: boolean) => ({
    display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: active ? `1.5px solid ${ds.accent}` : "1px solid #E5E5E5",
    background: active ? "#F0EDFD" : "#FFFFFF",
    color: active ? ds.accent : "#525252",
  }) as React.CSSProperties,
  tile: {
    background: "#FFFFFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: "16px 20px", cursor: "pointer",
    display: "flex", flexDirection: "column" as const, gap: 4, transition: "transform 0.15s ease, box-shadow 0.15s ease",
  } as React.CSSProperties,
  skinTile: (skinId: SkinId, active: boolean) => {
    const colors: Record<SkinId, string> = { ocean: "#3B82F6", forest: "#10B981", ember: "#F59E0B", midnight: "#6366F1" };
    return {
      background: active ? `${colors[skinId]}15` : "#FFFFFF",
      border: active ? `2px solid ${colors[skinId]}` : "1px solid #E5E5E5",
      borderRadius: 12, padding: "20px 24px", cursor: "pointer", textAlign: "center" as const,
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
    } as React.CSSProperties;
  },
} as const;

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
  ontologyBundle,
  venueBindings,
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
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Page header ────────────────────────── */}
      <div>
        <p style={ds.eyebrow}>SYSTEM</p>
        <h1 style={ds.pageTitle}>Settings</h1>
      </div>

      {/* ── Workspace preferences ────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Settings</p>
        <h2 style={ds.sectionTitle}>Workspace preferences</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>These preferences are local to your browser and exist to make the shell feel like home again.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          <button
            style={ds.tile}
            onClick={onToggleTheme}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
          >
            <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Theme</strong>
            <span style={{ fontSize: 13, color: "#737373" }}>{theme}</span>
          </button>
          <button
            style={ds.tile}
            onClick={onToggleSidebar}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
          >
            <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Sidebar</strong>
            <span style={{ fontSize: 13, color: "#737373" }}>{sidebarCollapsed ? "collapsed" : "expanded"}</span>
          </button>
          <div style={{ ...ds.tile, cursor: "default" }}>
            <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Current surface</strong>
            <span style={{ fontSize: 13, color: "#737373" }}>{currentSurfaceLabel}</span>
          </div>
        </div>
      </section>

      {/* ── Color system ─────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Skins</p>
        <h2 style={ds.sectionTitle}>Color system</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>The reset now starts from a cooler neutral baseline with a small set of restrained alternates.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
          {skins.map((skinId) => (
            <button
              key={skinId}
              style={ds.skinTile(skinId, skin === skinId)}
              onClick={() => onSelectSkin(skinId)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
            >
              <strong style={{ fontSize: 14, color: "#0A0A0A", textTransform: "capitalize" }}>{skinId}</strong>
            </button>
          ))}
        </div>
      </section>

      {/* ── Trust posture ────────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Trust posture</p>
        <h2 style={ds.sectionTitle}>Session and provider policy</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>This is the live security stance of the current workspace, not just documentation.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {([
            ["Authentication mode", securityPosture?.authentication_mode ?? authenticationMode, false],
            ["Auth readiness", loadingSecurityPosture ? "Loading..." : securityPosture ? securityPosture.auth_ready ? "Ready" : securityPosture.auth_missing_configuration.length ? `Missing ${securityPosture.auth_missing_configuration.join(", ")}` : "Not ready" : "Unavailable", securityPosture?.auth_ready],
            ["Legacy header path", securityPosture?.legacy_header_auth_enabled ? "enabled" : "disabled", false],
            ["AI requested", loadingSecurityPosture ? "Loading..." : securityPosture ? `${securityPosture.ai_provider} / ${securityPosture.ai_model}` : "Unavailable", false],
            ["AI runtime", loadingSecurityPosture ? "Loading..." : securityPosture ? `${securityPosture.ai_provider_effective} / ${securityPosture.ai_mode}` : "Unavailable", securityPosture?.ai_provider_effective !== "mock"],
            ["Live activation", loadingSecurityPosture ? "Loading..." : !securityPosture ? "Unavailable" : securityPosture.ai_live_activation_ready ? securityPosture.ai_live_provider_supported ? "Ready" : "Configured, not implemented" : securityPosture.ai_missing_configuration.length ? `Missing ${securityPosture.ai_missing_configuration.join(", ")}` : "Not ready", securityPosture?.ai_live_activation_ready],
            ["Secret backend", loadingSecurityPosture ? "Loading..." : securityPosture?.ai_secret_backend ?? "Unavailable", false],
            ["Cookie posture", loadingSecurityPosture || !securityPosture ? "Loading..." : `${securityPosture.session_cookie_samesite} / ${securityPosture.session_cookie_secure ? "secure" : "local-http"}`, false],
            ["Data residency default", loadingSecurityPosture ? "Loading..." : securityPosture?.default_data_residency ?? "Unavailable", false],
          ] as [string, string, boolean | undefined][]).map(([label, value, highlight]) => (
            <div key={label} style={{ ...ds.card, padding: "14px 18px", ...(highlight ? { borderLeft: `4px solid ${ds.accent}` } : {}) }}>
              <strong style={{ fontSize: 12, color: "#737373", fontWeight: 600 }}>{label}</strong>
              <span style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 500, display: "block", marginTop: 4 }}>{value}</span>
            </div>
          ))}
        </div>
        {securityPosture ? (
          <div style={{ marginTop: 16, padding: "14px 18px", background: "#FAFAFA", borderRadius: 8 }}>
            <p style={ds.small}>{securityPosture.ai_runtime_note}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <span style={ds.countPill}>fallback enabled: {securityPosture.ai_mock_fallback_enabled ? "yes" : "no"}</span>
              <span style={ds.countPill}>fallback active: {securityPosture.ai_mock_fallback_active ? "yes" : "no"}</span>
              <span style={ds.countPill}>live supported: {securityPosture.ai_live_provider_supported ? "yes" : "no"}</span>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Ontology posture ─────────────────── */}
      {(authUserRole === "owner" || authUserRole === "developer") && ontologyBundle ? (
        <section style={ds.card}>
          <p style={ds.eyebrow}>Ontology</p>
          <h2 style={ds.sectionTitle}>Mounted ontology posture</h2>
          <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>The operational vocabulary driving signals, failure modes, and intervention blocks across your venues.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            <div style={{ ...ds.card, padding: "14px 18px", borderLeft: `4px solid ${ds.accent}` }}>
              <strong style={{ fontSize: 12, color: "#737373", fontWeight: 600 }}>Active bundle</strong>
              <span style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 500, display: "block", marginTop: 4 }}>{ontologyBundle.meta.ontology_id} {ontologyBundle.meta.version}</span>
            </div>
            {([
              ["Signals", ontologyBundle.signals.length],
              ["Failure modes", ontologyBundle.failure_modes.length],
              ["Response patterns", ontologyBundle.response_patterns.length],
              ["Blocks", ontologyBundle.blocks.length],
              ["Tools", ontologyBundle.tools.length],
            ] as [string, number][]).map(([label, count]) => (
              <div key={label} style={{ ...ds.card, padding: "14px 18px" }}>
                <strong style={{ fontSize: 12, color: "#737373", fontWeight: 600 }}>{label}</strong>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#0A0A0A", display: "block", marginTop: 4 }}>{count}</span>
              </div>
            ))}
          </div>
          {venueBindings.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <p style={ds.eyebrow}>Venue bindings</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {venueBindings.map((binding) => (
                  <span key={binding.venue_id} style={ds.countPill}>
                    {binding.ontology_id}@{binding.ontology_version} ({binding.binding_status})
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Data portability ──────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Data portability</p>
        <h2 style={ds.sectionTitle}>Organization export and recovery posture</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>Enterprise trust includes portability, backup readiness, and knowing exactly what still blocks a clean recovery story.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {([
            ["Export posture", loadingExportSummary ? "Loading..." : exportSummary ? exportSummary.export_ready ? "Ready" : "Not ready" : "Unavailable", exportSummary?.export_ready],
            ["Backup posture", loadingBackupReadiness ? "Loading..." : backupReadiness ? backupReadiness.backup_ready ? "Operationally clear" : backupReadiness.snapshot_export_ready ? "Manual snapshot only" : "Not ready" : "Unavailable", backupReadiness?.backup_ready],
            ["Delete posture", loadingDeleteReadiness ? "Loading..." : deleteReadiness ? deleteReadiness.delete_ready ? "Operationally clear" : "Blocked" : "Unavailable", !deleteReadiness?.delete_ready],
            ["Structured records", loadingExportSummary ? "Loading..." : exportSummary ? String(Object.values(exportSummary.entity_counts).reduce((total, count) => total + count, 0)) : "Unavailable", false],
            ["Restore posture", loadingBackupReadiness ? "Loading..." : backupReadiness ? backupReadiness.restore_supported ? "Supported" : "Not implemented" : "Unavailable", false],
            ["File content", loadingExportSummary ? "Loading..." : exportSummary ? exportSummary.includes_file_content ? "Included" : "Metadata only" : "Unavailable", false],
            ["File backup", loadingBackupReadiness ? "Loading..." : backupReadiness ? backupReadiness.file_binary_backup_ready ? "Covered" : `${backupReadiness.upload_backend} gap` : "Unavailable", backupReadiness?.file_binary_backup_ready],
            ["Delete blockers", loadingDeleteReadiness ? "Loading..." : deleteReadiness ? String(deleteReadiness.blocking_conditions.length) : "Unavailable", false],
          ] as [string, string, boolean | undefined][]).map(([label, value, highlight]) => (
            <div key={label} style={{ ...ds.card, padding: "14px 18px", ...(highlight ? { borderLeft: `4px solid ${ds.accent}` } : {}) }}>
              <strong style={{ fontSize: 12, color: "#737373", fontWeight: 600 }}>{label}</strong>
              <span style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 500, display: "block", marginTop: 4 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "14px 18px", background: "#FAFAFA", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={ds.small}>
            {exportSummary?.notes[0] ??
              "Exports are currently JSON snapshots of structured tenant state for portability, auditability, and later delete/export posture."}
          </p>
          {backupReadiness ? <p style={ds.small}>{backupReadiness.notes[0]}</p> : null}
          {deleteReadiness ? <p style={ds.small}>{deleteReadiness.notes[0]}</p> : null}
          {exportSummary ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(exportSummary.entity_counts).slice(0, 6).map(([key, count]) => (
                <span key={`export-${key}`} style={ds.countPill}>{key.replace(/_/g, " ")}: {count}</span>
              ))}
            </div>
          ) : null}
          {deleteReadiness?.blocking_conditions.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {deleteReadiness.blocking_conditions.map((item) => (
                <span key={`delete-${item}`} style={{ ...ds.countPill, background: "#FEF2F2", color: ds.danger }}>{item}</span>
              ))}
            </div>
          ) : null}
          {backupReadiness?.blocking_conditions.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {backupReadiness.blocking_conditions.map((item) => (
                <span key={`backup-${item}`} style={{ ...ds.countPill, background: "#FFFBEB", color: ds.warning }}>{item}</span>
              ))}
            </div>
          ) : null}
          {canGenerateOrganizationExport ? (
            <button style={{ ...ds.btnSecondary, alignSelf: "flex-start", marginTop: 4 }} onClick={onGenerateOrganizationExport} disabled={exportingOrganization}>
              {exportingOrganization ? "Generating export..." : "Generate export snapshot"}
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "#A3A3A3", fontStyle: "italic" }}>Organization export generation is limited to admin roles.</span>
          )}
        </div>
      </section>

      {/* ── Operator session ─────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Access</p>
        <h2 style={ds.sectionTitle}>Operator session</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>The shell now expects a real Firebase-backed identity. That is what gives audit, tenancy, and uploads a trustworthy operator context.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Identity card */}
          <div style={{ ...ds.card, ...(sessionActive ? { borderLeft: `4px solid ${ds.accent}` } : {}) }}>
            <strong style={{ fontSize: 15, color: "#0A0A0A" }}>{authUserName}</strong>
            <span style={{ fontSize: 13, color: "#737373", display: "block", marginTop: 2 }}>{authUserEmail}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <span style={{
                ...ds.countPill,
                ...(sessionActive ? { background: "#F0EDFD", color: ds.accent } : {}),
              }}>
                {securityPosture?.authentication_mode ?? authenticationMode}
              </span>
              <span style={{ fontSize: 12, color: "#737373" }}>{authUserRole.replace(/_/g, " ")}</span>
            </div>
          </div>

          {sessionActive ? (
            <div style={{ padding: "14px 18px", background: "#FAFAFA", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={ds.small}>
                You are signed in with a governed Firebase identity. VOIS is now reading the backend-enforced auth path
                instead of relying on local bootstrap shortcuts.
              </p>
              <button style={{ ...ds.btnSecondary, alignSelf: "flex-start" }} onClick={onLogout} disabled={logoutBusy}>
                {logoutBusy ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <div style={{ padding: "14px 18px", background: "#FAFAFA", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={ds.small}>
                You are currently signed out. Use your real Firebase account to exercise the governed auth layer.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#737373" }}>Email</span>
                  <input
                    style={ds.input}
                    value={loginEmail}
                    onChange={(event) => onLoginEmailChange(event.target.value)}
                    placeholder="operator@ois.local"
                    autoComplete="username"
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#737373" }}>Password</span>
                  <input
                    style={ds.input}
                    type="password"
                    value={loginPassword}
                    onChange={(event) => onLoginPasswordChange(event.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button style={ds.btnPrimary} onClick={onLogin} disabled={loginBusy}>
                  {loginBusy ? "Signing in..." : "Sign in"}
                </button>
                <span style={{ fontSize: 12, color: "#A3A3A3", fontStyle: "italic" }}>Use your real Firebase password for this role account.</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Session inventory ────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Session inventory</p>
        <h2 style={ds.sectionTitle}>Active operator sessions</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>This is where enterprise trust starts to feel real: who is signed in, how recently they were seen, and which sessions can be closed cleanly.</p>

        {sessionActive ? (
          <>
            {sessionInventoryAvailable ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 4 }} role="tablist" aria-label="Session scope">
                    <button style={ds.pill(sessionInventoryScope === "self")} onClick={() => onSessionInventoryScopeChange("self")}>
                      My sessions
                    </button>
                    {canInspectOrganizationSessions ? (
                      <button style={ds.pill(sessionInventoryScope === "organization")} onClick={() => onSessionInventoryScopeChange("organization")}>
                        Organization
                      </button>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 12, color: "#A3A3A3" }}>
                    {loadingSessionInventory
                      ? "Refreshing session inventory..."
                      : sessionInventory
                        ? `${sessionInventory.sessions.length} session(s)`
                        : "No session inventory loaded yet."}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                    <div style={{ ...ds.card, padding: "14px 18px" }}>
                      <strong style={{ fontSize: 13, color: "#0A0A0A" }}>No sessions visible</strong>
                      <span style={{ fontSize: 13, color: "#737373", display: "block", marginTop: 2 }}>The inventory is empty or still loading.</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ ...ds.card, padding: "14px 18px" }}>
                <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Token-based auth is active</strong>
                <span style={{ fontSize: 13, color: "#737373", display: "block", marginTop: 2 }}>
                  This rollout is using Firebase ID tokens directly. Managed server-session inventory will stay empty
                  until VOIS adds backend session cookies as a later phase.
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ ...ds.card, padding: "14px 18px" }}>
            <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Session inventory needs a real session</strong>
            <span style={{ fontSize: 13, color: "#737373", display: "block", marginTop: 2 }}>Sign in first so session management and revocation work through the governed path.</span>
          </div>
        )}
      </section>

      {/* ── Session memory ───────────────────── */}
      <section style={ds.card}>
        <p style={ds.eyebrow}>Session memory</p>
        <h2 style={ds.sectionTitle}>Restore the shell</h2>
        <p style={{ ...ds.small, marginTop: 4, marginBottom: 20 }}>These controls help you get the homecoming feel back quickly without touching browser storage by hand.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          <button
            style={ds.tile}
            onClick={onResetWelcome}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
          >
            <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Replay landing</strong>
            <span style={{ fontSize: 13, color: "#737373" }}>Show the welcome overlay again</span>
          </button>
          <button
            style={ds.tile}
            onClick={onRestoreDefaults}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}
          >
            <strong style={{ fontSize: 13, color: "#0A0A0A" }}>Restore defaults</strong>
            <span style={{ fontSize: 13, color: "#737373" }}>Reset theme, skin, sidebar, and route memory</span>
          </button>
        </div>
      </section>
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
  const statusColor = session.revoked_at ? "#EF4444" : session.is_active ? "#10B981" : "#A3A3A3";

  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "16px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
      ...(session.is_current ? { borderLeft: "4px solid #6C5CE7" } : {}),
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
        <strong style={{ fontSize: 14, color: "#0A0A0A" }}>{session.user_full_name}</strong>
        <span style={{ fontSize: 13, color: "#737373" }}>{session.user_email}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: `${statusColor}15`, color: statusColor }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
            {statusLabel}
          </span>
          <span style={{ fontSize: 11, color: "#A3A3A3" }}>
            {session.is_current ? "current session" : `expires ${formatCompactDate(session.expires_at)}`}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#A3A3A3", marginTop: 2 }}>
          Last seen {formatCompactDate(session.last_seen_at ?? session.created_at)}. Issued by {session.issued_by_name ?? "unknown"}.
        </span>
      </div>
      <button
        style={{ background: "#FFFFFF", color: "#0A0A0A", border: "1px solid #E5E5E5", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
        onClick={() => onRevoke(session.id)}
        disabled={revoking}
      >
        {revoking ? "Revoking..." : session.is_current ? "Sign out this session" : "Revoke"}
      </button>
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
