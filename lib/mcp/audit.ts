import { prisma } from "@/lib/prisma";
import type { CommandResult } from "@/lib/generated/prisma/enums";
import { displayToolName } from "./tools";

// Ghi phiên + nhật ký cho mọi lệnh MCP (F16.2). Endpoint stateless (ADR-022) nên không có MCP session id:
// "phiên" = agent làm việc trên một dự án, còn mở khi lệnh cuối cách đây chưa tới SESSION_IDLE_MS;
// phiên quá hạn được đóng lười ở lệnh kế tiếp của chính agent đó (không cần job nền — Cloud Run scale về 0).

export const SESSION_IDLE_MS = 30 * 60_000;
export { displayToolName } from "./tools";

export interface ToolCallRecord {
  agentId: string;
  /** Token đã dùng (F16.7) — rate limit đếm theo token */
  tokenId?: string | null;
  /** Tên tool thật, vd `tasks_list` */
  tool: string;
  /** Đối tượng thao tác hiển thị ở nhật ký, vd `T-405` hoặc `rv-web` */
  target: string;
  result: CommandResult;
  /** Dự án của lệnh — không xác định được (vd liệt kê mọi dự án) thì chỉ ghi nhật ký, không gắn phiên */
  projectId?: string | null;
  taskId?: string | null;
}

export async function recordToolCall(call: ToolCallRecord, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - SESSION_IDLE_MS);
  await prisma.$transaction(async (tx) => {
    await tx.mcpLogEntry.create({
      data: { agentId: call.agentId, tokenId: call.tokenId ?? null, tool: displayToolName(call.tool), target: call.target, result: call.result, at: now },
    });
    if (!call.projectId) return;

    // Đóng phiên quá hạn của agent: kết thúc tại lệnh cuối, còn "Đang chạy" thì thành "Xong".
    await tx.$executeRaw`
      UPDATE "mcp_sessions"
      SET "endedAt" = "lastCallAt",
          "result" = CASE WHEN "result" = 'Đang chạy'::"SessionResult" THEN 'Xong'::"SessionResult" ELSE "result" END
      WHERE "agentId" = ${call.agentId} AND "endedAt" IS NULL AND "lastCallAt" IS NOT NULL AND "lastCallAt" < ${cutoff}`;

    const open = await tx.mcpSession.findFirst({
      where: { agentId: call.agentId, projectId: call.projectId, endedAt: null, lastCallAt: { gte: cutoff } },
      orderBy: { lastCallAt: "desc" },
      select: { id: true },
    });
    if (open) {
      await tx.mcpSession.update({
        where: { id: open.id },
        data: { toolCalls: { increment: 1 }, lastCallAt: now, ...(call.taskId && { taskId: call.taskId }) },
      });
    } else {
      await tx.mcpSession.create({
        data: {
          agentId: call.agentId,
          projectId: call.projectId,
          taskId: call.taskId ?? null,
          startedAt: now,
          lastCallAt: now,
          toolCalls: 1,
          result: "DangChay",
        },
      });
    }
  });
}
