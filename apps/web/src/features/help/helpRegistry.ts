export type HelpEntry = {
  surface: string;
  title: string;
  bullets: string[];
};

export const HELP_REGISTRY: HelpEntry[] = [
  { surface: "today", title: "Today's Board", bullets: ["Auto-prioritized daily view — work the list top to bottom", "Overdue follow-ups and escalations surface first", "Ready-to-execute tasks appear below the priority list", "Click any action to drill into the workspace"] },
  { surface: "plan", title: "Operational Plan", bullets: ["Shows dependency-ordered tasks trimmed to execution capacity", "Task status reflects backend truth — not just UI state", "Expand a task to see sub-actions, deliverables, and comments", "Use 'Request review' to get owner sign-off on the plan"] },
  { surface: "workspace", title: "Task Workspace", bullets: ["Select a task from the list to open its execution chamber", "Sub-actions and deliverables track granular progress", "Use 'Set follow-up' to create accountability checkpoints", "Escalate when a task cannot move honestly at your level"] },
  { surface: "evidence", title: "Evidence Hub", bullets: ["All evidence linked to tasks lives here", "Filter by type (photo, checklist, document) or by task", "Quality scoring reflects trust hierarchy: metric > photo > document > observation", "Evidence proves work — not just records it"] },
  { surface: "escalations", title: "Escalation Channel", bullets: ["Escalations are blocked-truth governance, not complaints", "Open escalations need resolution notes before closing", "Severity levels: critical, high, medium, low", "All escalations route to the owner for intervention"] },
  { surface: "overview", title: "Venue Overview", bullets: ["Orientation surface — what is the current venue state?", "Shows execution pulse, recent progress, and recommended next move", "Use quick actions to jump to assessment, report, or plan", "The operating picture updates after each engine run"] },
  { surface: "assessment", title: "Assessment", bullets: ["Paste operational observations for AI signal detection", "The intake quality bar shows when you have enough detail", "Review and confirm each detected signal before saving", "After saving, run the engine to generate the diagnostic report"] },
  { surface: "signals", title: "Signals Review", bullets: ["Dedicated surface for confirming or rejecting detected signals", "Filter by domain, confidence level, or active status", "Expand 'Show impact' to see downstream failure modes and response patterns", "Signals are the foundation — everything downstream depends on signal quality"] },
  { surface: "report", title: "Diagnostic Report", bullets: ["Shows failure modes, response patterns, and the diagnostic spine", "Use 'Compare' to see changes from prior reports", "Export as markdown or JSON for external sharing", "The trust surface shows diagnostic confidence levels"] },
  { surface: "history", title: "Assessment Timeline", bullets: ["Every analyzed venue state becomes a reviewable record", "Click an entry to load its snapshot and compare with current", "Signal count trends show operational improvement trajectory", "Ontology identity is preserved per historical entry"] },
  { surface: "console", title: "Console", bullets: ["System transparency surface — what is the system doing?", "Platform state shows ontology binding and engine status", "Integration health tracks connected providers", "Audit trail is a chronological log of system actions"] },
  { surface: "command", title: "Command Center", bullets: ["Strategic pressure lens — where is owner intervention needed?", "Top attention items are ranked by severity across all venues", "Delegation health score shows follow-through quality", "Open a venue only when the system says intervention matters"] },
  { surface: "intelligence", title: "Signal Intelligence", bullets: ["Five analytical lenses: concentration, domains, chain, timeline, heatmap", "Heatmap shows the signals-x-venues matrix at a glance", "Causal chain traces signal → failure mode → response pattern → block", "Flag high-frequency signals as systemic for portfolio-level tracking"] },
  { surface: "portfolio", title: "Portfolio", bullets: ["Multi-venue overview showing health, velocity, and attention items", "Attention filters surface venues that need intervention", "Click a venue card to enter its workspace", "Activity feed shows recent events across all venues"] },
  { surface: "settings", title: "Settings", bullets: ["Theme and skin preferences", "Trust posture and session management", "Export, backup, and delete readiness for data governance", "Ontology posture shows mounted bundle statistics"] },
  { surface: "kb", title: "Knowledge Base", bullets: ["Operational guidance organized by domain", "Reading engine tracks your progress with bookmarks and notes", "Glossary defines all key product terms", "Workflows tab provides step-by-step operational procedures"] },
  { surface: "reference", title: "Reference Library", bullets: ["Browse signals, blocks, and tools from the mounted ontology", "Search and filter by name, domain, or category", "Select an item to inspect its linked relationships", "Use 'Add to plan' to create a task from a block"] },
  { surface: "shift", title: "My Shift", bullets: ["Your current tasks for this shift, ordered by priority", "Tap a task to see details and sub-action checklist", "Complete tasks by checking off all sub-actions", "Use the footer to ask for help or report issues"] },
];

export function helpForSurface(surface: string): HelpEntry | null {
  return HELP_REGISTRY.find((e) => e.surface === surface) ?? null;
}
