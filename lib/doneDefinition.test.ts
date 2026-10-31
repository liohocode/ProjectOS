import { describe, expect, it } from "vitest";
import { missingDod, parseDodInput } from "./doneDefinition";

describe("Definition of Done (F22.6)", () => {
  it("mỗi dòng một mục, bỏ gạch đầu dòng / checkbox, bỏ trùng và dòng trống", () => {
    expect(parseDodInput("- Có test\n\n* [x] PR đã review\nCó test\n  Cập nhật tài liệu  ")).toEqual({ ok: true, items: ["Có test", "PR đã review", "Cập nhật tài liệu"] });
    expect(parseDodInput("")).toEqual({ ok: true, items: [] });
  });
  it("quá nhiều / quá dài → lỗi", () => {
    expect(parseDodInput(Array.from({ length: 13 }, (_, i) => `m${i}`).join("\n"))).toEqual({ ok: false, error: "Tối đa 12 mục" });
    expect(parseDodInput("x".repeat(121))).toEqual({ ok: false, error: "Mỗi mục tối đa 120 ký tự" });
  });
  it("missingDod", () => {
    expect(missingDod(["a", "b"], ["b"])).toEqual(["a"]);
    expect(missingDod([], [])).toEqual([]);
  });
});
