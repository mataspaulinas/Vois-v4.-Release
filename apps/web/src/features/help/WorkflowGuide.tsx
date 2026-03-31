import { useState } from "react";
import { WORKFLOWS, WorkflowDef } from "./workflowDefinitions";
import { SectionCard } from "../../components/SectionCard";

export function WorkflowGuide() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = WORKFLOWS.find((w) => w.id === selectedId) ?? null;

  return (
    <div>
      {!selected ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {WORKFLOWS.map((wf) => (
            <div
              key={wf.id}
              onClick={() => setSelectedId(wf.id)}
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "var(--color-surface)",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 180ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(108,92,231,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(108,92,231,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
              }}
            >
              <h4 style={{
                margin: "0 0 6px 0",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}>
                {wf.title}
              </h4>
              <p style={{
                margin: 0,
                fontSize: 13,
                color: "var(--color-text-muted)",
                lineHeight: 1.4,
              }}>
                {wf.description}
              </p>
              <span style={{
                fontSize: 11,
                color: "var(--color-accent)",
                fontWeight: 600,
                marginTop: 8,
                display: "inline-block",
              }}>
                {wf.steps.length} steps
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedId(null)}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-muted)",
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 16,
              transition: "all 180ms ease",
              minHeight: 36,
            }}
          >
            Back to workflows
          </button>
          <SectionCard eyebrow="Workflow" title={selected.title} description={selected.description}>
            <ol style={{ margin: 0, paddingLeft: 24 }}>
              {selected.steps.map((step, i) => (
                <li key={i} style={{ marginBottom: 16 }}>
                  <strong style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}>
                    {step.title}
                  </strong>
                  <p style={{
                    margin: "4px 0 0 0",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                  }}>
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
