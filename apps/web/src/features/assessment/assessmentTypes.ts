import type { IconName } from "../../components/Icon";

export type AssessmentTypeKey =
  | "full_diagnostic"
  | "follow_up"
  | "incident"
  | "preopening_gate"
  | "weekly_pulse";

export type TriageIntensity = "focused" | "balanced" | "thorough";

type TriageMode = "optional" | "auto-focused" | "not-applicable" | "off" | "auto-on";

export type AssessmentTypeDefinition = {
  id: AssessmentTypeKey;
  name: string;
  icon: IconName;
  tagline: string;
  when: string;
  aiFocus: string;
  defaultTriageEnabled: boolean;
  defaultTriageIntensity: TriageIntensity | null;
  triageLocked: boolean;
  triageMode: TriageMode;
  triageNote: string;
  reportStyle: string;
  tips: string[];
  placeholder: string;
};

export const DEFAULT_ASSESSMENT_TYPE: AssessmentTypeKey = "full_diagnostic";

export const ASSESSMENT_TYPE_ORDER: AssessmentTypeKey[] = [
  "full_diagnostic",
  "follow_up",
  "incident",
  "preopening_gate",
  "weekly_pulse",
];

export const ASSESSMENT_TYPE_DEFINITIONS: Record<AssessmentTypeKey, AssessmentTypeDefinition> = {
  full_diagnostic: {
    id: "full_diagnostic",
    name: "Full Diagnostic",
    icon: "search",
    tagline: "Comprehensive venue analysis",
    when: "First visit, or more than 90 days since the last assessment.",
    aiFocus:
      "The AI scans the full operating picture across service, safety, execution, team dynamics, environment, and commercial signals.",
    defaultTriageEnabled: false,
    defaultTriageIntensity: "balanced",
    triageLocked: false,
    triageMode: "optional",
    triageNote:
      "Triage is optional. Use it when you want the plan trimmed to capacity. Leave it off when you need the full diagnostic picture first.",
    reportStyle: "Top root-cause threads plus a prioritized action plan",
    tips: [
      "Walk the full venue: customer areas, prep zones, storage, and staff spaces.",
      "Capture what you see, hear, and smell instead of abstract judgments.",
      "Include customer flow, handoffs, staff behavior, and quality checks.",
      "Note concrete evidence such as temperatures, labeling, cleanliness, and organization.",
    ],
    placeholder:
      'Walk through your observations from the visit...\n\nExample: "Arrived at 9:15am during morning rush. Queue of 8 people, only 1 person on till. Barista making drinks alone with no clear handoff. Display fridge was at 7°C. Three items had no date labels. Staff seemed stressed but still warm with guests. Bathroom was clean but the soap dispenser was empty..."',
  },
  follow_up: {
    id: "follow_up",
    name: "Follow-up",
    icon: "refresh",
    tagline: "Progress check visit",
    when: "Checking progress 2–4 weeks after the last assessment or intervention cycle.",
    aiFocus:
      "The AI compares current observations against previously surfaced issues so improvement, regression, and unresolved friction stand out clearly.",
    defaultTriageEnabled: true,
    defaultTriageIntensity: "focused",
    triageLocked: false,
    triageMode: "auto-focused",
    triageNote:
      "Follow-up mode should stay focused. Improvements are acknowledged, but the plan should concentrate on what is still stuck or getting worse.",
    reportStyle: "Signal movement, improvements, stuck points, and new concerns",
    tips: [
      "Focus on the areas flagged last time and check what genuinely changed.",
      "Mention specific plan items that were actioned or ignored.",
      "Capture any new issues that appeared since the previous visit.",
      "Include staff feedback on whether changes helped in practice.",
    ],
    placeholder:
      'Focus on what changed since the last visit...\n\nExample: "Follow-up visit 3 weeks after the initial assessment. Fridge temperatures are now in range after installing a new thermometer. Date labeling improved, but two pastry items were still missing dates. Morning rush still backs up because no second till person was added. A new cleaning schedule is posted and being followed. Staff morale feels better and the head barista says support is clearer..."',
  },
  incident: {
    id: "incident",
    name: "Incident",
    icon: "warning",
    tagline: "Specific event response",
    when: "Something went wrong and you need to capture the situation while it is still fresh.",
    aiFocus:
      "The AI narrows to the operational signals most relevant to the incident and traces likely root causes instead of running a broad diagnostic.",
    defaultTriageEnabled: true,
    defaultTriageIntensity: "focused",
    triageLocked: true,
    triageMode: "not-applicable",
    triageNote:
      "Incident work is already focused. The important move is to reconstruct the cause chain and prevention logic, not widen the scope unnecessarily.",
    reportStyle: "Root-cause cascade, systemic vulnerability, and prevention protocol",
    tips: [
      "Describe exactly what happened, when it happened, and who was involved.",
      "Record the immediate response and whether it contained the issue.",
      "Note customer, staff, service, safety, or reputation impact.",
      "Say whether this feels like a one-off or part of a repeating pattern.",
    ],
    placeholder:
      'Describe what happened...\n\nExample: "A customer found a hair in their drink at 2:30pm on Tuesday. The barista on duty was a new starter in week 2. No hair covering was being worn. Two kitchen staff were also uncovered. The manager was on break. We replaced the drink and apologized, but the customer left upset and later posted a 1-star review..."',
  },
  preopening_gate: {
    id: "preopening_gate",
    name: "Pre-opening Gate",
    icon: "success",
    tagline: "Launch readiness check",
    when: "Final check before opening, reopening, or launching a new concept or major change.",
    aiFocus:
      "The AI evaluates readiness across critical operating areas like compliance, staffing, equipment, stock, and standards with a pass/fail posture.",
    defaultTriageEnabled: false,
    defaultTriageIntensity: null,
    triageLocked: true,
    triageMode: "off",
    triageNote:
      "Triage stays off for gate checks. Before opening, you need to see every blocker and warning rather than hiding anything behind capacity constraints.",
    reportStyle: "Ready / not ready verdict with blockers, warnings, and readiness score",
    tips: [
      "Check equipment is working, calibrated, and safe to use.",
      "Verify stock position, supplier readiness, and delivery coverage.",
      "Confirm the team is trained and roles are clearly assigned.",
      "Review permits, licenses, insurance, and required compliance documents.",
    ],
    placeholder:
      'Document your readiness observations...\n\nExample: "Pre-opening walkthrough for Friday soft launch. Espresso machine calibrated and grinder dialed in. Fridges are holding temperature. Menu boards are installed but one price is wrong. Four of six staff completed food safety training, two still pending. Fire exit signage is in place. Environmental health visit is scheduled for next week..."',
  },
  weekly_pulse: {
    id: "weekly_pulse",
    name: "Weekly Pulse",
    icon: "chart-line",
    tagline: "Quick status snapshot",
    when: "Regular weekly check-in to keep the operating picture current without running a full diagnostic.",
    aiFocus:
      "The AI extracts the most relevant status signals from brief notes and keeps the output lean enough for fast weekly review.",
    defaultTriageEnabled: true,
    defaultTriageIntensity: "focused",
    triageLocked: false,
    triageMode: "auto-on",
    triageNote:
      "Weekly pulse should stay light. The system should surface only the most important watch-items and actions rather than rebuilding the whole plan.",
    reportStyle: "Trend snapshot, watch list, metrics, and this week’s actions",
    tips: [
      "Capture what stood out this week instead of retelling everything.",
      "Mention complaints, incidents, wins, and staffing changes.",
      "Note absences, new starters, or pressure points in the rota.",
      "Include any useful numbers: covers, sales, waste, refunds, or wait times.",
    ],
    placeholder:
      'Quick notes from this week...\n\nExample: "Busy week, around 15% more covers than usual. One complaint about slow service on Saturday when only two people were on the floor instead of three. New barista Sarah started on Monday and is learning quickly. Pastry waste was high because too many croissants were ordered. Coffee quality felt consistent. Oat milk stock is running low..."',
  },
};

export function isAssessmentTypeKey(value: string | null | undefined): value is AssessmentTypeKey {
  return Boolean(value && value in ASSESSMENT_TYPE_DEFINITIONS);
}

export function getAssessmentTypeDefinition(value: string | null | undefined): AssessmentTypeDefinition {
  if (isAssessmentTypeKey(value)) {
    return ASSESSMENT_TYPE_DEFINITIONS[value];
  }
  return ASSESSMENT_TYPE_DEFINITIONS[DEFAULT_ASSESSMENT_TYPE];
}

export type AssessmentTriageSettings = {
  enabled: boolean;
  intensity: TriageIntensity | null;
  locked: boolean;
};

export const TRIAGE_INTENSITY_ORDER: TriageIntensity[] = ["focused", "balanced", "thorough"];

export function normalizeAssessmentTriageSettings(
  assessmentType: string | null | undefined,
  enabled?: boolean | null,
  intensity?: string | null
): AssessmentTriageSettings {
  const definition = getAssessmentTypeDefinition(assessmentType);
  if (definition.triageLocked) {
    return {
      enabled: definition.defaultTriageEnabled,
      intensity: definition.defaultTriageIntensity,
      locked: true,
    };
  }

  const normalizedEnabled = enabled ?? definition.defaultTriageEnabled;
  const normalizedIntensity = TRIAGE_INTENSITY_ORDER.includes((intensity ?? "") as TriageIntensity)
    ? (intensity as TriageIntensity)
    : definition.defaultTriageIntensity;

  return {
    enabled: normalizedEnabled,
    intensity: normalizedEnabled
      ? normalizedIntensity
      : normalizedIntensity ?? definition.defaultTriageIntensity,
    locked: false,
  };
}
