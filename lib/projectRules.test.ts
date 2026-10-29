import { describe, expect, it } from "vitest";
import { PROJECT_CODE_PATTERN, PROJECT_ID_PATTERN, suggestProjectCode } from "./projectRules";

describe("projectRules", () => {
  it("gợi ý mã từ tên (bỏ dấu, chữ hoa)", () => {
    expect(suggestProjectCode("Rever Mobile App")).toBe("RM");
    expect(suggestProjectCode("đối tác")).toBe("DT");
    expect(suggestProjectCode("Kho")).toBe("KH");
    expect(suggestProjectCode("")).toBe("");
  });

  it("id: chữ thường/số/gạch, 2–40 ký tự, không bắt đầu bằng gạch; mã: đúng 2 ký tự hoa/số", () => {
    expect(PROJECT_ID_PATTERN.test("rv-web")).toBe(true);
    expect(PROJECT_ID_PATTERN.test("a")).toBe(false);
    expect(PROJECT_ID_PATTERN.test("-ab")).toBe(false);
    expect(PROJECT_ID_PATTERN.test("Ab")).toBe(false);
    expect(PROJECT_CODE_PATTERN.test("R2")).toBe(true);
    expect(PROJECT_CODE_PATTERN.test("rv")).toBe(false);
    expect(PROJECT_CODE_PATTERN.test("RVW")).toBe(false);
  });
});
