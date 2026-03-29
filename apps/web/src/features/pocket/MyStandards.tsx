import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { StandardItem } from "../../lib/api";

type MyStandardsProps = {
  standards: StandardItem[];
  loading: boolean;
};

export function MyStandards({ standards, loading }: MyStandardsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="pocket-view">
      <SurfaceHeader title="Standards" subtitle="What good looks like. Tap to see steps." />
      <PrimaryCanvas>
        {loading ? (
          <LoadingState variant="list" />
        ) : standards.length === 0 ? (
          <EmptyState title="No standards loaded" description="Your manager will set these up." />
        ) : (
          <div className="pocket-task-list">
            {standards.map((item, i) => (
              <div
                key={item.block_id}
                className="pocket-task-card"
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 500 }}>{item.title}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "var(--text-small)" }}>{expandedIndex === i ? "−" : "+"}</span>
                </div>

                {expandedIndex === i && (
                  <div style={{ marginTop: "var(--spacing-sm)" }}>
                    {item.rationale && (
                      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-small)", lineHeight: "var(--lh-normal)", marginBottom: "var(--spacing-sm)" }}>
                        {item.rationale}
                      </p>
                    )}

                    {item.sub_actions.length > 0 && (
                      <div style={{ marginBottom: "var(--spacing-sm)" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "var(--spacing-xs)" }}>Steps</p>
                        {item.sub_actions.map((sa, j) => (
                          <div key={j} style={{ display: "flex", gap: "var(--spacing-xs)", padding: "2px 0", fontSize: "var(--text-small)" }}>
                            <span style={{ color: "var(--color-text-muted)", width: 16, flexShrink: 0 }}>{j + 1}.</span>
                            <span>{sa.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.deliverables.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "var(--spacing-xs)" }}>What to do if wrong</p>
                        {item.deliverables.map((d, j) => (
                          <div key={j} style={{ display: "flex", gap: "var(--spacing-xs)", padding: "2px 0", fontSize: "var(--text-small)", color: "var(--color-text-secondary)" }}>
                            <span>•</span><span>{d.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PrimaryCanvas>
    </div>
  );
}
