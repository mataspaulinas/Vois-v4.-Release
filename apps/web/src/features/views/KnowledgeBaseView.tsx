import { useMemo } from "react";
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
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Hero ─────────────────────────────────── */}
      <section className="ui-card" style={{ padding: "32px 32px 28px" }}>
        <p className="eyebrow">KNOWLEDGE</p>
        <h1 className="page-title">Guidance surfaces</h1>
        <p className="small-text" style={{ marginTop: 8, maxWidth: 720 }}>
          Where doctrine, ontology posture, and live rebuild guardrails sit together while the new operational knowledge system is still deepening.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
          <div className="ui-card" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.12)" }}>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Doctrine set</p>
            <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{guidanceArticles.length}</span>
            <p className="small-text" style={{ marginTop: 4 }}>The knowledge base carries both the product thesis and the live ontology posture.</p>
          </div>
          <div className="ui-card">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Ontology posture</p>
            <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{bundle ? `${bundle.meta.ontology_id} ${bundle.meta.version}` : "Loading..."}</span>
            <p className="small-text" style={{ marginTop: 4 }}>
              {alignment
                ? `${alignment.counts.signals} signals, ${alignment.counts.failure_modes} failure modes, ${alignment.counts.response_patterns} response patterns aligned to the universal core.`
                : "Loading alignment and posture data."}
            </p>
          </div>
          <div className="ui-card">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Governance</p>
            <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{errorCount ? `${errorCount} errors` : warningCount ? `${warningCount} warnings` : "Clean"}</span>
            <p className="small-text" style={{ marginTop: 4 }}>
              {governance ? "Reflects the published ontology bundle, not a mock placeholder." : "Governance posture is loading."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Ontology operating picture ────────────── */}
      <section className="ui-card">
        <p className="eyebrow">LIVE POSTURE</p>
        <h2 className="section-title">Ontology operating picture</h2>
        <p className="small-text" style={{ marginTop: 4, maxWidth: 720 }}>
          Connected to the real ontology APIs -- this surface tells you whether the current published library is coherent enough to trust.
        </p>

        {loading ? (
          <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>Loading ontology posture...</p>
        ) : (
          <>
            {/* Top metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 20 }}>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 6 }}>Module coverage</p>
                <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{coveredModules}/{moduleCoverage.length}</span>
                <p className="small-text" style={{ marginTop: 4 }}>Universal service modules represented in the current published adapter.</p>
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 6 }}>Unclassified entities</p>
                <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>
                  {(alignment?.unclassified_signal_ids.length ?? 0) +
                    (alignment?.unclassified_failure_mode_ids.length ?? 0) +
                    (alignment?.unclassified_response_pattern_ids.length ?? 0)}
                </span>
                <p className="small-text" style={{ marginTop: 4 }}>Anything above zero here means the adapter is drifting away from the universal core.</p>
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 6 }}>Contract gaps</p>
                <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{countGovernanceGaps(governance)}</span>
                <p className="small-text" style={{ marginTop: 4 }}>Block and tool contract omissions still visible in the current published bundle.</p>
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 6 }}>Scenario evals</p>
                <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>
                  {loadingEvaluations
                    ? "Running..."
                    : evaluationResult
                      ? `${Math.round(evaluationResult.pass_rate * 100)}%`
                      : evaluationPacks.length
                        ? `${evaluationPacks[0].scenario_count} queued`
                        : "None"}
                </span>
                <p className="small-text" style={{ marginTop: 4 }}>
                  {evaluationResult
                    ? `${evaluationResult.passed_scenarios}/${evaluationResult.scenario_count} baseline scenarios are passing.`
                    : "Evaluation packs turn diagnosis and sequencing quality into something testable."}
                </p>
              </div>
            </div>

            {/* Detail panels */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 20 }}>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Strongest-covered modules</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topModules.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-surface-subtle)" }}>
                      <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{item.name}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>{item.covered_count} mapped objects</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Contract field posture</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span className="ui-badge ui-badge--muted">{authoringBrief?.signal_contract_fields.length ?? 0} signal fields</span>
                  <span className="ui-badge ui-badge--muted">{authoringBrief?.block_contract_fields.length ?? 0} block fields</span>
                  <span className="ui-badge ui-badge--muted">{authoringBrief?.tool_contract_fields.length ?? 0} tool fields</span>
                </div>
                <p className="small-text" style={{ marginTop: 10 }}>
                  These are the authoring standards the ontology has to satisfy before it is considered trustworthy.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Evaluation packs</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {evaluationPacks.length ? (
                    evaluationPacks.map((pack) => (
                      <div key={pack.pack_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-surface-subtle)" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{pack.title}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{pack.scenario_count} scenarios -- {pack.ontology_version}</span>
                      </div>
                    ))
                  ) : (
                    <p className="small-text" style={{ color: "var(--color-text-muted)" }}>No evaluation packs yet. Scenario pressure tests will appear here.</p>
                  )}
                </div>
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Sensor layer</p>
                {connectors.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {connectors.map((connector) => (
                      <div key={connector.provider} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-surface-subtle)" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{connector.display_name}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{connector.provider} -- {connector.status}</span>
                        <span style={{ color: "var(--color-text-muted)", display: "block" }}>{connector.supported_event_types.length} starter event types</span>
                        {integrationSummary ? (
                          <span style={{ color: "var(--color-text-muted)", display: "block" }}>{integrationSummary.total_events} canonical events observed</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="small-text" style={{ color: "var(--color-text-muted)" }}>Connector posture will appear here once the sensor layer is exposed.</p>
                )}
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Current scenario pressure</p>
                {loadingEvaluations ? (
                  <p className="small-text" style={{ color: "var(--color-text-muted)" }}>Running the baseline pack against the published ontology...</p>
                ) : weakestScenario ? (
                  <>
                    <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>{weakestScenario.scenario_name}</span>
                    <p className="small-text" style={{ marginTop: 6 }}>
                      {weakestScenario.passed
                        ? "Current weakest visible scenario is still passing; this is the floor to beat as the ontology deepens."
                        : "This scenario is currently failing and should guide the next ontology or sequencing correction."}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      <span className="ui-badge ui-badge--muted">{Math.round(weakestScenario.score * 100)}% score</span>
                      <span className="ui-badge ui-badge--muted">{weakestScenario.load_classification} load</span>
                      <span className="ui-badge ui-badge--muted">{weakestScenario.plan_task_count} tasks</span>
                    </div>
                  </>
                ) : (
                  <p className="small-text" style={{ color: "var(--color-text-muted)" }}>Open this surface after packs exist to see diagnosis and sequencing quality.</p>
                )}
              </div>
              <div className="ui-card">
                <p className="eyebrow" style={{ marginBottom: 10 }}>Connector health</p>
                {integrationSummary ? (
                  <>
                    <span style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", display: "block" }}>
                      {integrationSummary.overdue_retry_count || integrationSummary.stale_event_count
                        ? `${integrationSummary.overdue_retry_count} overdue / ${integrationSummary.stale_event_count} stale`
                        : "Stable"}
                    </span>
                    <p className="small-text" style={{ marginTop: 6 }}>
                      {integrationSummary.total_events
                        ? `${integrationSummary.total_events} canonical event(s) observed across ${integrationSummary.counts_by_provider.length} provider surface(s).`
                        : "No canonical events have been observed yet."}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      <span className="ui-badge ui-badge--muted">{integrationSummary.retryable_event_count} retryable</span>
                      {integrationSummary.counts_by_status.slice(0, 3).map((item) => (
                        <span key={`status-${item.key}`} className="ui-badge ui-badge--muted">{item.key}: {item.count}</span>
                      ))}
                      {integrationSummary.provider_pressure[0] ? (
                        <span className="ui-badge ui-badge--muted">top pressure: {integrationSummary.provider_pressure[0].provider}</span>
                      ) : null}
                      {integrationSummary.latest_failure_events[0] ? (
                        <span className="ui-badge ui-badge--muted">latest failure: {integrationSummary.latest_failure_events[0].provider}/{integrationSummary.latest_failure_events[0].event_type}</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="small-text" style={{ color: "var(--color-text-muted)" }}>Connector health will appear here once event ingestion is active.</p>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <ReadingEngine articles={allArticles} />

      <Glossary />

      {/* ── Connectors ───────────────────────────── */}
      <section className="ui-card">
        <p className="eyebrow">CONNECTORS</p>
        <h2 className="section-title">Starter sensor layer</h2>
        <p className="small-text" style={{ marginTop: 4, maxWidth: 720 }}>
          Provider-specific translation belongs outside the engine. This surface shows what the current platform can already normalize.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginTop: 20 }}>
          {connectors.length ? (
            connectors.map((connector) => (
              <article key={connector.provider} className="ui-card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  <span>{connector.provider}</span>
                  <span>{connector.status}</span>
                </div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{connector.display_name}</h3>
                <p className="small-text" style={{ margin: "0 0 8px" }}>{connector.notes[0] ?? "Connector guidance is still being authored."}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {connector.ingest_modes.map((mode) => (
                    <span key={`${connector.provider}-${mode}`} className="ui-badge ui-badge--muted">{mode}</span>
                  ))}
                  {connector.supported_event_types.slice(0, 3).map((eventType) => (
                    <span key={`${connector.provider}-${eventType}`} className="ui-badge ui-badge--muted">{eventType}</span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="small-text" style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)", gridColumn: "1 / -1" }}>No connector posture published yet.</p>
          )}
        </div>
      </section>
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
