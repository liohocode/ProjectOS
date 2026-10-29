import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("bỏ dấu tiếng Việt, đ → d, chữ thường, gạch nối", () => {
    expect(slugify("Đặc tả thanh toán điện tử")).toBe("dac-ta-thanh-toan-dien-tu");
    expect(slugify("  PRD — Quản lý Tin đăng (v2)!  ")).toBe("prd-quan-ly-tin-dang-v2");
    expect(slugify("Nguyễn Ưng Ỷ")).toBe("nguyen-ung-y");
  });

  it("cắt tối đa 60 ký tự, không để gạch cuối; rỗng → fallback", () => {
    const long = slugify("a ".repeat(50) + "b");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
    expect(slugify("!!! ???")).toBe("tai-lieu");
    expect(slugify("日本語", "doc")).toBe("doc");
  });
});
