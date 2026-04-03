import { SectionCard } from "../../components/SectionCard";

type RoleCopilotStateProps = {
  roleLabel: string;
  venueName?: string | null;
  unavailableMessage?: string | null;
  onOpenCopilot: () => void;
};

export function RoleCopilotState({
  roleLabel,
  venueName,
  unavailableMessage,
  onOpenCopilot,
}: RoleCopilotStateProps) {
  return (
    <SectionCard
      eyebrow="VOIS"
      title={`${roleLabel} thread workspace`}
      description={
        venueName
          ? `Open the saved thread workspace for ${venueName}.`
          : "Open the saved thread workspace for this role."
      }
    >
      <div
        style={{
          background: "var(--color-surface, #FFFFFF)",
          borderRadius: "var(--radius-md, 12px)",
          border: "1px solid var(--color-border-subtle, #E5E5E5)",
          boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
          padding: "var(--spacing-24)",
        }}
      >
        <p
          style={{
            fontSize: "var(--text-eyebrow, 11px)",
            fontWeight: "var(--weight-semibold, 600)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "var(--color-text-muted, #A3A3A3)",
            margin: "0 0 var(--spacing-8)",
          }}
        >
          Thread status
        </p>
        <h3
          style={{
            fontSize: "var(--text-section, 20px)",
            fontWeight: "var(--weight-semibold, 600)",
            color: unavailableMessage
              ? "var(--color-warning, #F59E0B)"
              : "var(--color-success, #10B981)",
            margin: "0 0 var(--spacing-8)",
          }}
        >
          {unavailableMessage ? "Unavailable" : "Available"}
        </h3>
        <p
          style={{
            fontSize: "var(--text-body, 15px)",
            lineHeight: "var(--lh-normal, 1.5)",
            color: "var(--color-text-secondary, #525252)",
            margin: "0 0 var(--spacing-20)",
          }}
        >
          {unavailableMessage ??
            "Open saved threads grounded in current workspace state, history, files, and mounted ontology context."}
        </p>
        <button
          onClick={onOpenCopilot}
          style={{
            fontSize: "var(--text-body, 15px)",
            fontWeight: "var(--weight-semibold, 600)",
            color: "var(--color-accent-foreground, #FFFFFF)",
            background: "var(--color-accent, #6C5CE7)",
            border: "none",
            borderRadius: "var(--radius-sm, 8px)",
            padding: "10px 20px",
            cursor: "pointer",
            transition: "background var(--motion-fast) var(--easing-standard)",
          }}
        >
          Open threads
        </button>
      </div>
    </SectionCard>
  );
}
