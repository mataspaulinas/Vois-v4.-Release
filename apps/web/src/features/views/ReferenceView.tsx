import { useEffect, useMemo, useState } from "react";

import { SectionCard } from "../../components/SectionCard";
import {
  OntologyAlignmentSummaryResponse,
  OntologyAuthoringBriefResponse,
  OntologyBlockRecord,
  OntologyBundleResponse,
  OntologyGovernanceSummaryResponse,
  OntologySignalRecord,
  OntologyToolRecord,
} from "../../lib/api";
import { ReferenceView as ReferenceViewId } from "../shell/types";

type ReferenceItem = {
  id: string;
  title: string;
  detail: string;
  meta: string[];
  note: string;
  related: Array<{ label: string; values: string[] }>;
};

type ReferenceViewProps = {
  view: ReferenceViewId;
  bundle: OntologyBundleResponse | null;
  alignment: OntologyAlignmentSummaryResponse | null;
  governance: OntologyGovernanceSummaryResponse | null;
  authoringBrief: OntologyAuthoringBriefResponse | null;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
};

/* ── Shared style constants ── */

const eyebrowSt: React.CSSProperties = {
  fontSize: "var(--text-eyebrow, 11px)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--color-text-muted, #A3A3A3)",
  margin: "0 0 var(--spacing-8)",
};

const cardSt: React.CSSProperties = {
  background: "var(--color-surface, #FFFFFF)",
  borderRadius: "var(--radius-md, 12px)",
  border: "1px solid var(--color-border-subtle, #E5E5E5)",
  boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
  padding: "var(--spacing-20)",
};

const cardPrimarySt: React.CSSProperties = {
  ...cardSt,
  background: "var(--color-accent-soft, rgba(108,92,231,0.08))",
  borderColor: "var(--color-accent, #6C5CE7)",
};

const h3St: React.CSSProperties = {
  fontSize: "var(--text-section, 20px)",
  fontWeight: 600,
  color: "var(--color-text-primary, #0A0A0A)",
  margin: "0 0 var(--spacing-4)",
};

const bodySt: React.CSSProperties = {
  fontSize: "var(--text-small, 13px)",
  lineHeight: "var(--lh-normal, 1.5)",
  color: "var(--color-text-secondary, #525252)",
  margin: 0,
};

const tagSt: React.CSSProperties = {
  fontSize: "var(--text-eyebrow, 11px)",
  color: "var(--color-text-muted, #A3A3A3)",
  background: "var(--color-bg-muted, #F5F5F5)",
  padding: "3px 8px",
  borderRadius: "var(--radius-full, 9999px)",
};

export function ReferenceView({
  view,
  bundle,
  alignment,
  governance,
  authoringBrief,
  loading,
  search,
  onSearchChange,
}: ReferenceViewProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!bundle) {
      return [];
    }

    const normalized = search.trim().toLowerCase();
    const base = buildItems(view, bundle);
    return base.filter((item) => {
      if (!normalized) {
        return true;
      }
      return (
        item.id.toLowerCase().includes(normalized) ||
        item.title.toLowerCase().includes(normalized) ||
        item.detail.toLowerCase().includes(normalized) ||
        item.note.toLowerCase().includes(normalized) ||
        item.meta.some((entry) => entry.toLowerCase().includes(normalized)) ||
        item.related.some((group) =>
          group.values.some((value) => value.toLowerCase().includes(normalized)) || group.label.toLowerCase().includes(normalized)
        )
      );
    });
  }, [bundle, search, view]);

  useEffect(() => {
    if (!items.length) {
      setSelectedItemId(null);
      return;
    }
    if (selectedItemId && items.some((item) => item.id === selectedItemId)) {
      return;
    }
    setSelectedItemId(items[0].id);
  }, [items, selectedItemId]);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0] ?? null;
  const posture = describeReferencePosture(view, bundle, alignment, governance, authoringBrief);

  return (
    <SectionCard
      eyebrow="REFERENCE"
      title={`${labelFor(view)} library`}
      description="These are current library/reference surfaces. They are here to inform the rebuild, not to freeze the next ontology in place."
      actions={
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search ${labelFor(view).toLowerCase()}...`}
          style={{
            height: 44,
            padding: "0 var(--spacing-16)",
            fontSize: "var(--text-body, 15px)",
            fontFamily: "var(--font-sans)",
            color: "var(--color-text-primary, #0A0A0A)",
            background: "var(--color-bg-muted, #F5F5F5)",
            border: "1px solid var(--color-border-subtle, #E5E5E5)",
            borderRadius: "var(--radius-md, 12px)",
            outline: "none",
            width: 260,
            boxSizing: "border-box" as const,
          }}
        />
      }
    >
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "var(--spacing-16)",
          marginBottom: "var(--spacing-24)",
        }}
      >
        <div style={cardPrimarySt}>
          <p style={eyebrowSt}>Published bundle</p>
          <h3 style={h3St}>{bundle ? `${bundle.meta.ontology_id} ${bundle.meta.version}` : "Loading..."}</h3>
          <p style={bodySt}>This is read-only product memory while the next intervention library is authored more intentionally.</p>
        </div>
        <div style={cardSt}>
          <p style={eyebrowSt}>Filtered count</p>
          <h3 style={h3St}>{items.length}</h3>
          <p style={bodySt}>Matching {labelFor(view).toLowerCase()} visible under the current filter.</p>
        </div>
        <div style={cardSt}>
          <p style={eyebrowSt}>Live posture</p>
          <h3 style={h3St}>{posture.title}</h3>
          <p style={bodySt}>{posture.detail}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "var(--spacing-48) var(--spacing-24)", textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-body, 15px)", color: "var(--color-text-muted, #A3A3A3)" }}>
            Loading {labelFor(view).toLowerCase()} library...
          </p>
        </div>
      ) : (
        <>
          {/* Posture metrics */}
          {posture.metrics.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(posture.metrics.length, 3)}, 1fr)`,
                gap: "var(--spacing-16)",
                marginBottom: "var(--spacing-24)",
              }}
            >
              {posture.metrics.map((metric) => (
                <div style={cardSt} key={metric.label}>
                  <p style={eyebrowSt}>{metric.label}</p>
                  <h3 style={h3St}>{metric.value}</h3>
                  <p style={bodySt}>{metric.note}</p>
                </div>
              ))}
            </div>
          )}

          {/* Library layout: grid + detail */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: "var(--spacing-24)",
              alignItems: "start",
            }}
          >
            {/* Item grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--spacing-16)",
              }}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  style={{
                    ...cardSt,
                    textAlign: "left" as const,
                    cursor: "pointer",
                    outline: selectedItem?.id === item.id ? "2px solid var(--color-accent, #6C5CE7)" : "none",
                    outlineOffset: -2,
                    transition: "box-shadow var(--motion-fast) var(--easing-standard)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                    <span style={{ fontSize: "var(--text-eyebrow, 11px)", fontWeight: 500, color: "var(--color-text-muted, #A3A3A3)", fontFamily: "var(--font-mono)" }}>
                      {item.id}
                    </span>
                    <span style={{ fontSize: "var(--text-eyebrow, 11px)", textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--color-text-muted, #A3A3A3)" }}>
                      Reference
                    </span>
                  </div>
                  <h3 style={{ fontSize: "var(--text-card, 16px)", fontWeight: 600, color: "var(--color-text-primary, #0A0A0A)", margin: "0 0 var(--spacing-8)", lineHeight: "var(--lh-tight, 1.15)" }}>
                    {item.title}
                  </h3>
                  <p style={{ ...bodySt, marginBottom: "var(--spacing-12)" }}>{item.detail}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-4)" }}>
                    {item.meta.slice(0, 5).map((entry) => (
                      <span key={`${item.id}-${entry}`} style={tagSt}>{entry}</span>
                    ))}
                  </div>
                </button>
              ))}
              {!items.length ? (
                <div style={{ gridColumn: "1 / -1", padding: "var(--spacing-32) var(--spacing-24)", textAlign: "center" }}>
                  <p style={{ fontSize: "var(--text-body, 15px)", color: "var(--color-text-muted, #A3A3A3)" }}>
                    No matching {labelFor(view).toLowerCase()} found.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Detail aside */}
            <aside
              style={{
                ...cardSt,
                position: "sticky" as const,
                top: "var(--spacing-24)",
                maxHeight: "calc(100vh - 120px)",
                overflowY: "auto" as const,
              }}
            >
              {selectedItem ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                    <span style={{ fontSize: "var(--text-eyebrow, 11px)", fontWeight: 500, color: "var(--color-text-muted, #A3A3A3)", fontFamily: "var(--font-mono)" }}>
                      {selectedItem.id}
                    </span>
                    <span style={{ fontSize: "var(--text-eyebrow, 11px)", textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--color-accent, #6C5CE7)" }}>
                      Pinned detail
                    </span>
                  </div>
                  <h3 style={{ fontSize: "var(--text-section, 20px)", fontWeight: 600, color: "var(--color-text-primary, #0A0A0A)", margin: "0 0 var(--spacing-8)" }}>
                    {selectedItem.title}
                  </h3>
                  <p style={{ fontSize: "var(--text-small, 13px)", lineHeight: "var(--lh-loose, 1.6)", color: "var(--color-text-secondary, #525252)", margin: "0 0 var(--spacing-8)" }}>
                    {selectedItem.detail}
                  </p>
                  <p style={{ fontSize: "var(--text-body, 15px)", lineHeight: "var(--lh-loose, 1.6)", color: "var(--color-text-primary, #0A0A0A)", margin: "0 0 var(--spacing-16)", maxWidth: 720 }}>
                    {selectedItem.note}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-4)", marginBottom: "var(--spacing-16)" }}>
                    {selectedItem.meta.map((entry) => (
                      <span key={`${selectedItem.id}-meta-${entry}`} style={tagSt}>{entry}</span>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-12)" }}>
                    {selectedItem.related.map((group) => (
                      <div
                        key={`${selectedItem.id}-${group.label}`}
                        style={{
                          padding: "var(--spacing-12) var(--spacing-16)",
                          background: "var(--color-bg-muted, #F5F5F5)",
                          borderRadius: "var(--radius-sm, 8px)",
                        }}
                      >
                        <p style={{ ...eyebrowSt, marginBottom: "var(--spacing-8)" }}>{group.label}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-4)" }}>
                          {group.values.length
                            ? group.values.map((value) => <span key={value} style={tagSt}>{value}</span>)
                            : <span style={{ fontSize: "var(--text-small, 13px)", color: "var(--color-text-muted, #A3A3A3)" }}>None linked yet</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "var(--spacing-24)", textAlign: "center" }}>
                  <p style={{ fontSize: "var(--text-small, 13px)", color: "var(--color-text-muted, #A3A3A3)" }}>
                    Select a reference item to inspect its linked relationships.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function buildItems(view: ReferenceViewId, bundle: OntologyBundleResponse): ReferenceItem[] {
  if (view === "signals") {
    return bundle.signals.map((item) => buildSignalItem(item, bundle));
  }
  if (view === "blocks") {
    return bundle.blocks.map((item) => buildBlockItem(item, bundle));
  }
  return bundle.tools.map((item) => buildToolItem(item, bundle));
}

function buildSignalItem(item: OntologySignalRecord, bundle: OntologyBundleResponse): ReferenceItem {
  const failureModeMap = new Map(bundle.failure_modes.map((failureMode) => [failureMode.id, failureMode.name]));
  const mappedFailures = bundle.signal_failure_map
    .filter((mapping) => mapping.signal_id === item.id)
    .sort((left, right) => right.weight - left.weight)
    .map((mapping) => `${failureModeMap.get(mapping.failure_mode_id) ?? mapping.failure_mode_id} (${mapping.weight})`);

  return {
    id: item.id,
    title: item.name,
    detail: item.description,
    meta: [item.domain, item.module, item.indicator_type, ...(item.evidence_types.length ? item.evidence_types : ["evidence pending"])],
    note: "Signals are evidence objects. Their value comes from what they activate downstream, not from how nicely they are named.",
    related: [
      { label: "Likely failure modes", values: mappedFailures },
      { label: "Co-signals", values: item.likely_co_signals },
      { label: "Adapter aliases", values: item.adapter_aliases },
      { label: "Source types", values: item.source_types },
    ],
  };
}

function buildBlockItem(item: OntologyBlockRecord, bundle: OntologyBundleResponse): ReferenceItem {
  const responsePatternMap = new Map(bundle.response_patterns.map((pattern) => [pattern.id, pattern.name]));
  const toolMap = new Map(bundle.tools.map((tool) => [tool.id, tool.name]));
  const dependencyMap = new Map(bundle.blocks.map((block) => [block.id, block.name]));

  return {
    id: item.id,
    title: item.name,
    detail: item.description,
    meta: [
      item.owner_role ?? "owner pending",
      `${item.effort_hours}h`,
      item.expected_time_to_effect_days ? `${item.expected_time_to_effect_days}d effect` : "effect pending",
      `${item.tool_ids.length} tools`,
    ],
    note: "Blocks are the intervention layer. They should read like a specific operating reset, not a vague improvement wish.",
    related: [
      {
        label: "Response patterns",
        values: item.response_pattern_ids.map((patternId) => responsePatternMap.get(patternId) ?? patternId),
      },
      {
        label: "Linked tools",
        values: item.tool_ids.map((toolId) => toolMap.get(toolId) ?? toolId),
      },
      {
        label: "Dependencies",
        values: item.dependencies.map((blockId) => dependencyMap.get(blockId) ?? blockId),
      },
      {
        label: "Proof of completion",
        values: item.proof_of_completion,
      },
    ],
  };
}

function buildToolItem(item: OntologyToolRecord, bundle: OntologyBundleResponse): ReferenceItem {
  const blockMap = new Map(bundle.blocks.map((block) => [block.id, block.name]));

  return {
    id: item.id,
    title: item.name,
    detail: item.description,
    meta: [
      item.category,
      item.format ?? "format pending",
      item.usage_moment ?? "moment pending",
      item.expected_output ?? "output pending",
    ],
    note: "Tools are execution assets. They become valuable only when they are tied to a block, a moment, and a concrete output.",
    related: [
      {
        label: "Linked blocks",
        values: item.block_ids.map((blockId) => blockMap.get(blockId) ?? blockId),
      },
      {
        label: "Adaptation variables",
        values: item.adaptation_variables,
      },
      {
        label: "Usage moment",
        values: item.usage_moment ? [item.usage_moment] : [],
      },
      {
        label: "Expected output",
        values: item.expected_output ? [item.expected_output] : [],
      },
    ],
  };
}

function labelFor(view: ReferenceViewId) {
  switch (view) {
    case "blocks":
      return "Blocks";
    case "tools":
      return "Tools";
    case "signals":
      return "Signals";
  }
}

function describeReferencePosture(
  view: ReferenceViewId,
  bundle: OntologyBundleResponse | null,
  alignment: OntologyAlignmentSummaryResponse | null,
  governance: OntologyGovernanceSummaryResponse | null,
  authoringBrief: OntologyAuthoringBriefResponse | null
) {
  if (!bundle || !alignment || !governance || !authoringBrief) {
    return {
      title: "Loading...",
      detail: "Reference posture is loading from the live ontology APIs.",
      metrics: [] as Array<{ label: string; value: string; note: string }>,
    };
  }

  if (view === "signals") {
    const unclassifiedCount =
      alignment.unclassified_signal_ids.length +
      alignment.unclassified_failure_mode_ids.length +
      alignment.unclassified_response_pattern_ids.length;
    return {
      title: unclassifiedCount ? `${unclassifiedCount} gaps` : "Fully classified",
      detail: "Signals are useful only if they stay aligned to universal modules and failure logic.",
      metrics: [
        {
          label: "Signal count",
          value: String(bundle.signals.length),
          note: "Published signal objects in the current adapter bundle.",
        },
        {
          label: "Module spread",
          value: String(Object.keys(alignment.service_module_counts).length),
          note: "Universal modules touched by the current signal layer.",
        },
        {
          label: "Unclassified",
          value: String(unclassifiedCount),
          note: "Signals or downstream entities not yet aligned to the core canon.",
        },
      ],
    };
  }

  if (view === "blocks") {
    const blockGapCount = Object.values(governance.block_contract_gaps).reduce(
      (total, entries) => total + entries.length,
      0
    );
    return {
      title: blockGapCount ? `${blockGapCount} contract gaps` : "Contract clean",
      detail: "Blocks are the real product. Their owner, entry conditions, proof, and sequencing must stay explicit.",
      metrics: [
        {
          label: "Block count",
          value: String(bundle.blocks.length),
          note: "Published intervention blocks in the current adapter bundle.",
        },
        {
          label: "Coverage",
          value: `${authoringBrief.failure_family_coverage.filter((item) => item.is_covered).length}/${authoringBrief.failure_family_coverage.length}`,
          note: "Failure families represented by the current block layer.",
        },
        {
          label: "Contract gaps",
          value: String(blockGapCount),
          note: "Missing owner, entry, proof, timing, or mapping fields in the published bundle.",
        },
      ],
    };
  }

  const toolGapCount = Object.values(governance.tool_contract_gaps).reduce(
    (total, entries) => total + entries.length,
    0
  );
  return {
    title: toolGapCount ? `${toolGapCount} contract gaps` : "Linked and ready",
    detail: "Tools are only useful when they are attached to a block job, moment, and expected output.",
    metrics: [
      {
        label: "Tool count",
        value: String(bundle.tools.length),
        note: "Published tool assets in the current adapter bundle.",
      },
      {
        label: "Response spread",
        value: `${authoringBrief.response_logic_coverage.filter((item) => item.is_covered).length}/${authoringBrief.response_logic_coverage.length}`,
        note: "Response logics represented in the current intervention system.",
      },
      {
        label: "Contract gaps",
        value: String(toolGapCount),
        note: "Missing format, usage moment, expected output, or block links in the published bundle.",
      },
    ],
  };
}
