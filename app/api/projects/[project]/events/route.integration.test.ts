import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { GET } from "./route";

// F17.2 — sự kiện mới theo con trỏ. Session mock: Trung Hiếu (thuộc cả 3 dự án).
const startedAt = new Date();
afterAll(async () => {
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.mcpLogEntry.deleteMany({ where: { at: { gte: startedAt } } });
});

async function get(project: string, after?: string) {
  const url = `http://localhost/api/projects/${project}/events${after !== undefined ? `?after=${after}` : ""}`;
  const res = await GET(new Request(url), { params: Promise.resolve({ project }) });
  return { status: res.status, body: await res.json() };
}

describe("GET /api/projects/[project]/events (F17.2)", () => {
  it("không có after → chỉ trả con trỏ; con trỏ cũ → đúng các sự kiện + dòng nhật ký mới, con trỏ tiến lên", async () => {
    const first = await get("rv-web");
    expect(first).toMatchObject({ status: 200, body: { events: [], mcpLog: [] } });
    const cursor = first.body.cursor as string;

    const at = new Date(Number(cursor) + 5);
    await prisma.activityEvent.create({ data: { projectId: "rv-web", actorId: "agent-atlas", type: "task", tone: "ok", text: "IT sự kiện mới", tool: "tasks.comment", taskId: "T-405", at } });
    await prisma.activityEvent.create({ data: { projectId: "crm", actorId: "hieu", type: "task", tone: "ok", text: "IT dự án khác", at } });
    await prisma.mcpLogEntry.create({ data: { agentId: "agent-atlas", tool: "tasks.comment", target: "T-405", result: "OK", at } });

    const t0 = performance.now();
    const next = await get("rv-web", cursor);
    const elapsed = performance.now() - t0;
    expect(next.status).toBe(200);
    expect(next.body.events.map((e: { text: string }) => e.text)).toEqual(["IT sự kiện mới"]);
    expect(next.body.events[0]).toMatchObject({ who: "Atlas", tool: "tasks.comment", taskId: "T-405", id: expect.any(String) });
    expect(next.body.mcpLog).toHaveLength(1);
    expect(Number(next.body.cursor)).toBe(at.getTime());
    expect(elapsed).toBeLessThan(300);

    // Gọi lại với con trỏ mới → không có gì.
    expect((await get("rv-web", next.body.cursor)).body).toMatchObject({ events: [], mcpLog: [], cursor: next.body.cursor });
  });

  it("chặn: chưa đăng nhập 401, không thuộc dự án 404, con trỏ sai 400", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValueOnce(null);
    expect((await get("rv-web", "0")).status).toBe(401);
    vi.mocked(getSessionMemberId).mockResolvedValueOnce("nam");
    expect((await get("rv-app", "0")).status).toBe(404);
    expect((await get("rv-web", "abc")).status).toBe(400);
  });
});
