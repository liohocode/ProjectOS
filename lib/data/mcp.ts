import { cache } from "react";
import type { McpLogEntry, McpServer, McpSession } from "@/lib/types";
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

export const getMcpSessions = cache(async (): Promise<McpSession[]> => {
  const rows = await prisma.mcpSession.findMany({
    include: { agent: true },
    orderBy: { startedAt: "desc" },
  });
  const now = new Date();
  return rows.map((row) => ({
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
});

function toHHMMSS(date: Date) {
  return date.toTimeString().slice(0, 8);
}

export const getMcpLog = cache(async (): Promise<McpLogEntry[]> => {
  const rows = await prisma.mcpLogEntry.findMany({
    include: { agent: true },
    orderBy: { at: "desc" },
  });
  return rows.map((row) => ({
    at: toHHMMSS(row.at),
    agentId: row.agentId,
    agent: row.agent.name,
    tool: row.tool,
    target: row.target,
    result: COMMAND_RESULT_LABEL[row.result],
  }));
});
