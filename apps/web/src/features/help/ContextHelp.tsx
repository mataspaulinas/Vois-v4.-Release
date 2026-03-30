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
        onClick={() => setOpen(!open)}
        aria-label="Help for this page"
        title={`Help: ${help.title}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#FFFFFF",
          color: "#6C5CE7",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 180ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          minWidth: 44,
          minHeight: 44,
        }}
      >
        ?
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99,
            }}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxWidth: "90vw",
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)",
            zIndex: 100,
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
                {help.title}
              </h4>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#999",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 6,
                  minWidth: 32,
                  minHeight: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Close
              </button>
            </div>
            {/* Content */}
            <ul style={{
              margin: 0,
              padding: "12px 16px 12px 32px",
              listStyle: "disc",
            }}>
              {help.bullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13,
                    color: "#555",
                    lineHeight: 1.5,
                    marginBottom: 6,
                  }}
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
