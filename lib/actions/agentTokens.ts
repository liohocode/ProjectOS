"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/authorize";
import { generateAgentToken, hashAgentToken } from "@/lib/auth/tokenFormat";
import { getAgentTokens } from "@/lib/data/team";
import type { AgentTokenInfo } from "@/lib/types";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

// Token MCP cho agent (F15.5). Cùng quyền với sửa cấu hình agent (tech lead — F15.4).

const memberIdSchema = z.string().trim().min(1, "Thiếu agent");
const MAX_ACTIVE_TOKENS = 5;

/** Danh sách token của agent (chỉ đọc) — panel agent tải khi mở. */
export async function loadAgentTokens(memberId: string): Promise<ActionResult<{ tokens: AgentTokenInfo[] }>> {
  const denied = await authorize("agent.configure");
  if (denied) return fail(denied);
  const id = memberIdSchema.safeParse(memberId);
  if (!id.success) return fail(id.error.issues[0].message);
  return { ok: true, tokens: await getAgentTokens(id.data) };
}

/** Tạo token — trả token gốc **một lần duy nhất**; DB chỉ giữ SHA-256. */
export async function createAgentToken(memberId: string, name: string): Promise<ActionResult<{ token: string }>> {
  const denied = await authorize("agent.configure");
  if (denied) return fail(denied);
  const input = z
    .object({ memberId: memberIdSchema, name: z.string().trim().min(1, "Đặt tên cho token").max(60, "Tên tối đa 60 ký tự") })
    .safeParse({ memberId, name });
  if (!input.success) return fail(input.error.issues[0].message);

  const member = await prisma.member.findUnique({ where: { id: input.data.memberId }, select: { kind: true, name: true } });
  if (!member) return fail("Không tìm thấy thành viên");
  if (member.kind !== "agent") return fail("Chỉ agent có token MCP");
  const active = await prisma.agentToken.count({ where: { memberId: input.data.memberId, revokedAt: null } });
  if (active >= MAX_ACTIVE_TOKENS) return fail(`Tối đa ${MAX_ACTIVE_TOKENS} token còn hiệu lực — thu hồi token cũ trước`);

  const token = generateAgentToken();
  await prisma.agentToken.create({
    data: { memberId: input.data.memberId, name: input.data.name, tokenHash: hashAgentToken(token), lastFour: token.slice(-4) },
  });
  await recordActivity("ph-key", `Tạo token "${input.data.name}" cho ${member.name}`);
  revalidatePath("/[project]/team", "page");
  return { ok: true, token };
}

/** Thu hồi token — có hiệu lực ngay (verifyAgentToken kiểm tra revokedAt mỗi request). */
export async function revokeAgentToken(tokenId: string): Promise<ActionResult> {
  const denied = await authorize("agent.configure");
  if (denied) return fail(denied);
  const id = z.string().trim().min(1, "Thiếu token").safeParse(tokenId);
  if (!id.success) return fail(id.error.issues[0].message);

  const token = await prisma.agentToken.findUnique({ where: { id: id.data }, select: { name: true, revokedAt: true, member: { select: { name: true } } } });
  if (!token) return fail("Không tìm thấy token");
  if (token.revokedAt) return fail("Token đã bị thu hồi");
  await prisma.agentToken.update({ where: { id: id.data }, data: { revokedAt: new Date() } });
  await recordActivity("ph-key", `Thu hồi token "${token.name}" của ${token.member.name}`);
  revalidatePath("/[project]/team", "page");
  return ok();
}
