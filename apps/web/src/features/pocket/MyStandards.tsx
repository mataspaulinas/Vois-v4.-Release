import { useState } from "react";
import { SurfaceHeader } from "../../components/SurfaceHeader";
import { PrimaryCanvas } from "../../components/PrimaryCanvas";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { StandardItem } from "../../lib/api";
import Icon from "../../components/Icon";

type MyStandardsProps = {
  standards: StandardItem[];
  loading: boolean;
};

const sectionStyle: React.CSSProperties = {
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  cursor: "pointer",
  minHeight: 48,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 48,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#1a1a2e",
  lineHeight: 1.3,
};

const toggleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#6C5CE7",
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6C5CE7",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 8,
};

const rationaleStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#555",
  lineHeight: 1.5,
  marginBottom: 16,
};

const stepRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "4px 0",
  fontSize: 16,
  lineHeight: 1.4,
};

const stepNumberStyle: React.CSSProperties = {
  color: "#6C5CE7",
  fontWeight: 600,
  width: 20,
  flexShrink: 0,
};

const bulletRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "4px 0",
  fontSize: 16,
  color: "#555",
  lineHeight: 1.4,
};

const headingStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#1a1a2e",
  marginBottom: 16,
};

export function MyStandards({ standards, loading }: MyStandardsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="pocket-view">
      <SurfaceHeader title="Standards" subtitle="What good looks like. Tap to see steps." />
      <PrimaryCanvas>
        <div style={sectionStyle}>
          {loading ? (
            <LoadingState variant="list" />
          ) : standards.length === 0 ? (
            <EmptyState title="No standards loaded" description="Your manager will set these up." />
          ) : (
            <>
              <div style={headingStyle}>All Standards</div>
              {standards.map((item, i) => (
                <div
                  key={item.block_id}
                  style={cardStyle}
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                >
                  <div style={titleRowStyle}>
                    <span style={cardTitleStyle}>{item.title}</span>
                    <span style={toggleStyle}>{expandedIndex === i ? <Icon name="chevron-up" size={14} /> : <Icon name="chevron-down" size={14} />}</span>
                  </div>

                  {expandedIndex === i && (
                    <div style={{ marginTop: 16 }}>
                      {item.rationale && (
                        <p style={rationaleStyle}>
                          {item.rationale}
                        </p>
                      )}

                      {item.sub_actions.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={sectionLabelStyle}>Steps</p>
                          {item.sub_actions.map((sa, j) => (
                            <div key={j} style={stepRowStyle}>
                              <span style={stepNumberStyle}>{j + 1}.</span>
                              <span>{sa.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.deliverables.length > 0 && (
                        <div>
                          <p style={sectionLabelStyle}>What to do if wrong</p>
                          {item.deliverables.map((d, j) => (
                            <div key={j} style={bulletRowStyle}>
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", marginRight: 8, flexShrink: 0 }} />
                              <span>{d.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </PrimaryCanvas>
    </div>
  );
}
