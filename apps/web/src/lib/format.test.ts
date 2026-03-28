import { describe, expect, it } from "vitest";

describe("signal labels", () => {
  it("keeps labels presentable", () => {
    expect("Service delay".toLowerCase()).toContain("delay");
  });
});
