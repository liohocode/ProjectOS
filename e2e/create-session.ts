// Chạy bằng tsx (ESM — better-auth chỉ phát hành ESM, bộ nạp TS của Playwright biên dịch sang CJS nên không import được).
// Dựng instance Better Auth CHỈ cho test (authOptions + testUtils), tạo session mới cho member `argv[2]` (mặc định hieu) trên DB test,
// in cookie ra stdout dạng JSON cho e2e/auth.setup.ts. Env (DATABASE_URL = DB test, BETTER_AUTH_*) do auth.setup.ts truyền vào.
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { authOptions } from "../lib/auth/auth";
import { prisma } from "../lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL?.includes("test")) throw new Error("create-session chỉ chạy trên DB test");
  const testAuth = betterAuth({ ...authOptions, plugins: [testUtils()] });
  const ctx = await testAuth.$context;

  // Seed (chạy trước khi server start) xoá tài khoản đăng nhập → tạo lại theo email của member trong DB test.
  const memberId = process.argv[2] ?? "hieu";
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId }, select: { email: true, name: true } });
  if (!member.email) throw new Error(`Member ${memberId} chưa có email trong DB test`);
  const existing = await ctx.internalAdapter.findUserByEmail(member.email);
  const userId =
    existing?.user.id ??
    (
      await ctx.internalAdapter.createOAuthUser(
        { email: member.email, name: member.name, emailVerified: true },
        { providerId: "google", accountId: `e2e-${memberId}` },
      )
    ).user.id;

  const { cookies } = await ctx.test.login({ userId });
  process.stdout.write(JSON.stringify(cookies));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
