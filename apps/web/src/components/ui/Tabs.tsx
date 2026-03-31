import type { ReactNode } from "react";

type Tab = { id: string; label: ReactNode };

type TabsProps = {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
  children?: ReactNode;
  className?: string;
};

export function Tabs({ tabs, activeId, onChange, children, className }: TabsProps) {
  return (
    <div className={`ui-tabs ${className ?? ""}`}>
      <div className="ui-tab-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeId}
            className={`ui-tab ${tab.id === activeId ? "ui-tab--active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children && <div className="ui-tab-panel" role="tabpanel">{children}</div>}
    </div>
  );
}
