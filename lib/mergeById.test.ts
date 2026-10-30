import { describe, expect, it } from "vitest";
import { mergeById } from "./mergeById";

describe("mergeById (F17.3)", () => {
  it("mục mới lên đầu, bỏ trùng theo id, cắt theo limit", () => {
    const current = [{ id: "b" }, { id: "a" }];
    expect(mergeById([{ id: "c" }, { id: "b" }], current, 10)).toEqual([{ id: "c" }, { id: "b" }, { id: "a" }]);
    expect(mergeById([{ id: "c" }], current, 2)).toEqual([{ id: "c" }, { id: "b" }]);
  });

  it("mục không có id luôn giữ", () => {
    expect(mergeById([{}], [{}], 5)).toHaveLength(2);
  });
});
