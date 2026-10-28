import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { checkLogin } from "./loginPolicy";

// Đăng nhập Google qua Better Auth (ADR-020, thay Auth.js ở ADR-013).
// Env: BETTER_AUTH_SECRET, BETTER_AUTH_URL (Better Auth tự đọc), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "Meridian",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Model Prisma riêng (AuthUser…) để không lẫn với Member — xem prisma/schema.prisma.
  user: {
    modelName: "authUser",
    additionalFields: {
      // Gán trong databaseHooks.user.create.before; client không gửi được (input: false).
      memberId: { type: "string", required: false, input: false },
    },
    // Chạy khi tạo tài khoản, liên kết tài khoản và mỗi lần đăng nhập lại bằng Google
    // → thành viên bị gỡ email khỏi Member không đăng nhập lại được.
    validateUserInfo: async ({ user }) => {
      const result = await checkLogin(user.email ?? undefined, user.emailVerified ?? undefined);
      if (!result.ok) return { error: result.error, errorDescription: result.errorDescription };
    },
  },
  session: {
    modelName: "authSession",
    // Session nằm trong cookie ký 5 phút → phần lớn request không đọc DB (Cloud Run + Neon, ADR-016).
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const result = await checkLogin(user.email, user.emailVerified);
          if (!result.ok) return false;
          return { data: { ...user, memberId: result.memberId } };
        },
      },
    },
  },
  telemetry: { enabled: false },
  // nextCookies() phải đứng cuối: set cookie khi gọi auth.api từ server action.
  plugins: [nextCookies()],
});

export const isGoogleLoginConfigured = googleConfigured;
