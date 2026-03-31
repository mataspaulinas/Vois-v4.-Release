import { ListRow } from "../ui";

type HistoryComparisonRowProps = {
  label: string;
  currentValue: string | number;
  previousValue?: string | number;
  trend?: "up" | "down" | "flat";
  onClick?: () => void;
};

const TREND_SYMBOL: Record<string, string> = {
  up: "\u2191",
  down: "\u2193",
  flat: "\u2192",
};

const TREND_CLASS: Record<string, string> = {
  up: "history-comparison-row__trend--up",
  down: "history-comparison-row__trend--down",
  flat: "history-comparison-row__trend--flat",
};

export function HistoryComparisonRow({
  label,
  currentValue,
  previousValue,
  trend,
  onClick,
}: HistoryComparisonRowProps) {
  return (
    <ListRow
      className={`history-comparison-row${onClick ? " history-comparison-row--clickable" : ""}`}
      onClick={onClick}
      left={<span className="history-comparison-row__label">{label}</span>}
      right={
        <div className="history-comparison-row__values">
          <span className="history-comparison-row__current">{currentValue}</span>
          {previousValue !== undefined && (
            <span className="history-comparison-row__previous">{previousValue}</span>
          )}
          {trend && (
            <span className={`history-comparison-row__trend ${TREND_CLASS[trend]}`}>
              {TREND_SYMBOL[trend]}
            </span>
          )}
        </div>
      }
    />
  );
}
