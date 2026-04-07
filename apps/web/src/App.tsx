import { useEffect, useMemo, useState } from "react";

import {
  AssessmentHistoryItem,
  AssessmentRecord,
  AuthEntryConfig,
  AuthSecurityPosture,
  AuthSessionResponse,
  AuthSessionInventory,
  AuditEntryRecord,
  BootstrapResponse,
  CopilotActionPreview,
  CopilotActionReceipt,
  CopilotActionRecord,
  CopilotActionType,
  CopilotAttachment,
  CopilotMessageRecord,
  CopilotSearchResponse,
  CopilotThreadDetail,
  CopilotThreadContext,
  CopilotThreadSummary,
  EnhancedReportResponse,
  EngineRunResponse,
  IntakePreviewResponse,
  IntegrationConnectorRecord,
  IntegrationEventRecord,
  IntegrationHealthSummary,
  OrganizationBackupReadiness,
  OrganizationDeleteReadiness,
  OrganizationMember,
  OrganizationExportSummary,
  OntologyAlignmentSummaryResponse,
  OntologyAuthoringBriefResponse,
  OntologyBundleResponse,
  OntologyEvaluationPackResult,
  OntologyEvaluationPackSummary,
  OntologyGovernanceSummaryResponse,
  PortfolioSummaryResponse,
  PersistedEngineRunDetailRecord,
  PersistedEngineRunRecord,
  PlanExecutionSummary,
  PlanRecord,
  ProgressEntryRecord,
  ProvisionedLoginPacket,
  Venue,
  applyAssessmentSignalSuggestion,
  claimOwnerSetup,
  commitCopilotAction,
  fetchAuthEntryConfig,
  createAssessment,
  createOrganizationMember,
  createProgressEntry,
  createVenue,
  fetchAssessment,
  fetchAssessmentHistory,
  fetchAuthSecurityPosture,
  fetchAuthSession,
  fetchAuditEntries,
  fetchBootstrap,
  fetchCopilotThread,
  fetchCopilotThreadActions,
  fetchCopilotThreads,
  fetchCopilotThreadContext,
  fetchEnhancedReport,
  fetchEngineRunDetail,
  fetchEngineRunHistory,
  fetchIntegrationConnectors,
  fetchIntegrationEvents,
  fetchIntegrationSummary,
  fetchOrganizationBackupReadiness,
  fetchOrganizationDeleteReadiness,
  fetchOrganizationExportSummary,
  fetchOrganizationMembers,
  fetchActiveExecutionSummary,
  fetchActivePlan,
  fetchLatestEngineRun,
  fetchLatestExecutionSummary,
  fetchLatestPlan,
  fetchOntologyAlignment,
  fetchOntologyAuthoringBrief,
  fetchOntologyBundle,
  fetchOntologyEvaluationPacks,
  fetchOntologyGovernance,
  fetchPlan,
  fetchPlanExecutionSummary,
  fetchPortfolioSummary,
  fetchProgressEntries,
  fetchSessionInventory,
  loginLocalSession,
  loginSession,
  logoutSession,
  previewIntake,
  previewCopilotAction,
  retryIntegrationEvent,
  runAIIntake,
  runSavedAssessment,
  revokeManagedSession,
  sendCopilotMessage,
  searchCopilotWorkspace,
  setAuthToken,
  subscribeToAuthTokenChanges,
  createCopilotThread,
  updateCopilotThread,
  deleteCopilotThread,
  branchCopilotThread,
  generateOrganizationExport,
  runOntologyEvaluationPack,
  updatePlan,
  updatePlanTask,
  updatePlanTaskStatus,
  updateOrganizationMember,
  updateOrganizationMemberVenueAccess,
  createCopilotPlanSuggestion,
  PlanUpdatePayload,
  PlanTaskUpdatePayload,
  NextActionItem,
  FollowUpRecord,
  HelpRequestRecord,
  EscalationRecord,
  EvidenceRecord,
  fetchNextActions,
  fetchFollowUps,
  fetchEscalations,
  fetchEvidence,
  createFollowUp,
  createEvidence,
  createEscalation,
  resolveEscalation,
  updateFollowUp,
  MyShiftResponse,
  StandardItem,
  ShiftDiaryEntry,
  fetchMyShift,
  fetchMyStandards,
  fetchShiftDiary,
  fetchHelpRequests,
  reportFriction,
  createHelpRequest,
  createShiftDiaryEntry,
  updateHelpRequest,
  TeamProfile,
  OverloadEntry,
  FlightRiskEntry,
  ExecutionVelocity,
  DelegationEntry,
  AttentionItem,
  VenueOntologyBindingRecord,
  fetchTeamProfiles,
  fetchOverloadMap,
  fetchFlightRisk,
  fetchExecutionVelocity,
  fetchDelegations,
  fetchAttentionItems,
  fetchVenueOntologyBinding,
  resetOrganizationMemberLogin,
  KBArticleRecord,
  fetchKBArticles,
} from "./lib/api";
import { firebaseConfigured } from "./lib/firebase";
import { SectionCard } from "./components/SectionCard";
import { CopilotDrawer } from "./features/copilot/CopilotDrawer";
import { CopilotWorkspace } from "./features/copilot/CopilotWorkspace";
import { TourOverlay } from "./features/tours/TourOverlay";
import { tourForRole } from "./features/tours/tourDefinitions";
import { useTour } from "./features/tours/useTour";
import { RoleCopilotState } from "./features/copilot/RoleCopilotState";
import { MobileTabStrip } from "./features/shell/MobileTabStrip";
import { NotificationBell } from "./features/shell/NotificationBell";
import {
  buildHash,
  loadShellPreferences,
  parseHash,
  persistShellPreferences,
} from "./features/shell/navigation";
import { RoleWorkspaceFrame } from "./features/shell/RoleWorkspaceFrame";
import { Sidebar } from "./features/shell/Sidebar";
import { TopBar } from "./features/shell/TopBar";
import { WelcomeOverlay } from "./features/shell/WelcomeOverlay";
import {
  DEFAULT_PREFERENCES,
  ManagerView,
  OwnerView,
  PocketView,
  ShellPreferences,
  ShellRoute,
  SkinId,
  ThemeMode,
  VenueSubview,
} from "./features/shell/types";
import { AssessmentView } from "./features/views/AssessmentView";
import {
  DEFAULT_ASSESSMENT_TYPE,
  normalizeAssessmentTriageSettings,
  type AssessmentTypeKey,
  type TriageIntensity,
  isAssessmentTypeKey,
} from "./features/assessment/assessmentTypes";
import { SignalsReviewView } from "./features/views/SignalsReviewView";
import { ConsoleView } from "./features/views/ConsoleView";
import { HistoryView } from "./features/views/HistoryView";
import { HelpView } from "./features/views/HelpView";
import { KnowledgeBaseView } from "./features/views/KnowledgeBaseView";
import { PlanView } from "./features/views/PlanView";
import { PortfolioView } from "./features/views/PortfolioView";
import { ReferenceView } from "./features/views/ReferenceView";
import { ReportView } from "./features/views/ReportView";
import { SettingsView } from "./features/views/SettingsView";
import { VenueOverviewView } from "./features/views/VenueOverviewView";
import { TodayBoard } from "./features/manager/TodayBoard";
import { ExecutionWorkspace } from "./features/manager/ExecutionWorkspace";
import { EvidenceHub } from "./features/manager/EvidenceHub";
import { TeamPulse } from "./features/manager/TeamPulse";
import { EscalationChannel } from "./features/manager/EscalationChannel";
import { ManagerCopilot } from "./features/manager/ManagerCopilot";
import { OwnerCopilot } from "./features/owner/OwnerCopilot";
import { MyShift } from "./features/pocket/MyShift";
import { PocketTaskDetail } from "./features/pocket/PocketTaskDetail";
import { MyStandards } from "./features/pocket/MyStandards";
import { AskForHelp } from "./features/pocket/AskForHelp";
import { ReportSomething } from "./features/pocket/ReportSomething";
import { MyLog } from "./features/pocket/MyLog";
import { SignalIntelligenceMap } from "./features/intelligence/SignalIntelligenceMap";
import { OwnerAdministrationView } from "./features/owner/OwnerAdministrationView";
import { OwnerPeopleView } from "./features/owner/OwnerPeopleView";
import { CommandCenter } from "./features/owner/CommandCenter";
import { DelegationConsole } from "./features/owner/DelegationConsole";
import { OwnerSetupView } from "./features/setup/OwnerSetupView";
import { AuthRouterScreen } from "./features/auth/AuthRouterScreen";
import { AuthUnavailableScreen } from "./features/auth/AuthUnavailableScreen";
import { InviteAcceptanceScreen } from "./features/auth/InviteAcceptanceScreen";
import { LocalBootstrapScreen } from "./features/auth/LocalBootstrapScreen";
import { NoAccessScreen } from "./features/auth/NoAccessScreen";
import { PasswordResetScreen } from "./features/auth/PasswordResetScreen";
import { buildHistoryComparison } from "./features/views/historyInsights";
import { buildReportComparison } from "./features/views/reportInsights";
import { ToastProvider } from "./components/Toast";
import { DrawerProvider, StackingDrawerHost } from "./components/StackingDrawer";
import { CommandPalette, useCommandPalette } from "./components/CommandPalette";
import Icon from "./components/Icon";

const sampleIntakeNotes: Array<{ id: string; label: string; text: string }> = [];

function fileToCopilotAttachment(file: File): Promise<CopilotAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Failed to read ${file.name}`));
        return;
      }
      const [, contentBase64 = ""] = reader.result.split(",", 2);
      resolve({
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        content_base64: contentBase64,
      });
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

type AuthPathState = {
  pathname: string;
  search: string;
  inviteToken: string | null;
  resetToken: string | null;
  inviteQueryToken: string | null;
  emailHint: string;
  isAuthRoute: boolean;
  isAuthRoot: boolean;
  isLocalAuth: boolean;
  isInvite: boolean;
  isReset: boolean;
  isClaimOwner: boolean;
};

function readAuthPathState(): AuthPathState {
  if (typeof window === "undefined") {
    return {
      pathname: "/auth",
      search: "",
      inviteToken: null,
      resetToken: null,
      inviteQueryToken: null,
      emailHint: "",
      isAuthRoute: true,
      isAuthRoot: true,
      isLocalAuth: false,
      isInvite: false,
      isReset: false,
      isClaimOwner: false,
    };
  }

  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);
  const inviteMatch = pathname.match(/^\/auth\/invite\/([^/?#]+)$/);

  return {
    pathname,
    search,
    inviteToken: inviteMatch ? decodeURIComponent(inviteMatch[1]) : null,
    resetToken: params.get("token"),
    inviteQueryToken: params.get("invite"),
    emailHint: params.get("email") ?? "",
    isAuthRoute: pathname === "/auth" || pathname === "/auth/local" || pathname === "/auth/reset" || /^\/auth\/invite\/[^/?#]+$/.test(pathname),
    isAuthRoot: pathname === "/auth",
    isLocalAuth: pathname === "/auth/local",
    isInvite: /^\/auth\/invite\/[^/?#]+$/.test(pathname),
    isReset: pathname === "/auth/reset",
    isClaimOwner: pathname === "/setup/claim-owner",
  };
}

function navigatePath(nextPath: string, replace = false) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(nextPath, window.location.origin);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (replace) {
    window.history.replaceState({}, "", next);
  } else {
    window.history.pushState({}, "", next);
  }
}

export default function App() {
  const [authPath, setAuthPath] = useState<AuthPathState>(() => readAuthPathState());
  const [authEntryConfig, setAuthEntryConfig] = useState<AuthEntryConfig | null>(null);
  const [loadingAuthEntryConfig, setLoadingAuthEntryConfig] = useState(true);
  const [authEntryError, setAuthEntryError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ShellPreferences>(() => {
    const stored = loadShellPreferences();
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
      lastRoute: stored.lastRoute ?? DEFAULT_PREFERENCES.lastRoute,
    };
  });
  const [shellRoute, setShellRoute] = useState<ShellRoute>({ topLevelView: "portfolio" });
  const [shellInitialized, setShellInitialized] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(
    preferences.lastRoute.topLevelView === "venue" ? preferences.lastRoute.venueId : null
  );
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotWorkspaceOpen, setCopilotWorkspaceOpen] = useState(false);
  const [copilotPreFill, setCopilotPreFill] = useState<string | null>(null);
  const [referenceSearch, setReferenceSearch] = useState("");
  const [authSession, setAuthSession] = useState<AuthSessionResponse | null>(null);
  const [securityPosture, setSecurityPosture] = useState<AuthSecurityPosture | null>(null);
  const [sessionInventory, setSessionInventory] = useState<AuthSessionInventory | null>(null);
  const [sessionInventoryScope, setSessionInventoryScope] = useState<"self" | "organization">("self");
  const [organizationExportSummary, setOrganizationExportSummary] = useState<OrganizationExportSummary | null>(null);
  const [organizationBackupReadiness, setOrganizationBackupReadiness] = useState<OrganizationBackupReadiness | null>(null);
  const [organizationDeleteReadiness, setOrganizationDeleteReadiness] = useState<OrganizationDeleteReadiness | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [venueOntologyBindings, setVenueOntologyBindings] = useState<VenueOntologyBindingRecord[]>([]);
  const [ontologyBundle, setOntologyBundle] = useState<OntologyBundleResponse | null>(null);
  const [ontologyAlignment, setOntologyAlignment] = useState<OntologyAlignmentSummaryResponse | null>(null);
  const [ontologyGovernance, setOntologyGovernance] = useState<OntologyGovernanceSummaryResponse | null>(null);
  const [ontologyAuthoringBrief, setOntologyAuthoringBrief] = useState<OntologyAuthoringBriefResponse | null>(null);
  const [ontologyEvaluationPacks, setOntologyEvaluationPacks] = useState<OntologyEvaluationPackSummary[]>([]);
  const [ontologyEvaluationResult, setOntologyEvaluationResult] = useState<OntologyEvaluationPackResult | null>(null);
  const [integrationConnectors, setIntegrationConnectors] = useState<IntegrationConnectorRecord[]>([]);
  const [integrationSummary, setIntegrationSummary] = useState<IntegrationHealthSummary | null>(null);
  const [integrationEvents, setIntegrationEvents] = useState<IntegrationEventRecord[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummaryResponse | null>(null);
  const [engineResult, setEngineResult] = useState<EngineRunResponse | null>(null);
  const [enhancedReport, setEnhancedReport] = useState<EnhancedReportResponse | null>(null);
  const [intakePreview, setIntakePreview] = useState<IntakePreviewResponse | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryItem[]>([]);
  const [savedAssessment, setSavedAssessment] = useState<AssessmentRecord | null>(null);
  const [latestPlan, setLatestPlan] = useState<PlanRecord | null>(null);
  const [executionSummary, setExecutionSummary] = useState<PlanExecutionSummary | null>(null);
  const [livePlan, setLivePlan] = useState<PlanRecord | null>(null);
  const [liveExecutionSummary, setLiveExecutionSummary] = useState<PlanExecutionSummary | null>(null);
  // "viewedPlan" is the currently displayed plan — may be the live active plan,
  // the latest generated draft, or a historical selection.  Execution mutations
  // are gated by plan.status === "active" (enforced in PlanView and backend).
  // Law 1: only the active plan is execution truth.
  const [viewedPlan, setViewedPlan] = useState<PlanRecord | null>(null);
  const [viewedExecutionSummary, setViewedExecutionSummary] = useState<PlanExecutionSummary | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [progressEntries, setProgressEntries] = useState<ProgressEntryRecord[]>([]);
  const [engineRunHistory, setEngineRunHistory] = useState<PersistedEngineRunRecord[]>([]);
  const [selectedEngineRunId, setSelectedEngineRunId] = useState<string | null>(null);
  const [selectedEngineRunDetail, setSelectedEngineRunDetail] = useState<PersistedEngineRunDetailRecord | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntryRecord[]>([]);
  const [copilotThreads, setCopilotThreads] = useState<CopilotThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<CopilotThreadDetail | null>(null);
  const [selectedThreadContext, setSelectedThreadContext] = useState<CopilotThreadContext | null>(null);
  const [selectedThreadActions, setSelectedThreadActions] = useState<CopilotActionRecord[]>([]);
  const [loadingCopilotActions, setLoadingCopilotActions] = useState(false);
  const [copilotActionPreview, setCopilotActionPreview] = useState<CopilotActionPreview | null>(null);
  const [copilotActionPreviewRequest, setCopilotActionPreviewRequest] = useState<{
    action_type: CopilotActionType;
    message_id?: string | null;
    task_id?: string | null;
    severity?: string | null;
    due_at?: string | null;
    signal_additions?: Array<{ signal_id: string; notes?: string | null; confidence?: string | null }>;
    signal_removals?: string[];
  } | null>(null);
  const [copilotActionReceipt, setCopilotActionReceipt] = useState<CopilotActionReceipt | null>(null);
  const [previewingCopilotActionType, setPreviewingCopilotActionType] = useState<CopilotActionType | null>(null);
  const [committingCopilotActionType, setCommittingCopilotActionType] = useState<CopilotActionType | null>(null);
  const [copilotQuotedMessageId, setCopilotQuotedMessageId] = useState<string | null>(null);
  const [copilotSearchQuery, setCopilotSearchQuery] = useState("");
  const [copilotSearchResults, setCopilotSearchResults] = useState<CopilotSearchResponse | null>(null);
  const [copilotVisibilityFilter, setCopilotVisibilityFilter] = useState<"all" | "shared" | "private">("all");
  const [copilotSortMode, setCopilotSortMode] = useState<"recent" | "title" | "created">("recent");
  const [copilotIncludeArchived, setCopilotIncludeArchived] = useState(false);
  const [copilotWorkspaceActionMessage, setCopilotWorkspaceActionMessage] = useState<string | null>(null);
  const [intakeText, setIntakeText] = useState("");
  const [assessmentType, setAssessmentType] = useState<AssessmentTypeKey>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_ASSESSMENT_TYPE;
    }
    const stored = window.localStorage.getItem("vois_default_assessment_type");
    return isAssessmentTypeKey(stored) ? stored : DEFAULT_ASSESSMENT_TYPE;
  });
  const [triageEnabled, setTriageEnabled] = useState(() => normalizeAssessmentTriageSettings(assessmentType).enabled);
  const [triageIntensity, setTriageIntensity] = useState<TriageIntensity | null>(
    () => normalizeAssessmentTriageSettings(assessmentType).intensity
  );
  const [rejectedSignalIds, setRejectedSignalIds] = useState<Set<string>>(new Set());
  const [manuallyAddedSignalIds, setManuallyAddedSignalIds] = useState<Set<string>>(new Set());
  const [managementHours, setManagementHours] = useState(10);
  const [weeklyBudget, setWeeklyBudget] = useState(24);
  const [progressSummary, setProgressSummary] = useState("");
  const [progressDetail, setProgressDetail] = useState("");
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotAttachments, setCopilotAttachments] = useState<CopilotAttachment[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [loadingOntology, setLoadingOntology] = useState(true);
  const [kbArticles, setKbArticles] = useState<KBArticleRecord[]>([]);
  const [loadingKbArticles, setLoadingKbArticles] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [loadingIntegrationEvents, setLoadingIntegrationEvents] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingExecution, setLoadingExecution] = useState(false);
  const [loadingPlanSelection, setLoadingPlanSelection] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingEngineRunDetail, setLoadingEngineRunDetail] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingCopilot, setLoadingCopilot] = useState(false);
  const [searchingCopilot, setSearchingCopilot] = useState(false);
  const [analyzingIntake, setAnalyzingIntake] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [loadingAssessmentRecordId, setLoadingAssessmentRecordId] = useState<string | null>(null);
  const [runningEngine, setRunningEngine] = useState(false);
  const [loadingEnhancedReport, setLoadingEnhancedReport] = useState(false);
  const [applyingSignalSuggestion, setApplyingSignalSuggestion] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [sendingCopilot, setSendingCopilot] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingSecurityPosture, setLoadingSecurityPosture] = useState(false);
  const [loadingSessionInventory, setLoadingSessionInventory] = useState(false);
  const [loadingExportSummary, setLoadingExportSummary] = useState(false);
  const [loadingBackupReadiness, setLoadingBackupReadiness] = useState(false);
  const [loadingDeleteReadiness, setLoadingDeleteReadiness] = useState(false);
  const [exportingOrganization, setExportingOrganization] = useState(false);
  const [retryingIntegrationEventId, setRetryingIntegrationEventId] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [dismissedSignalSuggestionIds, setDismissedSignalSuggestionIds] = useState<string[]>([]);
  const [copilotIssue, setCopilotIssue] = useState<string | null>(null);
  const [ownerMembers, setOwnerMembers] = useState<OrganizationMember[]>([]);
  const [loadingOwnerMembers, setLoadingOwnerMembers] = useState(false);
  const [workspaceSetupBusy, setWorkspaceSetupBusy] = useState(false);
  const [latestLoginPacket, setLatestLoginPacket] = useState<ProvisionedLoginPacket | null>(null);
  const [developerChromeHidden, setDeveloperChromeHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vois_default_assessment_type", assessmentType);
    }
  }, [assessmentType]);

  // ─── Manager shell ECL state ───
  const [mgrNextActions, setMgrNextActions] = useState<NextActionItem[]>([]);
  const [mgrFollowUps, setMgrFollowUps] = useState<FollowUpRecord[]>([]);
  const [mgrEscalations, setMgrEscalations] = useState<EscalationRecord[]>([]);
  const [mgrEvidence, setMgrEvidence] = useState<EvidenceRecord[]>([]);
  const [mgrLoading, setMgrLoading] = useState(false);
  const [mgrSelectedTaskId, setMgrSelectedTaskId] = useState<string | null>(null);
  const [mgrResolvingEscalationId, setMgrResolvingEscalationId] = useState<string | null>(null);

  // ─── Pocket shell state ───
  const [pktShift, setPktShift] = useState<MyShiftResponse | null>(null);
  const [pktStandards, setPktStandards] = useState<StandardItem[]>([]);
  const [pktDiary, setPktDiary] = useState<ShiftDiaryEntry[]>([]);
  const [pktHelpRequests, setPktHelpRequests] = useState<HelpRequestRecord[]>([]);
  const [pktLoading, setPktLoading] = useState(false);
  const [pktSubmitting, setPktSubmitting] = useState(false);
  const [pktSelectedTaskId, setPktSelectedTaskId] = useState<string | null>(null);

  // ─── Owner shell state ───
  const [ownAttentionItems, setOwnAttentionItems] = useState<AttentionItem[]>([]);
  const [ownTeamProfiles, setOwnTeamProfiles] = useState<TeamProfile[]>([]);
  const [ownOverloadMap, setOwnOverloadMap] = useState<OverloadEntry[]>([]);
  const [ownFlightRisk, setOwnFlightRisk] = useState<FlightRiskEntry[]>([]);
  const [ownVelocities, setOwnVelocities] = useState<ExecutionVelocity[]>([]);
  const [ownDelegations, setOwnDelegations] = useState<DelegationEntry[]>([]);
  const [ownLoading, setOwnLoading] = useState(false);
  const [portfolioVelocities, setPortfolioVelocities] = useState<ExecutionVelocity[]>([]);

  const workspaceVenue = useMemo(() => {
    if (!bootstrap) {
      return null;
    }
    return bootstrap.venues.find((venue) => venue.id === selectedVenueId) ?? bootstrap.venues[0] ?? null;
  }, [bootstrap, selectedVenueId]);

  const activeRole = authSession?.user.role ?? bootstrap?.current_user.role ?? null;
  const roleTour = useMemo(() => tourForRole(activeRole), [activeRole]);
  const tour = useTour(roleTour ?? { id: "none", steps: [] });
  const { open: cmdPaletteOpen, setOpen: setCmdPaletteOpen } = useCommandPalette();
  const organizationId = bootstrap?.organization?.id ?? null;
  const ownerSetupState = bootstrap?.setup_state ?? authSession?.setup_state ?? null;
  const isAuthenticated = Boolean(authSession);
  const requiresOwnerClaim = activeRole === "owner" && Boolean(bootstrap?.requires_owner_claim ?? authSession?.requires_owner_claim);
  const noWorkspaceAccess =
    isAuthenticated &&
    !requiresOwnerClaim &&
    !loadingBootstrap &&
    Boolean(bootstrap) &&
    !bootstrap?.organization &&
    !ownerSetupState?.organization_claimed;
  const ownerNeedsVenueOnboarding =
    activeRole === "owner" &&
    Boolean(bootstrap?.organization_claimed ?? authSession?.organization_claimed) &&
    Boolean(organizationId) &&
    (bootstrap?.venues.length ?? 0) === 0;
  const userHasVenueAccess = (bootstrap?.venues.length ?? 0) > 0;
  const isDeveloperRole = activeRole === "developer";
  const sessionInventoryAvailable =
    authSession?.session.authentication_mode === "local_session" && Boolean(authSession.session.id);

  const selectedOntologyBinding = useMemo(() => {
    if (!workspaceVenue || !venueOntologyBindings.length) {
      return null;
    }
    return venueOntologyBindings.find((binding) => binding.venue_id === workspaceVenue.id) ?? null;
  }, [venueOntologyBindings, workspaceVenue]);
  const selectedOntologyMount = selectedOntologyBinding?.mount ?? null;
  const selectedOntologyId = selectedOntologyBinding?.ontology_id ?? null;
  const selectedOntologyVersion = selectedOntologyBinding?.ontology_version ?? null;
  const selectedOntologyLabel =
    selectedOntologyMount
      ? `${selectedOntologyMount.display_name} (${selectedOntologyMount.version})`
      : selectedOntologyBinding
        ? `${selectedOntologyBinding.ontology_id}@${selectedOntologyBinding.ontology_version}`
        : "Unbound";
  const selectedOntologyIssue = useMemo(() => {
    if (!workspaceVenue) {
      return null;
    }
    if (!selectedOntologyBinding) {
      return `${workspaceVenue.name} has no ontology binding. Bind the venue to a valid ontology pack before running venue workflows.`;
    }
    if (selectedOntologyBinding.binding_status !== "active") {
      return `${workspaceVenue.name} is bound to ${selectedOntologyBinding.ontology_id}@${selectedOntologyBinding.ontology_version}, but that binding is not active.`;
    }
    if (!selectedOntologyMount) {
      return `${workspaceVenue.name} is bound to ${selectedOntologyBinding.ontology_id}@${selectedOntologyBinding.ontology_version}, but the mount summary is missing.`;
    }
    if (!selectedOntologyMount.validation.mountable) {
      return `${workspaceVenue.name} is bound to ${selectedOntologyBinding.ontology_id}@${selectedOntologyBinding.ontology_version}, but the pack is not mountable for runtime execution.`;
    }
    return null;
  }, [selectedOntologyBinding, selectedOntologyMount, workspaceVenue]);

  useEffect(() => {
    const syncPath = () => setAuthPath(readAuthPathState());
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    setLoadingAuthEntryConfig(true);
    fetchAuthEntryConfig()
      .then((payload) => {
        setAuthEntryConfig(payload);
        setAuthEntryError(null);
      })
      .catch((err: Error) => {
        setAuthEntryError(err.message);
      })
      .finally(() => {
        setLoadingAuthEntryConfig(false);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthTokenChanges((token) => {
      if (!token) {
        setAuthToken(null);
        setError(null);
        setLoadingBootstrap(true);
        refreshWorkspaceIdentity(null)
          .catch((err: Error) => {
            setError(err.message);
            setAuthSession(null);
            setBootstrap(null);
            setVenueOntologyBindings([]);
            setShellInitialized(false);
            setSessionInventory(null);
          })
          .finally(() => {
            setLoadingBootstrap(false);
          });
        return;
      }

      setLoadingBootstrap(true);
      refreshWorkspaceIdentity()
        .catch((err: Error) => {
          setError(err.message);
          setBootstrap(null);
        })
        .finally(() => {
          setLoadingBootstrap(false);
        });
    });

    return unsubscribe;
  }, []);

  // Restore local session on startup (cookie-based auth without Firebase)
  useEffect(() => {
    if (firebaseConfigured()) return; // Firebase handler above covers this
    setLoadingBootstrap(true);
    fetchAuthSession()
      .then((session) => {
        if (session) {
          return refreshWorkspaceIdentity(session);
        }
        setAuthSession(null);
        setBootstrap(null);
      })
      .catch(() => {
        setAuthSession(null);
        setBootstrap(null);
      })
      .finally(() => {
        setLoadingBootstrap(false);
      });
  }, []);

  useEffect(() => {
    if (!loginEmail && bootstrap?.current_user.email) {
      setLoginEmail(bootstrap.current_user.email);
    }
  }, [bootstrap?.current_user.email, loginEmail]);

  useEffect(() => {
    if (loadingBootstrap) {
      return;
    }

    if (!authSession) {
      if (!authPath.isAuthRoute) {
        navigatePath("/auth", true);
        setAuthPath(readAuthPathState());
      }
      return;
    }

    if (requiresOwnerClaim) {
      if (!authPath.isClaimOwner) {
        navigatePath("/setup/claim-owner", true);
        setAuthPath(readAuthPathState());
      }
      return;
    }

    if (noWorkspaceAccess) {
      if (authPath.pathname !== "/auth/no-access") {
        navigatePath("/auth/no-access", true);
        setAuthPath(readAuthPathState());
      }
      return;
    }

    if (authPath.isInvite) {
      return;
    }

    if (authPath.isAuthRoute || authPath.isClaimOwner || authPath.pathname === "/auth/no-access") {
      const inviteToken = authPath.inviteQueryToken;
      if (inviteToken) {
        navigatePath(`/auth/invite/${encodeURIComponent(inviteToken)}`, true);
      } else {
        navigatePath("/", true);
      }
      setAuthPath(readAuthPathState());
    }
  }, [
    authPath,
    authSession,
    loadingBootstrap,
    noWorkspaceAccess,
    requiresOwnerClaim,
  ]);

  useEffect(() => {
    if (!bootstrap || !organizationId || (activeRole !== "owner" && activeRole !== "developer")) {
      setPortfolioSummary(null);
      setLoadingPortfolio(false);
      return;
    }

    setLoadingPortfolio(true);
    fetchPortfolioSummary()
      .then((payload) => {
        setPortfolioSummary(payload);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingPortfolio(false);
      });

    if (bootstrap.venues.length > 0) {
      Promise.all(bootstrap.venues.map((v) => fetchExecutionVelocity(v.id).catch(() => null)))
        .then((results) => setPortfolioVelocities(results.filter((r): r is ExecutionVelocity => r !== null)));
    }
  }, [activeRole, bootstrap?.current_user.id, organizationId]);

  useEffect(() => {
    if (!bootstrap) {
      setOntologyBundle(null);
      setOntologyAlignment(null);
      setOntologyGovernance(null);
      setOntologyAuthoringBrief(null);
      setOntologyEvaluationPacks([]);
      setOntologyEvaluationResult(null);
      setLoadingOntology(false);
      return;
    }
    if (!selectedOntologyId || !selectedOntologyVersion || selectedOntologyIssue) {
      setOntologyBundle(null);
      setOntologyAlignment(null);
      setOntologyGovernance(null);
      setOntologyAuthoringBrief(null);
      setOntologyEvaluationPacks([]);
      setOntologyEvaluationResult(null);
      setLoadingOntology(false);
      return;
    }

    setLoadingOntology(true);
    Promise.all([
      fetchOntologyBundle(selectedOntologyVersion, selectedOntologyId),
      fetchOntologyAlignment(selectedOntologyId, selectedOntologyVersion),
      fetchOntologyGovernance(selectedOntologyId, selectedOntologyVersion).catch(() => null),
      fetchOntologyAuthoringBrief(selectedOntologyId, selectedOntologyVersion).catch(() => null),
      fetchOntologyEvaluationPacks(selectedOntologyId).catch(() => []),
      fetchIntegrationConnectors().catch(() => []),
      fetchIntegrationSummary().catch(() => null),
      fetchIntegrationEvents({ limit: 12 }).catch(() => []),
    ])
      .then(([bundle, alignment, governance, authoringBrief, evaluationPacks, connectors, connectorSummary, connectorEvents]) => {
        setOntologyBundle(bundle);
        setOntologyAlignment(alignment);
        setOntologyGovernance(governance);
        setOntologyAuthoringBrief(authoringBrief);
        setOntologyEvaluationPacks(evaluationPacks);
        setIntegrationConnectors(connectors);
        setIntegrationSummary(connectorSummary);
        setIntegrationEvents(connectorEvents);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingOntology(false);
      });
  }, [organizationId, selectedOntologyId, selectedOntologyIssue, selectedOntologyVersion]);

  // ── KB articles ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    setLoadingKbArticles(true);
    fetchKBArticles()
      .then(setKbArticles)
      .catch(() => setKbArticles([]))
      .finally(() => setLoadingKbArticles(false));
  }, [organizationId]);

  useEffect(() => {
    if (activeRole !== "owner" || !organizationId) {
      setOwnerMembers([]);
      setLoadingOwnerMembers(false);
      return;
    }

    setLoadingOwnerMembers(true);
    fetchOrganizationMembers(organizationId)
      .then((members) => {
        setOwnerMembers(members);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingOwnerMembers(false);
      });
  }, [activeRole, organizationId, bootstrap?.venues.length]);

  useEffect(() => {
    if (!workspaceVenue) {
      return;
    }

    fetchVenueOntologyBinding(workspaceVenue.id)
      .then((binding) => {
        setVenueOntologyBindings((current) => {
          const next = current.filter((item) => item.venue_id !== binding.venue_id);
          next.push(binding);
          return next;
        });
      })
      .catch(() => {
        setVenueOntologyBindings((current) => current.filter((item) => item.venue_id !== workspaceVenue.id));
      });
  }, [workspaceVenue?.id]);

  useEffect(() => {
    if (!bootstrap || !organizationId) {
      setIntegrationEvents([]);
      setLoadingIntegrationEvents(false);
      return;
    }

    setLoadingIntegrationEvents(true);
    fetchIntegrationEvents({ limit: 12 })
      .then((events) => {
        setIntegrationEvents(events);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingIntegrationEvents(false);
      });
  }, [organizationId]);

  useEffect(() => {
    if (!bootstrap) {
      return;
    }

    setLoadingSecurityPosture(true);
    fetchAuthSecurityPosture()
      .then((payload) => {
        setSecurityPosture(payload);
        // Surface AI unavailability for real roles before they attempt
        // copilot interaction.
        if (
          activeRole &&
          activeRole !== "developer" &&
          !payload.ai_live_activation_ready
        ) {
          setCopilotIssue(
            "Live AI is not configured. Copilot, AI intake, and report enhancement are unavailable until an AI provider is set up."
          );
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingSecurityPosture(false);
      });
  }, [authSession?.user.id, organizationId]);

  useEffect(() => {
    if (!bootstrap || !organizationId) {
      return;
    }

    setLoadingExportSummary(true);
    setLoadingBackupReadiness(true);
    setLoadingDeleteReadiness(true);
    Promise.all([
      fetchOrganizationExportSummary(),
      fetchOrganizationBackupReadiness(),
      fetchOrganizationDeleteReadiness()
    ])
      .then(([exportPayload, backupPayload, deletePayload]) => {
        setOrganizationExportSummary(exportPayload);
        setOrganizationBackupReadiness(backupPayload);
        setOrganizationDeleteReadiness(deletePayload);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingExportSummary(false);
        setLoadingBackupReadiness(false);
        setLoadingDeleteReadiness(false);
      });
  }, [authSession?.user.id, organizationId]);

  useEffect(() => {
    if (!sessionInventoryAvailable) {
      setSessionInventory(null);
      setLoadingSessionInventory(false);
      return;
    }

    setLoadingSessionInventory(true);
    fetchSessionInventory(sessionInventoryScope)
      .then((payload) => {
        setSessionInventory(payload);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingSessionInventory(false);
      });
  }, [sessionInventoryAvailable, sessionInventoryScope]);

  useEffect(() => {
    if (sessionInventoryScope === "organization" && activeRole !== "owner" && activeRole !== "developer") {
      setSessionInventoryScope("self");
    }
  }, [activeRole, sessionInventoryScope]);

  useEffect(() => {
    if (shellRoute.topLevelView !== "kb") {
      return;
    }
    if (!selectedOntologyId || selectedOntologyIssue || !ontologyEvaluationPacks.length || ontologyEvaluationResult) {
      return;
    }

    setLoadingEvaluations(true);
    runOntologyEvaluationPack(ontologyEvaluationPacks[0].pack_id, selectedOntologyId)
      .then((payload) => {
        setOntologyEvaluationResult(payload);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingEvaluations(false);
      });
  }, [ontologyEvaluationPacks, ontologyEvaluationResult, selectedOntologyId, selectedOntologyIssue, shellRoute.topLevelView]);

  useEffect(() => {
    if (!bootstrap || shellInitialized) {
      return;
    }

    // Prefer the user's assigned venue, then fall back to first available
    const userVenueId = bootstrap.current_user.venue_id ?? null;
    const fallbackVenueId = userVenueId
      ? (bootstrap.venues.find((v) => v.id === userVenueId)?.id ?? bootstrap.venues[0]?.id ?? null)
      : (bootstrap.venues[0]?.id ?? null);

    if (activeRole === "manager" && window.location.hash.trim() === "" && fallbackVenueId) {
      const managerRoute: ShellRoute = { topLevelView: "manager", venueId: fallbackVenueId, managerView: "today" };
      setShellRoute(managerRoute);
      setSelectedVenueId(fallbackVenueId);
      setShellInitialized(true);
      return;
    }

    if (activeRole === "barista" && window.location.hash.trim() === "" && fallbackVenueId) {
      const pocketRoute: ShellRoute = { topLevelView: "pocket", venueId: fallbackVenueId, pocketView: "shift" };
      setShellRoute(pocketRoute);
      setSelectedVenueId(fallbackVenueId);
      setShellInitialized(true);
      return;
    }

    if (activeRole === "owner" && window.location.hash.trim() === "" && fallbackVenueId) {
      const ownerRoute: ShellRoute = { topLevelView: "owner", venueId: fallbackVenueId, ownerView: "command" };
      setShellRoute(ownerRoute);
      setSelectedVenueId(fallbackVenueId);
      setShellInitialized(true);
      return;
    }

    if (activeRole === "developer" && window.location.hash.trim() === "") {
      setShellRoute({ topLevelView: "settings" });
      setSelectedVenueId(fallbackVenueId);
      setShellInitialized(true);
      return;
    }

    const route =
      window.location.hash.trim() === ""
        ? preferences.lastRoute
        : parseHash(window.location.hash, fallbackVenueId);
    const resolvedRoute = coerceRouteForRole(
      sanitizeRoute(route, bootstrap.venues, fallbackVenueId),
      activeRole,
      fallbackVenueId
    );
    const preferredVenueId =
      resolvedRoute.topLevelView === "venue"
        ? resolvedRoute.venueId
        : resolvedRoute.topLevelView === "manager"
          ? (resolvedRoute as { venueId: string }).venueId
          : resolvedRoute.topLevelView === "pocket"
            ? (resolvedRoute as { venueId: string }).venueId
            : resolvedRoute.topLevelView === "owner"
              ? (resolvedRoute as { venueId: string }).venueId
              : preferences.lastRoute.topLevelView === "venue"
                ? preferences.lastRoute.venueId
                : fallbackVenueId;

    setShellRoute(resolvedRoute);
    setSelectedVenueId(preferredVenueId);
    setShellInitialized(true);
  }, [activeRole, bootstrap, preferences.lastRoute, shellInitialized]);

  useEffect(() => {
    if (!shellInitialized || !bootstrap) {
      return;
    }

    const onHashChange = () => {
      const fallbackVenueId = selectedVenueId ?? bootstrap.venues[0]?.id ?? null;
      const nextRoute = coerceRouteForRole(
        sanitizeRoute(parseHash(window.location.hash, fallbackVenueId), bootstrap.venues, fallbackVenueId),
        activeRole,
        fallbackVenueId
      );
      setShellRoute(nextRoute);
      if (nextRoute.topLevelView === "venue") {
        setSelectedVenueId(nextRoute.venueId);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [activeRole, bootstrap, selectedVenueId, shellInitialized]);

  useEffect(() => {
    if (!shellInitialized) {
      return;
    }

    const targetHash = buildHash(shellRoute);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }

    setPreferences((current) => ({ ...current, lastRoute: shellRoute }));
  }, [shellInitialized, shellRoute]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", preferences.theme);
    document.documentElement.setAttribute("data-skin", preferences.skin);
    persistShellPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (shellRoute.topLevelView === "venue") {
      setSelectedVenueId(shellRoute.venueId);
    }
  }, [shellRoute]);

  const displayedVenue = shellRoute.topLevelView === "venue" || shellRoute.topLevelView === "manager" || shellRoute.topLevelView === "pocket" || shellRoute.topLevelView === "owner" ? workspaceVenue : null;
  const inferredSignals = intakePreview?.detected_signals ?? [];
  const effectiveSignals = inferredSignals.filter((s) => !rejectedSignalIds.has(s.signal_id));
  const copilotVenueContext =
    shellRoute.topLevelView === "venue" ||
    shellRoute.topLevelView === "manager" ||
    shellRoute.topLevelView === "pocket" ||
    shellRoute.topLevelView === "owner"
      ? workspaceVenue?.id ?? null
      : null;
  const scopedCopilotThreads = useMemo(
    () => filterThreadsForScope(copilotThreads, copilotVenueContext, activeRole),
    [copilotThreads, copilotVenueContext, activeRole]
  );
  const copilotContextLabel = copilotVenueContext
    ? `${displayedVenue?.name ?? "Venue"}`
    : "Portfolio";
  const copilotContextSummary = copilotVenueContext
    ? shellRoute.topLevelView === "manager"
      ? "Saved venue threads for current operating work."
      : shellRoute.topLevelView === "pocket"
        ? "Saved help threads for this shift."
        : shellRoute.topLevelView === "owner"
          ? "Portfolio and venue threads relevant to this location."
          : "Saved venue threads grounded in the current workspace."
    : "Cross-venue threads for portfolio decisions.";
  const copilotInputPlaceholder = copilotVenueContext
    ? shellRoute.topLevelView === "manager"
      ? "Ask about blockers, task order, evidence, or venue state."
      : shellRoute.topLevelView === "pocket"
        ? "Ask about this shift, a standard, or a help request."
        : shellRoute.topLevelView === "owner"
          ? "Ask about pressure, people risk, delegation, or venue drift."
          : "Ask about the current venue state, blockers, files, or next moves."
    : "Ask about portfolio patterns, risk concentration, or where to intervene next.";
  const selectedPocketTask = useMemo(
    () => pktShift?.tasks.find((task) => task.id === pktSelectedTaskId) ?? null,
    [pktSelectedTaskId, pktShift]
  );
  const activePocketNavView =
    shellRoute.topLevelView === "pocket" && (shellRoute as { pocketView: PocketView }).pocketView === "task"
      ? "shift"
      : shellRoute.topLevelView === "pocket"
        ? (shellRoute as { pocketView: PocketView }).pocketView
        : undefined;

  const askCopilotAbout = (context: string) => {
    setCopilotPreFill(context);
    setCopilotOpen(true);
  };

  function titleCase(s: string) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const copilotScreenContext = useMemo(() => {
    const route = shellRoute;
    if (route.topLevelView === "portfolio") return "Portfolio overview";
    if (route.topLevelView === "venue") return `${displayedVenue?.name ?? "Venue"} — ${titleCase(route.venueView)}`;
    if (route.topLevelView === "manager") return `Manager — ${titleCase((route as any).managerView ?? "today")}`;
    if (route.topLevelView === "pocket") return `Shift — ${titleCase((route as any).pocketView ?? "shift")}`;
    if (route.topLevelView === "owner") return `Owner — ${titleCase((route as any).ownerView ?? "command")}`;
    if (route.topLevelView === "kb") return "Knowledge Base";
    if (route.topLevelView === "help") return "Help & Guidance";
    if (route.topLevelView === "settings") return "Settings";
    if (route.topLevelView === "reference") return `Reference — ${titleCase((route as any).referenceView ?? "blocks")}`;
    return null;
  }, [shellRoute, displayedVenue]);
  const quotedCopilotMessage = useMemo(
    () => selectedThread?.messages.find((message) => message.id === copilotQuotedMessageId) ?? null,
    [copilotQuotedMessageId, selectedThread]
  );

  // TODO: drawerContext requires a consumer for DrawerProvider state — skipping for now (Feature 1.3)

  const resumePulse =
    portfolioSummary?.venue_pulses.find((pulse) => pulse.venue_id === portfolioSummary.resume_venue_id) ?? null;
  const selectedEngineRun = useMemo(
    () => engineRunHistory.find((run) => run.engine_run_id === selectedEngineRunId) ?? engineRunHistory[0] ?? null,
    [engineRunHistory, selectedEngineRunId]
  );
  const reportComparison = useMemo(
    () => buildReportComparison(engineRunHistory, selectedEngineRunId),
    [engineRunHistory, selectedEngineRunId]
  );
  const historyComparison = useMemo(
    () => buildHistoryComparison(assessmentHistory, savedAssessment?.id ?? null),
    [assessmentHistory, savedAssessment?.id]
  );
  const loadedAssessmentFromHistory = Boolean(
    savedAssessment &&
      assessmentHistory.some((item) => item.id === savedAssessment.id) &&
      (savedAssessment.notes ?? "") === intakeText
  );
  const currentSurfaceLabel = useMemo(
    () => describeSurface(shellRoute, displayedVenue?.name ?? null),
    [displayedVenue?.name, shellRoute]
  );
  const roleFrameTitle =
    activeRole === "owner"
      ? bootstrap?.organization?.name ?? "Owner workspace"
      : displayedVenue?.name ?? bootstrap?.organization?.name ?? "Workspace";
  const roleFrameSubtitle =
    activeRole === "owner"
      ? "Own the portfolio, create venues, provision access, and step into the right workspace without developer chrome."
      : activeRole === "manager"
        ? "Operate the current venue from the live execution state."
        : activeRole === "barista"
          ? "Stay on the active shift with only the controls needed for frontline work."
          : "Developer diagnostics";
  const realRoleNavItems = activeRole === "owner"
    ? [
        {
          key: "portfolio",
          label: "Portfolio",
          active: shellRoute.topLevelView === "portfolio",
          onClick: () => navigate({ topLevelView: "portfolio" }),
        },
        {
          key: "operations",
          label: "Operations",
          active: shellRoute.topLevelView === "owner" && (shellRoute as { ownerView?: string }).ownerView === "command",
          onClick: () => workspaceVenue && navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: "command" }),
        },
        {
          key: "access",
          label: "People & access",
          active: shellRoute.topLevelView === "owner" && (shellRoute as { ownerView?: string }).ownerView === "people",
          onClick: () => {
            if (workspaceVenue) {
              navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: "people" });
            } else {
              navigate({ topLevelView: "portfolio" });
            }
          },
        },
        {
          key: "intelligence",
          label: "Intelligence",
          active: shellRoute.topLevelView === "owner" && (shellRoute as { ownerView?: string }).ownerView === "intelligence",
          onClick: () => workspaceVenue && navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: "intelligence" }),
        },
        {
          key: "reference",
          label: "Reference",
          active: shellRoute.topLevelView === "reference",
          onClick: () => navigate({ topLevelView: "reference", referenceView: "blocks" }),
        },
        {
          key: "kb",
          label: "Knowledge",
          active: shellRoute.topLevelView === "kb",
          onClick: () => navigate({ topLevelView: "kb" }),
        },
      ]
    : activeRole === "manager"
      ? [
          {
            key: "today",
            label: "Today",
            active: shellRoute.topLevelView === "manager" && (shellRoute as { managerView?: string }).managerView === "today",
            onClick: () => workspaceVenue && navigate({ topLevelView: "manager", venueId: workspaceVenue.id, managerView: "today" }),
          },
          {
            key: "workspace",
            label: "Workspace",
            active: shellRoute.topLevelView === "manager" && (shellRoute as { managerView?: string }).managerView === "workspace",
            onClick: () => workspaceVenue && navigate({ topLevelView: "manager", venueId: workspaceVenue.id, managerView: "workspace" }),
          },
          {
            key: "reference",
            label: "Reference",
            active: shellRoute.topLevelView === "reference",
            onClick: () => navigate({ topLevelView: "reference", referenceView: "blocks" }),
          },
          {
            key: "kb",
            label: "Knowledge",
            active: shellRoute.topLevelView === "kb",
            onClick: () => navigate({ topLevelView: "kb" }),
          },
        ]
      : activeRole === "barista"
        ? [
            {
              key: "shift",
              label: "My shift",
              active: shellRoute.topLevelView === "pocket" && (shellRoute as { pocketView?: string }).pocketView === "shift",
              onClick: () => workspaceVenue && navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: "shift" }),
            },
            {
              key: "standards",
              label: "Standards",
              active: shellRoute.topLevelView === "pocket" && (shellRoute as { pocketView?: string }).pocketView === "standards",
              onClick: () => workspaceVenue && navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: "standards" }),
            },
            {
              key: "help",
              label: "Ask manager",
              active: shellRoute.topLevelView === "pocket" && (shellRoute as { pocketView?: string }).pocketView === "help",
              onClick: () => workspaceVenue && navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: "help" }),
            },
        ]
      : [];
  const showDeveloperChrome = isDeveloperRole && !developerChromeHidden;
  const pendingSignalSuggestion = useMemo(
    () => extractPendingSignalSuggestion(selectedThread, dismissedSignalSuggestionIds),
    [dismissedSignalSuggestionIds, selectedThread]
  );
  const copilotActionSource = useMemo(() => deriveCopilotActionSource(selectedThread), [selectedThread]);
  const canApplyThreadSignalSuggestion = Boolean(savedAssessment && pendingSignalSuggestion);
  const copilotAvailableActions = useMemo(() => {
    const canManage = activeRole === "owner" || activeRole === "manager" || activeRole === "developer";
    const hasVenueScope = Boolean(workspaceVenue && selectedThread?.venue_id && workspaceVenue.id === selectedThread.venue_id);
    const hasAssistantSource = Boolean(copilotActionSource);
    const hasLivePlan = Boolean(hasVenueScope && livePlan && canManage);
    const hasAssessmentApply = Boolean(savedAssessment && pendingSignalSuggestion && canManage);

    return [
      {
        type: "save_note" as CopilotActionType,
        title: "Save note",
        description: "Save the latest helpful part of this conversation as a note.",
        mode: "save" as const,
        enabled: Boolean(hasVenueScope && hasAssistantSource),
        status: hasVenueScope && hasAssistantSource ? "Ready" : "Open a venue thread with copilot guidance in scope",
      },
      {
        type: "apply_to_assessment" as CopilotActionType,
        title: "Add to assessment",
        description: "Add the reviewed signal change from this thread into the saved assessment.",
        mode: "apply" as const,
        enabled: hasAssessmentApply,
        status: hasAssessmentApply ? "Ready" : "No reviewed signal update in scope",
      },
      {
        type: "create_diagnosis_note" as CopilotActionType,
        title: "Save to diagnosis",
        description: "Keep this reasoning with the venue diagnosis for later reference.",
        mode: "draft" as const,
        enabled: Boolean(hasVenueScope && hasAssistantSource && canManage),
        status: hasVenueScope && hasAssistantSource && canManage ? "Ready" : "Owner or manager venue context required",
      },
      {
        type: "create_plan_suggestion" as CopilotActionType,
        title: "Create suggestion",
        description: "Turn the latest guidance into a reviewed suggestion on the active plan.",
        mode: "suggest" as const,
        enabled: hasLivePlan,
        status: hasLivePlan ? "Ready" : "Owner or manager with an active plan required",
      },
      {
        type: "create_task_suggestion" as CopilotActionType,
        title: "Suggest task",
        description: "Turn the latest thread output into a reviewed task suggestion.",
        mode: "suggest" as const,
        enabled: hasLivePlan,
        status: hasLivePlan ? "Ready" : "Owner or manager with an active plan required",
      },
      {
        type: "create_escalation_draft" as CopilotActionType,
        title: "Draft escalation",
        description: "Turn the latest thread reasoning into an escalation draft for review.",
        mode: "draft" as const,
        enabled: Boolean(hasVenueScope && hasAssistantSource && canManage),
        status: hasVenueScope && hasAssistantSource && canManage ? "Ready" : "Owner or manager venue context required",
      },
      {
        type: "create_follow_up_list" as CopilotActionType,
        title: "Create follow-up list",
        description: "Save a short follow-up list from this thread for later review.",
        mode: "draft" as const,
        enabled: Boolean(hasAssistantSource && canManage),
        status: hasAssistantSource && canManage ? "Ready" : "Owner or manager guidance required",
      },
      {
        type: "save_compare_insight" as CopilotActionType,
        title: "Save comparison",
        description: "Capture this comparison insight so you can come back to it later.",
        mode: "save" as const,
        enabled: Boolean(hasVenueScope && hasAssistantSource && canManage),
        status: hasVenueScope && hasAssistantSource && canManage ? "Ready" : "Venue comparison context required",
      },
    ];
  }, [activeRole, copilotActionSource, livePlan, pendingSignalSuggestion, savedAssessment, selectedThread?.venue_id, workspaceVenue]);
  const compactCopilotActions = useMemo(() => {
    const saveNoteAction = copilotAvailableActions.find((action) => action.type === "save_note");
    const primaryStructuredAction =
      copilotAvailableActions.find((action) => action.type === "apply_to_assessment" && action.enabled) ??
      copilotAvailableActions.find((action) => action.type === "create_plan_suggestion" && action.enabled) ??
      copilotAvailableActions.find((action) => action.type === "create_task_suggestion" && action.enabled) ??
      copilotAvailableActions.find((action) => action.type === "create_diagnosis_note" && action.enabled) ??
      copilotAvailableActions.find((action) => action.type === "save_compare_insight" && action.enabled) ??
      copilotAvailableActions.find((action) => action.type === "create_escalation_draft" && action.enabled) ??
      null;

    return [saveNoteAction, primaryStructuredAction].filter((action): action is NonNullable<typeof action> => Boolean(action));
  }, [copilotAvailableActions]);

  const commandItems = useMemo(() => {
    const items: Array<{ id: string; label: string; description?: string; group: string; shortcut?: string; onSelect: () => void }> = [];

    // Navigation commands (role-filtered)
    const canSeeVenue = activeRole !== "barista";
    const canSeeManager = activeRole === "owner" || activeRole === "manager" || activeRole === "developer";
    const canSeePortfolioCmd = activeRole === "owner" || activeRole === "developer";

    if (canSeeManager && displayedVenue) {
      items.push({ id: "nav-today", label: "Today", group: "Navigation", shortcut: "T", onSelect: () => navigate({ topLevelView: "manager", venueId: displayedVenue.id, managerView: "today" }) });
    }
    if (canSeeVenue && displayedVenue) {
      items.push({ id: "nav-plan", label: "Plan", group: "Navigation", shortcut: "P", onSelect: () => navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "plan" }) });
      items.push({ id: "nav-assessment", label: "Assessment", group: "Navigation", onSelect: () => navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "assessment" }) });
      items.push({ id: "nav-diagnosis", label: "Diagnosis", group: "Navigation", onSelect: () => navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "diagnosis" }) });
      items.push({ id: "nav-history", label: "History", group: "Navigation", onSelect: () => navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "history" }) });
    }
    if (canSeePortfolioCmd) {
      items.push({ id: "nav-portfolio", label: "Portfolio", group: "Navigation", onSelect: () => navigate({ topLevelView: "portfolio" }) });
    }
    items.push({ id: "nav-reference", label: "Reference — Blocks", group: "Navigation", onSelect: () => navigate({ topLevelView: "reference", referenceView: "blocks" }) });
    items.push({ id: "nav-settings", label: "Settings", group: "Navigation", onSelect: () => navigate({ topLevelView: "settings" }) });
    items.push({ id: "nav-kb", label: "Knowledge Base", group: "Navigation", onSelect: () => navigate({ topLevelView: "kb" }) });
    items.push({ id: "nav-help", label: "Help & Guidance", group: "Navigation", onSelect: () => navigate({ topLevelView: "help" }) });

    // Venue commands
    if (bootstrap) {
      bootstrap.venues.forEach((v) => {
        items.push({ id: `venue-${v.id}`, label: v.name, group: "Venues", onSelect: () => handleSelectVenue(v.id) });
      });
    }

    // Actions
    items.push({ id: "action-copilot", label: "Open Copilot", group: "Actions", shortcut: "C", onSelect: () => setCopilotWorkspaceOpen(true) });
    items.push({ id: "action-copilot-shared", label: "New shared thread", group: "Actions", onSelect: () => { void handleCreateCopilotThread("shared"); } });
    items.push({ id: "action-copilot-private", label: "New private thread", group: "Actions", onSelect: () => { void handleCreateCopilotThread("private"); } });
    items.push({ id: "action-theme", label: "Toggle Theme", group: "Actions", onSelect: () => setPreferences((c) => ({ ...c, theme: (c.theme === "dark" ? "light" : "dark") as ThemeMode })) });

    return items;
  }, [bootstrap, displayedVenue, navigate, handleSelectVenue, handleCreateCopilotThread]);

  useEffect(() => {
    if (!workspaceVenue) {
      return;
    }

    setLoadingHistory(true);
    fetchAssessmentHistory(workspaceVenue.id)
      .then((items) => {
        setAssessmentHistory(items);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [workspaceVenue?.id]);

  useEffect(() => {
    if (!workspaceVenue) {
      return;
    }

    setLoadingExecution(true);
    Promise.all([
      fetchLatestPlan(workspaceVenue.id),
      fetchLatestExecutionSummary(workspaceVenue.id),
      fetchActivePlan(workspaceVenue.id),
      fetchActiveExecutionSummary(workspaceVenue.id),
      fetchProgressEntries(workspaceVenue.id),
    ])
      .then(([latest, latestSummary, live, liveSummary, progress]) => {
        setLatestPlan(latest);
        setExecutionSummary(latestSummary);
        setLivePlan(live);
        setLiveExecutionSummary(liveSummary);
        setViewedPlan(live);
        setViewedExecutionSummary(liveSummary);
        setSelectedPlanId(live?.id ?? null);
        setProgressEntries(progress);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingExecution(false);
      });
  }, [workspaceVenue?.id]);

  useEffect(() => {
    if (!workspaceVenue) {
      return;
    }

    setLoadingReports(true);
    Promise.all([fetchEngineRunHistory(workspaceVenue.id), fetchLatestEngineRun(workspaceVenue.id)])
      .then(([history, latestRun]) => {
        setEngineRunHistory(history);
        setSelectedEngineRunId((currentRunId) => {
          if (currentRunId && history.some((run) => run.engine_run_id === currentRunId)) {
            return currentRunId;
          }
          return latestRun?.engine_run_id ?? history[0]?.engine_run_id ?? null;
        });
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingReports(false);
      });
  }, [workspaceVenue?.id]);

  useEffect(() => {
    if (!selectedPlanId) {
      setViewedPlan(livePlan);
      setViewedExecutionSummary(liveExecutionSummary);
      return;
    }

    if (selectedPlanId === livePlan?.id) {
      setViewedPlan(livePlan);
      setViewedExecutionSummary(liveExecutionSummary);
      return;
    }

    if (selectedPlanId === latestPlan?.id) {
      setViewedPlan(latestPlan);
      setViewedExecutionSummary(executionSummary);
      return;
    }

    setLoadingPlanSelection(true);
    Promise.all([fetchPlan(selectedPlanId), fetchPlanExecutionSummary(selectedPlanId)])
      .then(([plan, summary]) => {
        setViewedPlan(plan);
        setViewedExecutionSummary(summary);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingPlanSelection(false);
      });
  }, [selectedPlanId, livePlan, liveExecutionSummary, latestPlan, executionSummary]);

  useEffect(() => {
    if (!selectedEngineRun) {
      return;
    }
    if (!selectedEngineRun.plan_id) {
      setSelectedPlanId(livePlan?.id ?? null);
      return;
    }
    setSelectedPlanId(selectedEngineRun.plan_id);
  }, [livePlan?.id, selectedEngineRun]);

  useEffect(() => {
    if (!bootstrap || !organizationId) {
      return;
    }

    setLoadingAudit(true);
    fetchAuditEntries(organizationId)
      .then((entries) => {
        setAuditEntries(entries);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingAudit(false);
      });
  }, [organizationId]);

  useEffect(() => {
    if (shellRoute.topLevelView === "venue" && !workspaceVenue) {
      return;
    }

    setLoadingCopilot(true);
    fetchCopilotThreads({
      venue_id: copilotVenueContext ?? undefined,
      visibility: copilotVisibilityFilter,
      include_archived: copilotIncludeArchived,
      sort: copilotSortMode,
    })
      .then((threads) => {
        const scopedThreads = filterThreadsForScope(threads, copilotVenueContext, activeRole);
        setCopilotIssue(null);
        setCopilotThreads(scopedThreads);
        setSelectedThreadId((currentThreadId) => {
          if (currentThreadId && scopedThreads.some((thread) => thread.id === currentThreadId)) {
            return currentThreadId;
          }
          return preferredThreadId(scopedThreads, copilotVenueContext, activeRole);
        });
      })
      .catch((err: Error) => {
        setCopilotIssue(err.message);
        setCopilotThreads([]);
        setSelectedThreadId(null);
      })
      .finally(() => {
        setLoadingCopilot(false);
      });
  }, [activeRole, copilotIncludeArchived, copilotSortMode, copilotVenueContext, copilotVisibilityFilter, shellRoute.topLevelView, workspaceVenue?.id, portfolioSummary?.resume_reason]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      setCopilotAttachments([]);
      return;
    }

    setLoadingCopilot(true);
    fetchCopilotThread(selectedThreadId)
      .then((thread) => {
        setCopilotIssue(null);
        setSelectedThread(thread);
      })
      .catch((err: Error) => {
        setCopilotIssue(err.message);
        setSelectedThread(null);
      })
      .finally(() => {
        setLoadingCopilot(false);
      });
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThreadContext(null);
      return;
    }
    fetchCopilotThreadContext(selectedThreadId)
      .then((context) => {
        setSelectedThreadContext(context);
      })
      .catch(() => {
        setSelectedThreadContext(null);
      });
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThreadActions([]);
      return;
    }
    setLoadingCopilotActions(true);
    fetchCopilotThreadActions(selectedThreadId)
      .then((actions) => {
        setSelectedThreadActions(actions);
      })
      .catch(() => {
        setSelectedThreadActions([]);
      })
      .finally(() => {
        setLoadingCopilotActions(false);
      });
  }, [selectedThreadId]);

  useEffect(() => {
    setCopilotWorkspaceActionMessage(null);
    setCopilotActionPreview(null);
    setCopilotActionPreviewRequest(null);
    setCopilotActionReceipt(null);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!copilotWorkspaceOpen || !copilotSearchQuery.trim()) {
      setCopilotSearchResults(null);
      return;
    }
    setSearchingCopilot(true);
    searchCopilotWorkspace({
      query: copilotSearchQuery,
      venue_id: copilotVenueContext ?? undefined,
      include_archived: copilotIncludeArchived,
      visibility: copilotVisibilityFilter,
    })
      .then((results) => {
        setCopilotSearchResults(results);
      })
      .catch((err: Error) => {
        setCopilotIssue(err.message);
        setCopilotSearchResults(null);
      })
      .finally(() => {
        setSearchingCopilot(false);
      });
  }, [copilotIncludeArchived, copilotSearchQuery, copilotVenueContext, copilotVisibilityFilter, copilotWorkspaceOpen]);

  useEffect(() => {
    setCopilotAttachments([]);
  }, [selectedThreadId]);

  useEffect(() => {
    setEnhancedReport(null);
  }, [selectedEngineRunId]);

  useEffect(() => {
    if (!selectedEngineRunId) {
      setSelectedEngineRunDetail(null);
      return;
    }

    setLoadingEngineRunDetail(true);
    fetchEngineRunDetail(selectedEngineRunId)
      .then((detail) => {
        setSelectedEngineRunDetail(detail);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoadingEngineRunDetail(false);
      });
  }, [selectedEngineRunId]);

  // Load manager data when entering the manager shell
  useEffect(() => {
    if (shellRoute.topLevelView === "manager" && shellRoute.venueId) {
      refreshManagerData(shellRoute.venueId);
    }
  }, [shellRoute.topLevelView === "manager" ? (shellRoute as { venueId: string }).venueId : null]);

  // Load pocket data when entering the pocket shell
  useEffect(() => {
    if (shellRoute.topLevelView === "pocket" && shellRoute.venueId) {
      refreshPocketData(shellRoute.venueId);
    }
  }, [shellRoute.topLevelView === "pocket" ? (shellRoute as { venueId: string }).venueId : null]);

  // Load owner data when entering the owner shell
  useEffect(() => {
    if (shellRoute.topLevelView === "owner" && shellRoute.venueId) {
      refreshOwnerData(shellRoute.venueId);
    }
  }, [shellRoute.topLevelView === "owner" ? (shellRoute as { venueId: string }).venueId : null]);

  function navigate(nextRoute: ShellRoute) {
    setShellRoute(nextRoute);
  }

  function resetDerivedState(nextText: string) {
    setIntakeText(nextText);
    setIntakePreview(null);
    setSavedAssessment(null);
    setEngineResult(null);
    setRejectedSignalIds(new Set());
    setManuallyAddedSignalIds(new Set());
  }

  function invalidateSavedAssessment() {
    setSavedAssessment(null);
    setEngineResult(null);
  }

  function handleAssessmentTypeChange(nextType: AssessmentTypeKey) {
    if (nextType === assessmentType) {
      return;
    }
    setAssessmentType(nextType);
    const triageDefaults = normalizeAssessmentTriageSettings(nextType);
    setTriageEnabled(triageDefaults.enabled);
    setTriageIntensity(triageDefaults.intensity);
    setIntakePreview(null);
    setSavedAssessment(null);
    setEngineResult(null);
    setRejectedSignalIds(new Set());
    setManuallyAddedSignalIds(new Set());
  }

  function handleTriageEnabledChange(nextEnabled: boolean) {
    setTriageEnabled(nextEnabled);
    invalidateSavedAssessment();
  }

  function handleTriageIntensityChange(nextIntensity: TriageIntensity) {
    setTriageIntensity(nextIntensity);
    invalidateSavedAssessment();
  }

  function handleManagementHoursChange(nextHours: number) {
    setManagementHours(nextHours);
    invalidateSavedAssessment();
  }

  function handleWeeklyBudgetChange(nextBudget: number) {
    setWeeklyBudget(nextBudget);
    invalidateSavedAssessment();
  }

  function buildSignalStates() {
    const states: Record<string, { active: boolean; confidence: string; notes: string }> = {};
    for (const signal of effectiveSignals) {
      states[signal.signal_id] = {
        active: true,
        confidence: signal.confidence,
        notes: signal.evidence_snippet,
      };
    }
    for (const signalId of manuallyAddedSignalIds) {
      if (!states[signalId]) {
        states[signalId] = { active: true, confidence: "medium", notes: "" };
      }
    }
    return states;
  }

  function handleToggleSignalRejection(signalId: string) {
    setRejectedSignalIds((prev) => {
      const next = new Set(prev);
      if (next.has(signalId)) {
        next.delete(signalId);
      } else {
        next.add(signalId);
      }
      return next;
    });
    setSavedAssessment(null);
    setEngineResult(null);
  }

  function handleToggleManualSignal(signalId: string) {
    setManuallyAddedSignalIds((prev) => {
      const next = new Set(prev);
      if (next.has(signalId)) {
        next.delete(signalId);
      } else {
        next.add(signalId);
      }
      return next;
    });
    setSavedAssessment(null);
    setEngineResult(null);
  }

  function rebuildPreviewFromAssessment(assessment: AssessmentRecord) {
    const signalIndex = new Map((ontologyBundle?.signals ?? []).map((signal) => [signal.id, signal]));

    return {
      ontology_id: assessment.ontology_id,
      ontology_version: assessment.ontology_version,
      detected_signals: assessment.selected_signal_ids
        .map((signalId) => {
          const signal = signalIndex.get(signalId);
          const state = assessment.signal_states[signalId];
          return {
            signal_id: signal?.id ?? signalId,
            signal_name: signal?.name ?? signalId,
            confidence: state?.confidence ?? "medium",
            score: state?.active === false ? 0.2 : 0.9,
            evidence_snippet: state?.notes ?? "Loaded from saved assessment snapshot.",
            match_reasons: ["Saved assessment snapshot"],
          };
        })
        .filter((signal): signal is NonNullable<typeof signal> => signal !== null),
      unmapped_observations: [],
    };
  }

  function applyAssessmentDraft(assessment: AssessmentRecord) {
    const normalizedType = isAssessmentTypeKey(assessment.assessment_type)
      ? assessment.assessment_type
      : DEFAULT_ASSESSMENT_TYPE;
    const triageSettings = normalizeAssessmentTriageSettings(
      assessment.assessment_type,
      assessment.triage_enabled,
      assessment.triage_intensity
    );
    setSavedAssessment(assessment);
    setAssessmentType(normalizedType);
    setTriageEnabled(triageSettings.enabled);
    setTriageIntensity(triageSettings.intensity);
    setManagementHours(assessment.management_hours_available);
    setWeeklyBudget(assessment.weekly_effort_budget);
    setIntakeText(assessment.notes ?? "");
    setIntakePreview(rebuildPreviewFromAssessment(assessment));
    setRejectedSignalIds(new Set());
    setManuallyAddedSignalIds(new Set());
    setEngineResult(null);
  }

  async function refreshAssessmentHistory() {
    if (!workspaceVenue) {
      return;
    }
    setAssessmentHistory(await fetchAssessmentHistory(workspaceVenue.id));
  }

  async function refreshExecutionWorkspace() {
    if (!workspaceVenue) {
      return;
    }
    const [latest, latestSummary, live, liveSummary, progress] = await Promise.all([
      fetchLatestPlan(workspaceVenue.id),
      fetchLatestExecutionSummary(workspaceVenue.id),
      fetchActivePlan(workspaceVenue.id),
      fetchActiveExecutionSummary(workspaceVenue.id),
      fetchProgressEntries(workspaceVenue.id),
    ]);
    setLatestPlan(latest);
    setExecutionSummary(latestSummary);
    setLivePlan(live);
    setLiveExecutionSummary(liveSummary);
    if (!selectedPlanId || selectedPlanId === latest?.id || selectedPlanId === live?.id) {
      setViewedPlan(live);
      setViewedExecutionSummary(liveSummary);
      setSelectedPlanId(live?.id ?? null);
    }
    setProgressEntries(progress);
  }

  async function refreshSelectedPlanWorkspace() {
    if (!selectedPlanId) {
      setViewedPlan(livePlan);
      setViewedExecutionSummary(liveExecutionSummary);
      return;
    }

    if (selectedPlanId === livePlan?.id) {
      setViewedPlan(livePlan);
      setViewedExecutionSummary(liveExecutionSummary);
      return;
    }

    if (selectedPlanId === latestPlan?.id) {
      setViewedPlan(latestPlan);
      setViewedExecutionSummary(executionSummary);
      return;
    }

    const [plan, summary] = await Promise.all([fetchPlan(selectedPlanId), fetchPlanExecutionSummary(selectedPlanId)]);
    setViewedPlan(plan);
    setViewedExecutionSummary(summary);
  }

  async function refreshEngineRunHistory(preferredRunId?: string | null) {
    if (!workspaceVenue) {
      return;
    }
    const [history, latestRun] = await Promise.all([
      fetchEngineRunHistory(workspaceVenue.id),
      fetchLatestEngineRun(workspaceVenue.id),
    ]);
    setEngineRunHistory(history);
    setSelectedEngineRunId(
      (preferredRunId && history.some((run) => run.engine_run_id === preferredRunId) && preferredRunId) ||
        latestRun?.engine_run_id ||
        history[0]?.engine_run_id ||
        null
    );
  }

  async function refreshAuditTrail() {
    if (!organizationId) {
      setAuditEntries([]);
      return;
    }
    setAuditEntries(await fetchAuditEntries(organizationId));
  }

  async function refreshPortfolioWorkspace() {
    if (!organizationId || (activeRole !== "owner" && activeRole !== "developer")) {
      setPortfolioSummary(null);
      return;
    }
    setPortfolioSummary(await fetchPortfolioSummary());
  }

  async function refreshWorkspaceIdentity(preferredSession?: AuthSessionResponse | null) {
    const session = preferredSession === undefined ? await fetchAuthSession() : preferredSession;
    setAuthSession(session);

    if (!session) {
      setError(null);
      setBootstrap(null);
      setVenueOntologyBindings([]);
      setOwnerMembers([]);
      setLatestLoginPacket(null);
      setCopilotIssue(null);
      return { session, payload: null };
    }

    let payload: BootstrapResponse;
    try {
      payload = await fetchBootstrap();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load workspace bootstrap";
      if (message === "VOIS bootstrap requires an active authenticated session.") {
        setAuthSession(null);
        setBootstrap(null);
        setVenueOntologyBindings([]);
        setOwnerMembers([]);
        setLatestLoginPacket(null);
        setCopilotIssue(null);
        setError(null);
        return { session: null, payload: null };
      }
      throw err;
    }
    setError(null);
    setBootstrap(payload);
    setVenueOntologyBindings(payload.venue_ontology_bindings ?? []);
    setLoginEmail(session?.user.email ?? payload.current_user.email);
    setLatestLoginPacket(null);
    setCopilotIssue(null);

    return { session, payload };
  }

  async function refreshSecurityPosture() {
    setSecurityPosture(await fetchAuthSecurityPosture());
  }

  async function refreshOrganizationExportSummary() {
    setOrganizationExportSummary(await fetchOrganizationExportSummary());
  }

  async function refreshOrganizationBackupReadiness() {
    setOrganizationBackupReadiness(await fetchOrganizationBackupReadiness());
  }

  async function refreshOrganizationDeleteReadiness() {
    setOrganizationDeleteReadiness(await fetchOrganizationDeleteReadiness());
  }

  async function refreshOwnerMembers() {
    if (!organizationId || activeRole !== "owner") {
      setOwnerMembers([]);
      return;
    }
    setLoadingOwnerMembers(true);
    try {
      setOwnerMembers(await fetchOrganizationMembers(organizationId));
    } finally {
      setLoadingOwnerMembers(false);
    }
  }

  async function refreshIntegrationTelemetry() {
    const [summary, events] = await Promise.all([
      fetchIntegrationSummary(),
      fetchIntegrationEvents({ limit: 12 })
    ]);
    setIntegrationSummary(summary);
    setIntegrationEvents(events);
  }

  async function refreshSessionInventory(scope: "self" | "organization" = sessionInventoryScope) {
    if (!sessionInventoryAvailable) {
      setSessionInventory(null);
      return;
    }
    setSessionInventory(await fetchSessionInventory(scope));
  }

  async function refreshCopilotWorkspace(preferredThread?: string | null) {
    if (shellRoute.topLevelView === "venue" && !workspaceVenue) {
      return;
    }

    try {
      const threads = filterThreadsForScope(
        await fetchCopilotThreads({
          venue_id: copilotVenueContext ?? undefined,
          visibility: copilotVisibilityFilter,
          include_archived: copilotIncludeArchived,
          sort: copilotSortMode,
        }),
        copilotVenueContext,
        activeRole
      );
      setCopilotIssue(null);
      setCopilotThreads(threads);
      const nextThreadId =
        (preferredThread && threads.some((thread) => thread.id === preferredThread) && preferredThread) ||
        preferredThreadId(threads, copilotVenueContext, activeRole);
      setSelectedThreadId(nextThreadId);

      if (nextThreadId) {
        setSelectedThread(await fetchCopilotThread(nextThreadId));
        setSelectedThreadContext(await fetchCopilotThreadContext(nextThreadId));
        setSelectedThreadActions(await fetchCopilotThreadActions(nextThreadId));
      } else {
        setSelectedThread(null);
        setSelectedThreadContext(null);
        setSelectedThreadActions([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "VOIS is unavailable in this workspace right now.";
      setCopilotIssue(message);
      setCopilotThreads([]);
      setSelectedThreadId(null);
      setSelectedThread(null);
      setSelectedThreadContext(null);
    }
  }

  async function handleAnalyzeIntake() {
    if (!workspaceVenue) {
      setError("Select a venue before analyzing intake.");
      return;
    }
    if (selectedOntologyIssue) {
      setError(selectedOntologyIssue);
      return;
    }
    if (!intakeText.trim()) {
      setError("Add operational observations before analyzing the intake.");
      return;
    }

    setAnalyzingIntake(true);
    setError(null);

    try {
      const result = await runAIIntake({
        raw_text: intakeText,
        venue_id: workspaceVenue.id,
        assessment_type: assessmentType,
      });
      setIntakePreview(result);
      setSavedAssessment(null);
      setEngineResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze intake");
    } finally {
      setAnalyzingIntake(false);
    }
  }

  async function handleSaveAssessment() {
    if (!workspaceVenue) {
      setError("No venue available to attach the assessment to.");
      return;
    }
    if (selectedOntologyIssue) {
      setError(selectedOntologyIssue);
      return;
    }
    const allSignalIds = [
      ...effectiveSignals.map((s) => s.signal_id),
      ...[...manuallyAddedSignalIds].filter((id) => !effectiveSignals.some((s) => s.signal_id === id)),
    ];
    if (!allSignalIds.length) {
      setError("Analyze the intake or add signals manually before saving.");
      return;
    }

    setSavingAssessment(true);
    setError(null);

    try {
      const assessment = await createAssessment({
        venue_id: workspaceVenue.id,
        created_by: bootstrap?.current_user.id ?? null,
        notes: intakeText,
        assessment_type: assessmentType,
        triage_enabled: triageEnabled,
        triage_intensity: triageIntensity,
        selected_signal_ids: allSignalIds,
        signal_states: buildSignalStates(),
        management_hours_available: managementHours,
        weekly_effort_budget: weeklyBudget,
      });

      applyAssessmentDraft(assessment);
      await Promise.all([refreshAssessmentHistory(), refreshPortfolioWorkspace()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assessment");
    } finally {
      setSavingAssessment(false);
    }
  }

  async function handleRunEngine() {
    if (!workspaceVenue) {
      setError("No venue available to run the engine against.");
      return;
    }
    if (selectedOntologyIssue) {
      setError(selectedOntologyIssue);
      return;
    }
    const allSignalIds = [
      ...effectiveSignals.map((s) => s.signal_id),
      ...[...manuallyAddedSignalIds].filter((id) => !effectiveSignals.some((s) => s.signal_id === id)),
    ];
    if (!allSignalIds.length) {
      setError("Analyze the intake or add signals manually before running the engine.");
      return;
    }

    setRunningEngine(true);
    setError(null);

    try {
      const assessment =
        savedAssessment ??
        (await createAssessment({
          venue_id: workspaceVenue.id,
          created_by: bootstrap?.current_user.id ?? null,
          notes: intakeText,
          assessment_type: assessmentType,
          triage_enabled: triageEnabled,
          triage_intensity: triageIntensity,
          selected_signal_ids: allSignalIds,
          signal_states: buildSignalStates(),
          management_hours_available: managementHours,
          weekly_effort_budget: weeklyBudget,
        }));

      applyAssessmentDraft(assessment);
      const result = await runSavedAssessment(assessment.id);
      setEngineResult(result);

      await Promise.all([
        refreshAssessmentHistory(),
        refreshExecutionWorkspace(),
        refreshEngineRunHistory(result.engine_run_id),
        refreshPortfolioWorkspace(),
      ]);

      navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: "diagnosis" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run diagnostic engine");
    } finally {
      setRunningEngine(false);
    }
  }

  async function handleApprovePlan(planId: string) {
    if (!workspaceVenue) return;
    setSavingProgress(true);
    setError(null);
    try {
      await updatePlan(planId, { status: "active" });
      await Promise.all([
        refreshExecutionWorkspace(),
        refreshPortfolioWorkspace(),
      ]);
      handleEnterManagerShell();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve plan");
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleTaskStatusUpdate(taskId: string, status: string) {
    setUpdatingTaskId(taskId);
    setError(null);

    try {
      await updatePlanTaskStatus(taskId, status);
      await refreshExecutionWorkspace();
      await Promise.all([refreshSelectedPlanWorkspace(), refreshAuditTrail(), refreshPortfolioWorkspace()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task status");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleTaskUpdate(taskId: string, payload: PlanTaskUpdatePayload) {
    setUpdatingTaskId(taskId);
    setError(null);

    try {
      await updatePlanTask(taskId, payload);
      await Promise.all([refreshExecutionWorkspace(), refreshSelectedPlanWorkspace()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleCreateProgressEntry() {
    if (!workspaceVenue) {
      setError("No venue available for progress logging.");
      return;
    }
    if (!progressSummary.trim()) {
      setError("Add a progress summary before logging execution movement.");
      return;
    }

    setSavingProgress(true);
    setError(null);

    try {
      await createProgressEntry({
        venue_id: workspaceVenue.id,
        created_by: bootstrap?.current_user.id ?? null,
        summary: progressSummary,
        detail: progressDetail,
        status: "logged",
      });
      setProgressSummary("");
      setProgressDetail("");
      await refreshExecutionWorkspace();
      await Promise.all([refreshSelectedPlanWorkspace(), refreshAuditTrail(), refreshPortfolioWorkspace()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create progress entry");
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleSendCopilotMessage() {
    if (!selectedThreadId || !copilotInput.trim()) {
      return;
    }

    setSendingCopilot(true);
    setError(null);

    try {
      const updatedThread = await sendCopilotMessage({
        thread_id: selectedThreadId,
        content: copilotInput,
        created_by: bootstrap?.current_user.id ?? null,
        attachments: copilotAttachments,
        quoted_message_id: copilotQuotedMessageId,
      });
      setCopilotIssue(null);
      setCopilotInput("");
      setCopilotAttachments([]);
      setCopilotQuotedMessageId(null);
      await Promise.all([refreshCopilotWorkspace(updatedThread.id), refreshAuditTrail()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send copilot message";
      setCopilotIssue(message);
      setError(message);
    } finally {
      setSendingCopilot(false);
    }
  }

  async function handleCreateCopilotThread(visibility: "shared" | "private") {
    const title =
      visibility === "private"
        ? displayedVenue?.name
          ? `${displayedVenue.name} private analysis`
          : "Private analysis"
        : displayedVenue?.name
          ? `${displayedVenue.name} shared thread`
          : "Portfolio shared thread";
    try {
      setLoadingCopilot(true);
      const detail = await createCopilotThread({
        title,
        visibility,
        venue_id: copilotVenueContext ?? undefined,
        scope: copilotVenueContext ? "venue" : "global",
        context_kind: copilotVenueContext ? "venue" : "portfolio",
        context_id: copilotVenueContext ?? undefined,
      });
      setSelectedThreadId(detail.id);
      await refreshCopilotWorkspace(detail.id);
      setCopilotWorkspaceOpen(true);
      setCopilotOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create thread";
      setCopilotIssue(message);
      setError(message);
    } finally {
      setLoadingCopilot(false);
    }
  }

  async function handleRenameSelectedCopilotThread(title: string) {
    if (!selectedThreadId || !title.trim()) {
      return;
    }
    try {
      await updateCopilotThread(selectedThreadId, { title: title.trim() });
      await refreshCopilotWorkspace(selectedThreadId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rename thread";
      setCopilotIssue(message);
      setError(message);
    }
  }

  async function handleToggleSelectedCopilotPin() {
    if (!selectedThread) return;
    try {
      await updateCopilotThread(selectedThread.id, { pinned: !selectedThread.pinned });
      await refreshCopilotWorkspace(selectedThread.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update thread pin";
      setCopilotIssue(message);
      setError(message);
    }
  }

  async function handleToggleSelectedCopilotArchive() {
    if (!selectedThread) return;
    try {
      await updateCopilotThread(selectedThread.id, { archived: !selectedThread.archived });
      await refreshCopilotWorkspace(selectedThread.archived ? selectedThread.id : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update thread archive state";
      setCopilotIssue(message);
      setError(message);
    }
  }

  async function handleDeleteSelectedCopilotThread() {
    if (!selectedThreadId) return;
    try {
      await deleteCopilotThread(selectedThreadId);
      setSelectedThreadId(null);
      setSelectedThread(null);
      setSelectedThreadContext(null);
      await refreshCopilotWorkspace();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete thread";
      setCopilotIssue(message);
      setError(message);
    }
  }

  async function handleBranchFromCopilotMessage(messageId: string) {
    if (!selectedThreadId) return;
    try {
      const detail = await branchCopilotThread(selectedThreadId, {
        message_id: messageId,
        visibility: "private",
      });
      await refreshCopilotWorkspace(detail.id);
      setCopilotWorkspaceOpen(true);
      setCopilotOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to branch thread";
      setCopilotIssue(message);
      setError(message);
    }
  }

  function buildCopilotActionRequest(
    actionType: CopilotActionType
  ): {
    action_type: CopilotActionType;
    message_id?: string | null;
    task_id?: string | null;
    severity?: string | null;
    due_at?: string | null;
    signal_additions?: Array<{ signal_id: string; notes?: string | null; confidence?: string | null }>;
    signal_removals?: string[];
  } | null {
    if (!selectedThreadId || !copilotActionSource) {
      return null;
    }

    const baseRequest = {
      action_type: actionType,
      message_id: copilotActionSource.message.id,
    };

    if (actionType === "apply_to_assessment") {
      if (!pendingSignalSuggestion) {
        return null;
      }
      return {
        ...baseRequest,
        message_id: pendingSignalSuggestion.messageId,
        signal_additions: pendingSignalSuggestion.suggestion.add.map((item) => ({
          signal_id: item.signal_id,
          notes: item.notes,
          confidence: item.confidence,
        })),
        signal_removals: pendingSignalSuggestion.suggestion.remove,
      };
    }

    return baseRequest;
  }

  async function handlePreviewCopilotAction(actionType: CopilotActionType) {
    const request = buildCopilotActionRequest(actionType);
    if (!selectedThreadId || !request) {
      return;
    }

    setPreviewingCopilotActionType(actionType);
    setError(null);
    setCopilotWorkspaceActionMessage(null);
    setCopilotActionReceipt(null);

    try {
      const preview = await previewCopilotAction(selectedThreadId, request);
      setCopilotActionPreview(preview);
      setCopilotActionPreviewRequest(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to preview copilot action";
      setCopilotIssue(message);
      setError(message);
    } finally {
      setPreviewingCopilotActionType(null);
    }
  }

  async function handleCommitCopilotAction() {
    if (!selectedThreadId || !copilotActionPreviewRequest) {
      return;
    }

    setCommittingCopilotActionType(copilotActionPreviewRequest.action_type);
    setError(null);
    setCopilotWorkspaceActionMessage(null);

    try {
      const receipt = await commitCopilotAction(selectedThreadId, copilotActionPreviewRequest);
      setCopilotActionReceipt(receipt);
      setCopilotWorkspaceActionMessage(receipt.receipt_summary);
      setCopilotActionPreview(null);
      setCopilotActionPreviewRequest(null);

      if (copilotActionPreviewRequest.action_type === "apply_to_assessment" && pendingSignalSuggestion) {
        setDismissedSignalSuggestionIds((current) => [...current, pendingSignalSuggestion.messageId]);
      }

      await refreshCopilotWorkspace(selectedThreadId);
      await Promise.all([
        refreshAuditTrail(),
        refreshPortfolioWorkspace(),
        workspaceVenue ? refreshExecutionWorkspace() : Promise.resolve(),
        workspaceVenue ? refreshSelectedPlanWorkspace() : Promise.resolve(),
        workspaceVenue ? refreshAssessmentHistory() : Promise.resolve(),
      ]);

      if (workspaceVenue && receipt.target_artifact_type === "assessment") {
        navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: "assessment" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to commit copilot action";
      setCopilotIssue(message);
      setError(message);
    } finally {
      setCommittingCopilotActionType(null);
    }
  }

  function handleDismissCopilotActionPreview() {
    setCopilotActionPreview(null);
    setCopilotActionPreviewRequest(null);
  }

  async function handleGenerateEnhancedReport() {
    if (!selectedEngineRun) {
      return;
    }

    setLoadingEnhancedReport(true);
    setError(null);

    try {
      const response = await fetchEnhancedReport(selectedEngineRun.engine_run_id);
      setEnhancedReport(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load enhanced report");
    } finally {
      setLoadingEnhancedReport(false);
    }
  }

  async function handleApplySignalSuggestion() {
    if (!savedAssessment || !pendingSignalSuggestion) {
      return;
    }

    setApplyingSignalSuggestion(true);
    setError(null);
    setCopilotWorkspaceActionMessage(null);

    try {
      const updatedAssessment = await applyAssessmentSignalSuggestion(savedAssessment.id, {
        add: pendingSignalSuggestion.suggestion.add.map((item) => ({
          signal_id: item.signal_id,
          notes: item.notes,
          confidence: item.confidence,
        })),
        remove: pendingSignalSuggestion.suggestion.remove,
        source: "copilot_review",
      });

      applyAssessmentDraft(updatedAssessment);
      setDismissedSignalSuggestionIds((current) => [...current, pendingSignalSuggestion.messageId]);
      setCopilotWorkspaceActionMessage("Applied the latest copilot signal suggestion to the assessment.");

      await Promise.all([refreshAssessmentHistory(), refreshPortfolioWorkspace(), refreshAuditTrail()]);
      navigate({ topLevelView: "venue", venueId: updatedAssessment.venue_id, venueView: "assessment" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply signal suggestion");
    } finally {
      setApplyingSignalSuggestion(false);
    }
  }

  function handleDismissSignalSuggestion() {
    if (!pendingSignalSuggestion) {
      return;
    }
    setDismissedSignalSuggestionIds((current) => [...current, pendingSignalSuggestion.messageId]);
  }

  function handleSelectVenue(venueId: string) {
    setSelectedVenueId(venueId);
    navigate({ topLevelView: "venue", venueId, venueView: "overview" });
  }

  function handleOpenVenueWorkspace(venueId: string, view: VenueSubview) {
    setSelectedVenueId(venueId);
    navigate({ topLevelView: "venue", venueId, venueView: view });
  }

  function handleOpenReportRecord(engineRunId: string) {
    if (!workspaceVenue) {
      return;
    }
    handleSelectEngineRun(engineRunId);
    navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: "diagnosis" });
  }

  function handleSelectEngineRun(engineRunId: string) {
    setEngineResult((current) => (current?.engine_run_id === engineRunId ? current : null));
    setSelectedEngineRunId(engineRunId);
  }

  async function handleLoadAssessmentRecord(assessmentId: string) {
    if (!workspaceVenue) {
      return;
    }

    setLoadingAssessmentRecordId(assessmentId);
    setError(null);

    try {
      const assessment = await fetchAssessment(assessmentId);
      applyAssessmentDraft(assessment);
      const historyItem = assessmentHistory.find((item) => item.id === assessmentId);
      if (historyItem?.engine_run_id) {
        setSelectedEngineRunId(historyItem.engine_run_id);
      }
      navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: "assessment" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved assessment");
    } finally {
      setLoadingAssessmentRecordId(null);
    }
  }

  function handleSelectVenueView(view: VenueSubview) {
    if (!workspaceVenue) {
      return;
    }
    navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: view });
  }

  function dismissWelcome(nextRoute: ShellRoute) {
    setPreferences((current) => ({ ...current, welcomeDismissed: true }));
    navigate(nextRoute);
  }

  // ─── Manager shell handlers ───

  function handleSelectManagerView(view: ManagerView) {
    if (!workspaceVenue) return;
    navigate({ topLevelView: "manager", venueId: workspaceVenue.id, managerView: view });
  }

  function handleEnterManagerShell() {
    if (!workspaceVenue) return;
    navigate({ topLevelView: "manager", venueId: workspaceVenue.id, managerView: "today" });
  }

  async function refreshManagerData(venueId: string) {
    setMgrLoading(true);
    try {
      const [nextActions, followUps, escalations, evidence] = await Promise.all([
        fetchNextActions(venueId),
        fetchFollowUps(venueId),
        fetchEscalations(venueId),
        fetchEvidence(venueId),
      ]);
      setMgrNextActions(nextActions);
      setMgrFollowUps(followUps);
      setMgrEscalations(escalations);
      setMgrEvidence(evidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manager data");
    } finally {
      setMgrLoading(false);
    }
  }

  async function handleMgrCreateFollowUp(taskId: string) {
    if (!workspaceVenue) return;
    const title = window.prompt("Follow-up title:");
    if (!title?.trim()) return;
    const hoursStr = window.prompt("Due in how many hours?", "48");
    const hours = parseFloat(hoursStr ?? "48") || 48;
    const dueAt = new Date(Date.now() + hours * 3600_000).toISOString();
    try {
      await createFollowUp({ venue_id: workspaceVenue.id, task_id: taskId, title: title.trim(), due_at: dueAt });
      await refreshManagerData(workspaceVenue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create follow-up");
    }
  }

  async function handleMgrCreateEvidence(taskId: string | undefined) {
    if (!workspaceVenue) return;
    const title = window.prompt("Evidence title:");
    if (!title?.trim()) return;
    const description = window.prompt("Description (optional):");
    const evidenceType = window.prompt("Type (observation, photo, document, checklist, metric):", "observation") ?? "observation";
    try {
      await createEvidence({
        venue_id: workspaceVenue.id,
        task_id: taskId,
        title: title.trim(),
        description: description?.trim() || undefined,
        evidence_type: evidenceType.trim(),
      });
      await refreshManagerData(workspaceVenue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create evidence");
    }
  }

  async function handleMgrEscalateTask(taskId: string) {
    if (!workspaceVenue) return;
    const reason = window.prompt("Escalation reason:");
    if (!reason?.trim()) return;
    try {
      await createEscalation({ venue_id: workspaceVenue.id, task_id: taskId, reason: reason.trim(), severity: "medium" });
      await refreshManagerData(workspaceVenue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create escalation");
    }
  }

  async function handleMgrCreateEscalation() {
    if (!workspaceVenue) return;
    const reason = window.prompt("Escalation reason:");
    if (!reason?.trim()) return;
    const severity = window.prompt("Severity (low, medium, high, critical):", "medium") ?? "medium";
    try {
      await createEscalation({ venue_id: workspaceVenue.id, reason: reason.trim(), severity: severity.trim() });
      await refreshManagerData(workspaceVenue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create escalation");
    }
  }

  async function handleMgrResolveEscalation(escalationId: string, resolutionNotes: string) {
    setMgrResolvingEscalationId(escalationId);
    try {
      await resolveEscalation(escalationId, resolutionNotes);
      if (workspaceVenue) await refreshManagerData(workspaceVenue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve escalation");
    } finally {
      setMgrResolvingEscalationId(null);
    }
  }

  // ─── Pocket shell handlers ───

  function handleSelectPocketView(view: PocketView) {
    if (!workspaceVenue) return;
    navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: view });
  }

  function handleEnterPocketShell() {
    if (!workspaceVenue) return;
    navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: "shift" });
  }

  function openPocketHelpThread(threadId: string | null) {
    if (!threadId) {
      return;
    }
    setCopilotOpen(true);
    setSelectedThreadId(threadId);
    void refreshCopilotWorkspace(threadId);
  }

  async function refreshPocketData(venueId: string) {
    setPktLoading(true);
    try {
      const [shift, standards, diary, helpRequests] = await Promise.all([
        fetchMyShift(venueId),
        fetchMyStandards(venueId),
        fetchShiftDiary(venueId),
        fetchHelpRequests(venueId, true),
      ]);
      setPktShift(shift);
      setPktStandards(standards);
      setPktDiary(diary);
      setPktHelpRequests(helpRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pocket data");
    } finally {
      setPktLoading(false);
    }
  }

  async function handlePktReportFriction(summary: string, detail: string | undefined, anonymous: boolean) {
    if (!workspaceVenue) return;
    setPktSubmitting(true);
    try {
      await reportFriction({ venue_id: workspaceVenue.id, summary, detail, anonymous });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setPktSubmitting(false);
    }
  }

  async function handlePktCreateDiaryEntry(summary: string, detail: string | undefined) {
    if (!workspaceVenue) return;
    setPktSubmitting(true);
    try {
      await createShiftDiaryEntry({ venue_id: workspaceVenue.id, summary, detail });
      await refreshPocketData(workspaceVenue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create diary entry");
    } finally {
      setPktSubmitting(false);
    }
  }

  async function handlePktCreateHelpRequest(title: string, prompt: string) {
    if (!workspaceVenue) return;
    setPktSubmitting(true);
    try {
      const request = await createHelpRequest({
        venue_id: workspaceVenue.id,
        title,
        prompt,
        channel: "pocket",
      });
      await Promise.all([
        refreshPocketData(workspaceVenue.id),
        refreshCopilotWorkspace(request.linked_thread_id ?? undefined),
        refreshAuditTrail(),
      ]);
      openPocketHelpThread(request.linked_thread_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create help request");
    } finally {
      setPktSubmitting(false);
    }
  }

  async function handlePktCloseHelpRequest(helpRequestId: string) {
    if (!workspaceVenue) return;
    setPktSubmitting(true);
    try {
      await updateHelpRequest(helpRequestId, { status: "closed" });
      await Promise.all([refreshPocketData(workspaceVenue.id), refreshAuditTrail()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close help request");
    } finally {
      setPktSubmitting(false);
    }
  }

  // ─── Owner shell handlers ───

  function handleSelectOwnerView(view: OwnerView) {
    if (!workspaceVenue) return;
    navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: view });
  }

  function handleEnterOwnerShell() {
    if (!workspaceVenue) return;
    navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: "command" });
  }

  async function refreshOwnerData(venueId: string) {
    setOwnLoading(true);
    try {
      const [attention, profiles, overload, risk, velocity, delegations] = await Promise.all([
        fetchAttentionItems().catch(() => []),
        fetchTeamProfiles(venueId).catch(() => []),
        fetchOverloadMap(venueId).catch(() => []),
        fetchFlightRisk(venueId).catch(() => [] as FlightRiskEntry[]),
        fetchExecutionVelocity(venueId).catch(() => ({ venue_id: venueId, has_plan: false, total_tasks: 0, completed_tasks: 0, in_progress_tasks: 0, blocked_tasks: 0, completion_percentage: 0, velocity_label: "unknown" })),
        fetchDelegations(venueId).catch(() => []),
      ]);
      setOwnAttentionItems(attention);
      setOwnTeamProfiles(profiles);
      setOwnOverloadMap(overload);
      setOwnFlightRisk(risk);
      setOwnVelocities([velocity]);
      setOwnDelegations(delegations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load owner data");
    } finally {
      setOwnLoading(false);
    }
  }

  function handleResetWelcome() {
    setPreferences((current) => ({ ...current, welcomeDismissed: false }));
  }

  function handleRestoreDefaults() {
    setReferenceSearch("");
    setError(null);
    setPreferences(DEFAULT_PREFERENCES);
    navigate(DEFAULT_PREFERENCES.lastRoute);
  }

  function handleNavigateToAuth(email?: string, inviteToken?: string | null) {
    const params = new URLSearchParams();
    if (email) {
      params.set("email", email);
    }
    if (inviteToken) {
      params.set("invite", inviteToken);
    }
    const suffix = params.toString();
    navigatePath(suffix ? `/auth?${suffix}` : "/auth");
    setAuthPath(readAuthPathState());
  }

  function handleNavigateToLocalAuth() {
    navigatePath("/auth/local");
    setAuthPath(readAuthPathState());
  }

  function handleNavigateToReset(email?: string) {
    const params = new URLSearchParams();
    if (email) {
      params.set("email", email);
    }
    const suffix = params.toString();
    navigatePath(suffix ? `/auth/reset?${suffix}` : "/auth/reset");
    setAuthPath(readAuthPathState());
  }

  function handleNavigateToInvite(token: string) {
    navigatePath(`/auth/invite/${encodeURIComponent(token)}`);
    setAuthPath(readAuthPathState());
  }

  async function handleAuthenticatedSession(session: AuthSessionResponse) {
    await refreshWorkspaceIdentity(session);
    setShellInitialized(false);
  }

  async function handleClaimOwnerWorkspace(payload: {
    organization_name: string;
    organization_slug: string;
    region?: string;
    data_residency?: string;
    first_venue?: {
      name: string;
      slug: string;
      vertical?: string | null;
      ontology_binding: {
        ontology_id: string;
        ontology_version: string;
      };
      concept?: string | null;
      location?: string | null;
      size_note?: string | null;
      capacity_profile?: Record<string, unknown>;
    } | null;
  }) {
    setWorkspaceSetupBusy(true);
    setError(null);
    try {
      await claimOwnerSetup(payload);
      await refreshWorkspaceIdentity();
      setShellInitialized(false);
      navigate({ topLevelView: "portfolio" });
      navigatePath("/", true);
      setAuthPath(readAuthPathState());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim owner workspace");
    } finally {
      setWorkspaceSetupBusy(false);
    }
  }

  async function handleCreateVenue(payload: {
    organization_id: string;
    name: string;
    slug: string;
    vertical?: string | null;
    ontology_binding: {
      ontology_id: string;
      ontology_version: string;
    };
    initial_manager_user_id?: string | null;
    status?: string;
    concept?: string | null;
    location?: string | null;
    size_note?: string | null;
    capacity_profile?: Record<string, unknown>;
  }) {
    setWorkspaceSetupBusy(true);
    setError(null);
    try {
      const venue = await createVenue(payload);
      await Promise.all([refreshWorkspaceIdentity(), refreshOwnerMembers(), refreshPortfolioWorkspace()]);
      setSelectedVenueId(venue.id);
      navigate({ topLevelView: "owner", venueId: venue.id, ownerView: "command" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create venue");
    } finally {
      setWorkspaceSetupBusy(false);
    }
  }

  async function handleCreateOrganizationMember(payload: {
    email: string;
    full_name: string;
    role: "owner" | "manager" | "barista" | "developer";
    venue_ids: string[];
  }) {
    if (!organizationId) {
      setError("Create or claim an organization before adding members.");
      return;
    }
    setWorkspaceSetupBusy(true);
    setError(null);
    try {
      const response = await createOrganizationMember(organizationId, payload);
      setLatestLoginPacket(response.login_packet);
      await refreshOwnerMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization member");
    } finally {
      setWorkspaceSetupBusy(false);
    }
  }

  async function handleUpdateOrganizationMember(
    memberId: string,
    payload: {
      full_name?: string;
      role?: "owner" | "manager" | "barista" | "developer";
      active?: boolean;
    }
  ) {
    if (!organizationId) {
      return;
    }
    setWorkspaceSetupBusy(true);
    setError(null);
    try {
      await updateOrganizationMember(organizationId, memberId, payload);
      await refreshOwnerMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization member");
    } finally {
      setWorkspaceSetupBusy(false);
    }
  }

  async function handleResetOrganizationMemberLogin(memberId: string) {
    if (!organizationId) {
      return;
    }
    setWorkspaceSetupBusy(true);
    setError(null);
    try {
      const packet = await resetOrganizationMemberLogin(organizationId, memberId);
      setLatestLoginPacket(packet);
      await refreshOwnerMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset member login");
    } finally {
      setWorkspaceSetupBusy(false);
    }
  }

  async function handleUpdateOrganizationMemberVenueAccess(memberId: string, venueIds: string[]) {
    if (!organizationId) {
      return;
    }
    setWorkspaceSetupBusy(true);
    setError(null);
    try {
      await updateOrganizationMemberVenueAccess(organizationId, memberId, venueIds);
      await refreshOwnerMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update venue access");
    } finally {
      setWorkspaceSetupBusy(false);
    }
  }

  async function handleAttachCopilotFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    try {
      const nextAttachments = await Promise.all(Array.from(files).map((file) => fileToCopilotAttachment(file)));
      setCopilotAttachments((current) => {
        const existingNames = new Set(current.map((attachment) => attachment.file_name));
        return [...current, ...nextAttachments.filter((attachment) => !existingNames.has(attachment.file_name))];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach files");
    }
  }

  function handleRemoveCopilotAttachment(fileName: string) {
    setCopilotAttachments((current) => current.filter((attachment) => attachment.file_name !== fileName));
  }

  async function handleLogin() {
    if (loggingIn) {
      return;
    }

    const email = loginEmail.trim();
    const password = loginPassword;

    setLoginEmail(email);
    setLoginPassword(password);

    if (!email || !password.trim()) {
      setError("Add both email and password before signing in.");
      return;
    }

    setLoggingIn(true);
    setError(null);

    try {
      const session = await loginSession({
        email,
        password,
      });
      await handleAuthenticatedSession(session);
      setLoginPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLocalBootstrapLogin(payload: { email: string; password: string }) {
    setLoginEmail(payload.email);
    setLoginPassword(payload.password);
    const session = await loginLocalSession(payload);
    await handleAuthenticatedSession(session);
    setLoginPassword("");
  }

  async function handleLogout() {
    if (!authSession) {
      return;
    }

    setLoggingOut(true);
    setError(null);

    try {
      await logoutSession();
      setAuthSession(null);
      setBootstrap(null);
      setVenueOntologyBindings([]);
      setOwnerMembers([]);
      setLatestLoginPacket(null);
      setCopilotIssue(null);
      setSessionInventory(null);
      setLoginPassword("");
      setShellInitialized(false);
      navigatePath("/auth", true);
      setAuthPath(readAuthPathState());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign out");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleRevokeManagedSession(sessionId: string) {
    setRevokingSessionId(sessionId);
    setError(null);

    try {
      const result = await revokeManagedSession(sessionId);
      if (result.cleared_current_cookie) {
        await refreshWorkspaceIdentity(null);
        setSessionInventory(null);
        navigate({ topLevelView: "portfolio" });
      } else {
        await Promise.all([refreshSessionInventory(), refreshAuditTrail()]);
      }
      await refreshSecurityPosture();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  }

  async function handleGenerateOrganizationExport() {
    setExportingOrganization(true);
    setError(null);

    try {
      const payload = await generateOrganizationExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${payload.organization_slug}-${payload.format_version}-${payload.generated_at.slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      await Promise.all([
        refreshOrganizationExportSummary(),
        refreshOrganizationBackupReadiness(),
        refreshOrganizationDeleteReadiness(),
        refreshAuditTrail()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate organization export");
    } finally {
      setExportingOrganization(false);
    }
  }

  async function handleRetryIntegrationEvent(eventId: string) {
    try {
      setRetryingIntegrationEventId(eventId);
      await retryIntegrationEvent(eventId);
      await Promise.all([refreshIntegrationTelemetry(), refreshAuditTrail()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry integration event");
    } finally {
      setRetryingIntegrationEventId(null);
    }
  }

  if ((!isAuthenticated && !requiresOwnerClaim) || authPath.isAuthRoute || authPath.pathname === "/auth/no-access") {
    if (loadingAuthEntryConfig || (isAuthenticated && loadingBootstrap && !noWorkspaceAccess)) {
      return <div className="app-shell loading-screen">Preparing secure sign-in…</div>;
    }

    if (authEntryError || !authEntryConfig) {
      return (
        <AuthUnavailableScreen
          message={authEntryError ?? "VOIS could not load the authentication entry configuration."}
          onRetry={() => window.location.reload()}
          localAuthPath={!firebaseConfigured() ? "/auth/local" : null}
        />
      );
    }

    if (authPath.pathname === "/auth/no-access" && isAuthenticated && authSession) {
      return (
        <NoAccessScreen
          email={authSession.user.email}
          message={ownerSetupState?.status_message ?? "This account is authenticated but has no workspace access yet."}
          supportUrl={authEntryConfig.support_url}
          onSignOut={() => {
            void handleLogout();
          }}
        />
      );
    }

    if (authPath.isInvite && authPath.inviteToken) {
      return (
        <InviteAcceptanceScreen
          token={authPath.inviteToken}
          authSession={authSession}
          onNavigateToSignIn={(email, inviteToken) => handleNavigateToAuth(email, inviteToken)}
          onAccepted={async () => {
            await refreshWorkspaceIdentity();
            setShellInitialized(false);
            navigatePath("/", true);
            setAuthPath(readAuthPathState());
          }}
          onSignOut={handleLogout}
        />
      );
    }

    if (authPath.isReset) {
      return (
        <PasswordResetScreen
          token={authPath.resetToken}
          initialEmail={authPath.emailHint}
          environmentLabel={authEntryConfig.environment_mode !== "production" ? authEntryConfig.environment_label : null}
          supportUrl={authEntryConfig.support_url}
          onNavigateToAuth={(email) => handleNavigateToAuth(email)}
        />
      );
    }

    if (authPath.isLocalAuth) {
      if (!authEntryConfig.local_auth_available) {
        return (
          <AuthUnavailableScreen
            title="Local access is unavailable"
            message="This build does not allow the non-production local password route."
            supportUrl={authEntryConfig.support_url}
            statusUrl={authEntryConfig.status_url}
            onRetry={() => window.location.reload()}
          />
        );
      }

      return (
        <LocalBootstrapScreen
          environmentLabel={authEntryConfig.environment_label}
          initialEmail={authPath.emailHint || loginEmail}
          onLogin={handleLocalBootstrapLogin}
          onNavigateToAuth={() => handleNavigateToAuth(authPath.emailHint || loginEmail)}
        />
      );
    }

    if (!authEntryConfig.enabled_providers.length && !authEntryConfig.local_auth_available) {
      return (
        <AuthUnavailableScreen
          message="VOIS does not have an interactive sign-in method configured for this environment."
          supportUrl={authEntryConfig.support_url}
          statusUrl={authEntryConfig.status_url}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return (
      <AuthRouterScreen
        entryConfig={authEntryConfig}
        initialEmail={authPath.emailHint || loginEmail}
        inviteToken={authPath.inviteQueryToken}
        onAuthenticated={handleAuthenticatedSession}
        onNavigateToLocal={handleNavigateToLocalAuth}
        onNavigateToReset={handleNavigateToReset}
        onNavigateToInvite={handleNavigateToInvite}
      />
    );
  }

  if (!loadingBootstrap && !bootstrap && isAuthenticated) {
    return (
      <div className="app-shell loading-screen fatal-screen">
        <div className="fatal-card">
          <p className="hero-badge">Startup issue</p>
          <h1>Workspace failed to load</h1>
          <p className="hero-copy">
            VOIS could not complete startup against <strong>http://127.0.0.1:8001/api/v1/bootstrap</strong>. The API may
            still be starting up, or this browser tab may be holding an older startup failure.
          </p>
          <p className="hero-copy">{error ?? "Start the API server and refresh the page."}</p>
          <button className="btn-secondary fatal-retry-button" onClick={() => window.location.reload()}>
            Retry startup
          </button>
        </div>
      </div>
    );
  }

  if (loadingBootstrap || !shellInitialized) {
    return <div className="app-shell loading-screen">Loading OIS workspace...</div>;
  }

  if (requiresOwnerClaim && bootstrap) {
    return (
      <div className="ois-shell">
        {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss"><Icon name="close" size={12} /></button></div> : null}
        <OwnerSetupView
          ownerName={authSession?.user.full_name ?? bootstrap.current_user.full_name}
          ownerEmail={authSession?.user.email ?? bootstrap.current_user.email}
          statusMessage={ownerSetupState?.status_message ?? null}
          mounts={bootstrap.ontology_mounts}
          submitting={workspaceSetupBusy}
          error={error}
          onClaim={handleClaimOwnerWorkspace}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  if (ownerNeedsVenueOnboarding && bootstrap && organizationId) {
    return (
      <div className="ois-shell">
        {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss"><Icon name="close" size={12} /></button></div> : null}
        <RoleWorkspaceFrame
          roleLabel="Owner workspace"
          title={bootstrap.organization?.name ?? "Owner workspace"}
          subtitle="The workspace is claimed. Add the first venue and provision the first real operators before moving into day-to-day execution."
          organizationName={bootstrap.organization?.name ?? null}
          actions={
            <button className="btn btn-secondary" onClick={handleLogout} disabled={workspaceSetupBusy}>
              Sign out
            </button>
          }
        >
          <OwnerAdministrationView
            organizationName={bootstrap.organization?.name ?? "Organization"}
            organizationId={organizationId}
            mounts={bootstrap.ontology_mounts}
            venues={bootstrap.venues}
            members={ownerMembers}
            loadingMembers={loadingOwnerMembers}
            working={workspaceSetupBusy}
            latestLoginPacket={latestLoginPacket}
            error={error}
            onCreateVenue={handleCreateVenue}
            onCreateMember={handleCreateOrganizationMember}
            onUpdateMember={handleUpdateOrganizationMember}
            onResetMemberLogin={handleResetOrganizationMemberLogin}
            onUpdateMemberVenueAccess={handleUpdateOrganizationMemberVenueAccess}
            onOpenVenue={handleSelectVenue}
            onLogout={handleLogout}
          />
        </RoleWorkspaceFrame>
      </div>
    );
  }

  if (!userHasVenueAccess && (activeRole === "manager" || activeRole === "barista")) {
    return (
      <div className="ois-shell">
        {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss"><Icon name="close" size={12} /></button></div> : null}
        <RoleWorkspaceFrame
          roleLabel={activeRole === "manager" ? "Manager workspace" : "Pocket workspace"}
          title="Access pending"
          subtitle="This account is real, but it has not been assigned to a venue yet. An owner needs to grant venue access before this role can begin operating."
          organizationName={bootstrap?.organization?.name ?? null}
          actions={
            <button className="btn btn-secondary" onClick={handleLogout} disabled={loggingOut}>
              Sign out
            </button>
          }
        >
          <SectionCard
            eyebrow="Access"
            title="No venue assignment yet"
            description="VOIS now fails closed instead of silently dropping you into demo data."
          >
            <div className="empty-state">
              <p>{ownerSetupState?.status_message ?? "Ask an owner to assign this account to a venue."}</p>
            </div>
          </SectionCard>
        </RoleWorkspaceFrame>
      </div>
    );
  }

  return (
    <ToastProvider>
      <DrawerProvider
        sidebarWidth={preferences.sidebarCollapsed ? 48 : 240}
        onSidebarAutoCollapse={() => setPreferences((c) => ({ ...c, sidebarCollapsed: true }))}
      >
        <div className={`ois-shell ${preferences.sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <WelcomeOverlay
        open={!preferences.welcomeDismissed}
        resumeVenueName={resumePulse?.venue_name ?? null}
        resumeReason={portfolioSummary?.resume_reason ?? null}
        portfolioNotes={portfolioSummary?.portfolio_notes ?? []}
        onEnterResume={
          resumePulse
            ? () =>
                dismissWelcome({
                  topLevelView: "venue",
                  venueId: resumePulse.venue_id,
                  venueView: toVenueView(resumePulse.suggested_view),
                })
            : null
        }
        onEnterPortfolio={() => dismissWelcome({ topLevelView: "portfolio" })}
        onEnterKnowledgeBase={() => dismissWelcome({ topLevelView: "kb" })}
      />

      {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss"><Icon name="close" size={12} /></button></div> : null}

      {bootstrap ? (
        <>
          <Sidebar
                collapsed={preferences.sidebarCollapsed}
                activeTopLevel={shellRoute.topLevelView}
                authRole={activeRole}
                venues={bootstrap.venues}
                activeVenueId={workspaceVenue?.id ?? null}
                venuePulses={portfolioSummary?.venue_pulses ?? []}
                onSelectVenue={handleSelectVenue}
                activeVenueView={shellRoute.topLevelView === "venue" ? shellRoute.venueView : "overview"}
                activeReferenceView={shellRoute.topLevelView === "reference" ? shellRoute.referenceView : "blocks"}
                portfolioSummary={portfolioSummary}
                onToggleCollapsed={() =>
                  setPreferences((current) => ({
                    ...current,
                    sidebarCollapsed: !current.sidebarCollapsed,
                  }))
                }
                onShowPortfolio={() => navigate({ topLevelView: "portfolio" })}
                onSelectVenueView={handleSelectVenueView}
                onSelectReferenceView={(view) => {
                  setReferenceSearch("");
                  navigate({ topLevelView: "reference", referenceView: view });
                }}
                onShowKnowledgeBase={() => navigate({ topLevelView: "kb" })}
                onShowHelp={() => navigate({ topLevelView: "help" })}
                onShowSettings={() => navigate({ topLevelView: "settings" })}
                onShowManager={handleEnterManagerShell}
                onShowPocket={handleEnterPocketShell}
                onShowOwner={handleEnterOwnerShell}
                onSelectManagerView={(view) => workspaceVenue && navigate({ topLevelView: "manager", venueId: workspaceVenue.id, managerView: view })}
                onSelectPocketView={(view) => workspaceVenue && navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: view })}
                onSelectOwnerView={(view) => workspaceVenue && navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: view })}
                activeManagerView={shellRoute.topLevelView === "manager" ? (shellRoute as { managerView: ManagerView }).managerView : undefined}
                activePocketView={activePocketNavView}
                activeOwnerView={shellRoute.topLevelView === "owner" ? (shellRoute as { ownerView: OwnerView }).ownerView : undefined}
                onToggleCopilot={() => setCopilotOpen((current) => !current)}
                copilotOpen={copilotOpen}
              />
          <div className="main-area">
          <TopBar
            authRole={activeRole}
            theme={preferences.theme}
            skin={preferences.skin}
            onToggleTheme={() =>
              setPreferences((current) => ({
                ...current,
                theme: (current.theme === "dark" ? "light" : "dark") as ThemeMode,
              }))
            }
            onSelectSkin={(skin) => setPreferences((current) => ({ ...current, skin: skin as SkinId }))}
            onToggleCopilot={() => setCopilotOpen((current) => !current)}
            onLogout={handleLogout}
            copilotOpen={copilotOpen}
            formatTimestamp={formatTimestamp}
            onNavigateToVenue={(venueId) => {
              if (activeRole === "barista") {
                navigate({ topLevelView: "pocket", venueId, pocketView: "shift" });
                return;
              }
              if (activeRole === "manager") {
                navigate({ topLevelView: "manager", venueId, managerView: "today" });
                return;
              }
              navigate({ topLevelView: "venue", venueId, venueView: "overview" });
            }}
          />
            <div className="content-area">
              <MobileTabStrip
                  visible={
                    activeRole === "barista" ||
                    (activeRole === "manager" && shellRoute.topLevelView === "manager") ||
                    (activeRole === "owner" && shellRoute.topLevelView === "owner") ||
                    shellRoute.topLevelView === "venue"
                  }
                  authRole={activeRole}
                  activeTopLevel={shellRoute.topLevelView}
                  activeView={
                    shellRoute.topLevelView === "venue"
                      ? (shellRoute as { venueView: string }).venueView ?? "overview"
                      : shellRoute.topLevelView === "manager"
                        ? (shellRoute as { managerView: string }).managerView ?? "today"
                        : shellRoute.topLevelView === "pocket"
                          ? ((shellRoute as { pocketView: string }).pocketView === "task"
                              ? "shift"
                              : (shellRoute as { pocketView: string }).pocketView) ?? "shift"
                          : shellRoute.topLevelView === "owner"
                            ? (shellRoute as { ownerView: string }).ownerView ?? "command"
                            : "overview"
                  }
                  onSelectView={handleSelectVenueView as (view: string) => void}
                  onSelectManagerView={handleSelectManagerView as (view: string) => void}
                  onSelectPocketView={handleSelectPocketView as (view: string) => void}
                  onSelectOwnerView={handleSelectOwnerView as (view: string) => void}
                />

              <main className="view-panel">
                {shellRoute.topLevelView === "portfolio" && bootstrap.organization ? (
                  <PortfolioView
                    bootstrap={bootstrap}
                    ontologyLabel={selectedOntologyLabel}
                    venues={bootstrap.venues}
                    portfolioSummary={portfolioSummary}
                    activeVenue={workspaceVenue}
                    loadingPortfolio={loadingPortfolio}
                    assessmentCount={assessmentHistory.length}
                    selectedEngineRun={selectedEngineRun}
                    latestPlan={latestPlan}
                    executionSummary={liveExecutionSummary}
                    progressEntries={progressEntries}
                    onOpenVenue={handleSelectVenue}
                    onOpenVenueWorkspace={handleOpenVenueWorkspace}
                    onOpenAssessment={() => handleSelectVenueView("assessment")}
                    onOpenDiagnosis={() => handleSelectVenueView("diagnosis")}
                    onOpenPlan={() => handleSelectVenueView("plan")}
                    formatTimestamp={formatTimestamp}
                    venueVelocities={portfolioVelocities}
                  />
                ) : null}

                {shellRoute.topLevelView === "venue" && workspaceVenue ? (
                  <>
                    {shellRoute.venueView === "overview" ? (
                      <VenueOverviewView
                        venue={workspaceVenue}
                        ontologyLabel={selectedOntologyLabel}
                        intakePreview={intakePreview}
                        savedAssessment={savedAssessment}
                        assessmentHistory={assessmentHistory}
                        selectedEngineRun={selectedEngineRun}
                        latestPlan={latestPlan}
                        executionSummary={liveExecutionSummary}
                        progressEntries={progressEntries}
                        auditEntries={auditEntries}
                        formatTimestamp={formatTimestamp}
                        onOpenAssessment={() => handleSelectVenueView("assessment")}
                        onOpenSignalReview={() => handleSelectVenueView("signals")}
                        onOpenDiagnosis={() => handleSelectVenueView("diagnosis")}
                        onOpenPlan={() => handleSelectVenueView("plan")}
                      />
                    ) : null}

                    {shellRoute.venueView === "assessment" ? (
                      selectedOntologyIssue ? (
                        <OntologyConfigurationState venueName={workspaceVenue.name} message={selectedOntologyIssue} />
                      ) : (
                        <AssessmentView
                          intakeText={intakeText}
                          assessmentType={assessmentType}
                          triageEnabled={triageEnabled}
                          triageIntensity={triageIntensity}
                          intakePreview={intakePreview}
                          inferredSignalCount={effectiveSignals.length + manuallyAddedSignalIds.size}
                          rejectedSignalIds={rejectedSignalIds}
                          manuallyAddedSignalIds={manuallyAddedSignalIds}
                          ontologyBundle={ontologyBundle}
                          managementHours={managementHours}
                          weeklyBudget={weeklyBudget}
                          savedAssessment={savedAssessment}
                          latestEngineRunAt={selectedEngineRun?.created_at ?? null}
                          loadedFromHistory={loadedAssessmentFromHistory}
                          sampleIntakeNotes={sampleIntakeNotes}
                          analyzingIntake={analyzingIntake}
                          savingAssessment={savingAssessment}
                          runningEngine={runningEngine}
                          reviewPlan={latestPlan}
                          activePlan={livePlan}
                          onIntakeChange={resetDerivedState}
                          onAssessmentTypeChange={handleAssessmentTypeChange}
                          onTriageEnabledChange={handleTriageEnabledChange}
                          onTriageIntensityChange={handleTriageIntensityChange}
                          onLoadSample={resetDerivedState}
                          onAnalyze={handleAnalyzeIntake}
                          onSaveAssessment={handleSaveAssessment}
                          onRunEngine={handleRunEngine}
                          onApprovePlan={handleApprovePlan}
                          onToggleSignalRejection={handleToggleSignalRejection}
                          onToggleManualSignal={handleToggleManualSignal}
                          onManagementHoursChange={handleManagementHoursChange}
                          onWeeklyBudgetChange={handleWeeklyBudgetChange}
                          formatTimestamp={formatTimestamp}
                          onOpenHistory={() => handleSelectVenueView("history")}
                          onOpenReport={() => handleSelectVenueView("diagnosis")}
                          onOpenSignalsReview={() => handleSelectVenueView("signals")}
                          onAskCopilot={askCopilotAbout}
                        />
                      )
                    ) : null}

                    {shellRoute.venueView === "signals" ? (
                      selectedOntologyIssue ? (
                        <OntologyConfigurationState venueName={workspaceVenue.name} message={selectedOntologyIssue} />
                      ) : (
                        <SignalsReviewView
                          intakePreview={intakePreview}
                          ontologyBundle={ontologyBundle}
                          rejectedSignalIds={rejectedSignalIds}
                          manuallyAddedSignalIds={manuallyAddedSignalIds}
                          onToggleSignalRejection={handleToggleSignalRejection}
                          onToggleManualSignal={handleToggleManualSignal}
                          onOpenAssessment={() => handleSelectVenueView("assessment")}
                          onOpenDiagnosis={() => handleSelectVenueView("diagnosis")}
                        />
                      )
                    ) : null}

                    {shellRoute.venueView === "history" ? (
                      <HistoryView
                        loading={loadingHistory}
                        assessments={assessmentHistory}
                        selectedAssessmentId={savedAssessment?.id ?? null}
                        loadingAssessmentId={loadingAssessmentRecordId}
                        comparison={historyComparison}
                        formatTimestamp={formatTimestamp}
                        onOpenAssessment={() => handleSelectVenueView("assessment")}
                        onOpenPlan={() => handleSelectVenueView("plan")}
                        onOpenDiagnosisRecord={handleOpenReportRecord}
                        onLoadAssessmentRecord={handleLoadAssessmentRecord}
                      />
                    ) : null}

                    {shellRoute.venueView === "plan" ? (
                      <PlanView
                        loadingExecution={loadingExecution || loadingPlanSelection}
                        plan={viewedPlan}
                        executionSummary={viewedExecutionSummary}
                        isHistoricalSelection={Boolean(viewedPlan && livePlan && viewedPlan.id !== livePlan.id)}
                        progressEntries={progressEntries}
                        progressSummary={progressSummary}
                        progressDetail={progressDetail}
                        savingProgress={savingProgress}
                        updatingTaskId={updatingTaskId}
                        venueId={workspaceVenue?.id ?? null}
                        onProgressSummaryChange={setProgressSummary}
                        onProgressDetailChange={setProgressDetail}
                        onCreateProgressEntry={handleCreateProgressEntry}
                        onUpdateTaskStatus={handleTaskStatusUpdate}
                        onUpdateTask={handleTaskUpdate}
                        formatTimestamp={formatTimestamp}
                        onOpenDiagnosis={() => handleSelectVenueView("diagnosis")}
                        onOpenHistory={() => handleSelectVenueView("history")}
                        onAskCopilot={askCopilotAbout}
                      />
                    ) : null}

                    {shellRoute.venueView === "diagnosis" ? (
                      <ReportView
                        loadingReports={loadingReports}
                        engineResult={engineResult}
                        selectedEngineRun={selectedEngineRun}
                        selectedEngineRunId={selectedEngineRunId}
                        engineRunHistory={engineRunHistory}
                        selectedEngineRunDetail={selectedEngineRunDetail}
                        loadingEngineRunDetail={loadingEngineRunDetail}
                        comparison={reportComparison}
                        enhancedReport={enhancedReport}
                        loadingEnhancedReport={loadingEnhancedReport}
                        onGenerateEnhancedReport={handleGenerateEnhancedReport}
                        onSelectEngineRun={handleSelectEngineRun}
                        formatTimestamp={formatTimestamp}
                        onOpenAssessment={() => handleSelectVenueView("assessment")}
                        onOpenPlan={() => handleSelectVenueView("plan")}
                        linkedPlanTitle={viewedPlan?.title ?? null}
                      />
                    ) : null}

                    {shellRoute.venueView === "console" ? (
                      <ConsoleView
                        organizationSlug={bootstrap.organization?.slug ?? "unclaimed"}
                        ontologyLabel={selectedOntologyLabel}
                        readiness={bootstrap.readiness}
                        intakePreview={intakePreview}
                        executionSummary={executionSummary}
                        integrationSummary={integrationSummary}
                        integrationEvents={integrationEvents}
                        loadingIntegrationEvents={loadingIntegrationEvents}
                        retryingIntegrationEventId={retryingIntegrationEventId}
                        onRetryIntegrationEvent={handleRetryIntegrationEvent}
                        auditEntries={auditEntries}
                        loadingAudit={loadingAudit}
                        formatTimestamp={formatTimestamp}
                      />
                    ) : null}
                  </>
                ) : null}

                {shellRoute.topLevelView === "reference" ? (
                  selectedOntologyIssue ? (
                    <OntologyConfigurationState
                      venueName={workspaceVenue?.name ?? "Selected venue"}
                      message={selectedOntologyIssue}
                    />
                  ) : (
                    <ReferenceView
                      view={shellRoute.referenceView}
                      bundle={ontologyBundle}
                      alignment={ontologyAlignment}
                      governance={ontologyGovernance}
                      authoringBrief={ontologyAuthoringBrief}
                      loading={loadingOntology}
                      search={referenceSearch}
                      onSearchChange={setReferenceSearch}
                    />
                  )
                ) : null}

                {shellRoute.topLevelView === "kb" ? (
                  <KnowledgeBaseView
                    articles={kbArticles}
                    loading={loadingKbArticles}
                  />
                ) : null}

                {shellRoute.topLevelView === "help" ? (
                  <HelpView />
                ) : null}

                {shellRoute.topLevelView === "settings" ? (
                  <SettingsView
                    theme={preferences.theme}
                    skin={preferences.skin}
                    sidebarCollapsed={preferences.sidebarCollapsed}
                    currentSurfaceLabel={currentSurfaceLabel}
                    authUserName={authSession?.user.full_name ?? bootstrap.current_user.full_name}
                    authUserEmail={authSession?.user.email ?? bootstrap.current_user.email ?? ""}
                    authUserRole={authSession?.user.role ?? bootstrap.current_user.role ?? ""}
                    authenticationMode={authSession?.session.authentication_mode ?? "firebase_id_token"}
                    sessionActive={Boolean(authSession)}
                    sessionInventoryAvailable={sessionInventoryAvailable}
                    sessionInventory={sessionInventory}
                    sessionInventoryScope={sessionInventoryScope}
                    loadingSessionInventory={loadingSessionInventory}
                    revokingSessionId={revokingSessionId}
                    securityPosture={securityPosture}
                    loadingSecurityPosture={loadingSecurityPosture}
                    exportSummary={organizationExportSummary}
                    backupReadiness={organizationBackupReadiness}
                    deleteReadiness={organizationDeleteReadiness}
                    loadingExportSummary={loadingExportSummary}
                    loadingBackupReadiness={loadingBackupReadiness}
                    loadingDeleteReadiness={loadingDeleteReadiness}
                    exportingOrganization={exportingOrganization}
                    ontologyBundle={ontologyBundle}
                    venueBindings={venueOntologyBindings}
                    loginEmail={loginEmail}
                    loginPassword={loginPassword}
                    loginBusy={loggingIn}
                    logoutBusy={loggingOut}
                    onToggleTheme={() =>
                      setPreferences((current) => ({
                        ...current,
                        theme: (current.theme === "dark" ? "light" : "dark") as ThemeMode,
                      }))
                    }
                    onSelectSkin={(skin) => setPreferences((current) => ({ ...current, skin: skin as SkinId }))}
                    onToggleSidebar={() =>
                      setPreferences((current) => ({
                        ...current,
                        sidebarCollapsed: !current.sidebarCollapsed,
                      }))
                    }
                    onResetWelcome={handleResetWelcome}
                    onRestoreDefaults={handleRestoreDefaults}
                    onLoginEmailChange={setLoginEmail}
                    onLoginPasswordChange={setLoginPassword}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    onSessionInventoryScopeChange={setSessionInventoryScope}
                    onRevokeSession={handleRevokeManagedSession}
                    onGenerateOrganizationExport={handleGenerateOrganizationExport}
                  />
                ) : null}

                {shellRoute.topLevelView === "manager" && workspaceVenue ? (
                  <>
                    {/* Manager sub-navigation */}
                    <div style={{ display: "flex", gap: "var(--spacing-xs)", padding: "var(--spacing-sm) 0", marginBottom: "var(--spacing-md)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                      {([
                        ["today", "Today"],
                        ["workspace", "Workspace"],
                        ["plan", "Plan"],
                        ["evidence", "Evidence"],
                        ["team", "Team pulse"],
                        ["escalations", "Escalations"],
                        ["copilot", "VOIS"],
                      ] as [ManagerView, string][]).map(([view, label]) => (
                        <button
                          key={view}
                          className={`btn btn-sm ${shellRoute.topLevelView === "manager" && (shellRoute as { managerView: string }).managerView === view ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => handleSelectManagerView(view)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {selectedOntologyIssue ? (
                      <OntologyConfigurationState venueName={workspaceVenue.name} message={selectedOntologyIssue} />
                    ) : (shellRoute as { managerView: string }).managerView === "today" ? (
                      <TodayBoard
                        nextActions={mgrNextActions}
                        followUps={mgrFollowUps}
                        escalations={mgrEscalations}
                        plan={livePlan}
                        executionSummary={liveExecutionSummary}
                        loading={mgrLoading}
                        formatTimestamp={formatTimestamp}
                        onOpenTask={(taskId) => { setMgrSelectedTaskId(taskId); handleSelectManagerView("workspace"); }}
                        onOpenFollowUp={() => handleSelectManagerView("workspace")}
                        onOpenEscalation={() => handleSelectManagerView("escalations")}
                        onOpenPlan={() => handleSelectManagerView("plan")}
                        onOpenWorkspace={(taskId) => { setMgrSelectedTaskId(taskId); handleSelectManagerView("workspace"); }}
                        onAskCopilot={askCopilotAbout}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { managerView: string }).managerView === "workspace" ? (
                      <ExecutionWorkspace
                        plan={livePlan}
                        followUps={mgrFollowUps}
                        evidence={mgrEvidence}
                        selectedTaskId={mgrSelectedTaskId}
                        updatingTaskId={updatingTaskId}
                        formatTimestamp={formatTimestamp}
                        onSelectTask={setMgrSelectedTaskId}
                        onUpdateTask={handleTaskUpdate}
                        onCreateFollowUp={handleMgrCreateFollowUp}
                        onCreateEvidence={(taskId) => handleMgrCreateEvidence(taskId)}
                        onEscalateTask={handleMgrEscalateTask}
                        onAskCopilot={askCopilotAbout}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { managerView: string }).managerView === "plan" ? (
                      <PlanView
                        loadingExecution={loadingExecution}
                        plan={livePlan}
                        executionSummary={liveExecutionSummary}
                        isHistoricalSelection={false}
                        progressEntries={progressEntries}
                        progressSummary={progressSummary}
                        progressDetail={progressDetail}
                        savingProgress={savingProgress}
                        updatingTaskId={updatingTaskId}
                        venueId={workspaceVenue?.id ?? null}
                        onProgressSummaryChange={setProgressSummary}
                        onProgressDetailChange={setProgressDetail}
                        onCreateProgressEntry={handleCreateProgressEntry}
                        onUpdateTaskStatus={handleTaskStatusUpdate}
                        onUpdateTask={handleTaskUpdate}
                        formatTimestamp={formatTimestamp}
                        onOpenDiagnosis={() => handleSelectVenueView("diagnosis")}
                        onOpenHistory={() => handleSelectVenueView("history")}
                        onAskCopilot={askCopilotAbout}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { managerView: string }).managerView === "evidence" ? (
                      <EvidenceHub
                        evidence={mgrEvidence}
                        plan={livePlan}
                        loading={mgrLoading}
                        formatTimestamp={formatTimestamp}
                        onCreateEvidence={handleMgrCreateEvidence}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { managerView: string }).managerView === "team" ? (
                      <TeamPulse
                        followUps={mgrFollowUps}
                        escalations={mgrEscalations}
                        progressEntries={progressEntries}
                        plan={livePlan}
                        loading={mgrLoading}
                        formatTimestamp={formatTimestamp}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { managerView: string }).managerView === "escalations" ? (
                      <EscalationChannel
                        escalations={mgrEscalations}
                        loading={mgrLoading}
                        formatTimestamp={formatTimestamp}
                        onResolveEscalation={handleMgrResolveEscalation}
                        onCreateEscalation={handleMgrCreateEscalation}
                        resolvingEscalationId={mgrResolvingEscalationId}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { managerView: string }).managerView === "copilot" ? (
                      <>
                        <ManagerCopilot
                          nextActions={mgrNextActions}
                          followUps={mgrFollowUps}
                          escalations={mgrEscalations}
                          plan={livePlan}
                          executionSummary={liveExecutionSummary}
                          venueName={workspaceVenue.name}
                          onAskCopilot={askCopilotAbout}
                        />
                        <RoleCopilotState
                          roleLabel="Manager"
                          venueName={workspaceVenue.name}
                          unavailableMessage={copilotIssue}
                          onOpenCopilot={() => setCopilotWorkspaceOpen(true)}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}

                {shellRoute.topLevelView === "pocket" && workspaceVenue ? (
                  <>
                    {/* Pocket sub-navigation */}
                    <div style={{ display: "flex", gap: "var(--spacing-xs)", padding: "var(--spacing-sm) 0", marginBottom: "var(--spacing-md)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                      {([
                        ["shift", "My shift"],
                        ["standards", "Standards"],
                        ["help", "Ask manager"],
                        ["report", "Report"],
                        ["log", "My log"],
                      ] as [PocketView, string][]).map(([view, label]) => (
                        <button
                          key={view}
                          className={`btn btn-sm ${shellRoute.topLevelView === "pocket" && (shellRoute as { pocketView: string }).pocketView === view ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => handleSelectPocketView(view)}
                          style={{ minHeight: 44 }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {selectedOntologyIssue ? (
                      <OntologyConfigurationState venueName={workspaceVenue.name} message={selectedOntologyIssue} />
                    ) : (shellRoute as { pocketView: string }).pocketView === "shift" ? (
                      <MyShift
                        shift={pktShift}
                        loading={pktLoading}
                        onOpenTask={(taskId) => {
                          setPktSelectedTaskId(taskId);
                          handleSelectPocketView("task");
                        }}
                        onAskCopilot={askCopilotAbout}
                        venueId={workspaceVenue?.id ?? null}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { pocketView: string }).pocketView === "task" ? (
                      <PocketTaskDetail
                        task={selectedPocketTask}
                        onBack={() => handleSelectPocketView("shift")}
                        onAskCopilot={askCopilotAbout}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { pocketView: string }).pocketView === "standards" ? (
                      <MyStandards
                        standards={pktStandards}
                        loading={pktLoading}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { pocketView: string }).pocketView === "help" ? (
                      <AskForHelp
                        shift={pktShift}
                        standards={pktStandards}
                        venueName={workspaceVenue.name}
                        helpRequests={pktHelpRequests}
                        loading={pktLoading}
                        submitting={pktSubmitting}
                        onCreateHelpRequest={handlePktCreateHelpRequest}
                        onCloseHelpRequest={handlePktCloseHelpRequest}
                        onOpenThread={openPocketHelpThread}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { pocketView: string }).pocketView === "report" ? (
                      <ReportSomething
                        venueId={workspaceVenue.id}
                        onSubmitReport={handlePktReportFriction}
                        submitting={pktSubmitting}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { pocketView: string }).pocketView === "log" ? (
                      <MyLog
                        entries={pktDiary}
                        loading={pktLoading}
                        formatTimestamp={formatTimestamp}
                        onCreateEntry={handlePktCreateDiaryEntry}
                        submitting={pktSubmitting}
                      />
                    ) : null}
                  </>
                ) : null}

                {shellRoute.topLevelView === "owner" && workspaceVenue ? (
                  <>
                    {/* Owner sub-navigation */}
                    <div style={{ display: "flex", gap: "var(--spacing-xs)", padding: "var(--spacing-sm) 0", marginBottom: "var(--spacing-md)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                      {([
                        ["command", "Command center"],
                        ["delegations", "Delegations"],
                        ["people", "People"],
                        ["intelligence", "Intelligence"],
                        ["administration", "Administration"],
                      ] as [OwnerView, string][]).map(([view, label]) => (
                        <button
                          key={view}
                          className={`btn btn-sm ${shellRoute.topLevelView === "owner" && (shellRoute as { ownerView: string }).ownerView === view ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => handleSelectOwnerView(view)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {selectedOntologyIssue ? (
                      <OntologyConfigurationState venueName={workspaceVenue.name} message={selectedOntologyIssue} />
                    ) : (shellRoute as { ownerView: string }).ownerView === "command" ? (
                      <CommandCenter
                        attentionItems={ownAttentionItems}
                        velocities={ownVelocities}
                        delegations={ownDelegations}
                        loading={ownLoading}
                        formatTimestamp={formatTimestamp}
                        onOpenVenue={(venueId) => navigate({ topLevelView: "venue", venueId, venueView: "overview" })}
                        onOpenDelegations={() => workspaceVenue && navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: "delegations" })}
                        onOpenIntelligence={() => workspaceVenue && navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: "intelligence" })}
                        onAskCopilot={askCopilotAbout}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { ownerView: string }).ownerView === "delegations" ? (
                      <DelegationConsole
                        delegations={ownDelegations}
                        loading={ownLoading}
                        formatTimestamp={formatTimestamp}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { ownerView: string }).ownerView === "people" ? (
                      <OwnerPeopleView
                        teamProfiles={ownTeamProfiles}
                        overloadMap={ownOverloadMap}
                        flightRisk={ownFlightRisk}
                        members={ownerMembers}
                        venues={bootstrap.venues}
                        loadingMembers={loadingOwnerMembers}
                        loadingHealth={ownLoading}
                        working={workspaceSetupBusy}
                        latestLoginPacket={latestLoginPacket}
                        onCreateMember={handleCreateOrganizationMember}
                        onUpdateMember={handleUpdateOrganizationMember}
                        onResetMemberLogin={handleResetOrganizationMemberLogin}
                        onUpdateMemberVenueAccess={handleUpdateOrganizationMemberVenueAccess}
                      />
                    ) : null}

                    {(shellRoute as { ownerView: string }).ownerView === "intelligence" ? (
                      <SignalIntelligenceMap
                        bundle={ontologyBundle}
                        venuePulses={portfolioSummary?.venue_pulses ?? []}
                        assessmentHistory={assessmentHistory}
                        loading={loadingOntology || loadingHistory}
                        venueId={workspaceVenue?.id ?? null}
                        onOpenVenue={(venueId) => navigate({ topLevelView: "venue", venueId, venueView: "overview" })}
                      />
                    ) : null}

                    {!selectedOntologyIssue && (shellRoute as { ownerView: string }).ownerView === "administration" ? (
                      <OwnerAdministrationView
                        organizationName={bootstrap.organization?.name ?? "Organization"}
                        organizationId={organizationId ?? ""}
                        mounts={bootstrap.ontology_mounts}
                        venues={bootstrap.venues}
                        members={ownerMembers}
                        loadingMembers={loadingOwnerMembers}
                        working={workspaceSetupBusy}
                        latestLoginPacket={latestLoginPacket}
                        error={error}
                        onCreateVenue={handleCreateVenue}
                        onCreateMember={handleCreateOrganizationMember}
                        onUpdateMember={handleUpdateOrganizationMember}
                        onResetMemberLogin={handleResetOrganizationMemberLogin}
                        onUpdateMemberVenueAccess={handleUpdateOrganizationMemberVenueAccess}
                        onOpenVenue={handleSelectVenue}
                        onLogout={handleLogout}
                      />
                    ) : null}
                  </>
                ) : null}
              </main>
            </div>
          </div>

          <CopilotDrawer
            open={copilotOpen}
            threads={scopedCopilotThreads}
            selectedThreadId={selectedThreadId}
            selectedThread={selectedThread}
            selectedThreadContext={selectedThreadContext}
            selectedThreadActions={selectedThreadActions}
            loading={loadingCopilot}
            sending={sendingCopilot}
            input={copilotInput}
            attachments={copilotAttachments}
            compactActions={compactCopilotActions}
            actionPreview={copilotActionPreview}
            actionReceipt={copilotActionReceipt}
            previewingActionType={previewingCopilotActionType}
            committingActionType={committingCopilotActionType}
            onPreviewAction={handlePreviewCopilotAction}
            onCommitPreview={handleCommitCopilotAction}
            onDismissPreview={handleDismissCopilotActionPreview}
            onSelectThread={setSelectedThreadId}
            onInputChange={setCopilotInput}
            onAttachFiles={handleAttachCopilotFiles}
            onRemoveAttachment={handleRemoveCopilotAttachment}
            onSend={handleSendCopilotMessage}
            onClose={() => setCopilotOpen(false)}
            formatTimestamp={formatTimestamp}
            contextLabel={copilotContextLabel}
            contextSummary={copilotContextSummary}
            inputPlaceholder={copilotInputPlaceholder}
            unavailableMessage={copilotIssue}
            preFillMessage={copilotPreFill}
            onPreFillConsumed={() => setCopilotPreFill(null)}
            screenContext={copilotScreenContext}
            onOpenWorkspace={() => {
              setCopilotWorkspaceOpen(true);
              setCopilotOpen(false);
            }}
          />
          <CopilotWorkspace
            open={copilotWorkspaceOpen}
            threads={scopedCopilotThreads}
            selectedThreadId={selectedThreadId}
            selectedThread={selectedThread}
            selectedThreadContext={selectedThreadContext}
            selectedThreadActions={selectedThreadActions}
            loadingActionHistory={loadingCopilotActions}
            actionPreview={copilotActionPreview}
            actionReceipt={copilotActionReceipt}
            previewingActionType={previewingCopilotActionType}
            committingActionType={committingCopilotActionType}
            availableActions={copilotAvailableActions}
            loading={loadingCopilot}
            sending={sendingCopilot}
            searching={searchingCopilot}
            searchQuery={copilotSearchQuery}
            searchResults={copilotSearchResults}
            visibilityFilter={copilotVisibilityFilter}
            sortMode={copilotSortMode}
            includeArchived={copilotIncludeArchived}
            input={copilotInput}
            attachments={copilotAttachments}
            quotedMessage={quotedCopilotMessage}
            contextLabel={copilotContextLabel}
            contextSummary={copilotContextSummary}
            inputPlaceholder={copilotInputPlaceholder}
            unavailableMessage={copilotIssue}
            onClose={() => setCopilotWorkspaceOpen(false)}
            onSelectThread={setSelectedThreadId}
            onSearchChange={setCopilotSearchQuery}
            onVisibilityFilterChange={setCopilotVisibilityFilter}
            onSortModeChange={setCopilotSortMode}
            onIncludeArchivedChange={setCopilotIncludeArchived}
            onInputChange={setCopilotInput}
            onAttachFiles={handleAttachCopilotFiles}
            onRemoveAttachment={handleRemoveCopilotAttachment}
            onSend={handleSendCopilotMessage}
            onCreateSharedThread={() => void handleCreateCopilotThread("shared")}
            onCreatePrivateThread={() => void handleCreateCopilotThread("private")}
            onRenameThread={handleRenameSelectedCopilotThread}
            onTogglePin={handleToggleSelectedCopilotPin}
            onToggleArchive={handleToggleSelectedCopilotArchive}
            onDeleteThread={handleDeleteSelectedCopilotThread}
            onQuoteMessage={setCopilotQuotedMessageId}
            onClearQuotedMessage={() => setCopilotQuotedMessageId(null)}
            onReuseMessage={(content) => {
              setCopilotInput(content);
              setCopilotQuotedMessageId(null);
            }}
            onBranchThread={handleBranchFromCopilotMessage}
            onPreviewAction={handlePreviewCopilotAction}
            onCommitPreview={handleCommitCopilotAction}
            onDismissPreview={handleDismissCopilotActionPreview}
            actionStatusMessage={copilotWorkspaceActionMessage}
            formatTimestamp={formatTimestamp}
          />
          {tour.active && roleTour ? (
            <TourOverlay
              step={tour.currentStep}
              stepIndex={tour.stepIndex}
              totalSteps={tour.totalSteps}
              isLast={tour.isLast}
              onNext={tour.next}
              onDismiss={tour.dismiss}
            />
          ) : null}
        </>
      ) : null}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        items={commandItems}
        onAskCopilot={(query) => {
          setCmdPaletteOpen(false);
          setCopilotOpen(true);
        }}
      />
      <StackingDrawerHost />
    </div>
    </DrawerProvider>
    </ToastProvider>
  );
}

function sanitizeRoute(route: ShellRoute, venues: Venue[], fallbackVenueId: string | null): ShellRoute {
  if (route.topLevelView === "venue") {
    const venueExists = venues.some((venue) => venue.id === route.venueId);
    if (venueExists) return route;
    if (fallbackVenueId) return { topLevelView: "venue", venueId: fallbackVenueId, venueView: "overview" };
    return { topLevelView: "portfolio" };
  }

  if (route.topLevelView === "manager") {
    const venueExists = venues.some((venue) => venue.id === (route as { venueId: string }).venueId);
    if (venueExists) return route;
    if (fallbackVenueId) return { topLevelView: "manager", venueId: fallbackVenueId, managerView: "today" };
    return { topLevelView: "portfolio" };
  }

  if (route.topLevelView === "pocket") {
    const venueExists = venues.some((venue) => venue.id === (route as { venueId: string }).venueId);
    if (venueExists) return route;
    if (fallbackVenueId) return { topLevelView: "pocket", venueId: fallbackVenueId, pocketView: "shift" };
    return { topLevelView: "portfolio" };
  }

  if (route.topLevelView === "owner") {
    const venueExists = venues.some((venue) => venue.id === (route as { venueId: string }).venueId);
    if (venueExists) return route;
    if (fallbackVenueId) return { topLevelView: "owner", venueId: fallbackVenueId, ownerView: "command" };
    return { topLevelView: "portfolio" };
  }

  return route;
}

function coerceRouteForRole(route: ShellRoute, role: string | null, fallbackVenueId: string | null): ShellRoute {
  if (role === "owner") {
    if (route.topLevelView === "settings") return route;
    if (route.topLevelView === "pocket") {
      return fallbackVenueId ? { topLevelView: "owner", venueId: fallbackVenueId, ownerView: "command" } : { topLevelView: "portfolio" };
    }
    return route;
  }

  if (role === "manager") {
    if (route.topLevelView === "settings") return route;
    if (route.topLevelView === "portfolio" || route.topLevelView === "owner") {
      return fallbackVenueId ? { topLevelView: "manager", venueId: fallbackVenueId, managerView: "today" } : { topLevelView: "settings" };
    }
    if (route.topLevelView === "pocket") {
      return fallbackVenueId ? { topLevelView: "manager", venueId: fallbackVenueId, managerView: "today" } : { topLevelView: "settings" };
    }
    return route;
  }

  if (role === "barista") {
    if (route.topLevelView === "pocket" || route.topLevelView === "reference" || route.topLevelView === "kb" || route.topLevelView === "help") {
      return route;
    }
    return fallbackVenueId ? { topLevelView: "pocket", venueId: fallbackVenueId, pocketView: "shift" } : { topLevelView: "settings" };
  }

  if (role === "developer") {
    if (!fallbackVenueId && route.topLevelView === "portfolio") {
      return { topLevelView: "settings" };
    }
    if (route.topLevelView === "settings" || route.topLevelView === "reference" || route.topLevelView === "kb" || route.topLevelView === "help" || route.topLevelView === "portfolio") {
      return route;
    }
    return { topLevelView: "settings" };
  }

  return route;
}

function OntologyConfigurationState({ venueName, message }: { venueName: string; message: string }) {
  return (
    <SectionCard
      eyebrow="Configuration"
      title="Ontology binding required"
      description="This surface is intentionally blocked until the selected venue has a valid runtime ontology mount."
    >
      <div className="empty-state">
        <p>
          <strong>{venueName}</strong> is not execution-ready.
        </p>
        <p>{message}</p>
        <p>Bind the venue to a valid ontology pack, then reload this workflow.</p>
      </div>
    </SectionCard>
  );
}

function formatTimestamp(isoTimestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoTimestamp));
}

function filterThreadsForScope(threads: CopilotThreadSummary[], activeVenueId: string | null, role: string | null = null) {
  if (role === "barista") {
    return threads.filter(
      (thread) =>
        (thread.visibility === "private" && (!activeVenueId || thread.venue_id === null || thread.venue_id === activeVenueId)) ||
        (thread.scope === "help_request" && (!activeVenueId || thread.venue_id === activeVenueId))
    );
  }

  if (role === "manager" && activeVenueId) {
    return threads.filter((thread) =>
      thread.visibility === "private" ||
      thread.scope === "global" ||
      thread.venue_id === null ||
      thread.venue_id === activeVenueId
    );
  }

  if (activeVenueId) {
    return threads.filter(
      (thread) =>
        thread.visibility === "private" ||
        thread.scope === "global" ||
        thread.venue_id === null ||
        thread.venue_id === activeVenueId
    );
  }

  const globalThreads = threads.filter((thread) => thread.visibility === "private" || thread.scope === "global" || thread.venue_id === null);
  return globalThreads.length ? globalThreads : threads;
}

function preferredThreadId(
  threads: CopilotThreadSummary[],
  activeVenueId: string | null,
  role: string | null = null
) {
  if (role === "barista") {
    return (
      threads.find((thread) => thread.visibility === "private" && !thread.archived)?.id ??
      threads.find((thread) => thread.scope === "help_request" && !thread.archived)?.id ??
      null
    );
  }

  if (!activeVenueId) {
    return (
      threads.find((thread) => thread.visibility === "private" && !thread.archived)?.id ??
      threads.find((thread) => thread.scope === "global" || thread.venue_id === null)?.id ??
      threads.find((thread) => !thread.archived)?.id ??
      null
    );
  }

  return (
    threads.find((thread) => thread.visibility === "private" && (thread.venue_id === activeVenueId || thread.venue_id === null) && !thread.archived)?.id ??
    threads.find((thread) => thread.venue_id === activeVenueId && thread.scope === "venue" && !thread.archived)?.id ??
    threads.find((thread) => thread.venue_id === activeVenueId && thread.scope === "help_request" && !thread.archived)?.id ??
    threads.find((thread) => thread.venue_id === activeVenueId && !thread.archived)?.id ??
    threads.find((thread) => (thread.scope === "global" || thread.venue_id === null) && !thread.archived)?.id ??
    threads.find((thread) => !thread.archived)?.id ??
    null
  );
}

function toVenueView(value: string): VenueSubview {
  if (value === "assessment" || value === "signals" || value === "history" || value === "plan" || value === "diagnosis" || value === "console") {
    return value;
  }
  if (value === "report") {
    return "diagnosis";
  }
  return "overview";
}

function describeSurface(route: ShellRoute, venueName: string | null) {
  switch (route.topLevelView) {
    case "portfolio":
      return "Portfolio home";
    case "venue":
      return `${venueName ?? "Venue"} / ${route.venueView}`;
    case "reference":
      return `Reference / ${route.referenceView}`;
    case "kb":
      return "Knowledge Base";
    case "settings":
      return "Settings";
    case "manager":
      return `${venueName ?? "Venue"} / manager / ${route.managerView}`;
    case "pocket":
      return `${venueName ?? "Venue"} / pocket / ${route.pocketView}`;
    case "owner":
      return `${venueName ?? "Venue"} / owner / ${route.ownerView}`;
  }
  return "Workspace";
}

function extractPendingSignalSuggestion(
  thread: CopilotThreadDetail | null,
  dismissedMessageIds: string[]
): {
  messageId: string;
  suggestion: {
    add: Array<{ signal_id: string; signal_name?: string | null; notes: string; confidence: string }>;
    remove: string[];
  };
} | null {
  if (!thread) {
    return null;
  }

  const messages = [...thread.messages].reverse();
  for (const message of messages) {
    if (dismissedMessageIds.includes(message.id)) {
      continue;
    }
    const suggestionReference = message.references.find((reference) => reference.type === "signal_update");
    if (!suggestionReference || !suggestionReference.payload) {
      continue;
    }

    const payload = suggestionReference.payload as {
      add?: Array<{ signal_id: string; signal_name?: string | null; notes: string; confidence?: string }>;
      remove?: string[];
    };

    return {
      messageId: message.id,
      suggestion: {
        add: (payload.add ?? []).map((item) => ({
          signal_id: item.signal_id,
          signal_name: item.signal_name ?? null,
          notes: item.notes,
          confidence: item.confidence ?? "medium",
        })),
        remove: payload.remove ?? [],
      },
    };
  }

  return null;
}

function deriveCopilotActionSource(thread: CopilotThreadDetail | null): { message: CopilotMessageRecord } | null {
  if (!thread) {
    return null;
  }

  const assistantMessage = [...thread.messages]
    .reverse()
    .find((message) => message.author_role === "assistant" && message.content.trim().length);

  if (assistantMessage) {
    return { message: assistantMessage };
  }

  const fallbackMessage = [...thread.messages].reverse().find((message) => message.content.trim().length);
  return fallbackMessage ? { message: fallbackMessage } : null;
}

function deriveCopilotArtifactTitle(
  thread: CopilotThreadDetail | null,
  message: CopilotMessageRecord
) {
  const preferredHeadline = firstMeaningfulLine(message.content);
  if (preferredHeadline) {
    return truncateTitle(preferredHeadline);
  }

  if (thread?.title?.trim()) {
    return truncateTitle(`Copilot follow-up · ${thread.title.trim()}`);
  }

  return "Copilot follow-up";
}

function buildCopilotNoteSummary(
  thread: CopilotThreadDetail | null,
  message: CopilotMessageRecord
) {
  const preferredHeadline = firstMeaningfulLine(message.content);
  if (preferredHeadline) {
    return truncateTitle(preferredHeadline, 96);
  }

  return thread?.title?.trim() ? truncateTitle(`Copilot note · ${thread.title.trim()}`, 96) : "Copilot note";
}

function buildCopilotArtifactBody(
  thread: CopilotThreadDetail | null,
  message: CopilotMessageRecord
) {
  const contextLabel = thread?.context_label ?? "Current workspace";
  const lines = [
    `Source thread: ${thread?.title ?? "Untitled thread"}`,
    `Context: ${contextLabel}`,
    `Captured: ${formatTimestamp(message.created_at)}`,
    "",
    message.content.trim(),
  ];
  return lines.join("\n").trim();
}

function firstMeaningfulLine(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[#>*\-\d.\s`]+/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);
  return lines[0] ?? null;
}

function truncateTitle(value: string, limit = 72) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}
