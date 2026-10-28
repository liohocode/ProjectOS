import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { auth } from "./auth";
import { checkLogin, EMAIL_NOT_VERIFIED, NOT_A_MEMBER } from "./loginPolicy";

// Email mẫu của "nam" (người) — không dùng "hieu" vì DEV_LOGIN_EMAIL có thể thay email của hieu khi seed.
const MEMBER_EMAIL = "nam@example.com";

describe("checkLogin", () => {
  it("cho phép email đã xác minh của Member người, không phân biệt hoa thường", async () => {
    expect(await checkLogin(MEMBER_EMAIL, true)).toEqual({ ok: true, memberId: "nam" });
    expect(await checkLogin("  NAM@Example.com ", true)).toEqual({ ok: true, memberId: "nam" });
  });

  it("từ chối người lạ, email chưa xác minh và tài khoản không có email", async () => {
    expect(await checkLogin("la@gmail.com", true)).toMatchObject({ ok: false, error: NOT_A_MEMBER });
    expect(await checkLogin(MEMBER_EMAIL, false)).toMatchObject({ ok: false, error: EMAIL_NOT_VERIFIED });
    expect(await checkLogin(undefined, true)).toMatchObject({ ok: false, error: NOT_A_MEMBER });
  });

  it("không cho agent đăng nhập dù có email trùng", async () => {
    await prisma.member.update({ where: { id: "agent-atlas" }, data: { email: "atlas@example.com" } });
    try {
      expect(await checkLogin("atlas@example.com", true)).toMatchObject({ ok: false, error: NOT_A_MEMBER });
    } finally {
      await prisma.member.update({ where: { id: "agent-atlas" }, data: { email: null } });
    }
  });
});

// Luồng Google tạo tài khoản mới bằng createOAuthUser (sau khi validateUserInfo đã chạy ở callback).
// Ở đây gọi thẳng để kiểm tra lớp chặn thứ hai (databaseHooks) + adapter ghi đúng model AuthUser/AuthAccount.
describe("Better Auth + Prisma (model AuthUser, hook gán memberId)", () => {
  afterAll(async () => {
    await prisma.authUser.deleteMany({ where: { email: { in: [MEMBER_EMAIL, "la@gmail.com"] } } });
  });

  const googleAccount = (accountId: string) => ({ providerId: "google", accountId });

  it("tạo tài khoản cho email thành viên → gắn đúng memberId, có tài khoản google", async () => {
    const ctx = await auth.$context;
    const { user } = await ctx.internalAdapter.createOAuthUser(
      { email: MEMBER_EMAIL, name: "Nguyễn Nam", emailVerified: true },
      googleAccount("google-nam"),
    );
    expect(user).toMatchObject({ email: MEMBER_EMAIL });
    const row = await prisma.authUser.findUniqueOrThrow({ where: { email: MEMBER_EMAIL }, include: { accounts: true } });
    expect(row.memberId).toBe("nam");
    expect(row.accounts).toMatchObject([{ providerId: "google", accountId: "google-nam" }]);
  });

  it("không tạo tài khoản cho người lạ (hook trả false)", async () => {
    const ctx = await auth.$context;
    await expect(
      ctx.internalAdapter.createOAuthUser({ email: "la@gmail.com", name: "Người lạ", emailVerified: true }, googleAccount("google-la")),
    ).rejects.toThrow();
    expect(await prisma.authUser.findUnique({ where: { email: "la@gmail.com" } })).toBeNull();
  });
});
