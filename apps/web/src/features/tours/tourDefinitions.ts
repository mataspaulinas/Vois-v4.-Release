import { TourDef } from "./useTour";

export const ownerTour: TourDef = {
  id: "owner-first-run",
  steps: [
    {
      id: "welcome",
      title: "Welcome to VOIS",
      body: "You are signed in as an Owner. Start by creating your organization and first venue from the setup screen.",
    },
    {
      id: "portfolio",
      title: "Portfolio overview",
      body: "The Portfolio view shows all your venues at a glance. Use attention filters and venue cards to triage where to focus.",
    },
    {
      id: "intelligence",
      title: "Signal intelligence",
      body: "The Intelligence view shows signal patterns, domain distribution, and causal chains across your portfolio.",
    },
  ],
};

export const managerTour: TourDef = {
  id: "manager-first-assessment",
  steps: [
    {
      id: "overview",
      title: "Venue workspace",
      body: "This is your operational workspace. The tabs follow the diagnosis-to-execution sequence.",
    },
    {
      id: "assessment",
      title: "Assessment",
      body: "Start by pasting operational evidence. The intake quality bar shows when you have enough detail for good signal detection.",
    },
    {
      id: "ai-intake",
      title: "AI intake",
      body: "Click 'Run AI intake' to detect signals from your evidence. The machine proposes — you review.",
    },
    {
      id: "signals-review",
      title: "Signals review",
      body: "Use the dedicated Signals Review page to confirm or reject each signal. See downstream impact before committing.",
    },
    {
      id: "plan",
      title: "Plan execution",
      body: "After saving the assessment and running the engine, the plan view shows dependency-ordered tasks ready for execution.",
    },
  ],
};

export const pocketTour: TourDef = {
  id: "pocket-first-shift",
  steps: [
    {
      id: "shift",
      title: "My Shift",
      body: "This is your shift view. You will see your current tasks and shift context here.",
    },
    {
      id: "standards",
      title: "Standards",
      body: "Look up operational standards and procedures for your venue here.",
    },
    {
      id: "help",
      title: "Get help",
      body: "Submit a help request if you are stuck or need guidance. It routes to your manager.",
    },
  ],
};

export function tourForRole(role: string | null): TourDef | null {
  if (role === "owner") return ownerTour;
  if (role === "manager") return managerTour;
  if (role === "barista") return pocketTour;
  return null;
}
