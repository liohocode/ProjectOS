import { describe, expect, it } from "vitest";
import { diffParas, diffSections, hasChanges } from "./diffSections";

describe("diffParas", () => {
  it("giữ đoạn chung, đánh dấu thêm/xoá theo thứ tự", () => {
    expect(diffParas(["a", "b", "c"], ["a", "x", "c", "d"])).toEqual([
      { kind: "same", text: "a" },
      { kind: "removed", text: "b" },
      { kind: "added", text: "x" },
      { kind: "same", text: "c" },
      { kind: "added", text: "d" },
    ]);
    expect(diffParas([], ["a"])).toEqual([{ kind: "added", text: "a" }]);
    expect(diffParas(["a"], [])).toEqual([{ kind: "removed", text: "a" }]);
  });
});

describe("diffSections", () => {
  const current = [
    { heading: "Bối cảnh", paras: ["b1"] },
    { heading: "Phạm vi", paras: ["p1"] },
    { heading: "Tiêu chí", paras: ["t1"] },
  ];

  it("mục thêm đoạn → changed; mục giữ nguyên → same (giống revision mẫu prd-listing)", () => {
    const diff = diffSections(current, [current[0], current[1], { heading: "Tiêu chí", paras: ["t1", "t2"] }]);
    expect(diff.map((d) => [d.heading, d.kind])).toEqual([
      ["Bối cảnh", "same"],
      ["Phạm vi", "same"],
      ["Tiêu chí", "changed"],
    ]);
    expect(diff[2].paras).toEqual([{ kind: "same", text: "t1" }, { kind: "added", text: "t2" }]);
    expect(hasChanges(diff)).toBe(true);
  });

  it("mục mới chèn giữa (giống revision mẫu mcp-spec) và mục bị xoá giữ đúng vị trí", () => {
    const proposed = [current[0], { heading: "Mới", paras: ["n1"] }, current[2]];
    expect(diffSections(current, proposed).map((d) => [d.heading, d.kind])).toEqual([
      ["Bối cảnh", "same"],
      ["Phạm vi", "removed"],
      ["Mới", "added"],
      ["Tiêu chí", "same"],
    ]);
  });

  it("đề xuất trùng bản hiện tại → không có thay đổi", () => {
    expect(hasChanges(diffSections(current, current))).toBe(false);
  });
});
