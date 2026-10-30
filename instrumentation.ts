// Chạy một lần khi server Next.js khởi động (F19.5): kiểm tra biến môi trường trước khi nhận request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertEnv } = await import("@/lib/env");
  assertEnv();
}
