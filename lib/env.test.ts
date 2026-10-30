import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

const DB = "postgresql://u:p@localhost:5432/meridian";
const prod = { DATABASE_URL: DB, BETTER_AUTH_SECRET: "x".repeat(32), BETTER_AUTH_URL: "https://meridian.example.run.app" };

describe("checkEnv (F19.5)", () => {
  it("thiếu DATABASE_URL hoặc sai dạng → lỗi rõ ràng", () => {
    expect(checkEnv({}, false)).toEqual({ ok: false, errors: ["DATABASE_URL: chưa đặt"] });
    expect(checkEnv({ DATABASE_URL: "mysql://x" }, false)).toEqual({ ok: false, errors: ["DATABASE_URL: phải là connection string postgresql://…"] });
  });

  it("production bắt buộc BETTER_AUTH_SECRET (≥32) + BETTER_AUTH_URL", () => {
    const r = checkEnv({ DATABASE_URL: DB, BETTER_AUTH_SECRET: "ngan" }, true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("BETTER_AUTH_SECRET: tối thiểu 32 ký tự (openssl rand -base64 32)");
      expect(r.errors).toContain("BETTER_AUTH_URL: chưa đặt");
    }
    expect(checkEnv({ DATABASE_URL: DB }, false).ok).toBe(true);
  });

  it("Google phải đặt đủ cặp; thiếu cả hai chỉ cảnh báo", () => {
    expect(checkEnv({ ...prod, GOOGLE_CLIENT_ID: "id" }, true).ok).toBe(false);
    expect(checkEnv(prod, true)).toMatchObject({ ok: true, warnings: [expect.stringContaining("Đăng nhập bằng Google")] });
    expect(checkEnv({ ...prod, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }, true)).toEqual({ ok: true, warnings: [] });
  });
});
