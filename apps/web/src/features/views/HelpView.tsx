import { useMemo } from "react";
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
    body: "The assessment flow follows five stages: Observe (capture raw evidence), Infer (AI detects signals from evidence), Review (confirm or reject machine interpretation), Save (persist the reviewed assessment), Run (generate the diagnosis and draft plan). The intake quality bar shows whether your evidence is rich enough for meaningful signal detection. After AI intake, move to Signal Review for detailed inspection before saving.",
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
    body: "AI in VOIS assists with signal detection, report enhancement, file understanding, and thread-based copilot work. However, AI is never the authority — it proposes, humans review and confirm. Signal suggestions from copilot require explicit application. Report narratives are grounded with references. Copilot cannot silently mutate plan truth, task state, or assessment signals. When live AI is unavailable, real roles see an explicit unavailable state rather than degraded mock behavior.",
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

export function HelpView() {
  const allArticles = useMemo(() => [...productHelpArticles, ...guidanceArticles], []);

  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 32 }}>
      <section className="ui-card" style={{ padding: "32px 32px 28px" }}>
        <p className="eyebrow">HELP</p>
        <h1 className="page-title">Help & Guidance</h1>
        <p className="small-text" style={{ marginTop: 8, maxWidth: 720 }}>
          Product walkthroughs, platform doctrine, and terminology reference. Start here if you are
          new to VOIS or need a refresher on how the system works.
        </p>
      </section>

      <ReadingEngine articles={allArticles} />

      <Glossary />
    </div>
  );
}
