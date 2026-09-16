import type { CommandResult, McpLogEntry, McpServer, McpSession, SessionResult } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";

export async function getMcpServers(): Promise<McpServer[]> {
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
}

// Prisma enum (tên identifier ASCII, @map giữ giá trị DB tiếng Việt) ↔ chuỗi
// hiển thị dùng trong lib/types — đảo ngược lại từ bảng map trong prisma/seed.ts.
const SESSION_RESULT_LABEL: Record<string, SessionResult> = {
  Xong: "Xong",
  DangChay: "Đang chạy",
  ChoReview: "Chờ review",
  BiChan: "Bị chặn",
};

const COMMAND_RESULT_LABEL: Record<string, CommandResult> = {
  OK: "OK",
  ChoReview: "Chờ review",
  BiChan: "Bị chặn",
};

export async function getMcpSessions(): Promise<McpSession[]> {
  const rows = await prisma.mcpSession.findMany({
    include: { agent: true },
    orderBy: { startedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    agent: row.agent.name,
    projectId: row.projectId,
    taskId: row.taskId ?? "",
    durationMin: row.durationMin,
    toolCalls: row.toolCalls,
    tokens: row.tokens,
    result: SESSION_RESULT_LABEL[row.result],
  }));
}

function toHHMMSS(date: Date) {
  return date.toTimeString().slice(0, 8);
}

export async function getMcpLog(): Promise<McpLogEntry[]> {
  const rows = await prisma.mcpLogEntry.findMany({
    include: { agent: true },
    orderBy: { at: "desc" },
  });
  return rows.map((row) => ({
    at: toHHMMSS(row.at),
    agent: row.agent.name,
    tool: row.tool,
    target: row.target,
    result: COMMAND_RESULT_LABEL[row.result],
  }));
}
