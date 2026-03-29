import { useState } from "react";
import { WORKFLOWS, WorkflowDef } from "./workflowDefinitions";
import { SectionCard } from "../../components/SectionCard";

export function WorkflowGuide() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = WORKFLOWS.find((w) => w.id === selectedId) ?? null;

  return (
    <div>
      {!selected ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--spacing-md)" }}>
          {WORKFLOWS.map((wf) => (
            <div
              key={wf.id}
              className="clickable-row"
              onClick={() => setSelectedId(wf.id)}
              style={{
                padding: "var(--spacing-md)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
            >
              <h4 style={{ margin: "0 0 var(--spacing-xs) 0" }}>{wf.title}</h4>
              <p style={{ margin: 0, fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>{wf.description}</p>
              <span style={{ fontSize: "var(--text-small)", color: "var(--color-accent)", marginTop: "var(--spacing-xs)", display: "inline-block" }}>
                {wf.steps.length} steps
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedId(null)} style={{ marginBottom: "var(--spacing-md)" }}>
            Back to workflows
          </button>
          <SectionCard eyebrow="Workflow" title={selected.title} description={selected.description}>
            <ol style={{ margin: 0, paddingLeft: "var(--spacing-lg)" }}>
              {selected.steps.map((step, i) => (
                <li key={i} style={{ marginBottom: "var(--spacing-md)" }}>
                  <strong>{step.title}</strong>
                  <p style={{ margin: "var(--spacing-4) 0 0 0", fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
