import { useMemo } from "react";
import { PortfolioVenuePulse } from "../../lib/api";

type HeatmapAssessment = {
  venue_id: string;
  signal_names: string[];
};

type SignalHeatmapGridProps = {
  /** Flattened assessment data with venue_id and signal names */
  assessments: HeatmapAssessment[];
  venuePulses: PortfolioVenuePulse[];
  onSelectSignal: (signalId: string) => void;
};

type HeatmapCell = { signalId: string; venueId: string; count: number; maxCount: number };

const SEVERITY_COLORS = [
  "var(--color-success)",      // 0-20% frequency
  "#65a30d",                   // 20-40%
  "var(--color-warning)",      // 40-60%
  "#ea580c",                   // 60-80%
  "var(--color-danger)",       // 80-100%
];

function intensityColor(ratio: number): string {
  const idx = Math.min(Math.floor(ratio * 5), 4);
  return SEVERITY_COLORS[idx];
}

export function SignalHeatmapGrid({ assessments, venuePulses, onSelectSignal }: SignalHeatmapGridProps) {
  const { signals, venues, matrix } = useMemo(() => {
    const signalVenueCount = new Map<string, Map<string, number>>();
    const signalTotalCount = new Map<string, number>();
    const venueSet = new Set<string>();

    for (const item of assessments) {
      const venueId = item.venue_id;
      venueSet.add(venueId);
      for (const sigId of item.signal_names) {
        if (!signalVenueCount.has(sigId)) signalVenueCount.set(sigId, new Map());
        const venueMap = signalVenueCount.get(sigId)!;
        venueMap.set(venueId, (venueMap.get(venueId) ?? 0) + 1);
        signalTotalCount.set(sigId, (signalTotalCount.get(sigId) ?? 0) + 1);
      }
    }

    // Top 25 signals by total frequency
    const sortedSignals = [...signalTotalCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([id]) => id);

    const venueIds = [...venueSet];
    const maxPerVenue = Math.max(...assessments.reduce((acc, item) => {
      const vid = item.venue_id;
      acc.set(vid, (acc.get(vid) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()).values(), 1);

    // Build matrix
    const cells: HeatmapCell[] = [];
    for (const sigId of sortedSignals) {
      for (const venueId of venueIds) {
        const count = signalVenueCount.get(sigId)?.get(venueId) ?? 0;
        cells.push({ signalId: sigId, venueId, count, maxCount: maxPerVenue });
      }
    }

    return { signals: sortedSignals, venues: venueIds, matrix: cells };
  }, [assessments]);

  const venueNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const pulse of venuePulses) {
      map.set(pulse.venue_id, pulse.venue_name);
    }
    return map;
  }, [venuePulses]);

  if (!signals.length || !venues.length) {
    return <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--spacing-xl)" }}>Not enough assessment data for heatmap. Run assessments across multiple venues.</p>;
  }

  const cellSize = 28;
  const labelWidth = 180;
  const headerHeight = 80;
  const svgWidth = labelWidth + venues.length * cellSize + 20;
  const svgHeight = headerHeight + signals.length * cellSize + 10;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={svgWidth} height={svgHeight} style={{ fontFamily: "var(--font-sans)", fontSize: 11 }}>
        {/* Column headers (venue names, rotated) */}
        {venues.map((venueId, col) => (
          <text
            key={venueId}
            x={labelWidth + col * cellSize + cellSize / 2}
            y={headerHeight - 6}
            textAnchor="end"
            transform={`rotate(-45, ${labelWidth + col * cellSize + cellSize / 2}, ${headerHeight - 6})`}
            fill="var(--color-text-secondary)"
            style={{ fontSize: 10 }}
          >
            {(venueNames.get(venueId) ?? venueId).slice(0, 16)}
          </text>
        ))}

        {/* Rows */}
        {signals.map((sigId, row) => (
          <g key={sigId}>
            {/* Row label */}
            <text
              x={labelWidth - 8}
              y={headerHeight + row * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fill="var(--color-text-secondary)"
              style={{ fontSize: 10, cursor: "pointer" }}
              onClick={() => onSelectSignal(sigId)}
            >
              {sigId.replace(/_/g, " ").slice(0, 24)}
            </text>

            {/* Cells */}
            {venues.map((venueId, col) => {
              const cell = matrix.find((c) => c.signalId === sigId && c.venueId === venueId);
              const ratio = cell ? cell.count / Math.max(cell.maxCount, 1) : 0;
              return (
                <rect
                  key={`${sigId}-${venueId}`}
                  x={labelWidth + col * cellSize + 1}
                  y={headerHeight + row * cellSize + 1}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  rx={3}
                  fill={ratio > 0 ? intensityColor(ratio) : "var(--color-bg-muted)"}
                  opacity={ratio > 0 ? 0.3 + ratio * 0.7 : 0.15}
                  style={{ cursor: "pointer", transition: "opacity var(--motion-fast)" }}
                  onClick={() => onSelectSignal(sigId)}
                >
                  <title>{`${sigId} at ${venueNames.get(venueId) ?? venueId}: ${cell?.count ?? 0} occurrences`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
