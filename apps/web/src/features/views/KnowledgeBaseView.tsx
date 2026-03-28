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

const guidanceArticles = [
  {
    title: "Universal Service Operations Doctrine",
    summary:
      "The product is built around a universal service grammar: signals, failure families, response logic, sequencing, and verification across service industries.",
    tags: ["Doctrine", "Core", "Cross-industry"],
  },
  {
    title: "Core vs Adapter Architecture",
    summary:
      "A mounted sector pack is not the identity of the system. The platform core stays universal while each service industry gets its own surface language.",
    tags: ["Architecture", "Adapters", "Scalability"],
  },
  {
    title: "AI Control Plane",
    summary:
      "AI sits at the heart of interpretation, guidance, and learning, but the system of record, auditability, and truth mutation remain governed.",
    tags: ["AI", "Safety", "Control plane"],
  },
  {
    title: "Canonical Ontology vNext",
    summary:
      "The ontology is being rebuilt around universal modules, failure families, response logics, and contract-grade interventions rather than inherited vertical wording.",
    tags: ["Ontology", "Rebuild", "Methodology"],
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

      <SectionCard
        eyebrow="Doctrine set"
        title="Foundational articles"
        description="These articles keep the rebuild aligned around universal operations, governed AI, and adapter-native ontology work."
      >
        <div className="library-grid">
          {guidanceArticles.map((article) => (
            <article className="library-card" key={article.title}>
              <div className="thread-row">
                <span>Guidance</span>
                <em>Current</em>
              </div>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <div className="dependency-list">
                {article.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

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
