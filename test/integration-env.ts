// Chạy trước mỗi file integration test, trước khi file đó import lib/prisma.ts
// (lib/prisma đọc DATABASE_URL lúc nạp module) → mọi query đi vào DB test.
import "dotenv/config";
import { vi } from "vitest";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl || !new URL(testUrl).pathname.includes("test")) {
  throw new Error("Thiếu DATABASE_URL_TEST trỏ tới DB test (tên DB phải chứa 'test') — xem .env.example");
}
process.env.DATABASE_URL = testUrl;

// Server action gọi revalidatePath — ngoài request Next.js thì không có context, mock đi.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
