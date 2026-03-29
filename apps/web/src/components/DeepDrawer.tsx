import { PropsWithChildren, ReactNode } from "react";

type DeepDrawerProps = PropsWithChildren<{
  open: boolean;
  title?: string;
  tabs?: { label: string; active: boolean; onClick: () => void }[];
  onClose: () => void;
  height?: string;
}>;

export function DeepDrawer({ open, title, tabs, onClose, height = "40vh", children }: DeepDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="deep-drawer__backdrop" onClick={onClose} />
      <div className="deep-drawer" style={{ height }}>
        <div className="deep-drawer__header">
          <div className="deep-drawer__drag-handle" />
          <div className="deep-drawer__header-content">
            {title && <h3 className="deep-drawer__title">{title}</h3>}
            {tabs && tabs.length > 0 && (
              <div className="deep-drawer__tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    className={`deep-drawer__tab ${tab.active ? "deep-drawer__tab--active" : ""}`}
                    onClick={tab.onClick}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="deep-drawer__close" onClick={onClose} aria-label="Close drawer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="deep-drawer__body">{children}</div>
      </div>
    </>
  );
}
