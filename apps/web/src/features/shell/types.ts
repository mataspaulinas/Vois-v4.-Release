export type VenueSubview = "overview" | "assessment" | "signals" | "plan" | "report" | "history" | "console";

export type ReferenceView = "blocks" | "tools" | "signals";

export type ManagerView = "today" | "workspace" | "plan" | "evidence" | "team" | "escalations" | "copilot";

export type PocketView = "shift" | "standards" | "help" | "report" | "log";

export type OwnerView = "command" | "delegations" | "people" | "copilot";

export type TopLevelView = "portfolio" | "venue" | "reference" | "kb" | "settings" | "manager" | "pocket" | "owner";

export type ThemeMode = "light" | "dark";

export type SkinId = "ocean" | "forest" | "ember" | "midnight";

export type ShellRoute =
  | { topLevelView: "portfolio" }
  | { topLevelView: "venue"; venueId: string; venueView: VenueSubview }
  | { topLevelView: "reference"; referenceView: ReferenceView }
  | { topLevelView: "kb" }
  | { topLevelView: "settings" }
  | { topLevelView: "manager"; venueId: string; managerView: ManagerView }
  | { topLevelView: "pocket"; venueId: string; pocketView: PocketView }
  | { topLevelView: "owner"; venueId: string; ownerView: OwnerView };

export type ShellPreferences = {
  theme: ThemeMode;
  skin: SkinId;
  sidebarCollapsed: boolean;
  welcomeDismissed: boolean;
  lastRoute: ShellRoute;
};

export const DEFAULT_VENUE_VIEW: VenueSubview = "overview";

export const DEFAULT_MANAGER_VIEW: ManagerView = "today";

export const DEFAULT_POCKET_VIEW: PocketView = "shift";

export const DEFAULT_OWNER_VIEW: OwnerView = "command";

export const DEFAULT_PREFERENCES: ShellPreferences = {
  theme: "light",
  skin: "ocean",
  sidebarCollapsed: false,
  welcomeDismissed: false,
  lastRoute: { topLevelView: "portfolio" },
};
