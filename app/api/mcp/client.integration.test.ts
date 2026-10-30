import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { prisma } from "@/lib/prisma";
import { generateAgentToken, hashAgentToken } from "@/lib/auth/tokenFormat";
import { POST } from "./route";

// F16.9 — đi đúng đường một client MCP thật (SDK Client + Streamable HTTP) đi, fetch được nối thẳng vào route handler.
// Bảo (BA agent): có cả meridian-core + meridian-docs, quyền "Append (chờ review)", thuộc rv-web + rv-app.
const startedAt = new Date();
let client: Client;
let snapshot: {
  tasks: { id: string; assigneeId: string; runningSince: Date | null; status: string; stage: string }[];
  current: string;
  maxConcurrentTasks: number;
  flowsReadBy: string[];
};

beforeAll(async () => {
  snapshot = {
    tasks: (await prisma.task.findMany({ where: { feature: { projectId: "rv-web" } } })) as typeof snapshot.tasks,
    current: (await prisma.member.findUniqueOrThrow({ where: { id: "agent-bao" } })).current,
    maxConcurrentTasks: (await prisma.agentConfig.findUniqueOrThrow({ where: { memberId: "agent-bao" } })).maxConcurrentTasks,
    flowsReadBy: (await prisma.doc.findUniqueOrThrow({ where: { id: "flows" } })).readBy,
  };
  // Seed: Bảo đang chạy 2 task (= giới hạn mặc định) → nới lên 3 cho luồng claim.
  await prisma.agentConfig.update({ where: { memberId: "agent-bao" }, data: { maxConcurrentTasks: 3 } });
  const raw = generateAgentToken();
  await prisma.agentToken.create({ data: { memberId: "agent-bao", name: "IT client", tokenHash: hashAgentToken(raw), lastFour: raw.slice(-4) } });
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost/api/mcp"), {
    requestInit: { headers: { Authorization: `Bearer ${raw}` } },
    // GET (stream SSE) trả 405 — client SDK coi là "server không hỗ trợ stream" và tiếp tục.
    fetch: (url, init) => (init?.method === "POST" ? POST(new Request(url, init)) : Promise.resolve(new Response(null, { status: 405 }))),
  });
  client = new Client({ name: "it-client", version: "0" });
  await client.connect(transport);
});

afterAll(async () => {
  await client?.close();
  for (const t of snapshot.tasks) {
    await prisma.task.update({ where: { id: t.id }, data: { assigneeId: t.assigneeId, runningSince: t.runningSince, status: t.status as never, stage: t.stage as never } });
  }
  await prisma.member.update({ where: { id: "agent-bao" }, data: { current: snapshot.current } });
  await prisma.agentConfig.update({ where: { memberId: "agent-bao" }, data: { maxConcurrentTasks: snapshot.maxConcurrentTasks } });
  await prisma.doc.update({ where: { id: "flows" }, data: { readBy: snapshot.flowsReadBy } });
  await prisma.memberActivity.deleteMany({ where: { memberId: "agent-bao", at: { gte: startedAt } } });
  await prisma.taskComment.deleteMany({ where: { authorId: "agent-bao" } });
  await prisma.docRevision.deleteMany({ where: { authorId: "agent-bao", what: { startsWith: "IT " } } });
  await prisma.mcpLogEntry.deleteMany({ where: { agentId: "agent-bao", at: { gte: startedAt } } });
  await prisma.mcpSession.deleteMany({ where: { agentId: "agent-bao", startedAt: { gte: startedAt } } });
  await prisma.agentToken.deleteMany({ where: { name: "IT client" } });
});

const data = (r: Awaited<ReturnType<Client["callTool"]>>) => JSON.parse((r.content as { text: string }[])[0].text);

describe("MCP client SDK → /api/mcp (F16.9)", () => {
  it("liệt kê đủ 7 tool", async () => {
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(["docs_append", "docs_read", "docs_search", "tasks_claim", "tasks_comment", "tasks_list", "tasks_update_status"]);
  });

  it("luồng làm việc: list → claim → comment → chuyển Review; đọc + đề xuất sửa tài liệu", async () => {
    const free = (await prisma.task.findFirstOrThrow({
      where: { feature: { projectId: "rv-web" }, stage: { not: "Done" }, blocked: null, runningSince: null },
      orderBy: { id: "asc" },
    })).id;
    expect(data(await client.callTool({ name: "tasks_list", arguments: { projectId: "rv-web" } })).count).toBeGreaterThan(0);
    expect(data(await client.callTool({ name: "tasks_claim", arguments: { taskId: free } }))).toMatchObject({ claimed: true });
    expect(data(await client.callTool({ name: "tasks_comment", arguments: { taskId: free, body: "IT: bắt đầu" } }))).toMatchObject({ commented: true });
    expect(data(await client.callTool({ name: "tasks_update_status", arguments: { taskId: free, stage: "Review", status: "Chờ review" } }))).toMatchObject({
      updated: true,
      task: { stage: "Review", running: false },
    });

    expect(data(await client.callTool({ name: "docs_search", arguments: { query: "user flows", projectId: "rv-web" } })).docs[0]).toMatchObject({ id: "flows" });
    expect(data(await client.callTool({ name: "docs_read", arguments: { docId: "flows" } }))).toMatchObject({ id: "flows" });
    expect(data(await client.callTool({ name: "docs_append", arguments: { docId: "flows", what: "IT đề xuất", summary: "Tóm tắt mới" } }))).toMatchObject({
      proposed: true,
    });

    const log = await prisma.mcpLogEntry.findMany({ where: { agentId: "agent-bao", at: { gte: startedAt } }, orderBy: { at: "asc" } });
    expect(log.map((l) => l.tool)).toEqual(["tasks.list", "tasks.claim", "tasks.comment", "tasks.update_status", "docs.search", "docs.read", "docs.append"]);
    expect(log.at(-1)?.result).toBe("ChoReview");
  });
});
