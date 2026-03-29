import { firebaseConfigured, observeFirebaseUser, signInWithFirebaseEmailPassword, signOutFirebaseUser } from "./firebase";

export type Venue = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: string;
  concept: string | null;
  location: string | null;
  size_note: string | null;
  capacity_profile: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type OwnerSetupState = {
  requires_owner_claim: boolean;
  organization_claimed: boolean;
  accessible_venue_ids: string[];
  active_membership_count: number;
  current_membership: {
    id: string;
    organization_id: string;
    user_id: string;
    role_claim: string;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  status_message: string | null;
};

export type OrganizationMembershipRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  role_claim: "owner" | "manager" | "barista" | "developer";
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function subscribeToAuthTokenChanges(onChange: (token: string | null) => void) {
  return observeFirebaseUser((user) => {
    if (!user) {
      setAuthToken(null);
      onChange(null);
      return;
    }
    user
      .getIdToken()
      .then((token) => {
        setAuthToken(token);
        onChange(token);
      })
      .catch(() => {
        setAuthToken(null);
        onChange(null);
      });
  });
}

async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  return fetch(input, {
    ...init,
    credentials: "include",
    headers
  });
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? fallback;
  } catch {
    return fallback;
  }
}

export type BootstrapResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    data_residency: string;
  } | null;
  current_user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    venue_id: string | null;
  };
  setup_state: OwnerSetupState;
  requires_owner_claim: boolean;
  organization_claimed: boolean;
  venues: Venue[];
  ontology_mounts: OntologyMountSummary[];
  venue_ontology_bindings: VenueOntologyBindingRecord[];
  copilot_threads: {
    id: string;
    title: string;
    scope: string;
    archived: boolean;
  }[];
  readiness: Record<string, string>;
  configuration_issues: string[];
};

export type OntologyMountSummary = {
  ontology_id: string;
  display_name: string;
  version: string;
  adapter_id: string;
  core_canon_version: string;
  manifest_digest: string;
  status: string;
  pack_kind: string;
  counts: Record<string, number>;
  validation: Record<string, boolean>;
  validation_errors: string[];
};

export type VenueOntologyBindingRecord = {
  venue_id: string;
  ontology_id: string;
  ontology_version: string;
  binding_status: string;
  bound_at: string;
  bound_by: string | null;
  mount: OntologyMountSummary | null;
};

export type AuthUser = {
  id: string;
  organization_id: string | null;
  venue_id: string | null;
  firebase_uid: string | null;
  email: string;
  full_name: string;
  role: string;
  allowed_shells: string[];
  capabilities: string[];
};

export type AuthSessionInfo = {
  id: string | null;
  expires_at: string | null;
  authentication_mode: string;
};

export type AuthSessionResponse = {
  user: AuthUser;
  session: AuthSessionInfo;
  setup_state: OwnerSetupState | null;
  requires_owner_claim: boolean;
  organization_claimed: boolean;
  session_token: string | null;
};

export type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  email: string;
  full_name: string;
  firebase_uid: string | null;
  role: "owner" | "manager" | "barista" | "developer";
  active: boolean;
  membership: OrganizationMembershipRecord;
  venue_access: Array<{
    id: string;
    organization_id: string;
    venue_id: string;
    user_id: string;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
};

export type ProvisionedLoginPacket = {
  email: string;
  temporary_password: string;
  reset_required: boolean;
  firebase_uid: string | null;
};

export type OrganizationMemberProvisionResponse = {
  member: OrganizationMember;
  login_packet: ProvisionedLoginPacket;
};

export type VenueCreatePayload = {
  organization_id: string;
  name: string;
  slug: string;
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
};

export type OwnerClaimPayload = {
  organization_name: string;
  organization_slug: string;
  region?: string;
  data_residency?: string;
  first_venue?: {
    name: string;
    slug: string;
    ontology_binding: {
      ontology_id: string;
      ontology_version: string;
    };
    concept?: string | null;
    location?: string | null;
    size_note?: string | null;
    capacity_profile?: Record<string, unknown>;
  } | null;
};

export type AuthManagedSessionRecord = {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string;
  organization_id: string;
  issued_by: string | null;
  issued_by_name: string | null;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  is_current: boolean;
  is_active: boolean;
};

export type AuthSessionInventory = {
  scope: string;
  current_session_id: string | null;
  sessions: AuthManagedSessionRecord[];
};

export type AuthSecurityPosture = {
  auth_provider: string;
  authentication_mode: string;
  auth_ready: boolean;
  auth_missing_configuration: string[];
  firebase_project_id: string | null;
  firebase_client_configured: boolean;
  firebase_admin_configured: boolean;
  firebase_client_missing_configuration: string[];
  firebase_admin_missing_configuration: string[];
  local_password_auth_enabled: boolean;
  bootstrap_fallback_enabled: boolean;
  session_cookie_name: string;
  session_cookie_secure: boolean;
  session_cookie_samesite: string;
  session_cookie_domain: string | null;
  session_cookie_path: string;
  session_ttl_hours: number;
  legacy_header_auth_enabled: boolean;
  ai_provider: string;
  ai_model: string;
  ai_mode: string;
  ai_configured: boolean;
  ai_provider_effective: string;
  ai_model_effective: string;
  ai_live_activation_ready: boolean;
  ai_live_provider_supported: boolean;
  ai_mock_fallback_enabled: boolean;
  ai_mock_fallback_active: boolean;
  ai_secret_backend: string;
  ai_runtime_note: string;
  ai_missing_configuration: string[];
  upload_backend: string;
  default_data_residency: string;
};

export type OrganizationExportSummary = {
  generated_at: string;
  organization_id: string;
  organization_name: string;
  entity_counts: Record<string, number>;
  includes_file_content: boolean;
  export_ready: boolean;
  notes: string[];
};

export type OrganizationDeleteReadiness = {
  generated_at: string;
  organization_id: string;
  organization_name: string;
  entity_counts: Record<string, number>;
  delete_supported: boolean;
  delete_ready: boolean;
  active_session_count: number;
  active_integration_event_count: number;
  blocking_conditions: string[];
  notes: string[];
};

export type OrganizationBackupReadiness = {
  generated_at: string;
  organization_id: string;
  organization_name: string;
  entity_counts: Record<string, number>;
  automated_backup_supported: boolean;
  backup_ready: boolean;
  snapshot_export_ready: boolean;
  restore_supported: boolean;
  file_binary_backup_ready: boolean;
  file_asset_count: number;
  retryable_integration_event_count: number;
  upload_backend: string;
  blocking_conditions: string[];
  notes: string[];
};

export type OrganizationExportBundle = {
  generated_at: string;
  organization_id: string;
  organization_slug: string;
  format_version: string;
  entity_counts: Record<string, number>;
  data: Record<string, unknown>;
};

export type PortfolioTotals = {
  venues: number;
  assessments: number;
  engine_runs: number;
  active_plans: number;
  ready_tasks: number;
  blocked_tasks: number;
  progress_entries: number;
};

export type PortfolioAttentionBucket = {
  attention_level: string;
  count: number;
};

export type PortfolioActivityItem = {
  venue_id: string;
  venue_name: string;
  summary: string;
  status: string;
  created_at: string;
};

export type PortfolioVenuePulse = {
  venue_id: string;
  venue_name: string;
  status: string;
  concept: string | null;
  location: string | null;
  latest_assessment_at: string | null;
  latest_engine_run_at: string | null;
  latest_plan_title: string | null;
  plan_load_classification: string | null;
  latest_signal_count: number;
  latest_plan_task_count: number;
  completion_percentage: number;
  ready_task_count: number;
  blocked_task_count: number;
  progress_entry_count: number;
  latest_progress_summary: string | null;
  latest_activity_at: string | null;
  suggested_view: string;
  attention_level: string;
  next_step_label: string;
};

export type PortfolioSummaryResponse = {
  generated_at: string;
  organization_id: string;
  resume_venue_id: string | null;
  resume_reason: string | null;
  totals: PortfolioTotals;
  attention_breakdown: PortfolioAttentionBucket[];
  portfolio_notes: string[];
  venue_pulses: PortfolioVenuePulse[];
  recent_activity: PortfolioActivityItem[];
};

export type EngineRunResponse = {
  engine_run_id: string;
  assessment_id: string;
  venue_id: string;
  plan_id: string;
  ontology_id: string;
  ontology_version: string;
  core_canon_version: string;
  adapter_id: string;
  manifest_digest: string;
  load_classification: string;
  active_signals: Array<{ id: string; name: string; score: number }>;
  failure_modes: Array<{ id: string; name: string; score: number }>;
  response_patterns: Array<{ id: string; name: string; score: number }>;
  plan_tasks: Array<{
    block_id: string;
    title: string;
    rationale: string;
    effort_hours: number;
    dependencies: string[];
    trace: Record<string, unknown>;
    sub_actions: string[];
    deliverables: string[];
    status: string;
  }>;
  report: {
    summary: string;
    diagnostic_spine: string[];
    investigation_threads: string[];
    verification_briefs: string[];
  };
};

export type PersistedEngineRunRecord = {
  engine_run_id: string;
  assessment_id: string;
  venue_id: string;
  plan_id: string | null;
  ontology_id: string;
  ontology_version: string;
  core_canon_version: string;
  adapter_id: string;
  manifest_digest: string;
  load_classification: string;
  summary: string;
  diagnostic_spine: string[];
  investigation_threads: string[];
  verification_briefs: string[];
  active_signal_names: string[];
  plan_task_count: number;
  created_at: string;
};

export type PersistedEngineRunDetailRecord = PersistedEngineRunRecord & {
  normalized_signals: Array<Record<string, unknown>>;
  diagnostic_snapshot: Record<string, unknown>;
  plan_snapshot: Record<string, unknown>;
  report_markdown: string | null;
  report_type: string | null;
  ai_trace: Record<string, unknown>;
};

export type IntakePreviewResponse = {
  ontology_id: string;
  ontology_version: string;
  provider?: string | null;
  model?: string | null;
  prompt_version?: string | null;
  detected_signals: Array<{
    signal_id: string;
    signal_name: string;
    confidence: string;
    score: number;
    evidence_snippet: string;
    match_reasons: string[];
  }>;
  unmapped_observations: string[];
  quantitative_evidence?: Array<{
    label: string;
    value: string;
    evidence_snippet: string;
  }>;
  venue_context?: {
    venue_name?: string | null;
    venue_type?: string | null;
    team_size_note?: string | null;
    stage?: string | null;
  };
};

export type AssessmentRecord = {
  id: string;
  venue_id: string;
  created_by: string | null;
  notes: string | null;
  selected_signal_ids: string[];
  signal_states: Record<
    string,
    { active: boolean; notes?: string; confidence?: string; value?: string | null }
  >;
  ontology_id: string;
  ontology_version: string;
  core_canon_version: string;
  adapter_id: string;
  manifest_digest: string;
  management_hours_available: number;
  weekly_effort_budget: number;
  created_at: string;
};

export type AssessmentHistoryItem = {
  id: string;
  created_at: string;
  notes: string | null;
  selected_signal_count: number;
  active_signal_names: string[];
  engine_run_id: string | null;
  plan_load_classification: string | null;
  plan_task_count: number;
  ontology_id: string | null;
  ontology_version: string | null;
};

export type SubActionItem = {
  text: string;
  completed: boolean;
};

export type DeliverableItem = {
  text?: string;
  name: string;
  completed: boolean;
};

export type PlanTaskRecord = {
  id: string;
  plan_id: string;
  block_id: string;
  title: string;
  status: string;
  order_index: number;
  effort_hours: number;
  rationale: string;
  notes: string | null;
  assigned_to: string | null;
  priority: string | null;
  due_at: string | null;
  dependencies: string[];
  trace: Record<string, unknown>;
  sub_actions: SubActionItem[];
  deliverables: DeliverableItem[];
  created_at: string;
};

export type PlanRecord = {
  id: string;
  engine_run_id: string;
  venue_id: string;
  title: string;
  summary: string;
  total_effort_hours: number;
  status: string;
  ontology_id: string;
  ontology_version: string;
  core_canon_version: string;
  adapter_id: string;
  manifest_digest: string;
  created_at: string;
  load_classification: string | null;
  tasks: PlanTaskRecord[];
};

export type PlanExecutionSummary = {
  plan_id: string;
  venue_id: string;
  completion_percentage: number;
  counts_by_status: Record<string, number>;
  next_executable_tasks: Array<{
    task_id: string;
    title: string;
    status: string;
    blocking_dependency_ids: string[];
  }>;
  blocked_tasks: Array<{
    task_id: string;
    title: string;
    status: string;
    blocking_dependency_ids: string[];
  }>;
};

export type TaskCommentRecord = {
  id: string;
  task_id: string;
  venue_id: string;
  author_user_id: string | null;
  author_name: string | null;
  body: string;
  visibility: string;
  created_at: string;
};

export type ProgressEntryRecord = {
  id: string;
  venue_id: string;
  created_by: string | null;
  summary: string;
  detail: string | null;
  status: string;
  created_at: string;
};

export type IntegrationConnectorRecord = {
  provider: string;
  display_name: string;
  status: string;
  ingest_modes: string[];
  supported_event_types: string[];
  notes: string[];
};

export type IntegrationSummaryBucket = {
  key: string;
  count: number;
};

export type IntegrationEventRecord = {
  id: string;
  organization_id: string;
  venue_id: string;
  provider: string;
  event_type: string;
  external_event_id: string | null;
  source_entity_id: string | null;
  ingest_mode: string;
  status: string;
  payload: Record<string, unknown>;
  normalized_signal_ids: string[];
  attempt_count: number;
  last_attempted_at: string | null;
  next_retry_at: string | null;
  occurred_at: string | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
};

export type IntegrationHealthSummary = {
  generated_at: string;
  organization_id: string;
  venue_id: string | null;
  total_events: number;
  retryable_event_count: number;
  overdue_retry_count: number;
  stale_event_count: number;
  counts_by_status: IntegrationSummaryBucket[];
  counts_by_provider: IntegrationSummaryBucket[];
  provider_pressure: Array<{
    provider: string;
    total_events: number;
    failure_like_count: number;
    retryable_count: number;
    overdue_retry_count: number;
    stale_event_count: number;
    latest_event_at: string | null;
  }>;
  latest_failure_events: Array<{
    id: string;
    provider: string;
    event_type: string;
    status: string;
    error_message: string | null;
    attempt_count: number;
    next_retry_at: string | null;
    created_at: string;
  }>;
};

export type AuditEntryRecord = {
  id: string;
  organization_id: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type CopilotReference = {
  type: string;
  label: string;
  id?: string | null;
  payload?: Record<string, unknown> | null;
};

export type CopilotAttachment = {
  file_asset_id?: string | null;
  file_name: string;
  content_type?: string | null;
  url?: string | null;
  content_base64?: string | null;
};

export type CopilotMessageRecord = {
  id: string;
  thread_id: string;
  created_by: string | null;
  author_role: string;
  source_mode: string;
  content: string;
  references: CopilotReference[];
  attachments: CopilotAttachment[];
  created_at: string;
};

export type CopilotThreadSummary = {
  id: string;
  organization_id: string;
  venue_id: string | null;
  title: string;
  scope: string;
  archived: boolean;
  message_count: number;
  latest_message_at: string | null;
  created_at: string;
};

export type CopilotThreadDetail = CopilotThreadSummary & {
  messages: CopilotMessageRecord[];
};

export type ProactiveGreetingResponse = {
  function: string;
  provider: string;
  model: string;
  prompt_version: string;
  content: string;
  references: CopilotReference[];
};

export type EnhancedReportResponse = {
  function: string;
  engine_run_id: string;
  provider: string;
  model: string;
  prompt_version: string;
  markdown: string;
  references: CopilotReference[];
};

export type OntologyEntityRecord = {
  id: string;
  name: string;
  description: string;
  status: string;
  owner: string;
  source_ref: string;
  updated_at: string;
};

export type OntologySignalRecord = OntologyEntityRecord & {
  domain: string;
  module: string;
  indicator_type: string;
  evidence_types: string[];
  source_types: string[];
  temporal_behavior: string | null;
  likely_co_signals: string[];
  adapter_aliases: string[];
};

export type OntologyFailureModeRecord = OntologyEntityRecord & {
  domain: string;
};

export type OntologyResponsePatternRecord = OntologyEntityRecord & {
  focus: string;
};

export type OntologyBlockRecord = OntologyEntityRecord & {
  effort_hours: number;
  dependencies: string[];
  tool_ids: string[];
  response_pattern_ids: string[];
  entry_conditions: string[];
  contraindications: string[];
  owner_role: string | null;
  expected_time_to_effect_days: number | null;
  proof_of_completion: string[];
  successor_block_ids: string[];
  service_module_ids: string[];
  failure_family_ids: string[];
};

export type OntologyToolRecord = OntologyEntityRecord & {
  category: string;
  format: string | null;
  usage_moment: string | null;
  expected_output: string | null;
  adaptation_variables: string[];
  block_ids: string[];
};

export type OntologyBundleResponse = {
  meta: {
    version: string;
    ontology_id: string;
    owner: string;
    released_at: string;
    recovery_sources: string[];
  };
  signals: OntologySignalRecord[];
  failure_modes: OntologyFailureModeRecord[];
  response_patterns: OntologyResponsePatternRecord[];
  blocks: OntologyBlockRecord[];
  tools: OntologyToolRecord[];
  signal_failure_map: Array<{ signal_id: string; failure_mode_id: string; weight: number }>;
  failure_pattern_map: Array<{ failure_mode_id: string; response_pattern_id: string; weight: number }>;
  pattern_block_map: Array<{ response_pattern_id: string; block_id: string; weight: number }>;
};

export type OntologyAlignmentSummaryResponse = {
  ontology_id: string;
  bundle_version: string;
  adapter_id: string;
  adapter_version: string;
  core_version: string;
  counts: Record<string, number>;
  service_module_counts: Record<string, number>;
  failure_family_counts: Record<string, number>;
  response_logic_counts: Record<string, number>;
  unclassified_signal_ids: string[];
  unclassified_failure_mode_ids: string[];
  unclassified_response_pattern_ids: string[];
};

export type OntologyGovernanceSummaryResponse = {
  ontology_id: string;
  bundle_version: string;
  adapter_id: string;
  adapter_version: string;
  core_version: string;
  errors: string[];
  warnings: string[];
  duplicate_entity_ids: Record<string, string[]>;
  block_dependency_cycles: string[][];
  adapter_reference_errors: string[];
  alignment_gaps: Record<string, string[]>;
  block_contract_gaps: Record<string, string[]>;
  tool_contract_gaps: Record<string, string[]>;
};

export type OntologyCoverageItem = {
  id: string;
  name: string;
  covered_count: number;
  is_covered: boolean;
};

export type OntologyAuthoringBriefResponse = {
  ontology_id: string;
  bundle_version: string;
  adapter_id: string;
  adapter_version: string;
  core_version: string;
  service_module_coverage: OntologyCoverageItem[];
  failure_family_coverage: OntologyCoverageItem[];
  response_logic_coverage: OntologyCoverageItem[];
  signal_contract_fields: string[];
  block_contract_fields: string[];
  tool_contract_fields: string[];
  governance_warning_counts: Record<string, number>;
};

export type OntologyEvaluationPackSummary = {
  pack_id: string;
  title: string;
  ontology_id: string;
  ontology_version: string;
  scenario_count: number;
  updated_at: string;
  description: string;
};

export type OntologyEvaluationCheckResult = {
  key: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  detail: string;
};

export type OntologyEvaluationScenarioResult = {
  scenario_id: string;
  scenario_name: string;
  passed: boolean;
  score: number;
  top_failure_mode_ids: string[];
  top_response_pattern_ids: string[];
  plan_block_ids: string[];
  load_classification: string;
  plan_task_count: number;
  checks: OntologyEvaluationCheckResult[];
};

export type OntologyEvaluationPackResult = {
  pack_id: string;
  title: string;
  ontology_id: string;
  ontology_version: string;
  generated_at: string;
  scenario_count: number;
  passed_scenarios: number;
  failed_scenarios: number;
  pass_rate: number;
  results: OntologyEvaluationScenarioResult[];
};

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  const response = await apiFetch("/api/v1/bootstrap");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load workspace bootstrap"));
  }
  return response.json();
}

export async function fetchSetupState(): Promise<OwnerSetupState> {
  const response = await apiFetch("/api/v1/setup/state");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load workspace setup state"));
  }
  return response.json();
}

export async function claimOwnerSetup(payload: OwnerClaimPayload): Promise<OwnerSetupState> {
  const response = await apiFetch("/api/v1/setup/claim-owner", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to claim the owner workspace"));
  }
  return response.json();
}

export async function fetchAuthSession(): Promise<AuthSessionResponse | null> {
  const response = await apiFetch("/api/v1/auth/me");
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load current session"));
  }
  return response.json();
}

export async function loginSession(payload: {
  email: string;
  password: string;
}): Promise<AuthSessionResponse> {
  if (firebaseConfigured()) {
    const user = await signInWithFirebaseEmailPassword(payload.email, payload.password);
    const token = await user.getIdToken();
    setAuthToken(token);
    const session = await fetchAuthSession();
    if (!session) {
      throw new Error("Signed in with Firebase, but VOIS could not load the authenticated user.");
    }
    return session;
  }

  let response: Response;
  try {
    response = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error("VOIS API is unreachable. Start the API launcher on http://127.0.0.1:8001 and try again.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to sign in"));
  }

  return response.json();
}

export async function logoutSession(): Promise<{ revoked: boolean }> {
  if (firebaseConfigured()) {
    await signOutFirebaseUser();
    setAuthToken(null);
    return { revoked: true };
  }

  const response = await apiFetch("/api/v1/auth/logout", {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to sign out"));
  }
  setAuthToken(null);
  return response.json();
}

export async function fetchSessionInventory(scope: "self" | "organization" = "self"): Promise<AuthSessionInventory> {
  const response = await apiFetch(`/api/v1/auth/sessions?scope=${encodeURIComponent(scope)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load session inventory"));
  }
  return response.json();
}

export async function revokeManagedSession(sessionId: string): Promise<{
  revoked: boolean;
  session_id: string;
  cleared_current_cookie: boolean;
}> {
  const response = await apiFetch(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to revoke session"));
  }
  return response.json();
}

export async function fetchAuthSecurityPosture(): Promise<AuthSecurityPosture> {
  const response = await apiFetch("/api/v1/auth/security-posture");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load security posture"));
  }
  return response.json();
}

export async function fetchOrganizationExportSummary(): Promise<OrganizationExportSummary | null> {
  const response = await apiFetch("/api/v1/organization/export-summary");
  if (response.status === 403 || response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load export summary"));
  }
  return response.json();
}

export async function fetchOrganizationDeleteReadiness(): Promise<OrganizationDeleteReadiness | null> {
  const response = await apiFetch("/api/v1/organization/delete-readiness");
  if (response.status === 403 || response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load delete readiness"));
  }
  return response.json();
}

export async function fetchOrganizationBackupReadiness(): Promise<OrganizationBackupReadiness | null> {
  const response = await apiFetch("/api/v1/organization/backup-readiness");
  if (response.status === 403 || response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load backup readiness"));
  }
  return response.json();
}

export async function generateOrganizationExport(): Promise<OrganizationExportBundle> {
  const response = await apiFetch("/api/v1/organization/export", {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to generate organization export"));
  }
  return response.json();
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummaryResponse | null> {
  const response = await apiFetch("/api/v1/portfolio/summary");
  if (response.status === 404 || response.status === 409) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load portfolio summary"));
  }
  return response.json();
}

export async function createVenue(payload: VenueCreatePayload): Promise<Venue> {
  const response = await apiFetch("/api/v1/venues", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      capacity_profile: payload.capacity_profile ?? {}
    })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create venue"));
  }
  return response.json();
}

export async function previewIntake(payload: {
  raw_text: string;
  venue_id: string;
}): Promise<IntakePreviewResponse> {
  const response = await apiFetch("/api/v1/intake/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to analyze operational intake"));
  }

  return response.json();
}

export async function runAIIntake(payload: {
  raw_text: string;
  venue_id: string;
}): Promise<IntakePreviewResponse> {
  const response = await apiFetch("/api/v1/ai-intake", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to run AI intake"));
  }

  return response.json();
}

export async function createAssessment(payload: {
  venue_id: string;
  created_by?: string | null;
  notes?: string;
  selected_signal_ids: string[];
  signal_states: Record<
    string,
    { active: boolean; notes?: string; confidence?: string; value?: string | null }
  >;
  management_hours_available: number;
  weekly_effort_budget: number;
}): Promise<AssessmentRecord> {
  const response = await apiFetch("/api/v1/assessments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to save assessment"));
  }

  return response.json();
}

export async function fetchAssessment(assessmentId: string): Promise<AssessmentRecord> {
  const response = await apiFetch(`/api/v1/assessments/${encodeURIComponent(assessmentId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load assessment"));
  }
  return response.json();
}

export async function applyAssessmentSignalSuggestion(
  assessmentId: string,
  payload: {
    add: Array<{ signal_id: string; notes?: string; confidence?: string }>;
    remove: string[];
    source?: string;
  }
): Promise<AssessmentRecord> {
  const response = await apiFetch(`/api/v1/assessments/${encodeURIComponent(assessmentId)}/signals`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      add: payload.add,
      remove: payload.remove,
      source: payload.source ?? "copilot_review"
    })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to apply signal suggestion"));
  }
  return response.json();
}

export async function fetchAssessmentHistory(venueId: string): Promise<AssessmentHistoryItem[]> {
  const response = await apiFetch(`/api/v1/assessments?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load assessment history"));
  }
  return response.json();
}

export async function fetchLatestPlan(venueId: string): Promise<PlanRecord | null> {
  const response = await apiFetch(`/api/v1/plans/latest?venue_id=${encodeURIComponent(venueId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load latest plan"));
  }
  return response.json();
}

export async function fetchActivePlan(venueId: string): Promise<PlanRecord | null> {
  const response = await apiFetch(`/api/v1/plans/active?venue_id=${encodeURIComponent(venueId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load active plan"));
  }
  return response.json();
}

export async function fetchPlan(planId: string): Promise<PlanRecord> {
  const response = await apiFetch(`/api/v1/plans/${encodeURIComponent(planId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load plan"));
  }
  return response.json();
}

export async function fetchLatestExecutionSummary(venueId: string): Promise<PlanExecutionSummary | null> {
  const response = await apiFetch(`/api/v1/plans/latest/execution-summary?venue_id=${encodeURIComponent(venueId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load execution summary"));
  }
  return response.json();
}

export async function fetchActiveExecutionSummary(venueId: string): Promise<PlanExecutionSummary | null> {
  const response = await apiFetch(`/api/v1/plans/active/execution-summary?venue_id=${encodeURIComponent(venueId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load active execution summary"));
  }
  return response.json();
}

export async function fetchPlanExecutionSummary(planId: string): Promise<PlanExecutionSummary> {
  const response = await apiFetch(`/api/v1/plans/${encodeURIComponent(planId)}/execution-summary`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load execution summary"));
  }
  return response.json();
}

export type PlanTaskUpdatePayload = {
  status?: string;
  notes?: string | null;
  assigned_to?: string | null;
  priority?: string | null;
  due_at?: string | null;
  sub_action_completions?: boolean[];
  deliverable_completions?: boolean[];
};

export type PlanUpdatePayload = {
  status?: string;
  title?: string;
  summary?: string;
};

export async function updatePlanTaskStatus(taskId: string, status: string): Promise<PlanTaskRecord> {
  return updatePlanTask(taskId, { status });
}

export async function updatePlanTask(taskId: string, payload: PlanTaskUpdatePayload): Promise<PlanTaskRecord> {
  const response = await apiFetch(`/api/v1/plans/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update task"));
  }
  return response.json();
}

export async function fetchTaskComments(taskId: string): Promise<TaskCommentRecord[]> {
  const response = await apiFetch(`/api/v1/plans/tasks/${taskId}/comments`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load comments"));
  }
  return response.json();
}

export async function createTaskComment(taskId: string, venueId: string, body: string): Promise<TaskCommentRecord> {
  const response = await apiFetch(`/api/v1/plans/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venue_id: venueId, body }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create comment"));
  }
  return response.json();
}

export async function updatePlan(planId: string, payload: PlanUpdatePayload): Promise<PlanRecord> {
  const response = await apiFetch(`/api/v1/plans/${planId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update plan"));
  }
  return response.json();
}

export async function fetchProgressEntries(venueId: string): Promise<ProgressEntryRecord[]> {
  const response = await apiFetch(`/api/v1/progress?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load progress entries"));
  }
  return response.json();
}

export async function createProgressEntry(payload: {
  venue_id: string;
  created_by?: string | null;
  summary: string;
  detail?: string;
  status: string;
}): Promise<ProgressEntryRecord> {
  const response = await apiFetch("/api/v1/progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create progress entry"));
  }
  return response.json();
}

export async function fetchAuditEntries(organizationId: string, limit = 12): Promise<AuditEntryRecord[]> {
  const response = await apiFetch(
    `/api/v1/audit?organization_id=${encodeURIComponent(organizationId)}&limit=${encodeURIComponent(String(limit))}`
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load audit entries"));
  }
  return response.json();
}

export async function fetchEngineRunHistory(venueId: string): Promise<PersistedEngineRunRecord[]> {
  const response = await apiFetch(`/api/v1/engine/runs?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load engine run history"));
  }
  return response.json();
}

export async function fetchLatestEngineRun(venueId: string): Promise<PersistedEngineRunRecord | null> {
  const response = await apiFetch(`/api/v1/engine/runs/latest?venue_id=${encodeURIComponent(venueId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load latest engine run"));
  }
  return response.json();
}

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  channel: string;
  level: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchNotifications(limit = 20): Promise<NotificationRecord[]> {
  const response = await apiFetch(`/api/v1/notifications?limit=${limit}`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await apiFetch("/api/v1/notifications/unread-count");
  if (!response.ok) return 0;
  const data = await response.json();
  return data.unread_count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiFetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
}

export type SystemicFlagRecord = {
  id: string;
  venue_id: string;
  signal_id: string;
  signal_name: string | null;
  flagged_by: string | null;
  notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

export async function fetchSystemicFlags(venueId: string): Promise<SystemicFlagRecord[]> {
  const response = await apiFetch(`/api/v1/venues/${encodeURIComponent(venueId)}/systemic-flags`);
  if (!response.ok) return [];
  return response.json();
}

export async function createSystemicFlag(venueId: string, signalId: string, signalName: string | null, notes: string | null): Promise<SystemicFlagRecord | null> {
  const response = await apiFetch(`/api/v1/venues/${encodeURIComponent(venueId)}/systemic-flags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signal_id: signalId, signal_name: signalName, notes }),
  });
  if (!response.ok) return null;
  return response.json();
}

export async function resolveSystemicFlag(flagId: string): Promise<void> {
  await apiFetch(`/api/v1/systemic-flags/${encodeURIComponent(flagId)}/resolve`, { method: "PATCH" });
}

export type KBReadingStatePayload = {
  bookmarked_ids: string[];
  read_ids: string[];
  notes: Record<string, string>;
  struggles: string[];
};

export async function fetchKBReadingState(): Promise<KBReadingStatePayload | null> {
  const response = await apiFetch("/api/v1/kb/reading-state");
  if (!response.ok) return null;
  return response.json();
}

export async function saveKBReadingState(payload: KBReadingStatePayload): Promise<void> {
  await apiFetch("/api/v1/kb/reading-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function exportEngineRun(engineRunId: string, format: "markdown" | "json" = "markdown"): Promise<string> {
  const response = await apiFetch(`/api/v1/engine/runs/${encodeURIComponent(engineRunId)}/export?format=${format}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to export report"));
  }
  if (format === "json") {
    return JSON.stringify(await response.json(), null, 2);
  }
  return response.text();
}

export async function fetchEngineRunDetail(engineRunId: string): Promise<PersistedEngineRunDetailRecord | null> {
  const response = await apiFetch(`/api/v1/engine/runs/${encodeURIComponent(engineRunId)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load engine run detail"));
  }
  return response.json();
}

export async function fetchCopilotThreads(venueId?: string): Promise<CopilotThreadSummary[]> {
  const query = venueId ? `?venue_id=${encodeURIComponent(venueId)}` : "";
  const response = await apiFetch(`/api/v1/copilot/threads${query}`);
  if (response.status === 409) {
    return [];
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load copilot threads"));
  }
  return response.json();
}

export async function fetchCopilotThread(threadId: string): Promise<CopilotThreadDetail> {
  const response = await apiFetch(`/api/v1/copilot/threads/${threadId}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load copilot thread"));
  }
  return response.json();
}

export async function sendCopilotMessage(payload: {
  thread_id: string;
  content: string;
  created_by?: string | null;
  attachments?: CopilotAttachment[];
}): Promise<CopilotThreadDetail> {
  const response = await apiFetch(`/api/v1/copilot/threads/${payload.thread_id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: payload.content,
      created_by: payload.created_by ?? null,
      attachments: payload.attachments ?? []
    })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to send copilot message"));
  }
  return response.json();
}

export async function fetchProactiveGreeting(venueId?: string): Promise<ProactiveGreetingResponse | null> {
  const response = await apiFetch("/api/v1/copilot/proactive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ venue_id: venueId ?? null })
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load proactive greeting"));
  }
  return response.json();
}

export async function fetchOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const response = await apiFetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/members`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load organization members"));
  }
  return response.json();
}

export async function createOrganizationMember(
  organizationId: string,
  payload: {
    email: string;
    full_name: string;
    role: "owner" | "manager" | "barista" | "developer";
    venue_ids?: string[];
  }
): Promise<OrganizationMemberProvisionResponse> {
  const response = await apiFetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      venue_ids: payload.venue_ids ?? []
    })
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create organization member"));
  }
  return response.json();
}

export async function updateOrganizationMember(
  organizationId: string,
  memberId: string,
  payload: {
    full_name?: string;
    role?: "owner" | "manager" | "barista" | "developer";
    active?: boolean;
  }
): Promise<OrganizationMember> {
  const response = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update organization member"));
  }
  return response.json();
}

export async function resetOrganizationMemberLogin(
  organizationId: string,
  memberId: string
): Promise<ProvisionedLoginPacket> {
  const response = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}/reset-login`,
    {
      method: "POST"
    }
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to reset member login"));
  }
  return response.json();
}

export async function updateOrganizationMemberVenueAccess(
  organizationId: string,
  memberId: string,
  venueIds: string[]
): Promise<OrganizationMember> {
  const response = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}/venue-access`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ venue_ids: venueIds })
    }
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update venue access"));
  }
  return response.json();
}

export async function runSavedAssessment(assessmentId: string): Promise<EngineRunResponse> {
  const response = await apiFetch(`/api/v1/assessments/${assessmentId}/runs`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to run saved assessment"));
  }

  return response.json();
}

export async function runEngine(payload: {
  venue_id: string;
  selected_signal_ids: string[];
  signal_states?: Record<
    string,
    { active: boolean; notes?: string; confidence?: string; value?: string | null }
  >;
  management_hours_available: number;
  weekly_effort_budget: number;
  notes?: string;
}): Promise<EngineRunResponse> {
  const response = await apiFetch("/api/v1/engine/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to run diagnostic engine"));
  }

  return response.json();
}

export async function fetchOntologyBundle(version?: string, ontologyId?: string): Promise<OntologyBundleResponse> {
  const params = new URLSearchParams();
  if (version) {
    params.set("version", version);
  }
  if (ontologyId) {
    params.set("ontology_id", ontologyId);
  }
  const query = params.size ? `?${params.toString()}` : "";
  const response = await apiFetch(`/api/v1/ontology/bundle${query}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load ontology bundle"));
  }
  return response.json();
}

export async function fetchOntologyAlignment(
  ontologyId?: string,
  version?: string
): Promise<OntologyAlignmentSummaryResponse> {
  const params = new URLSearchParams();
  if (ontologyId) {
    params.set("ontology_id", ontologyId);
  }
  if (version) {
    params.set("version", version);
  }
  const query = params.size ? `?${params.toString()}` : "";
  const response = await apiFetch(`/api/v1/ontology/alignment${query}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load ontology alignment"));
  }
  return response.json();
}

export async function fetchOntologyGovernance(
  ontologyId?: string,
  version?: string
): Promise<OntologyGovernanceSummaryResponse> {
  const params = new URLSearchParams();
  if (ontologyId) {
    params.set("ontology_id", ontologyId);
  }
  if (version) {
    params.set("version", version);
  }
  const query = params.size ? `?${params.toString()}` : "";
  const response = await apiFetch(`/api/v1/ontology/governance${query}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load ontology governance"));
  }
  return response.json();
}

export async function fetchOntologyAuthoringBrief(
  ontologyId?: string,
  version?: string
): Promise<OntologyAuthoringBriefResponse> {
  const params = new URLSearchParams();
  if (ontologyId) {
    params.set("ontology_id", ontologyId);
  }
  if (version) {
    params.set("version", version);
  }
  const query = params.size ? `?${params.toString()}` : "";
  const response = await apiFetch(`/api/v1/ontology/authoring-brief${query}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load ontology authoring brief"));
  }
  return response.json();
}

export async function fetchOntologyEvaluationPacks(ontologyId: string): Promise<OntologyEvaluationPackSummary[]> {
  const response = await apiFetch(`/api/v1/ontology/evaluations/packs?ontology_id=${encodeURIComponent(ontologyId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load ontology evaluation packs"));
  }
  return response.json();
}

export async function fetchOntologyMounts(): Promise<OntologyMountSummary[]> {
  const response = await apiFetch("/api/v1/ontology/mounts");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load ontology mounts"));
  }
  return response.json();
}

export async function fetchVenueOntologyBinding(venueId: string): Promise<VenueOntologyBindingRecord> {
  const response = await apiFetch(`/api/v1/venues/${encodeURIComponent(venueId)}/ontology-binding`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load venue ontology binding"));
  }
  return response.json();
}

export async function runOntologyEvaluationPack(
  packId: string,
  ontologyId: string
): Promise<OntologyEvaluationPackResult> {
  const response = await apiFetch(
    `/api/v1/ontology/evaluations/packs/${encodeURIComponent(packId)}/run?ontology_id=${encodeURIComponent(ontologyId)}`,
    {
      method: "POST"
    }
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to run ontology evaluation pack"));
  }
  return response.json();
}

export async function fetchEnhancedReport(engineRunId: string): Promise<EnhancedReportResponse | null> {
  const response = await apiFetch(`/api/v1/engine/runs/${encodeURIComponent(engineRunId)}/report-enhanced`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load enhanced report"));
  }
  return response.json();
}

export async function fetchIntegrationConnectors(): Promise<IntegrationConnectorRecord[]> {
  const response = await apiFetch("/api/v1/integrations/connectors");
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load integration connectors"));
  }
  return response.json();
}

export async function fetchIntegrationSummary(): Promise<IntegrationHealthSummary | null> {
  const response = await apiFetch("/api/v1/integrations/summary");
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load integration summary"));
  }
  return response.json();
}

export async function fetchIntegrationEvents(params?: {
  venueId?: string;
  provider?: string;
  status?: string;
  limit?: number;
}): Promise<IntegrationEventRecord[]> {
  const query = new URLSearchParams();
  if (params?.venueId) {
    query.set("venue_id", params.venueId);
  }
  if (params?.provider) {
    query.set("provider", params.provider);
  }
  if (params?.status) {
    query.set("status", params.status);
  }
  query.set("limit", String(params?.limit ?? 12));
  const response = await apiFetch(`/api/v1/integrations/events?${query.toString()}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load integration events"));
  }
  return response.json();
}

export async function retryIntegrationEvent(eventId: string): Promise<IntegrationEventRecord> {
  const response = await apiFetch(`/api/v1/integrations/events/${encodeURIComponent(eventId)}/retry`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to retry integration event"));
  }
  return response.json();
}


// ─── ECL (Execution Control Layer) types & functions ───


export type NextActionItem = {
  action_type: string;
  entity_id: string;
  title: string;
  priority: number;
  context: string;
  due_at: string | null;
  venue_id: string;
};

export type FollowUpRecord = {
  id: string;
  venue_id: string;
  task_id: string;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  status: string;
  due_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  escalated_at: string | null;
  notes: string | null;
  created_at: string;
  is_overdue: boolean;
};

export type EscalationRecord = {
  id: string;
  venue_id: string;
  follow_up_id: string | null;
  task_id: string | null;
  created_by: string | null;
  escalated_to: string | null;
  severity: string;
  status: string;
  reason: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
};

export type EvidenceRecord = {
  id: string;
  venue_id: string;
  task_id: string | null;
  follow_up_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  evidence_type: string;
  file_asset_id: string | null;
  created_at: string;
};

export async function fetchNextActions(venueId: string): Promise<NextActionItem[]> {
  const response = await apiFetch(`/api/v1/execution/next-action?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load next actions"));
  }
  return response.json();
}

export async function fetchFollowUps(venueId: string, overdueOnly = false): Promise<FollowUpRecord[]> {
  const query = new URLSearchParams({ venue_id: venueId });
  if (overdueOnly) query.set("overdue_only", "true");
  const response = await apiFetch(`/api/v1/execution/followups?${query.toString()}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load follow-ups"));
  }
  return response.json();
}

export async function createFollowUp(payload: {
  venue_id: string;
  task_id: string;
  assigned_to?: string;
  title: string;
  due_at: string;
  notes?: string;
}): Promise<FollowUpRecord> {
  const response = await apiFetch("/api/v1/execution/followups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create follow-up"));
  }
  return response.json();
}

export async function updateFollowUp(followUpId: string, payload: {
  status?: string;
  notes?: string;
}): Promise<FollowUpRecord> {
  const response = await apiFetch(`/api/v1/execution/followups/${encodeURIComponent(followUpId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update follow-up"));
  }
  return response.json();
}

export async function fetchEscalations(venueId: string): Promise<EscalationRecord[]> {
  const response = await apiFetch(`/api/v1/execution/escalations?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load escalations"));
  }
  return response.json();
}

export async function createEscalation(payload: {
  venue_id: string;
  follow_up_id?: string;
  task_id?: string;
  severity?: string;
  reason: string;
}): Promise<EscalationRecord> {
  const response = await apiFetch("/api/v1/execution/escalate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create escalation"));
  }
  return response.json();
}

export async function resolveEscalation(escalationId: string, resolutionNotes: string): Promise<EscalationRecord> {
  const response = await apiFetch(`/api/v1/execution/escalations/${encodeURIComponent(escalationId)}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resolution_notes: resolutionNotes }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to resolve escalation"));
  }
  return response.json();
}

export async function fetchEvidence(venueId: string, taskId?: string): Promise<EvidenceRecord[]> {
  const query = new URLSearchParams({ venue_id: venueId });
  if (taskId) query.set("task_id", taskId);
  const response = await apiFetch(`/api/v1/execution/evidence?${query.toString()}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load evidence"));
  }
  return response.json();
}

export async function createEvidence(payload: {
  venue_id: string;
  task_id?: string;
  follow_up_id?: string;
  title: string;
  description?: string;
  evidence_type?: string;
}): Promise<EvidenceRecord> {
  const response = await apiFetch("/api/v1/execution/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create evidence"));
  }
  return response.json();
}

// ─── Pocket shell (employee) ───

export type MyShiftTask = {
  id: string;
  title: string;
  status: string;
  order_index: number;
  effort_hours: number;
  rationale: string;
  notes: string | null;
  sub_actions: { label: string; completed: boolean }[];
  deliverables: { label: string; completed: boolean }[];
};

export type MyShiftResponse = {
  venue_name: string;
  venue_id: string;
  employee_name: string;
  tasks: MyShiftTask[];
  open_follow_ups: number;
  overdue_follow_ups: number;
};

export type StandardItem = {
  block_id: string;
  title: string;
  rationale: string;
  sub_actions: { label: string; completed: boolean }[];
  deliverables: { label: string; completed: boolean }[];
};

export type FrictionReportResponse = {
  id: string;
  summary: string;
  created_at: string;
};

export type ShiftDiaryEntry = {
  id: string;
  summary: string;
  detail: string | null;
  created_at: string;
};

export type HelpRequestRecord = {
  id: string;
  venue_id: string;
  requester_user_id: string | null;
  channel: string;
  title: string;
  prompt: string;
  status: "open" | "answered" | "closed";
  linked_thread_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

export async function fetchMyShift(venueId: string): Promise<MyShiftResponse> {
  const response = await apiFetch(`/api/v1/pocket/my-shift?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load shift"));
  }
  return response.json();
}

export async function fetchMyStandards(venueId: string): Promise<StandardItem[]> {
  const response = await apiFetch(`/api/v1/pocket/my-standards?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load standards"));
  }
  return response.json();
}

export async function reportFriction(payload: {
  venue_id: string;
  summary: string;
  detail?: string;
  anonymous?: boolean;
}): Promise<FrictionReportResponse> {
  const response = await apiFetch("/api/v1/pocket/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to submit report"));
  }
  return response.json();
}

export async function fetchShiftDiary(venueId: string): Promise<ShiftDiaryEntry[]> {
  const response = await apiFetch(`/api/v1/pocket/diary?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load diary"));
  }
  return response.json();
}

export async function createShiftDiaryEntry(payload: {
  venue_id: string;
  summary: string;
  detail?: string;
}): Promise<ShiftDiaryEntry> {
  const response = await apiFetch("/api/v1/pocket/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create diary entry"));
  }
  return response.json();
}

export async function fetchHelpRequests(venueId: string, mineOnly = true): Promise<HelpRequestRecord[]> {
  const response = await apiFetch(
    `/api/v1/pocket/help-requests?venue_id=${encodeURIComponent(venueId)}&mine_only=${mineOnly ? "true" : "false"}`
  );
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load help requests"));
  }
  return response.json();
}

export async function createHelpRequest(payload: {
  venue_id: string;
  title: string;
  prompt: string;
  channel?: string;
}): Promise<HelpRequestRecord> {
  const response = await apiFetch("/api/v1/pocket/help-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create help request"));
  }
  return response.json();
}

export async function updateHelpRequest(helpRequestId: string, payload: {
  status: "open" | "answered" | "closed";
}): Promise<HelpRequestRecord> {
  const response = await apiFetch(`/api/v1/pocket/help-requests/${helpRequestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update help request"));
  }
  return response.json();
}

// ─── People intelligence (owner shell) ───

export type TeamProfile = {
  user_id: string;
  full_name: string;
  role: string;
  follow_ups_total: number;
  follow_ups_overdue: number;
  follow_ups_completed: number;
  escalations_created: number;
  evidence_submitted: number;
  diary_entries: number;
  friction_reports: number;
};

export type OverloadEntry = {
  user_id: string;
  full_name: string;
  role: string;
  risk_score: number;
  risk_level: "high" | "medium" | "low";
  risk_factors: string[];
};

export type FlightRiskEntry = {
  user_id: string;
  full_name: string;
  role: string;
  flight_risk_score: number;
  risk_level: "high" | "medium";
  signals: string[];
};

export type ExecutionVelocity = {
  venue_id: string;
  has_plan: boolean;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  completion_percentage: number;
  velocity_label: string;
};

export type DelegationEntry = {
  follow_up_id: string;
  task_id: string | null;
  task_title: string | null;
  title: string;
  status: string;
  assigned_to: string | null;
  due_at: string;
  is_overdue: boolean;
  evidence_count: number;
};

export type AttentionItem = {
  type: string;
  severity: string;
  venue_id: string;
  venue_name: string;
  entity_id: string;
  title: string;
  detail: string;
  created_at: string;
  priority: number;
};

export async function fetchTeamProfiles(venueId: string): Promise<TeamProfile[]> {
  const response = await apiFetch(`/api/v1/people/team-profiles?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load team profiles"));
  return response.json();
}

export async function fetchOverloadMap(venueId: string): Promise<OverloadEntry[]> {
  const response = await apiFetch(`/api/v1/people/overload-map?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load overload map"));
  return response.json();
}

export async function fetchFlightRisk(venueId: string): Promise<FlightRiskEntry[]> {
  const response = await apiFetch(`/api/v1/people/flight-risk?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load flight risk"));
  return response.json();
}

export async function fetchExecutionVelocity(venueId: string): Promise<ExecutionVelocity> {
  const response = await apiFetch(`/api/v1/people/execution-velocity?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load execution velocity"));
  return response.json();
}

export async function fetchDelegations(venueId: string): Promise<DelegationEntry[]> {
  const response = await apiFetch(`/api/v1/people/delegations?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load delegations"));
  return response.json();
}

export async function fetchAttentionItems(): Promise<AttentionItem[]> {
  const response = await apiFetch("/api/v1/people/attention-items");
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load attention items"));
  return response.json();
}

// ─── Push notifications ───

export async function subscribePushNotifications(subscription: PushSubscription): Promise<{ status: string }> {
  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  const response = await apiFetch("/api/v1/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh_key: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
      auth_key: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
    }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to subscribe to push notifications"));
  return response.json();
}

export async function unsubscribePushNotifications(endpoint: string): Promise<{ status: string }> {
  const response = await apiFetch("/api/v1/notifications/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, p256dh_key: "", auth_key: "" }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to unsubscribe from push notifications"));
  return response.json();
}

// ─── Scheduler / Digest ───

export type VenueDigest = {
  venue_id: string;
  venue_name: string;
  generated_at: string;
  overdue_follow_ups: number;
  open_escalations: number;
  active_tasks: number;
  blocked_tasks: number;
  summary: string;
};

export async function fetchVenueDigest(venueId: string): Promise<VenueDigest> {
  const response = await apiFetch(`/api/v1/scheduler/digest?venue_id=${encodeURIComponent(venueId)}`);
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load venue digest"));
  return response.json();
}

export type OverdueReminder = {
  type: string;
  follow_up_id: string;
  title: string;
  venue_id: string;
  assigned_to: string | null;
  due_at: string | null;
  days_overdue: number;
};

export async function fetchOverdueReminders(): Promise<OverdueReminder[]> {
  const response = await apiFetch("/api/v1/scheduler/reminders");
  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to load overdue reminders"));
  return response.json();
}
