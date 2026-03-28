import { useMemo, useState } from "react";
import { SectionCard } from "../../components/SectionCard";

type GlossaryTerm = {
  term: string;
  definition: string;
  category: "core" | "workflow" | "ontology" | "role" | "ai";
};

const GLOSSARY_TERMS: GlossaryTerm[] = [
  { term: "Assessment", definition: "A persisted operational observation snapshot. Contains evidence, selected signals, and signal states for a specific venue at a specific time.", category: "workflow" },
  { term: "Signal", definition: "An evidence object detected from operational input. Signals represent observed conditions that the ontology recognizes as meaningful.", category: "ontology" },
  { term: "Failure Mode", definition: "A systemic breakdown pattern activated when certain signals are present. Failure modes describe what is going wrong at a structural level.", category: "ontology" },
  { term: "Response Pattern", definition: "A correction logic activated by failure modes. Response patterns prescribe how the operation should respond to the identified breakdowns.", category: "ontology" },
  { term: "Block", definition: "An atomic intervention unit. Blocks are the executable actions that response patterns prescribe. They have effort hours, dependencies, deliverables, and tools.", category: "ontology" },
  { term: "Ontology Pack", definition: "A mountable domain package that provides industry-specific signals, failure modes, response patterns, blocks, tools, and standards.", category: "ontology" },
  { term: "Ontology Mount", definition: "A resolved runtime instance of an ontology pack bound to a venue. It tells the system what domain vocabulary is active.", category: "core" },
  { term: "Venue", definition: "An operational site or location bound to an organization. Each venue binds to one ontology pack and runs its own assessment/plan cycles.", category: "core" },
  { term: "Active Plan", definition: "The sole execution truth for a venue. Only the active plan can be mutated. Draft plans exist for review only until explicitly activated.", category: "workflow" },
  { term: "Draft Plan", definition: "A generated plan awaiting review. Cannot be executed or mutated. Becomes active only through explicit activation.", category: "workflow" },
  { term: "Engine Run", definition: "A diagnostic execution that processes an assessment's signals through the ontology to produce failure modes, response patterns, a plan, and a report.", category: "workflow" },
  { term: "Copilot", definition: "The operational conversation surface. Copilot threads are persisted and venue-aware. AI proposes, humans review — copilot never silently mutates truth.", category: "ai" },
  { term: "Owner", definition: "The portfolio-level role. Owns organization setup, venue creation, ontology binding, people administration, and strategic oversight.", category: "role" },
  { term: "Manager", definition: "The venue-level operational role. Owns assessment, signal review, plan execution, report review, and venue copilot.", category: "role" },
  { term: "Barista", definition: "The team member role (pocket). Owns shift tasks, standards lookup, help requests, and report/log flows.", category: "role" },
  { term: "Developer", definition: "The diagnostics role. Owns ontology workbench, mount inspection, parity tools. Only role that sees diagnostics chrome.", category: "role" },
  { term: "Signals Review", definition: "The accountability layer where machine-proposed signals are confirmed or rejected by the human operator before driving downstream diagnosis.", category: "workflow" },
  { term: "Core Canon", definition: "The shared universal semantic layer outside any individual ontology pack. Versioned independently from packs and core product code.", category: "core" },
  { term: "Historical Ontology Identity", definition: "The five required fields (ontology_id, ontology_version, core_canon_version, adapter_id, manifest_digest) preserved on every assessment, engine run, and plan.", category: "core" },
  { term: "Venue Ontology Binding", definition: "The explicit assignment of a venue to a specific ontology pack and version. The only way the system knows what domain vocabulary to use.", category: "core" },
];

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core platform",
  workflow: "Workflow",
  ontology: "Ontology",
  role: "Roles",
  ai: "AI",
};

export function Glossary() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return GLOSSARY_TERMS
      .filter((item) => {
        if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
        if (query && !item.term.toLowerCase().includes(query) && !item.definition.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [search, categoryFilter]);

  const categories = [...new Set(GLOSSARY_TERMS.map((t) => t.category))].sort();

  return (
    <SectionCard
      eyebrow="Terminology"
      title="Product glossary"
      description="Consistent definitions for the concepts used throughout VOIS. Knowing the terms reduces confusion and strengthens communication."
      actions={
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms..."
          style={{ background: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border, #e0e0e0)", borderRadius: "var(--radius-sm, 4px)", padding: "4px 12px", fontSize: "var(--text-sm, 14px)", width: 200 }}
        />
      }
    >
      <div style={{ display: "flex", gap: "var(--space-2, 8px)", marginBottom: "var(--space-4, 16px)", flexWrap: "wrap" }}>
        <button className={`status-pill ${categoryFilter === "all" ? "active" : ""}`} onClick={() => setCategoryFilter("all")}>
          All ({GLOSSARY_TERMS.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`status-pill ${categoryFilter === cat ? "active" : ""}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {CATEGORY_LABELS[cat] ?? cat} ({GLOSSARY_TERMS.filter((t) => t.category === cat).length})
          </button>
        ))}
      </div>

      <div className="thread-list">
        {filtered.map((item) => (
          <div className="history-card" key={item.term}>
            <div className="thread-row">
              <strong>{item.term}</strong>
              <em style={{ textTransform: "capitalize" }}>{CATEGORY_LABELS[item.category] ?? item.category}</em>
            </div>
            <p className="history-note">{item.definition}</p>
          </div>
        ))}
        {!filtered.length && (
          <div className="empty-state compact">
            <p>No terms match your search.</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
