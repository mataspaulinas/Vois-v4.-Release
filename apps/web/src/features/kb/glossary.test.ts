import { describe, expect, it } from "vitest";

// Test glossary term data integrity
const GLOSSARY_TERMS = [
  { term: "Assessment", category: "workflow" },
  { term: "Signal", category: "ontology" },
  { term: "Failure Mode", category: "ontology" },
  { term: "Response Pattern", category: "ontology" },
  { term: "Block", category: "ontology" },
  { term: "Ontology Pack", category: "ontology" },
  { term: "Ontology Mount", category: "core" },
  { term: "Venue", category: "core" },
  { term: "Active Plan", category: "workflow" },
  { term: "Draft Plan", category: "workflow" },
  { term: "Engine Run", category: "workflow" },
  { term: "Copilot", category: "ai" },
  { term: "Owner", category: "role" },
  { term: "Manager", category: "role" },
  { term: "Barista", category: "role" },
  { term: "Developer", category: "role" },
  { term: "Signals Review", category: "workflow" },
  { term: "Core Canon", category: "core" },
  { term: "Historical Ontology Identity", category: "core" },
  { term: "Venue Ontology Binding", category: "core" },
];

describe("glossary terms", () => {
  it("has at least 20 terms", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(20);
  });

  it("has no duplicate terms", () => {
    const names = GLOSSARY_TERMS.map((t) => t.term);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers all required categories", () => {
    const categories = new Set(GLOSSARY_TERMS.map((t) => t.category));
    expect(categories).toContain("core");
    expect(categories).toContain("workflow");
    expect(categories).toContain("ontology");
    expect(categories).toContain("role");
    expect(categories).toContain("ai");
  });

  it("has no empty term names", () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.term.trim().length).toBeGreaterThan(0);
    }
  });
});
