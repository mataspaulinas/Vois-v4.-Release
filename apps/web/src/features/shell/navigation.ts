import {
  DEFAULT_MANAGER_VIEW,
  DEFAULT_OWNER_VIEW,
  DEFAULT_POCKET_VIEW,
  DEFAULT_VENUE_VIEW,
  ManagerView,
  OwnerView,
  PocketView,
  ReferenceView,
  ShellRoute,
  ShellPreferences,
  SkinId,
  ThemeMode,
  VenueSubview,
} from "./types";

export const STORAGE_KEYS = {
  theme: "ois_theme",
  skin: "ois_skin",
  sidebarCollapsed: "ois_sidebar_collapsed",
  welcomeDismissed: "ois_welcome_dismissed",
  lastRoute: "ois_last_route",
} as const;

export function buildHash(route: ShellRoute): string {
  switch (route.topLevelView) {
    case "portfolio":
      return "#/portfolio";
    case "venue":
      return `#/venue/${encodeURIComponent(route.venueId)}/${route.venueView}`;
    case "reference":
      return `#/reference/${route.referenceView}`;
    case "kb":
      return "#/kb";
    case "settings":
      return "#/settings";
    case "manager":
      return `#/manager/${encodeURIComponent(route.venueId)}/${route.managerView}`;
    case "pocket":
      return `#/pocket/${encodeURIComponent(route.venueId)}/${route.pocketView}`;
    case "owner":
      return `#/owner/${encodeURIComponent(route.venueId)}/${route.ownerView}`;
  }
}

export function parseHash(hash: string, fallbackVenueId?: string | null): ShellRoute {
  const normalized = hash.replace(/^#/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length === 0 || parts[0] === "portfolio") {
    return { topLevelView: "portfolio" };
  }

  if (parts[0] === "venue") {
    const venueId = decodeURIComponent(parts[1] ?? fallbackVenueId ?? "");
    const maybeView = parts[2] as VenueSubview | undefined;
    if (venueId) {
      return {
        topLevelView: "venue",
        venueId,
        venueView: isVenueSubview(maybeView) ? maybeView : DEFAULT_VENUE_VIEW,
      };
    }
  }

  if (parts[0] === "reference" && isReferenceView(parts[1])) {
    return { topLevelView: "reference", referenceView: parts[1] };
  }

  if (parts[0] === "kb") {
    return { topLevelView: "kb" };
  }

  if (parts[0] === "manager") {
    const venueId = decodeURIComponent(parts[1] ?? fallbackVenueId ?? "");
    const maybeView = parts[2] as ManagerView | undefined;
    if (venueId) {
      return {
        topLevelView: "manager",
        venueId,
        managerView: isManagerView(maybeView) ? maybeView : DEFAULT_MANAGER_VIEW,
      };
    }
  }

  if (parts[0] === "pocket") {
    const venueId = decodeURIComponent(parts[1] ?? fallbackVenueId ?? "");
    const maybeView = parts[2] as PocketView | undefined;
    if (venueId) {
      return {
        topLevelView: "pocket",
        venueId,
        pocketView: isPocketView(maybeView) ? maybeView : DEFAULT_POCKET_VIEW,
      };
    }
  }

  if (parts[0] === "owner") {
    const venueId = decodeURIComponent(parts[1] ?? fallbackVenueId ?? "");
    const maybeView = parts[2] as OwnerView | undefined;
    if (venueId) {
      return {
        topLevelView: "owner",
        venueId,
        ownerView: isOwnerView(maybeView) ? maybeView : DEFAULT_OWNER_VIEW,
      };
    }
  }

  if (parts[0] === "settings") {
    return { topLevelView: "settings" };
  }

  if (fallbackVenueId) {
    return { topLevelView: "venue", venueId: fallbackVenueId, venueView: DEFAULT_VENUE_VIEW };
  }

  return { topLevelView: "portfolio" };
}

export function loadShellPreferences(): Partial<ShellPreferences> {
  if (typeof window === "undefined") {
    return {};
  }

  const theme = window.localStorage.getItem(STORAGE_KEYS.theme);
  const skin = window.localStorage.getItem(STORAGE_KEYS.skin);
  const sidebarCollapsed = window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
  const welcomeDismissed = window.localStorage.getItem(STORAGE_KEYS.welcomeDismissed);
  const lastRoute = window.localStorage.getItem(STORAGE_KEYS.lastRoute);

  const preferences: Partial<ShellPreferences> = {};

  if (isThemeMode(theme)) {
    preferences.theme = theme;
  }
  if (isSkinId(skin)) {
    preferences.skin = skin;
  }
  if (sidebarCollapsed !== null) {
    preferences.sidebarCollapsed = sidebarCollapsed === "true";
  }
  if (welcomeDismissed !== null) {
    preferences.welcomeDismissed = welcomeDismissed === "true";
  }

  const parsedRoute = lastRoute ? parseRouteStorage(lastRoute) : undefined;
  if (parsedRoute) {
    preferences.lastRoute = parsedRoute;
  }

  return preferences;
}

export function persistShellPreferences(preferences: Partial<ShellPreferences>) {
  if (typeof window === "undefined") {
    return;
  }

  if (preferences.theme) {
    window.localStorage.setItem(STORAGE_KEYS.theme, preferences.theme);
  }
  if (preferences.skin) {
    window.localStorage.setItem(STORAGE_KEYS.skin, preferences.skin);
  }
  if (typeof preferences.sidebarCollapsed === "boolean") {
    window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(preferences.sidebarCollapsed));
  }
  if (typeof preferences.welcomeDismissed === "boolean") {
    window.localStorage.setItem(STORAGE_KEYS.welcomeDismissed, String(preferences.welcomeDismissed));
  }
  if (preferences.lastRoute) {
    window.localStorage.setItem(STORAGE_KEYS.lastRoute, JSON.stringify(preferences.lastRoute));
  }
}

function parseRouteStorage(value: string): ShellRoute | undefined {
  try {
    const parsed = JSON.parse(value) as Partial<ShellRoute>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.topLevelView !== "string") {
      return undefined;
    }
    return parseHash(buildHash(parsed as ShellRoute));
  } catch {
    return undefined;
  }
}

function isVenueSubview(value: string | undefined): value is VenueSubview {
  return value === "overview" || value === "assessment" || value === "history" || value === "plan" || value === "report" || value === "console";
}

function isReferenceView(value: string | undefined): value is ReferenceView {
  return value === "blocks" || value === "tools" || value === "signals";
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isManagerView(value: string | undefined): value is ManagerView {
  return value === "today" || value === "workspace" || value === "plan" || value === "evidence" || value === "team" || value === "escalations" || value === "copilot";
}

function isPocketView(value: string | undefined): value is PocketView {
  return value === "shift" || value === "standards" || value === "help" || value === "report" || value === "log";
}

function isOwnerView(value: string | undefined): value is OwnerView {
  return value === "command" || value === "delegations" || value === "people" || value === "copilot";
}

function isSkinId(value: string | null): value is SkinId {
  return value === "ocean" || value === "forest" || value === "ember" || value === "midnight";
}
