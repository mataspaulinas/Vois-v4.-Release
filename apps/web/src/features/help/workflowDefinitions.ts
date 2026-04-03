export type WorkflowStep = { title: string; description: string; surface: string };
export type WorkflowDef = { id: string; title: string; description: string; steps: WorkflowStep[] };

export const WORKFLOWS: WorkflowDef[] = [
  {
    id: "diagnose",
    title: "Diagnose a venue",
    description: "Full diagnostic cycle: intake observations, detect signals, run engine, review diagnosis.",
    steps: [
      { title: "Open the venue", description: "Navigate to the venue from the portfolio or sidebar. You'll land on the Overview.", surface: "overview" },
      { title: "Start an assessment", description: "Go to the Assessment tab. Paste your operational observations into the intake area.", surface: "assessment" },
      { title: "Run AI intake", description: "Click 'Run AI intake' to detect signals from your text. The system proposes signals — you review.", surface: "assessment" },
      { title: "Review signals", description: "Go to Signals Review. Confirm or reject each detected signal. Check downstream impact.", surface: "signals" },
      { title: "Save and run engine", description: "Save the assessment, then click 'Run engine'. This generates the diagnosis and plan.", surface: "assessment" },
      { title: "Review the diagnosis", description: "Open the Diagnosis tab to see failure modes, response patterns, and recommendations.", surface: "diagnosis" },
    ],
  },
  {
    id: "review-risk",
    title: "Review current operational risk",
    description: "Quickly assess where the venue stands without running a new assessment.",
    steps: [
      { title: "Check venue overview", description: "The overview shows execution pulse, recent progress, and the recommended next move.", surface: "overview" },
      { title: "Review active signals", description: "Go to Signals Review to see which signals are currently active and their severity.", surface: "signals" },
      { title: "Check history", description: "History shows the improvement trajectory over time. Compare current vs prior state.", surface: "history" },
    ],
  },
  {
    id: "execute-plan",
    title: "Execute the operational plan",
    description: "Work through tasks, track progress, and prove completion.",
    steps: [
      { title: "Open the plan", description: "Go to the Plan tab. Tasks are ordered by dependency and priority.", surface: "plan" },
      { title: "Enter the workspace", description: "Select a task to open its execution workspace. This is where real work happens.", surface: "workspace" },
      { title: "Work through sub-actions", description: "Check off sub-actions as you complete them. Track deliverables.", surface: "workspace" },
      { title: "Attach evidence", description: "Use 'Attach evidence' to prove task completion with photos, checklists, or documents.", surface: "evidence" },
      { title: "Set follow-ups", description: "Create follow-up checkpoints for accountability. Due dates trigger reminders.", surface: "workspace" },
      { title: "Escalate if blocked", description: "If a task cannot move honestly, escalate it. Escalations route to the owner.", surface: "escalations" },
    ],
  },
  {
    id: "prepare-report",
    title: "Prepare and export a diagnosis",
    description: "Generate, review, and share the diagnostic narrative.",
    steps: [
      { title: "Open the diagnosis", description: "Go to the Diagnosis tab after an engine run.", surface: "diagnosis" },
      { title: "Generate AI narrative", description: "Click 'AI narrative' for an enhanced prose summary (requires AI provider).", surface: "diagnosis" },
      { title: "Compare with prior", description: "Use the comparison section to see changes since the last diagnosis.", surface: "diagnosis" },
      { title: "Export", description: "Click 'Export MD' or 'Export JSON' to download the diagnosis.", surface: "diagnosis" },
    ],
  },
  {
    id: "use-libraries",
    title: "Browse operational libraries",
    description: "Explore signals, blocks, and tools from the mounted ontology.",
    steps: [
      { title: "Open Reference", description: "Navigate to Reference in the sidebar. Choose Signals, Blocks, or Tools tab.", surface: "reference" },
      { title: "Search and filter", description: "Use the search bar and filter pills to find specific items.", surface: "reference" },
      { title: "Inspect relationships", description: "Select an item to see its linked signals, blocks, and tools in the detail panel.", surface: "reference" },
      { title: "Add to plan", description: "Use 'Add to plan' on a block card to create a task in the active plan.", surface: "reference" },
    ],
  },
  {
    id: "manage-portfolio",
    title: "Manage your portfolio",
    description: "Multi-venue oversight: pressure, attention, delegation quality.",
    steps: [
      { title: "Open Portfolio", description: "The portfolio view shows all venues with health status and velocity.", surface: "portfolio" },
      { title: "Check attention items", description: "Owner Command shows the top intervention points across all venues.", surface: "command" },
      { title: "Review delegation health", description: "The delegation health score shows how well follow-through is working.", surface: "command" },
      { title: "Use intelligence map", description: "The heatmap and concentration lenses show systemic patterns across venues.", surface: "intelligence" },
    ],
  },
  {
    id: "configure-system",
    title: "Configure the system",
    description: "Set preferences, manage sessions, and review system posture.",
    steps: [
      { title: "Open Settings", description: "Navigate to Settings in the sidebar.", surface: "settings" },
      { title: "Set preferences", description: "Choose your theme, skin, and sidebar behavior.", surface: "settings" },
      { title: "Review trust posture", description: "Check security posture and session management.", surface: "settings" },
      { title: "Check ontology posture", description: "Review mounted bundle statistics and venue bindings.", surface: "settings" },
    ],
  },
];
