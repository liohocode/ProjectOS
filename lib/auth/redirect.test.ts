import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./redirect";

describe("safeReturnPath", () => {
  it("giữ path nội bộ kèm query", () => {
    expect(safeReturnPath("/rv-web/work?new=1")).toBe("/rv-web/work?new=1");
  });

  it("chặn URL ngoài, protocol-relative và giá trị rỗng", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "rv-web/work", "", undefined]) {
      expect(safeReturnPath(bad)).toBe("/");
    }
  });

  it("lấy phần tử đầu khi query lặp", () => {
    expect(safeReturnPath(["/crm/docs", "/x"])).toBe("/crm/docs");
  });
});
