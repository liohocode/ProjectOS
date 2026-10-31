import { describe, expect, it } from "vitest";
import { dependencyBlockReason, wouldCreateCycle } from "./taskDeps";

describe("wouldCreateCycle (F21.8)", () => {
  const edges = [
    ["T-3", "T-2"],
    ["T-2", "T-1"],
  ] as const;
  it("tự phụ thuộc và vòng gián tiếp → có", () => {
    expect(wouldCreateCycle(edges, "T-1", "T-1")).toBe(true);
    expect(wouldCreateCycle(edges, "T-1", "T-3")).toBe(true);
  });
  it("cạnh mới không khép vòng → không", () => {
    expect(wouldCreateCycle(edges, "T-4", "T-3")).toBe(false);
    expect(wouldCreateCycle(edges, "T-3", "T-1")).toBe(false);
  });
});

describe("dependencyBlockReason", () => {
  it("còn phụ thuộc chưa xong → lý do; hết → null", () => {
    expect(dependencyBlockReason("T-3", ["T-1", "T-2"])).toBe("T-3 đang chờ T-1, T-2 xong trước");
    expect(dependencyBlockReason("T-3", [])).toBeNull();
  });
});
