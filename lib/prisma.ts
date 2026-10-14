import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DatabaseUnavailableError, isDatabaseConnectionError } from "@/lib/dbErrors";

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  // Mọi lỗi mất kết nối DB được chuẩn hoá thành DatabaseUnavailableError (message cố định)
  // để error boundary hiển thị hướng dẫn thay vì "Invalid prisma.x invocation".
  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (isDatabaseConnectionError(error)) throw new DatabaseUnavailableError(error);
          throw error;
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
