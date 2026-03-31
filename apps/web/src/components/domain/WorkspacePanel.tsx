type WorkspacePanelProps = {
  main: React.ReactNode;
  side?: React.ReactNode;
  sideWidth?: number;
  children?: never;
};

export function WorkspacePanel({ main, side, sideWidth = 320 }: WorkspacePanelProps) {
  return (
    <div
      className="workspace-panel"
      style={side ? { gridTemplateColumns: `1fr ${sideWidth}px` } : undefined}
    >
      <div className="workspace-panel__main">{main}</div>
      {side && <aside className="workspace-panel__side">{side}</aside>}
    </div>
  );
}
