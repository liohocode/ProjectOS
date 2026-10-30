import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateAgentToken, hashAgentToken } from "@/lib/auth/tokenFormat";
import { RATE_LIMIT_PER_MINUTE } from "@/lib/mcp/governance";
import { POST } from "./route";

// F16.7 — governance trước mỗi lệnh MCP. Seed: Scout chỉ có meridian-docs + "Chỉ đọc"; Bảo có cả hai server.
const tokens: Record<string, { raw: string; id: string }> = {};
const startedAt = new Date();
let flowsReadBy: string[] = [];

beforeAll(async () => {
  flowsReadBy = (await prisma.doc.findUniqueOrThrow({ where: { id: "flows" } })).readBy;
  for (const memberId of ["agent-scout", "agent-bao"]) {
    const raw = generateAgentToken();
    const row = await prisma.agentToken.create({ data: { memberId, name: "IT gov", tokenHash: hashAgentToken(raw), lastFour: raw.slice(-4) } });
    tokens[memberId] = { raw, id: row.id };
  }
});
afterAll(async () => {
  // Gồm cả 60 dòng đổ vào với mốc thời gian trước startedAt (test rate limit).
  await prisma.mcpLogEntry.deleteMany({
    where: { agentId: { in: ["agent-scout", "agent-bao"] }, OR: [{ at: { gte: startedAt } }, { token: { name: "IT gov" } }] },
  });
  await prisma.mcpSession.deleteMany({ where: { agentId: { in: ["agent-scout", "agent-bao"] }, startedAt: { gte: startedAt } } });
  await prisma.agentToken.deleteMany({ where: { name: "IT gov" } });
  // docs_read của Scout ghi "đã đọc".
  await prisma.doc.update({ where: { id: "flows" }, data: { readBy: flowsReadBy } });
});

let id = 1;
async function call(agent: string, name: string, args: object) {
  const res = await POST(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        authorization: `Bearer ${tokens[agent].raw}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: id++, method: "tools/call", params: { name, arguments: args } }),
    }),
  );
  const body = await res.json();
  return { isError: Boolean(body.result?.isError), data: JSON.parse(body.result.content[0].text) };
}

const lastLog = (agentId: string) => prisma.mcpLogEntry.findFirstOrThrow({ where: { agentId, at: { gte: startedAt } }, orderBy: { at: "desc" } });

describe("governance MCP (F16.7)", () => {
  it("Scout (Chỉ đọc) gọi docs_append → bị chặn, nhật ký 'Bị chặn' kèm token; tài liệu không có revision mới", async () => {
    const before = await prisma.docRevision.count({ where: { docId: "flows" } });
    const r = await call("agent-scout", "docs_append", { docId: "flows", what: "IT", summary: "x" });
    expect(r).toMatchObject({ isError: true, data: { denied: true, reason: expect.stringContaining("Chỉ đọc") } });
    expect(await lastLog("agent-scout")).toMatchObject({ tool: "docs.append", result: "BiChan", tokenId: tokens["agent-scout"].id });
    expect(await prisma.docRevision.count({ where: { docId: "flows" } })).toBe(before);
  });

  it("server chưa cấu hình cho agent → chặn (Scout không có meridian-core); có thì được (docs_read)", async () => {
    expect(await call("agent-scout", "tasks_list", {})).toMatchObject({ isError: true, data: { reason: expect.stringContaining("meridian-core") } });
    expect(await call("agent-scout", "docs_read", { docId: "flows" })).toMatchObject({ isError: false, data: { id: "flows" } });
  });

  it("features_propose: agent không có canProposeFeatures → bị chặn (F16.6)", async () => {
    // Scout không có quyền đề xuất (và cũng thiếu meridian-core) → chặn trước khi tạo gì.
    const before = await prisma.feature.count();
    expect(await call("agent-scout", "features_propose", { projectId: "rv-web", name: "IT x", description: "x" })).toMatchObject({ isError: true });
    expect(await prisma.feature.count()).toBe(before);
  });

  it(`lệnh thứ ${RATE_LIMIT_PER_MINUTE + 1} trong một phút → bị chặn`, async () => {
    const now = Date.now();
    // Đã có 60 lệnh của token Bảo trong 60 giây qua (đổ thẳng vào nhật ký thay vì gọi 60 lần).
    await prisma.mcpLogEntry.createMany({
      data: Array.from({ length: RATE_LIMIT_PER_MINUTE }, (_, i) => ({
        agentId: "agent-bao",
        tokenId: tokens["agent-bao"].id,
        tool: "tasks.list",
        target: "IT",
        result: "OK" as const,
        at: new Date(now - 30_000 + i),
      })),
    });
    const r = await call("agent-bao", "tasks_list", {});
    expect(r).toMatchObject({ isError: true, data: { reason: expect.stringContaining("lệnh/phút") } });
    expect(await lastLog("agent-bao")).toMatchObject({ target: "rate limit", result: "BiChan" });
  });

  it("dưới giới hạn → bình thường (token khác không bị ảnh hưởng)", async () => {
    const raw = generateAgentToken();
    await prisma.agentToken.create({ data: { memberId: "agent-bao", name: "IT gov", tokenHash: hashAgentToken(raw), lastFour: raw.slice(-4) } });
    tokens["agent-bao"] = { raw, id: "" };
    expect(await call("agent-bao", "tasks_list", { projectId: "rv-web" })).toMatchObject({ isError: false });
  });
});
