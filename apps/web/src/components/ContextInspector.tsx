import { PropsWithChildren, ReactNode } from "react";
import Icon from "./Icon";

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
                <Icon name="close" size={14} />
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
