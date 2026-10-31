import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

const DB = "postgresql://u:p@localhost:5432/meridian";
const KEY = Buffer.alloc(32, 7).toString("base64");
const prod = { DATABASE_URL: DB, BETTER_AUTH_SECRET: "x".repeat(32), BETTER_AUTH_URL: "https://meridian.example.run.app", MERIDIAN_ENCRYPTION_KEY: KEY };

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

  it("thiếu / sai MERIDIAN_ENCRYPTION_KEY chỉ cảnh báo (F29.2)", () => {
    const google = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" };
    expect(checkEnv({ ...prod, ...google, MERIDIAN_ENCRYPTION_KEY: "ngan" }, true)).toEqual({ ok: true, warnings: [expect.stringContaining("gắn API key bị khoá")] });
    expect(checkEnv({ ...prod, ...google, MERIDIAN_ENCRYPTION_KEY: undefined }, true).ok).toBe(true);
  });
});
