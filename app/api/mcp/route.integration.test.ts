import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateAgentToken, hashAgentToken } from "@/lib/auth/tokenFormat";
import { DELETE, GET, POST } from "./route";

// F16.1 — endpoint MCP stateless: xác thực token agent, tool tasks_list.
let token = "";
let revoked = "";

beforeAll(async () => {
  token = generateAgentToken();
  revoked = generateAgentToken();
  await prisma.agentToken.createMany({
    data: [
      { memberId: "agent-vega", name: "IT mcp", tokenHash: hashAgentToken(token), lastFour: token.slice(-4) },
      { memberId: "agent-vega", name: "IT mcp revoked", tokenHash: hashAgentToken(revoked), lastFour: revoked.slice(-4), revokedAt: new Date() },
    ],
  });
});
const startedAt = new Date();
afterAll(async () => {
  await prisma.agentToken.deleteMany({ where: { name: { startsWith: "IT mcp" } } });
  // F16.2: nhật ký + phiên do các lệnh trong file này tạo ra.
  await prisma.mcpLogEntry.deleteMany({ where: { agentId: "agent-vega", at: { gte: startedAt } } });
  await prisma.mcpSession.deleteMany({ where: { agentId: "agent-vega", startedAt: { gte: startedAt } } });
});

let nextId = 1;
async function rpc(method: string, params: object = {}, bearer: string | null = token) {
  const res = await POST(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        ...(bearer !== null && { authorization: `Bearer ${bearer}` }),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
    }),
  );
  return { status: res.status, body: await res.json() };
}

const callTool = async (args: object) => {
  const { body } = await rpc("tools/call", { name: "tasks_list", arguments: args });
  return JSON.parse(body.result.content[0].text) as { count: number; tasks: { id: string; projectId: string; stage: string; assigneeId: string }[] };
};

describe("POST /api/mcp (F16.1)", () => {
  it("không token / token sai / token đã thu hồi → 401", async () => {
    expect((await rpc("tools/list", {}, null)).status).toBe(401);
    expect((await rpc("tools/list", {}, "mrd_" + "x".repeat(43))).status).toBe(401);
    expect((await rpc("tools/list", {}, revoked)).status).toBe(401);
    expect((await rpc("tools/list", {}, "khong-phai-token")).status).toBe(401);
  });

  it("initialize → thông tin server; tools/list có tasks_list (tên không dấu chấm)", async () => {
    const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "it", version: "0" } });
    expect(init.status).toBe(200);
    expect(init.body.result.serverInfo).toMatchObject({ name: "meridian" });
    const tools = await rpc("tools/list");
    expect(tools.body.result.tools.map((t: { name: string }) => t.name)).toContain("tasks_list");
  });

  it("tasks_list: chỉ dự án agent thuộc về; lọc theo dự án, stage, 'me'", async () => {
    const vegaProjects = (await prisma.projectMember.findMany({ where: { memberId: "agent-vega" } })).map((p) => p.projectId);
    const all = await callTool({});
    expect(all.count).toBeGreaterThan(0);
    expect(all.tasks.every((t) => vegaProjects.includes(t.projectId))).toBe(true);
    // crm không có Vega trong seed → không thấy task crm.
    expect(all.tasks.some((t) => t.projectId === "crm")).toBe(false);

    const dev = await callTool({ projectId: "rv-web", stage: "Dev" });
    expect(dev.tasks.length).toBeGreaterThan(0);
    expect(dev.tasks.every((t) => t.projectId === "rv-web" && t.stage === "Dev")).toBe(true);
    const mine = await callTool({ assigneeId: "me" });
    expect(mine.tasks.length).toBeGreaterThan(0);
    expect(mine.tasks.every((t) => t.assigneeId === "agent-vega")).toBe(true);
    expect((await callTool({ projectId: "crm" })).count).toBe(0);
  });

  it("mỗi lệnh ghi nhật ký 'tasks.list'; lệnh có dự án gắn vào phiên đang chạy của agent (F16.2)", async () => {
    const log = await prisma.mcpLogEntry.findMany({ where: { agentId: "agent-vega", at: { gte: startedAt } } });
    expect(log.length).toBe(4); // 4 lệnh tasks_list ở test trên
    expect(log.every((l) => l.tool === "tasks.list" && l.result === "OK")).toBe(true);
    expect(log.map((l) => l.target)).toContain("rv-web · Dev");
    const session = await prisma.mcpSession.findFirstOrThrow({ where: { agentId: "agent-vega", projectId: "rv-web", startedAt: { gte: startedAt } } });
    expect(session).toMatchObject({ result: "DangChay", endedAt: null });
    // crm: Vega không thuộc → không mở phiên cho crm.
    expect(await prisma.mcpSession.count({ where: { agentId: "agent-vega", projectId: "crm", startedAt: { gte: startedAt } } })).toBe(0);
  });

  it("tasks_claim bị chặn → isError + nhật ký 'tasks.claim' kết quả Bị chặn (F16.3)", async () => {
    const done = await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "rv-web" }, stage: "Done" } });
    const { body } = await rpc("tools/call", { name: "tasks_claim", arguments: { taskId: done.id } });
    expect(body.result.isError).toBe(true);
    expect(JSON.parse(body.result.content[0].text)).toEqual({ claimed: false, reason: `${done.id} đã Done` });
    const entry = await prisma.mcpLogEntry.findFirstOrThrow({ where: { agentId: "agent-vega", tool: "tasks.claim" }, orderBy: { at: "desc" } });
    expect(entry).toMatchObject({ target: done.id, result: "BiChan" });
  });

  it("GET / DELETE → 405 (không stream SSE ở chế độ stateless)", async () => {
    expect(GET().status).toBe(405);
    expect(DELETE().status).toBe(405);
  });
});
