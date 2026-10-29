import { cache } from "react";
import { toPage } from "./paging";
import type { McpLogEntry, McpServer, McpSession, Page } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";
import { COMMAND_RESULT_LABEL, SESSION_RESULT_LABEL } from "./mcpLabels";
import { formatTokens, sessionDurationMin } from "@/lib/mcpFormat";

export const getMcpServers = cache(async (): Promise<McpServer[]> => {
  const rows = await prisma.mcpServer.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    url: row.url,
    tools: row.tools,
    clients: row.clients,
    commandsPerDay: row.commandsPerDay,
    lastCommandAgo: formatRelativeVi(row.lastCommandAt),
  }));
});

export const MCP_PAGE_SIZE = 50;

/** Tham số trang + lọc (F14.3) cho bảng MCP — lọc trong DB để trang không bị thiếu dòng. */
export interface McpPageOptions {
  limit?: number;
  cursor?: string | null;
  agent?: string | null;
  project?: string | null;
  /** Khoá enum SessionResult (`DangChay`, `ChoReview`, `BiChan`, `Xong`) — chỉ cho phiên */
  result?: string | null;
}

/** Cắt `limit + 1` dòng → biết còn trang sau mà không cần đếm. */
// cache() theo tham số nguyên thuỷ (ADR-019); hàm export nhận object cho dễ gọi.
const sessionsPage = cache(
  async (limit: number, cursor: string | null, agent: string | null, project: string | null, result: string | null): Promise<Page<McpSession>> => {
    const rows = await prisma.mcpSession.findMany({
      where: {
        ...(agent && { agentId: agent }),
        ...(project && { projectId: project }),
        ...(result && { result: result as never }),
      },
      include: { agent: true },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const now = new Date();
    return toPage(rows, limit, (row) => ({
      id: row.id,
      agentId: row.agentId,
      agent: row.agent.name,
      projectId: row.projectId,
      taskId: row.taskId ?? "",
      durationMin: sessionDurationMin(row.startedAt, row.endedAt, now),
      toolCalls: row.toolCalls,
      tokens: formatTokens(row.tokensUsed),
      result: SESSION_RESULT_LABEL[row.result],
    }));
  },
);

/** Phiên chạy MCP mới nhất trước, mỗi lần một trang (mặc định 50). */
export async function getMcpSessions(opts: McpPageOptions = {}): Promise<Page<McpSession>> {
  return sessionsPage(opts.limit ?? MCP_PAGE_SIZE, opts.cursor ?? null, opts.agent ?? null, opts.project ?? null, opts.result ?? null);
}

function toHHMMSS(date: Date) {
  return date.toTimeString().slice(0, 8);
}

const logPage = cache(async (limit: number, cursor: string | null, agent: string | null): Promise<Page<McpLogEntry>> => {
  const rows = await prisma.mcpLogEntry.findMany({
    where: agent ? { agentId: agent } : {},
    include: { agent: true },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });
  return toPage(rows, limit, (row) => ({
    id: row.id,
    at: toHHMMSS(row.at),
    agentId: row.agentId,
    agent: row.agent.name,
    tool: row.tool,
    target: row.target,
    result: COMMAND_RESULT_LABEL[row.result],
  }));
});

/** Nhật ký lệnh MCP mới nhất trước, mỗi lần một trang (mặc định 50); chỉ lọc theo agent. */
export async function getMcpLog(opts: Pick<McpPageOptions, "limit" | "cursor" | "agent"> = {}): Promise<Page<McpLogEntry>> {
  return logPage(opts.limit ?? MCP_PAGE_SIZE, opts.cursor ?? null, opts.agent ?? null);
}
