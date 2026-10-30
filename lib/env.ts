import { z } from "zod";

// Kiểm tra biến môi trường lúc server khởi động (F19.5) — gọi từ instrumentation.ts.
// Production thiếu biến bắt buộc → container dừng ngay với thông báo rõ ràng, thay vì lỗi khó hiểu ở request đầu tiên.

const postgresUrl = z
  .string({ error: "chưa đặt" })
  .min(1, "chưa đặt")
  .refine((v) => v === "" || /^postgres(ql)?:\/\//.test(v), "phải là connection string postgresql://…");

const baseSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).optional(),
});

const productionSchema = baseSchema.extend({
  BETTER_AUTH_SECRET: z.string({ error: "chưa đặt" }).min(32, "tối thiểu 32 ký tự (openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.string({ error: "chưa đặt" }).url("phải là URL đầy đủ, vd https://meridian-….run.app"),
});

const googleSchema = z
  .object({ GOOGLE_CLIENT_ID: z.string().optional(), GOOGLE_CLIENT_SECRET: z.string().optional() })
  .refine((g) => Boolean(g.GOOGLE_CLIENT_ID) === Boolean(g.GOOGLE_CLIENT_SECRET), {
    message: "GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET phải đặt cùng nhau (hoặc bỏ cả hai để tắt đăng nhập Google)",
  });

export type EnvCheck = { ok: true; warnings: string[] } | { ok: false; errors: string[] };

/** Thuần — kiểm tra một bộ biến môi trường; `production` bật các biến bắt buộc khi chạy thật. */
export function checkEnv(env: Record<string, string | undefined>, production: boolean): EnvCheck {
  const errors: string[] = [];
  const parsed = (production ? productionSchema : baseSchema).safeParse(env);
  if (!parsed.success) errors.push(...parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  const google = googleSchema.safeParse(env);
  if (!google.success) errors.push(google.error.issues[0].message);
  if (errors.length) return { ok: false, errors };

  const warnings = env.GOOGLE_CLIENT_ID ? [] : ["GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET chưa đặt — nút “Đăng nhập bằng Google” bị khoá"];
  return { ok: true, warnings };
}

/** Gọi một lần lúc khởi động. Production lỗi → in thông báo và thoát (exit 1); dev chỉ cảnh báo. */
export function assertEnv(): void {
  const production = process.env.NODE_ENV === "production";
  const result = checkEnv(process.env, production);
  if (result.ok) {
    for (const w of result.warnings) console.warn(`[env] ${w}`);
    return;
  }
  const message = `[env] Thiếu/sai biến môi trường:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`;
  if (production) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message}\n(dev: vẫn chạy tiếp — xem .env.example)`);
}
