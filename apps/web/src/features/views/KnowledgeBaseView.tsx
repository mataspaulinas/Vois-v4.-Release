import { useMemo } from "react";
import { SectionCard } from "../../components/SectionCard";
import {
  IntegrationConnectorRecord,
  IntegrationHealthSummary,
  OntologyAlignmentSummaryResponse,
  OntologyAuthoringBriefResponse,
  OntologyBundleResponse,
  OntologyEvaluationPackResult,
  OntologyEvaluationPackSummary,
  OntologyGovernanceSummaryResponse,
} from "../../lib/api";
import { Glossary } from "../kb/Glossary";
import { KBArticle, ReadingEngine } from "../kb/ReadingEngine";

const productHelpArticles: KBArticle[] = [
  {
    id: "help-owner-setup",
    title: "Getting started as an Owner",
    summary: "Claim the workspace, create venues, bind ontology packs, and provision team access.",
    body: "VOIS starts empty by default. The first authenticated owner claims the workspace by creating an organization and optionally attaching the first venue with an ontology pack binding. After claiming, the owner provisions venues, assigns team members, and manages ontology bindings. The system waits for you to shape it — there are no demo assumptions in normal runtime.",
    tags: ["Owner", "Setup", "Getting started"],
    category: "product_help",
    relatedIds: ["help-assessment", "help-plans"],
  },
  {
    id: "help-assessment",
    title: "Running your first assessment",
    summary: "Capture evidence, run AI intake, review signals, save the assessment, then run the engine.",
    body: "The assessment flow follows five stages: Observe (capture raw evidence), Infer (AI detects signals from evidence), Review (confirm or reject machine interpretation), Save (persist the reviewed assessment), Run (generate the diagnostic report and draft plan). The intake quality bar shows whether your evidence is rich enough for meaningful signal detection. After AI intake, move to Signals Review for detailed inspection before saving.",
    tags: ["Manager", "Assessment", "Workflow"],
    category: "product_help",
    relatedIds: ["help-signals", "help-plans"],
  },
  {
    id: "help-signals",
    title: "Reviewing signals before diagnosis",
    summary: "The machine proposes, the human reviews. Confirm, reject, or manually add signals.",
    body: "Signals Review is the accountability layer between AI interpretation and downstream diagnosis. Each signal can be confirmed, rejected, or manually added. The downstream impact panel shows which failure modes, response patterns, and intervention blocks each signal activates. Reviewed signals become the authoritative interpreted set for the assessment cycle. Nothing silently bypasses this layer.",
    tags: ["Manager", "Signals", "Review"],
    category: "product_help",
    relatedIds: ["help-assessment", "help-plans"],
  },
  {
    id: "help-plans",
    title: "Understanding active vs draft plans",
    summary: "A draft plan is review-only. Only explicit activation makes it the execution truth.",
    body: "The engine generates draft plans from the diagnostic output. A draft plan cannot be executed — it exists for review only. Explicit activation promotes it to the active plan, which becomes the sole execution truth. When a new plan is activated, the previous active plan is archived. Task status changes, sub-action completions, and deliverable tracking are only allowed on the active plan. This protects execution from accidental drift.",
    tags: ["Manager", "Plans", "Truth"],
    category: "product_help",
    relatedIds: ["help-assessment", "help-pocket"],
  },
  {
    id: "help-pocket",
    title: "Using Pocket as a team member",
    summary: "My Shift, standards lookup, help requests, and report/log flows.",
    body: "Pocket is the team member's operating surface. My Shift shows current task assignments and shift context. Standards provides procedural guidance for the active venue. Help lets you submit help requests that route to managers. Report Something and My Log support friction reporting and personal shift notes. Pocket is touch-first and focused on what you need to do right now — it does not expose the full venue workspace.",
    tags: ["Barista", "Pocket", "Shift"],
    category: "product_help",
    relatedIds: ["help-owner-setup"],
  },
];

const guidanceArticles: KBArticle[] = [
  {
    id: "doctrine-universal",
    title: "Universal Service Operations Doctrine",
    summary: "The product is built around a universal service grammar: signals, failure families, response logic, sequencing, and verification across service industries.",
    body: "VOIS operates on the premise that all service operations share a common grammar: signals indicate operational reality, failure modes describe systemic breakdowns, response patterns prescribe corrections, and intervention blocks are the atomic units of execution. This grammar is universal — it applies across hospitality, healthcare, retail, and other service industries. Each industry provides its own vocabulary through ontology packs, but the operational machine remains the same.",
    tags: ["Doctrine", "Core", "Cross-industry"],
    category: "doctrine",
    relatedIds: ["doctrine-architecture", "doctrine-ai"],
  },
  {
    id: "doctrine-architecture",
    title: "Core vs Adapter Architecture",
    summary: "A mounted sector pack is not the identity of the system. The platform core stays universal while each service industry gets its own surface language.",
    body: "The platform separates into OIS Core (the universal operational machine) and mountable Ontology Packs (industry-specific meaning). Core owns workflows, persistence, auth, roles, and execution truth. Packs own signals, failure modes, response patterns, blocks, tools, standards, and domain reference content. A venue binds explicitly to one ontology pack, and that binding determines the domain vocabulary for all operations within it. Historical artifacts preserve the exact ontology identity they were created under.",
    tags: ["Architecture", "Adapters", "Scalability"],
    category: "doctrine",
    relatedIds: ["doctrine-universal", "doctrine-ontology"],
  },
  {
    id: "doctrine-ai",
    title: "AI Control Plane",
    summary: "AI sits at the heart of interpretation, guidance, and learning, but the system of record, auditability, and truth mutation remain governed.",
    body: "AI in VOIS assists with signal detection, report enhancement, copilot conversation, and proactive guidance. However, AI is never the authority — it proposes, humans review and confirm. Signal suggestions from copilot require explicit application. Report narratives are grounded with references. Copilot cannot silently mutate plan truth, task state, or assessment signals. When live AI is unavailable, real roles see an explicit unavailable state rather than degraded mock behavior.",
    tags: ["AI", "Safety", "Control plane"],
    category: "doctrine",
    relatedIds: ["doctrine-universal"],
  },
  {
    id: "doctrine-ontology",
    title: "Canonical Ontology vNext",
    summary: "The ontology is being rebuilt around universal modules, failure families, response logics, and contract-grade interventions rather than inherited vertical wording.",
    body: "The ontology system is evolving from inherited vertical wording toward a universal canon. Every ontology pack must provide signals, failure modes, response patterns, blocks, tools, and mappings. Packs are validated at three levels: structural (files and schemas), semantic (no orphans or impossible cycles), and runtime (mount, preview, and execution). Invalid packs fail closed — historical artifacts still render, but new runs are blocked.",
    tags: ["Ontology", "Rebuild", "Methodology"],
    category: "doctrine",
    relatedIds: ["doctrine-architecture"],
  },
];

type KnowledgeBaseViewProps = {
  bundle: OntologyBundleResponse | null;
  alignment: OntologyAlignmentSummaryResponse | null;
  governance: OntologyGovernanceSummaryResponse | null;
  authoringBrief: OntologyAuthoringBriefResponse | null;
  loading: boolean;
  evaluationPacks: OntologyEvaluationPackSummary[];
  evaluationResult: OntologyEvaluationPackResult | null;
  loadingEvaluations: boolean;
  connectors: IntegrationConnectorRecord[];
  integrationSummary: IntegrationHealthSummary | null;
};

export function KnowledgeBaseView({
  bundle,
  alignment,
  governance,
  authoringBrief,
  loading,
  evaluationPacks,
  evaluationResult,
  loadingEvaluations,
  connectors,
  integrationSummary,
}: KnowledgeBaseViewProps) {
  const allArticles = useMemo(() => [...productHelpArticles, ...guidanceArticles], []);
  const moduleCoverage = authoringBrief?.service_module_coverage ?? [];
  const coveredModules = moduleCoverage.filter((item) => item.is_covered).length;
  const warningCount = governance ? governance.warnings.length : 0;
  const errorCount = governance ? governance.errors.length : 0;
  const topModules = [...moduleCoverage]
    .sort((left, right) => right.covered_count - left.covered_count)
    .slice(0, 5);
  const weakestScenario = evaluationResult?.results.find((item) => !item.passed) ?? evaluationResult?.results[0] ?? null;

  return (
    <div className="view-stack">
      <SectionCard
        eyebrow="Knowledge Base"
        title="Guidance surfaces"
        description="This is where doctrine, ontology posture, and live rebuild guardrails sit together while the new operational knowledge system is still deepening."
      >
        <div className="highlight-grid">
          <div className="focus-card focus-card-primary">
            <p className="section-eyebrow">Doctrine set</p>
            <h3>{guidanceArticles.length}</h3>
            <p>The knowledge base now carries both the product thesis and the live ontology posture behind the current rebuild.</p>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Ontology posture</p>
            <h3>{bundle ? `${bundle.meta.ontology_id} ${bundle.meta.version}` : "Loading..."}</h3>
            <p>
              {alignment
                ? `${alignment.counts.signals} signals, ${alignment.counts.failure_modes} failure modes, ${alignment.counts.response_patterns} response patterns aligned to the universal core.`
                : "Loading alignment and posture data."}
            </p>
          </div>
          <div className="focus-card">
            <p className="section-eyebrow">Governance</p>
            <h3>{errorCount ? `${errorCount} errors` : warningCount ? `${warningCount} warnings` : "Clean"}</h3>
            <p>
              {governance
                ? "This reflects the published ontology bundle, not a mock placeholder."
                : "Governance posture is loading."}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Live posture"
        title="Ontology operating picture"
        description="The knowledge base is now connected to the real ontology APIs, so this surface tells you whether the current published library is coherent enough to trust."
      >
        {loading ? (
          <div className="empty-state">
            <p>Loading ontology posture...</p>
          </div>
        ) : (
          <>
            <div className="highlight-grid">
              <div className="focus-card">
                <p className="section-eyebrow">Module coverage</p>
                <h3>
                  {coveredModules}/{moduleCoverage.length}
                </h3>
                <p>Universal service modules represented in the current published adapter.</p>
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Unclassified entities</p>
                <h3>
                  {(alignment?.unclassified_signal_ids.length ?? 0) +
                    (alignment?.unclassified_failure_mode_ids.length ?? 0) +
                    (alignment?.unclassified_response_pattern_ids.length ?? 0)}
                </h3>
                <p>Anything above zero here means the adapter is drifting away from the universal core.</p>
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Contract gaps</p>
                <h3>{countGovernanceGaps(governance)}</h3>
                <p>Block and tool contract omissions still visible in the current published bundle.</p>
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Scenario evals</p>
                <h3>
                  {loadingEvaluations
                    ? "Running..."
                    : evaluationResult
                      ? `${Math.round(evaluationResult.pass_rate * 100)}%`
                      : evaluationPacks.length
                        ? `${evaluationPacks[0].scenario_count} queued`
                        : "None"}
                </h3>
                <p>
                  {evaluationResult
                    ? `${evaluationResult.passed_scenarios}/${evaluationResult.scenario_count} baseline scenarios are passing against the current ontology and engine.`
                    : "Evaluation packs turn diagnosis and sequencing quality into something testable instead of intuitive only."}
                </p>
              </div>
            </div>

            <div className="timeline-split comparison-grid">
              <div className="focus-card">
                <p className="section-eyebrow">Strongest-covered modules</p>
                <div className="compact-list">
                  {topModules.map((item) => (
                    <div className="compact-card" key={item.id}>
                      <strong>{item.name}</strong>
                      <span>{item.covered_count} mapped objects</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Contract field posture</p>
                <div className="dependency-list">
                  <span>{authoringBrief?.signal_contract_fields.length ?? 0} signal fields</span>
                  <span>{authoringBrief?.block_contract_fields.length ?? 0} block fields</span>
                  <span>{authoringBrief?.tool_contract_fields.length ?? 0} tool fields</span>
                </div>
                <p className="history-note">
                  These are the authoring standards the ontology has to satisfy before it is considered trustworthy.
                </p>
              </div>
            </div>

            <div className="timeline-split comparison-grid">
              <div className="focus-card">
                <p className="section-eyebrow">Evaluation packs</p>
                <div className="compact-list">
                  {evaluationPacks.length ? (
                    evaluationPacks.map((pack) => (
                      <div className="compact-card" key={pack.pack_id}>
                        <strong>{pack.title}</strong>
                        <span>
                          {pack.scenario_count} scenarios · {pack.ontology_version}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="compact-card">
                      <strong>No evaluation packs yet</strong>
                      <span>Scenario pressure tests will appear here.</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Sensor layer</p>
                {connectors.length ? (
                  <div className="compact-list">
                    {connectors.map((connector) => (
                      <div className="compact-card" key={connector.provider}>
                        <strong>{connector.display_name}</strong>
                        <span>
                          {connector.provider} · {connector.status}
                        </span>
                        <span>{connector.supported_event_types.length} starter event types</span>
                        {integrationSummary ? (
                          <span>{integrationSummary.total_events} canonical events observed</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="history-note">Connector posture will appear here once the sensor layer is exposed.</p>
                )}
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Current scenario pressure</p>
                {loadingEvaluations ? (
                  <p className="history-note">Running the baseline pack against the published ontology...</p>
                ) : weakestScenario ? (
                  <>
                    <h3>{weakestScenario.scenario_name}</h3>
                    <p className="history-note">
                      {weakestScenario.passed
                        ? "Current weakest visible scenario is still passing; this is the floor to beat as the ontology deepens."
                        : "This scenario is currently failing and should guide the next ontology or sequencing correction."}
                    </p>
                    <div className="dependency-list">
                      <span>{Math.round(weakestScenario.score * 100)}% score</span>
                      <span>{weakestScenario.load_classification} load</span>
                      <span>{weakestScenario.plan_task_count} tasks</span>
                    </div>
                  </>
                ) : (
                  <p className="history-note">Open this surface after packs exist to see diagnosis and sequencing quality.</p>
                )}
              </div>
              <div className="focus-card">
                <p className="section-eyebrow">Connector health</p>
                {integrationSummary ? (
                  <>
                    <h3>
                      {integrationSummary.overdue_retry_count || integrationSummary.stale_event_count
                        ? `${integrationSummary.overdue_retry_count} overdue / ${integrationSummary.stale_event_count} stale`
                        : "Stable"}
                    </h3>
                    <p className="history-note">
                      {integrationSummary.total_events
                        ? `${integrationSummary.total_events} canonical event(s) observed across ${integrationSummary.counts_by_provider.length} provider surface(s).`
                        : "No canonical events have been observed yet."}
                    </p>
                    <div className="dependency-list">
                      <span>{integrationSummary.retryable_event_count} retryable</span>
                      {integrationSummary.counts_by_status.slice(0, 3).map((item) => (
                        <span key={`status-${item.key}`}>
                          {item.key}: {item.count}
                        </span>
                      ))}
                      {integrationSummary.provider_pressure[0] ? (
                        <span>
                          top pressure: {integrationSummary.provider_pressure[0].provider}
                        </span>
                      ) : null}
                      {integrationSummary.latest_failure_events[0] ? (
                        <span>
                          latest failure: {integrationSummary.latest_failure_events[0].provider}/{integrationSummary.latest_failure_events[0].event_type}
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="history-note">Connector health will appear here once event ingestion is active.</p>
                )}
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <ReadingEngine articles={allArticles} />

      <Glossary />

      <SectionCard
        eyebrow="Connectors"
        title="Starter sensor layer"
        description="Provider-specific translation belongs outside the engine. This surface shows what the current platform can already normalize before live telemetry gets deeper."
      >
        <div className="library-grid">
          {connectors.length ? (
            connectors.map((connector) => (
              <article className="library-card" key={connector.provider}>
                <div className="thread-row">
                  <span>{connector.provider}</span>
                  <em>{connector.status}</em>
                </div>
                <h3>{connector.display_name}</h3>
                <p>{connector.notes[0] ?? "Connector guidance is still being authored."}</p>
                <div className="dependency-list">
                  {connector.ingest_modes.map((mode) => (
                    <span key={`${connector.provider}-${mode}`}>{mode}</span>
                  ))}
                  {connector.supported_event_types.slice(0, 3).map((eventType) => (
                    <span key={`${connector.provider}-${eventType}`}>{eventType}</span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <p>No connector posture published yet.</p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function countGovernanceGaps(governance: OntologyGovernanceSummaryResponse | null) {
  if (!governance) {
    return 0;
  }

  const blockGapCount = Object.values(governance.block_contract_gaps).reduce(
    (total, entries) => total + entries.length,
    0
  );
  const toolGapCount = Object.values(governance.tool_contract_gaps).reduce(
    (total, entries) => total + entries.length,
    0
  );

  return blockGapCount + toolGapCount;
}
