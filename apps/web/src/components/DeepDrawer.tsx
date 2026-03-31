import { PropsWithChildren, ReactNode } from "react";
import Icon from "./Icon";

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
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="deep-drawer__body">{children}</div>
      </div>
    </>
  );
}
