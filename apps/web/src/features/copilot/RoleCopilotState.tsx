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
      title={`${roleLabel} copilot`}
      description={
        venueName
          ? `Use VOIS from the persisted ${venueName} thread context instead of relying on synthetic advisor copy.`
          : "Use VOIS from the persisted workspace thread context instead of relying on synthetic advisor copy."
      }
    >
      <div className="focus-card">
        <p className="section-eyebrow">Copilot status</p>
        <h3>{unavailableMessage ? "Unavailable" : "Ready to open"}</h3>
        <p>
          {unavailableMessage ??
            "Open the live VOIS thread drawer to work against real portfolio or venue context, persisted history, and the mounted ontology."}
        </p>
        <div className="sample-actions">
          <button className="btn btn-primary" onClick={onOpenCopilot}>
            Open VOIS
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
