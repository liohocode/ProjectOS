// Chạy trước mỗi file integration test, trước khi file đó import lib/prisma.ts
// (lib/prisma đọc DATABASE_URL lúc nạp module) → mọi query đi vào DB test.
import "dotenv/config";
import { afterAll, vi } from "vitest";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl || !new URL(testUrl).pathname.includes("test")) {
  throw new Error("Thiếu DATABASE_URL_TEST trỏ tới DB test (tên DB phải chứa 'test') — xem .env.example");
}
process.env.DATABASE_URL = testUrl;

// Server action gọi revalidatePath — ngoài request Next.js thì không có context, mock đi.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
// Ngoài request Next không có headers()/cookie session → người đang thao tác = Trung Hiếu (tech lead mẫu).
vi.mock("@/lib/auth/session", () => ({ getSessionMemberId: vi.fn(async () => "hieu") }));

// Sự kiện rail (ActivityEvent) do test ghi ra phải được dọn sau mỗi file: feed chỉ lấy 30 mục mới nhất, sự kiện thừa
// đẩy sự kiện seed ra ngoài và làm hỏng test đọc feed (aggregates.integration.test.ts) chạy sau. Sự kiện seed có
// mốc thời gian trong quá khứ nên không bị xoá.
const fileStartedAt = new Date();
afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.activityEvent.deleteMany({ where: { at: { gte: fileStartedAt } } });
});
