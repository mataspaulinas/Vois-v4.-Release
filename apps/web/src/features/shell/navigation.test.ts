import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildHash, loadShellPreferences, parseHash, persistShellPreferences, STORAGE_KEYS } from "./navigation";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        clear: () => {
          storage.clear();
        },
      },
    },
    configurable: true,
  });
});

afterEach(() => {
  storage.clear();
  Reflect.deleteProperty(globalThis, "window");
});

describe("shell navigation", () => {
  it("builds venue hashes", () => {
    expect(buildHash({ topLevelView: "venue", venueId: "venue-123", venueView: "plan" })).toBe(
      "#/venue/venue-123/plan"
    );
  });

  it("parses reference hashes", () => {
    expect(parseHash("#/reference/tools")).toEqual({
      topLevelView: "reference",
      referenceView: "tools",
    });
  });

  it("round-trips pocket task hashes", () => {
    const route = { topLevelView: "pocket", venueId: "venue-abc", pocketView: "task" } as const;
    expect(buildHash(route)).toBe("#/pocket/venue-abc/task");
    expect(parseHash("#/pocket/venue-abc/task")).toEqual(route);
  });

  it("falls back to default manager view when graph route is requested", () => {
    expect(parseHash("#/manager/venue-abc/graph")).toEqual({
      topLevelView: "manager",
      venueId: "venue-abc",
      managerView: "today",
    });
  });

  it("falls back to a venue overview when hash is invalid and a venue exists", () => {
    expect(parseHash("#/something/else", "venue-abc")).toEqual({
      topLevelView: "venue",
      venueId: "venue-abc",
      venueView: "overview",
    });
  });

  it("ignores malformed stored routes instead of overwriting defaults", () => {
    window.localStorage.setItem(STORAGE_KEYS.lastRoute, JSON.stringify({ topLevelView: undefined }));

    expect(loadShellPreferences()).toEqual({});
  });

  it("round-trips persisted shell preferences", () => {
    persistShellPreferences({
      theme: "dark",
      skin: "ember",
      sidebarCollapsed: true,
      welcomeDismissed: true,
      lastRoute: { topLevelView: "venue", venueId: "venue-7", venueView: "diagnosis" },
    });

    expect(loadShellPreferences()).toEqual({
      theme: "dark",
      skin: "ember",
      sidebarCollapsed: true,
      welcomeDismissed: true,
      lastRoute: { topLevelView: "venue", venueId: "venue-7", venueView: "diagnosis" },
    });
  });

  it("maps legacy report routes into diagnosis", () => {
    expect(parseHash("#/venue/venue-7/report")).toEqual({
      topLevelView: "venue",
      venueId: "venue-7",
      venueView: "diagnosis",
    });
  });
});
