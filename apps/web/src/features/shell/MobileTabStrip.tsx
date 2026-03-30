import { VenueSubview } from "./types";

type MobileTabStripProps = {
  visible: boolean;
  activeView: VenueSubview;
  onSelectView: (view: VenueSubview) => void;
};

const mobileViews: VenueSubview[] = ["overview", "assessment", "signals", "plan", "report"];

const viewIcons: Record<string, string> = {
  overview: "OV",
  assessment: "IN",
  signals: "RE",
  plan: "PL",
  report: "RP",
};

export function MobileTabStrip({ visible, activeView, onSelectView }: MobileTabStripProps) {
  if (!visible) {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: "#FFFFFF",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "stretch",
      justifyContent: "space-around",
      zIndex: 50,
      boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
    }}>
      {mobileViews.map((view) => {
        const isActive = activeView === view;
        const label = view === "assessment" ? "Intake" : view === "signals" ? "Review" : titleCase(view);
        return (
          <button
            key={view}
            onClick={() => onSelectView(view)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              position: "relative",
              minWidth: 48,
              minHeight: 48,
              padding: "6px 4px",
              transition: "color 180ms ease",
              color: isActive ? "#6C5CE7" : "#999",
            }}
          >
            {/* Top indicator bar */}
            {isActive && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "20%",
                right: "20%",
                height: 3,
                borderRadius: "0 0 3px 3px",
                background: "#6C5CE7",
              }} />
            )}
            {/* Icon placeholder */}
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.5px",
              lineHeight: 1,
            }}>
              {viewIcons[view] ?? ""}
            </span>
            {/* Label */}
            <span style={{
              fontSize: 11,
              fontWeight: isActive ? 600 : 400,
              lineHeight: 1,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
