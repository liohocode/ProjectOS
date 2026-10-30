import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { verifyAgentToken } from "@/lib/auth/agentToken";
import { hashAgentToken } from "@/lib/auth/tokenFormat";
import { createAgentToken, loadAgentTokens, revokeAgentToken } from "./agentTokens";

afterAll(async () => {
  await prisma.agentToken.deleteMany({ where: { name: { startsWith: "IT " } } });
});

describe("token agent (F15.5)", () => {
  let raw = "";

  it("tạo → trả token một lần, DB chỉ có hash; verify ra đúng agent và ghi lastUsedAt", async () => {
    const result = await createAgentToken("agent-atlas", "IT Claude Code");
    expect(result.ok).toBe(true);
    raw = (result as { token: string }).token;
    const row = await prisma.agentToken.findFirstOrThrow({ where: { name: "IT Claude Code" } });
    expect(row.tokenHash).toBe(hashAgentToken(raw));
    expect(JSON.stringify(row)).not.toContain(raw.slice(4, 20));
    expect(row.lastFour).toBe(raw.slice(-4));

    expect(await verifyAgentToken(raw)).toMatchObject({ memberId: "agent-atlas", name: "Atlas", tokenId: row.id });
    expect((await prisma.agentToken.findUniqueOrThrow({ where: { id: row.id } })).lastUsedAt).not.toBeNull();
    const list = await loadAgentTokens("agent-atlas");
    expect(list.ok && list.tokens.find((t) => t.id === row.id)).toMatchObject({ name: "IT Claude Code", revoked: false, lastUsed: expect.any(String) });
  });

  it("thu hồi → không còn dùng được; thu hồi lần 2 báo lỗi", async () => {
    const row = await prisma.agentToken.findFirstOrThrow({ where: { name: "IT Claude Code" } });
    expect(await revokeAgentToken(row.id)).toEqual({ ok: true });
    expect(await verifyAgentToken(raw)).toBeNull();
    expect(await revokeAgentToken(row.id)).toEqual({ ok: false, error: "Token đã bị thu hồi" });
  });

  it("chặn: token sai/giả, người (không phải agent), tên trống, không phải tech lead", async () => {
    expect(await verifyAgentToken("mrd_" + "x".repeat(43))).toBeNull();
    expect(await verifyAgentToken("khong-phai-token")).toBeNull();
    expect(await createAgentToken("nam", "IT người")).toEqual({ ok: false, error: "Chỉ agent có token MCP" });
    expect(await createAgentToken("agent-atlas", " ")).toEqual({ ok: false, error: "Đặt tên cho token" });
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await createAgentToken("agent-atlas", "IT denied")).toEqual({ ok: false, error: "Chỉ tech lead được sửa cấu hình agent" });
      expect(await loadAgentTokens("agent-atlas")).toEqual({ ok: false, error: "Chỉ tech lead được sửa cấu hình agent" });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});
