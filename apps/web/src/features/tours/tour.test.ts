import { describe, expect, it } from "vitest";
import { tourForRole, ownerTour, managerTour, pocketTour } from "./tourDefinitions";

describe("tour definitions", () => {
  it("returns owner tour for owner role", () => {
    expect(tourForRole("owner")).toBe(ownerTour);
  });

  it("returns manager tour for manager role", () => {
    expect(tourForRole("manager")).toBe(managerTour);
  });

  it("returns pocket tour for barista role", () => {
    expect(tourForRole("barista")).toBe(pocketTour);
  });

  it("returns null for developer role", () => {
    expect(tourForRole("developer")).toBeNull();
  });

  it("returns null for null role", () => {
    expect(tourForRole(null)).toBeNull();
  });

  it("owner tour has at least 3 steps", () => {
    expect(ownerTour.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("manager tour has at least 5 steps", () => {
    expect(managerTour.steps.length).toBeGreaterThanOrEqual(5);
  });

  it("pocket tour has at least 3 steps", () => {
    expect(pocketTour.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("all tours have unique step ids", () => {
    for (const tour of [ownerTour, managerTour, pocketTour]) {
      const ids = tour.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("all steps have non-empty title and body", () => {
    for (const tour of [ownerTour, managerTour, pocketTour]) {
      for (const step of tour.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
      }
    }
  });
});
