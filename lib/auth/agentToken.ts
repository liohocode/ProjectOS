import { prisma } from "@/lib/prisma";
import { hashAgentToken, isAgentTokenFormat } from "./tokenFormat";

// Xác thực token agent (F15.5) — F16.1 (endpoint MCP) gọi hàm này cho mỗi request `Authorization: Bearer <token>`.

export interface AgentPrincipal {
  memberId: string;
  name: string;
  tokenId: string;
}

/** Token hợp lệ, chưa thu hồi, thuộc một agent → agent đó (và ghi `lastUsedAt`); ngược lại null. */
export async function verifyAgentToken(raw: string): Promise<AgentPrincipal | null> {
  if (!isAgentTokenFormat(raw)) return null;
  const token = await prisma.agentToken.findUnique({
    where: { tokenHash: hashAgentToken(raw) },
    select: { id: true, revokedAt: true, member: { select: { id: true, name: true, kind: true } } },
  });
  if (!token || token.revokedAt || token.member.kind !== "agent") return null;
  await prisma.agentToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return { memberId: token.member.id, name: token.member.name, tokenId: token.id };
}
