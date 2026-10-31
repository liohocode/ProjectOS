import { describe, expect, it } from "vitest";
import { featureProgress } from "./featureProgress";

describe("featureProgress (F21.2)", () => {
  it("chưa có task → 0%", () => {
    expect(featureProgress([])).toBe(0);
  });

  it("trọng số theo story point; task chưa ước lượng tính 1 điểm", () => {
    expect(featureProgress([{ stage: "Done", estimatePoints: 3 }, { stage: "Dev", estimatePoints: 1 }])).toBe(75);
    expect(featureProgress([{ stage: "Done", estimatePoints: null }, { stage: "BA", estimatePoints: null }])).toBe(50);
    expect(featureProgress([{ stage: "Done", estimatePoints: 0 }, { stage: "Review", estimatePoints: 2 }])).toBe(33);
  });

  it("toàn bộ Done → 100%", () => {
    expect(featureProgress([{ stage: "Done", estimatePoints: 5 }])).toBe(100);
  });
});
