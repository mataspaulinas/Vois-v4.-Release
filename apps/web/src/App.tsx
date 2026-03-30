import { useEffect, useMemo, useRef, useState } from "react";

import {
  AssessmentHistoryItem,
  AssessmentRecord,
  AuthSecurityPosture,
  AuthSessionResponse,
  AuthSessionInventory,
  AuditEntryRecord,
  BootstrapResponse,
  CopilotAttachment,
  CopilotThreadDetail,
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
  fetchCopilotThreads,
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
  fetchProactiveGreeting,
  fetchPlan,
  fetchPlanExecutionSummary,
  fetchPortfolioSummary,
  fetchProgressEntries,
  fetchSessionInventory,
  loginSession,
  logoutSession,
  previewIntake,
  retryIntegrationEvent,
  runAIIntake,
  runSavedAssessment,
  revokeManagedSession,
  sendCopilotMessage,
  setAuthToken,
  subscribeToAuthTokenChanges,
  generateOrganizationExport,
  runOntologyEvaluationPack,
  updatePlan,
  updatePlanTask,
  updatePlanTaskStatus,
  updateOrganizationMember,
  updateOrganizationMemberVenueAccess,
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
} from "./lib/api";
import { firebaseConfigured } from "./lib/firebase";
import { SectionCard } from "./components/SectionCard";
import { CopilotDrawer } from "./features/copilot/CopilotDrawer";
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
import { SignalsReviewView } from "./features/views/SignalsReviewView";
import { ConsoleView } from "./features/views/ConsoleView";
import { HistoryView } from "./features/views/HistoryView";
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
import { MyShift } from "./features/pocket/MyShift";
import { MyStandards } from "./features/pocket/MyStandards";
import { AskForHelp } from "./features/pocket/AskForHelp";
import { ReportSomething } from "./features/pocket/ReportSomething";
import { MyLog } from "./features/pocket/MyLog";
import { SignalIntelligenceMap } from "./features/intelligence/SignalIntelligenceMap";
import { OwnerAdministrationView } from "./features/owner/OwnerAdministrationView";
import { CommandCenter } from "./features/owner/CommandCenter";
import { DelegationConsole } from "./features/owner/DelegationConsole";
import { OwnerSetupView } from "./features/setup/OwnerSetupView";
import { buildHistoryComparison } from "./features/views/historyInsights";
import { buildReportComparison } from "./features/views/reportInsights";
import { ToastProvider } from "./components/Toast";
import { DrawerProvider, StackingDrawerHost } from "./components/StackingDrawer";
import { CommandPalette, useCommandPalette } from "./components/CommandPalette";

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

export default function App() {
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
  const loginEmailRef = useRef<HTMLInputElement | null>(null);
  const loginPasswordRef = useRef<HTMLInputElement | null>(null);

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
  const [proactiveGreeting, setProactiveGreeting] = useState<string | null>(null);
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
  const [intakeText, setIntakeText] = useState("");
  const [rejectedSignalIds, setRejectedSignalIds] = useState<Set<string>>(new Set());
  const [manuallyAddedSignalIds, setManuallyAddedSignalIds] = useState<Set<string>>(new Set());
  const [managementHours, setManagementHours] = useState(10);
  const [weeklyBudget, setWeeklyBudget] = useState(24);
  const [progressSummary, setProgressSummary] = useState("");
  const [progressDetail, setProgressDetail] = useState("");
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotAttachments, setCopilotAttachments] = useState<CopilotAttachment[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [loadingOntology, setLoadingOntology] = useState(true);
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
  const requiresOwnerClaim = activeRole === "owner" && Boolean(bootstrap?.requires_owner_claim ?? authSession?.requires_owner_claim);
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
            setLoginRequired(true);
          })
          .finally(() => {
            setLoadingBootstrap(false);
          });
        return;
      }

      setLoginRequired(false);
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

  useEffect(() => {
    if (!loginEmail && bootstrap?.current_user.email) {
      setLoginEmail(bootstrap.current_user.email);
    }
  }, [bootstrap?.current_user.email, loginEmail]);

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
        // Proactively surface AI unavailability for real roles so they
        // discover it before attempting copilot interaction.
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
    if (!bootstrap || !organizationId) {
      return;
    }

    fetchProactiveGreeting()
      .then((payload) => {
        setProactiveGreeting(payload?.content ?? null);
      })
      .catch((err: Error) => {
        setProactiveGreeting(err.message);
      });
  }, [organizationId]);

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
  const copilotRoleContext =
    shellRoute.topLevelView === "manager"
      ? "Manager"
      : shellRoute.topLevelView === "pocket"
        ? "Pocket"
        : shellRoute.topLevelView === "owner"
          ? "Owner"
          : shellRoute.topLevelView === "venue"
            ? "Venue"
            : "Portfolio";
  const scopedCopilotThreads = useMemo(
    () => filterThreadsForScope(copilotThreads, copilotVenueContext, activeRole),
    [copilotThreads, copilotVenueContext, activeRole]
  );
  const copilotContextLabel = copilotVenueContext
    ? `${copilotRoleContext}: ${displayedVenue?.name ?? "Venue"}`
    : "Portfolio";
  const copilotContextSummary = copilotVenueContext
    ? shellRoute.topLevelView === "manager"
      ? "Manager-grounded threads connected to the live venue state and execution pressure."
      : shellRoute.topLevelView === "pocket"
        ? "Pocket-grounded threads for current shift work, standards, and support."
        : shellRoute.topLevelView === "owner"
          ? "Owner-grounded threads focused on delegation, attention, and people risk in this venue."
          : "Venue-grounded threads connected to the active workspace."
    : portfolioSummary?.resume_reason ?? "Global threads covering cross-venue thinking and portfolio patterns.";
  const copilotInputPlaceholder = copilotVenueContext
    ? shellRoute.topLevelView === "manager"
      ? "Ask VOIS what changed, what is blocked, or what deserves attention for this manager workflow."
      : shellRoute.topLevelView === "pocket"
        ? "Ask VOIS what matters on this shift, what standard applies, or what needs help."
        : shellRoute.topLevelView === "owner"
          ? "Ask VOIS where pressure is building here, who needs intervention, or what deserves owner attention."
          : "Ask VOIS what changed, what is blocked, or what deserves attention in this venue."
    : "Ask VOIS what patterns are showing up across the portfolio, where pressure is building, or what deserves attention next.";
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
              label: "Help",
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

  const commandItems = useMemo(() => {
    const items: Array<{ id: string; label: string; description?: string; group: string; shortcut?: string; onSelect: () => void }> = [];

    // Navigation commands
    items.push({ id: "nav-today", label: "Today", group: "Navigation", shortcut: "T", onSelect: () => { if (displayedVenue) navigate({ topLevelView: "manager", venueId: displayedVenue.id, managerView: "today" }); } });
    items.push({ id: "nav-plan", label: "Plan", group: "Navigation", shortcut: "P", onSelect: () => { if (displayedVenue) navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "plan" }); } });
    items.push({ id: "nav-assessment", label: "Assessment", group: "Navigation", onSelect: () => { if (displayedVenue) navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "assessment" }); } });
    items.push({ id: "nav-signals", label: "Signals", group: "Navigation", onSelect: () => { if (displayedVenue) navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "signals" }); } });
    items.push({ id: "nav-report", label: "Report", group: "Navigation", onSelect: () => { if (displayedVenue) navigate({ topLevelView: "venue", venueId: displayedVenue.id, venueView: "report" }); } });
    items.push({ id: "nav-portfolio", label: "Portfolio", group: "Navigation", onSelect: () => navigate({ topLevelView: "portfolio" }) });
    items.push({ id: "nav-settings", label: "Settings", group: "Navigation", onSelect: () => navigate({ topLevelView: "settings" }) });
    items.push({ id: "nav-kb", label: "Knowledge Base", group: "Navigation", onSelect: () => navigate({ topLevelView: "kb" }) });

    // Venue commands
    if (bootstrap) {
      bootstrap.venues.forEach((v) => {
        items.push({ id: `venue-${v.id}`, label: v.name, group: "Venues", onSelect: () => handleSelectVenue(v.id) });
      });
    }

    // Actions
    items.push({ id: "action-copilot", label: "Open Copilot", group: "Actions", shortcut: "C", onSelect: () => setCopilotOpen(true) });
    items.push({ id: "action-theme", label: "Toggle Theme", group: "Actions", onSelect: () => setPreferences((c) => ({ ...c, theme: (c.theme === "dark" ? "light" : "dark") as ThemeMode })) });

    return items;
  }, [bootstrap, displayedVenue, navigate, handleSelectVenue]);

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
    fetchCopilotThreads(copilotVenueContext ?? undefined)
      .then((threads) => {
        const scopedThreads = filterThreadsForScope(threads, copilotVenueContext);
        setCopilotIssue(null);
        setCopilotThreads(scopedThreads);
        setSelectedThreadId((currentThreadId) => {
          if (currentThreadId && scopedThreads.some((thread) => thread.id === currentThreadId)) {
            return currentThreadId;
          }
          return preferredThreadId(scopedThreads, copilotVenueContext);
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
  }, [copilotVenueContext, shellRoute.topLevelView, workspaceVenue?.id, portfolioSummary?.resume_reason]);

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
      setLoginRequired(true);
      return { session, payload: null };
    }

    const payload = await fetchBootstrap();
    setError(null);
    setBootstrap(payload);
    setVenueOntologyBindings(payload.venue_ontology_bindings ?? []);
    setLoginEmail(session?.user.email ?? payload.current_user.email);
    setLoginRequired(false);
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
        await fetchCopilotThreads(copilotVenueContext ?? undefined),
        copilotVenueContext
      );
      setCopilotIssue(null);
      setCopilotThreads(threads);
      const nextThreadId =
        (preferredThread && threads.some((thread) => thread.id === preferredThread) && preferredThread) ||
        preferredThreadId(threads, copilotVenueContext);
      setSelectedThreadId(nextThreadId);

      if (nextThreadId) {
        setSelectedThread(await fetchCopilotThread(nextThreadId));
      } else {
        setSelectedThread(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "VOIS is unavailable in this workspace right now.";
      setCopilotIssue(message);
      setCopilotThreads([]);
      setSelectedThreadId(null);
      setSelectedThread(null);
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
        selected_signal_ids: allSignalIds,
        signal_states: buildSignalStates(),
        management_hours_available: managementHours,
        weekly_effort_budget: weeklyBudget,
      });

      setSavedAssessment(assessment);
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
          selected_signal_ids: allSignalIds,
          signal_states: buildSignalStates(),
          management_hours_available: managementHours,
          weekly_effort_budget: weeklyBudget,
        }));

      setSavedAssessment(assessment);
      const result = await runSavedAssessment(assessment.id);
      setEngineResult(result);

      await Promise.all([
        refreshAssessmentHistory(),
        refreshExecutionWorkspace(),
        refreshEngineRunHistory(result.engine_run_id),
        refreshPortfolioWorkspace(),
      ]);

      navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: "report" });
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
      });
      setCopilotIssue(null);
      setCopilotInput("");
      setCopilotAttachments([]);
      await Promise.all([refreshCopilotWorkspace(updatedThread.id), refreshAuditTrail()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send copilot message";
      setCopilotIssue(message);
      setError(message);
    } finally {
      setSendingCopilot(false);
    }
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

      setSavedAssessment(updatedAssessment);
      setIntakeText(updatedAssessment.notes ?? "");
      setIntakePreview(rebuildPreviewFromAssessment(updatedAssessment));
      setEngineResult(null);
      setDismissedSignalSuggestionIds((current) => [...current, pendingSignalSuggestion.messageId]);

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
    navigate({ topLevelView: "venue", venueId: workspaceVenue.id, venueView: "report" });
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
      setSavedAssessment(assessment);
      setIntakeText(assessment.notes ?? "");
      setIntakePreview(rebuildPreviewFromAssessment(assessment));
      setEngineResult(null);
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
      if (request.linked_thread_id) {
        setSelectedThreadId(request.linked_thread_id);
        setCopilotOpen(true);
      }
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

    const email = loginEmailRef.current?.value.trim() ?? loginEmail.trim();
    const password = loginPasswordRef.current?.value ?? loginPassword;

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
      await refreshWorkspaceIdentity(session);
      setLoginPassword("");
      if (loginPasswordRef.current) {
        loginPasswordRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoggingIn(false);
    }
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
      setLoginRequired(true);
      setShellInitialized(false);
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

  if (!loadingBootstrap && loginRequired) {
    return (
      <div className="app-shell loading-screen fatal-screen">
        <div className="fatal-card">
          <p className="hero-badge">VOIS Login</p>
          <h1>Sign in to VOIS</h1>
          <p className="hero-copy">
            Sign in with your VOIS account to enter the workspace.
          </p>
          {!firebaseConfigured() ? (
            <p className="hero-copy">
              Firebase web auth is not configured for this build yet. On a fresh local workspace, the API
              launcher provisions one explicit owner account so you can claim the first organization without
              demo data.
            </p>
          ) : null}
          <form
            className="auth-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}
          >
            <label className="auth-field">
              <span>Email</span>
              <input
                ref={loginEmailRef}
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                onInput={(event) => setLoginEmail((event.target as HTMLInputElement).value)}
                autoComplete="username"
                placeholder="owner@your-domain"
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                ref={loginPasswordRef}
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                onInput={(event) => setLoginPassword((event.target as HTMLInputElement).value)}
                autoComplete="current-password"
                placeholder="Password"
              />
            </label>
            <div className="auth-actions">
              <button
                type="submit"
                className="btn-primary auth-action-button"
                aria-busy={loggingIn}
              >
                {loggingIn ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
          {error ? <p className="hero-copy">{error}</p> : null}
        </div>
      </div>
    );
  }

  if (!loadingBootstrap && !bootstrap) {
    return (
      <div className="app-shell loading-screen fatal-screen">
        <div className="fatal-card">
          <p className="hero-badge">Startup issue</p>
          <h1>Workspace failed to load</h1>
          <p className="hero-copy">
            OIS could not complete startup against <strong>http://127.0.0.1:8000/api/v1/bootstrap</strong>. The API may
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
        {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss">x</button></div> : null}
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
        {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss">x</button></div> : null}
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
        {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss">x</button></div> : null}
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
        <div className="ois-shell">
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

      {error ? <div className="toast error">{error}<button className="toast-dismiss" onClick={() => setError(null)} aria-label="Dismiss">x</button></div> : null}

      {bootstrap ? (
        <>
          <TopBar
            venues={bootstrap.venues}
            activeVenue={displayedVenue}
            portfolioSummary={portfolioSummary}
            theme={preferences.theme}
            skin={preferences.skin}
            userName={authSession?.user.full_name ?? bootstrap.current_user.full_name}
            authMode={authSession?.session.authentication_mode ?? "firebase_id_token"}
            onSelectVenue={handleSelectVenue}
            onShowPortfolio={() => navigate({ topLevelView: "portfolio" })}
            onToggleTheme={() =>
              setPreferences((current) => ({
                ...current,
                theme: (current.theme === "dark" ? "light" : "dark") as ThemeMode,
              }))
            }
            onSelectSkin={(skin) => setPreferences((current) => ({ ...current, skin: skin as SkinId }))}
            onToggleCopilot={() => setCopilotOpen((current) => !current)}
            copilotOpen={copilotOpen}
            formatTimestamp={formatTimestamp}
            onNavigateToVenue={(venueId) => navigate({ topLevelView: "venue", venueId, venueView: "overview" })}
          />

          <div
            className={`main-layout ${preferences.sidebarCollapsed ? "sidebar-collapsed" : ""}`}
          >
            <Sidebar
                collapsed={preferences.sidebarCollapsed}
                activeTopLevel={shellRoute.topLevelView}
                authRole={activeRole}
                activeVenueName={displayedVenue?.name ?? null}
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
                onShowSettings={() => navigate({ topLevelView: "settings" })}
                onShowManager={handleEnterManagerShell}
                onShowPocket={handleEnterPocketShell}
                onShowOwner={handleEnterOwnerShell}
                onSelectManagerView={(view) => workspaceVenue && navigate({ topLevelView: "manager", venueId: workspaceVenue.id, managerView: view })}
                onSelectPocketView={(view) => workspaceVenue && navigate({ topLevelView: "pocket", venueId: workspaceVenue.id, pocketView: view })}
                onSelectOwnerView={(view) => workspaceVenue && navigate({ topLevelView: "owner", venueId: workspaceVenue.id, ownerView: view })}
                activeManagerView={shellRoute.topLevelView === "manager" ? (shellRoute as { managerView: ManagerView }).managerView : undefined}
                activePocketView={shellRoute.topLevelView === "pocket" ? (shellRoute as { pocketView: PocketView }).pocketView : undefined}
                activeOwnerView={shellRoute.topLevelView === "owner" ? (shellRoute as { ownerView: OwnerView }).ownerView : undefined}
                onToggleCopilot={() => setCopilotOpen((current) => !current)}
                copilotOpen={copilotOpen}
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
                          ? (shellRoute as { pocketView: string }).pocketView ?? "shift"
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
                    proactiveGreeting={proactiveGreeting}
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
                    onOpenReport={() => handleSelectVenueView("report")}
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
                        onOpenSignals={() => handleSelectVenueView("signals")}
                        onOpenReport={() => handleSelectVenueView("report")}
                        onOpenPlan={() => handleSelectVenueView("plan")}
                      />
                    ) : null}

                    {shellRoute.venueView === "assessment" ? (
                      selectedOntologyIssue ? (
                        <OntologyConfigurationState venueName={workspaceVenue.name} message={selectedOntologyIssue} />
                      ) : (
                        <AssessmentView
                          intakeText={intakeText}
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
                          onLoadSample={resetDerivedState}
                          onAnalyze={handleAnalyzeIntake}
                          onSaveAssessment={handleSaveAssessment}
                          onRunEngine={handleRunEngine}
                          onApprovePlan={handleApprovePlan}
                          onToggleSignalRejection={handleToggleSignalRejection}
                          onToggleManualSignal={handleToggleManualSignal}
                          onManagementHoursChange={setManagementHours}
                          onWeeklyBudgetChange={setWeeklyBudget}
                          formatTimestamp={formatTimestamp}
                          onOpenHistory={() => handleSelectVenueView("history")}
                          onOpenReport={() => handleSelectVenueView("report")}
                          onOpenSignalsReview={() => handleSelectVenueView("signals")}
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
                          onOpenReport={() => handleSelectVenueView("report")}
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
                        onOpenReportRecord={handleOpenReportRecord}
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
                        onOpenReport={() => handleSelectVenueView("report")}
                        onOpenHistory={() => handleSelectVenueView("history")}
                      />
                    ) : null}

                    {shellRoute.venueView === "report" ? (
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
                  selectedOntologyIssue ? (
                    <OntologyConfigurationState
                      venueName={workspaceVenue?.name ?? "Selected venue"}
                      message={selectedOntologyIssue}
                    />
                  ) : (
                    <KnowledgeBaseView
                      bundle={ontologyBundle}
                      alignment={ontologyAlignment}
                      governance={ontologyGovernance}
                      authoringBrief={ontologyAuthoringBrief}
                      loading={loadingOntology}
                      evaluationPacks={ontologyEvaluationPacks}
                      evaluationResult={ontologyEvaluationResult}
                      loadingEvaluations={loadingEvaluations}
                      connectors={integrationConnectors}
                      integrationSummary={integrationSummary}
                    />
                  )
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
                        onOpenReport={() => handleSelectVenueView("report")}
                        onOpenHistory={() => handleSelectVenueView("history")}
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
                      <RoleCopilotState
                        roleLabel="Manager"
                        venueName={workspaceVenue.name}
                        unavailableMessage={copilotIssue}
                        onOpenCopilot={() => setCopilotOpen(true)}
                      />
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
                        ["help", "Help"],
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
                        onOpenTask={(taskId) => { handleSelectPocketView("standards"); }}
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
                        onOpenThread={(threadId) => {
                          setSelectedThreadId(threadId);
                          setCopilotOpen(true);
                          void refreshCopilotWorkspace(threadId);
                        }}
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
                        ["people", "People & access"],
                        ["copilot", "VOIS"],
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
                        loading={ownLoading}
                        formatTimestamp={formatTimestamp}
                        onOpenVenue={(venueId) => navigate({ topLevelView: "venue", venueId, venueView: "overview" })}
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

                    {!selectedOntologyIssue && (shellRoute as { ownerView: string }).ownerView === "copilot" ? (
                      <RoleCopilotState
                        roleLabel="Owner"
                        venueName={workspaceVenue.name}
                        unavailableMessage={copilotIssue}
                        onOpenCopilot={() => setCopilotOpen(true)}
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
            loading={loadingCopilot}
            sending={sendingCopilot}
            input={copilotInput}
            attachments={copilotAttachments}
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
            signalSuggestion={pendingSignalSuggestion}
            canApplySignalSuggestion={Boolean(savedAssessment)}
            applyingSignalSuggestion={applyingSignalSuggestion}
            onApplySignalSuggestion={handleApplySignalSuggestion}
            onDismissSignalSuggestion={handleDismissSignalSuggestion}
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
    if (route.topLevelView === "pocket" || route.topLevelView === "settings") {
      return fallbackVenueId ? { topLevelView: "owner", venueId: fallbackVenueId, ownerView: "command" } : { topLevelView: "portfolio" };
    }
    return route;
  }

  if (role === "manager") {
    if (route.topLevelView === "portfolio" || route.topLevelView === "owner" || route.topLevelView === "settings") {
      return fallbackVenueId ? { topLevelView: "manager", venueId: fallbackVenueId, managerView: "today" } : { topLevelView: "settings" };
    }
    if (route.topLevelView === "pocket") {
      return fallbackVenueId ? { topLevelView: "manager", venueId: fallbackVenueId, managerView: "today" } : { topLevelView: "settings" };
    }
    return route;
  }

  if (role === "barista") {
    if (route.topLevelView === "pocket" || route.topLevelView === "reference" || route.topLevelView === "kb") {
      return route;
    }
    return fallbackVenueId ? { topLevelView: "pocket", venueId: fallbackVenueId, pocketView: "shift" } : { topLevelView: "settings" };
  }

  if (role === "developer") {
    if (!fallbackVenueId && route.topLevelView === "portfolio") {
      return { topLevelView: "settings" };
    }
    if (route.topLevelView === "settings" || route.topLevelView === "reference" || route.topLevelView === "kb" || route.topLevelView === "portfolio") {
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
  }).format(new Date(isoTimestamp));
}

function filterThreadsForScope(threads: CopilotThreadSummary[], activeVenueId: string | null, role: string | null = null) {
  // Baristas only see help_request threads (their own support conversations)
  if (role === "barista") {
    return threads.filter((thread) => thread.scope === "help_request");
  }

  // Managers see venue threads + help requests for their venue, not global
  if (role === "manager" && activeVenueId) {
    return threads.filter((thread) =>
      thread.venue_id === activeVenueId || thread.scope === "help_request"
    );
  }

  // Owners see everything
  if (activeVenueId) {
    return threads;
  }

  const globalThreads = threads.filter((thread) => thread.scope === "global" || thread.venue_id === null);
  return globalThreads.length ? globalThreads : threads;
}

function preferredThreadId(threads: CopilotThreadSummary[], activeVenueId: string | null) {
  if (!activeVenueId) {
    return (
      threads.find((thread) => thread.scope === "global" || thread.venue_id === null)?.id ??
      threads.find((thread) => !thread.archived)?.id ??
      null
    );
  }

  return (
    threads.find((thread) => thread.venue_id === activeVenueId && thread.scope === "venue" && !thread.archived)?.id ??
    threads.find((thread) => thread.venue_id === activeVenueId && !thread.archived)?.id ??
    threads.find((thread) => !thread.archived)?.id ??
    null
  );
}

function toVenueView(value: string): VenueSubview {
  if (value === "assessment" || value === "signals" || value === "history" || value === "plan" || value === "report" || value === "console") {
    return value;
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
