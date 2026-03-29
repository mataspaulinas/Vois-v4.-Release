import { PropsWithChildren, ReactNode } from "react";

type ContextInspectorProps = PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose?: () => void;
  width?: number;
  footer?: ReactNode;
}>;

export function ContextInspector({ open, title, onClose, width = 320, footer, children }: ContextInspectorProps) {
  if (!open) return null;

  return (
    <>
      <div className="context-inspector__backdrop" onClick={onClose} />
      <aside className="context-inspector" style={{ width }}>
        {(title || onClose) && (
          <div className="context-inspector__header">
            {title && <h3 className="context-inspector__title">{title}</h3>}
            {onClose && (
              <button className="context-inspector__close" onClick={onClose} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
        )}
        <div className="context-inspector__body">{children}</div>
        {footer && <div className="context-inspector__footer">{footer}</div>}
      </aside>
    </>
  );
}

/** A labeled section within the inspector body. */
export function InspectorSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="context-inspector__section">
      <h4 className="context-inspector__section-label">{label}</h4>
      {children}
    </div>
  );
}
