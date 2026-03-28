import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { StandardItem } from "../../lib/api";

type MyStandardsProps = {
  standards: StandardItem[];
  loading: boolean;
};

export function MyStandards({ standards, loading }: MyStandardsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="pocket-view">
        <SectionCard eyebrow="Standards" title="Loading...">
          <div className="empty-state"><p>Loading your procedures...</p></div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="pocket-view">
      <SectionCard
        eyebrow="Standards"
        title="My standards"
        description="What good looks like. Tap any item to see the steps."
      >
        {standards.length === 0 ? (
          <div className="empty-state">
            <p>No standards loaded yet. Your manager will set these up.</p>
          </div>
        ) : (
          <div className="pocket-task-list">
            {standards.map((item, i) => (
              <div
                key={item.block_id}
                className="pocket-task-card"
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                style={{ cursor: "pointer" }}
              >
                <div className="pocket-task-header">
                  <span className="pocket-task-title">{item.title}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {expandedIndex === i ? "−" : "+"}
                  </span>
                </div>

                {expandedIndex === i ? (
                  <div style={{ marginTop: "var(--spacing-sm)" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "var(--spacing-sm)" }}>
                      {item.rationale}
                    </p>

                    {item.sub_actions.length > 0 ? (
                      <div style={{ marginBottom: "var(--spacing-sm)" }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--spacing-xs)" }}>Steps</p>
                        {item.sub_actions.map((sa, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) 0", fontSize: "0.875rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>{j + 1}.</span>
                            <span>{sa.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {item.deliverables.length > 0 ? (
                      <div>
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "var(--spacing-xs)" }}>Deliverables</p>
                        {item.deliverables.map((d, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", padding: "var(--spacing-xs) 0", fontSize: "0.875rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>•</span>
                            <span>{d.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
