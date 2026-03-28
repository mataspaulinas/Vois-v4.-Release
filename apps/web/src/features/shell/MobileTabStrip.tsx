import { VenueSubview } from "./types";

type MobileTabStripProps = {
  visible: boolean;
  activeView: VenueSubview;
  onSelectView: (view: VenueSubview) => void;
};

const mobileViews: VenueSubview[] = ["overview", "assessment", "plan", "report"];

export function MobileTabStrip({ visible, activeView, onSelectView }: MobileTabStripProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="mobile-tab-strip">
      {mobileViews.map((view) => (
        <button
          key={view}
          className={`mobile-tab ${activeView === view ? "active" : ""}`}
          onClick={() => onSelectView(view)}
        >
          {view === "assessment" ? "Intake" : titleCase(view)}
        </button>
      ))}
    </div>
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
