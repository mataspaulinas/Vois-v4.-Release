import { describe, expect, it } from "vitest";

// Test the quality calculation logic extracted from IntakeQualityBar
function assessQuality(text: string) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  if (wordCount === 0) return { level: "empty", wordCount };
  if (wordCount < 30) return { level: "thin", wordCount };
  if (wordCount < 80) return { level: "minimal", wordCount };
  if (wordCount < 200) return { level: "good", wordCount };
  return { level: "rich", wordCount };
}

describe("intake quality assessment", () => {
  it("returns empty for blank text", () => {
    expect(assessQuality("")).toEqual({ level: "empty", wordCount: 0 });
    expect(assessQuality("   ")).toEqual({ level: "empty", wordCount: 0 });
  });

  it("returns thin for short text", () => {
    const result = assessQuality("Staff seem busy on Fridays");
    expect(result.level).toBe("thin");
    expect(result.wordCount).toBe(5);
  });

  it("returns minimal for moderate text", () => {
    const words = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    expect(assessQuality(words).level).toBe("minimal");
  });

  it("returns good for substantive text", () => {
    const words = Array.from({ length: 120 }, (_, i) => `word${i}`).join(" ");
    expect(assessQuality(words).level).toBe("good");
  });

  it("returns rich for comprehensive text", () => {
    const words = Array.from({ length: 250 }, (_, i) => `word${i}`).join(" ");
    expect(assessQuality(words).level).toBe("rich");
  });
});
