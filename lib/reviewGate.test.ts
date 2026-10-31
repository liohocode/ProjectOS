import { describe, expect, it } from "vitest";
import { reviewBlockReason } from "./reviewGate";

describe("reviewBlockReason (F22.3)", () => {
  it("không còn tiêu chí chưa đạt → được chuyển", () => {
    expect(reviewBlockReason([])).toBeNull();
  });

  it("liệt kê tối đa 3 tiêu chí, cắt nội dung dài, đếm phần còn lại", () => {
    expect(reviewBlockReason(["Có test"])).toBe('Còn 1 tiêu chí chưa đạt: "Có test" — tick khi đã đạt rồi mới chuyển sang Review');
    const long = "x".repeat(80);
    const reason = reviewBlockReason(["a", "b", long, "d", "e"])!;
    expect(reason).toContain(`"${"x".repeat(57)}…"`);
    expect(reason).toContain("Còn 5 tiêu chí chưa đạt");
    expect(reason).toContain("và 2 tiêu chí khác");
    expect(reason).not.toContain('"d"');
  });
});
