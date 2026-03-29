import { useState } from "react";
import { helpForSurface } from "./helpRegistry";

type ContextHelpProps = {
  surface: string;
};

export function ContextHelp({ surface }: ContextHelpProps) {
  const [open, setOpen] = useState(false);
  const help = helpForSurface(surface);

  if (!help) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        className="context-help-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Help for this page"
        title={`Help: ${help.title}`}
      >
        ?
      </button>
      {open && (
        <>
          <div className="context-help-backdrop" onClick={() => setOpen(false)} />
          <div className="context-help-panel">
            <div className="context-help-header">
              <h4>{help.title}</h4>
              <button className="context-help-close" onClick={() => setOpen(false)}>x</button>
            </div>
            <ul className="context-help-list">
              {help.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
