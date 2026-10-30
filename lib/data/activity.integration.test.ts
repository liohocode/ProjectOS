import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { setTaskBlocked } from "@/lib/actions/tasks";
import { recordToolCall } from "@/lib/mcp/audit";
import { getActivityFeed } from "./activity";

// F17.1 — activity rail đọc sự kiện thật: thao tác trên web và lệnh MCP đều hiện, mới nhất trên cùng.
const startedAt = new Date();
let task = "";

afterAll(async () => {
  if (task) await prisma.task.update({ where: { id: task }, data: { blocked: null, blockedFull: null } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.mcpLogEntry.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.mcpSession.deleteMany({ where: { startedAt: { gte: startedAt } } });
});

describe("getActivityFeed (F17.1)", () => {
  it("đặt block trên web → sự kiện 'block' của người thao tác đứng đầu rail, gắn task", async () => {
    task = (await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "crm" }, blocked: null, stage: { not: "Done" } } })).id;
    expect(await setTaskBlocked(task, { short: "IT chờ API", full: "" })).toEqual({ ok: true });
    const [top] = await getActivityFeed("crm");
    expect(top).toMatchObject({ who: "Trung Hiếu", kind: "human", tone: "block", tool: "web", taskId: task, text: expect.stringContaining("IT chờ API") });
  });

  it("lệnh MCP có sự kiện → hiện với tên tool; lệnh chỉ đọc (không event) không hiện", async () => {
    await recordToolCall({ agentId: "agent-atlas", tool: "tasks_list", target: "crm", result: "OK", projectId: "crm" });
    await recordToolCall({
      agentId: "agent-atlas",
      tool: "tasks_comment",
      target: task,
      result: "OK",
      projectId: "crm",
      taskId: task,
      event: { type: "task", tone: "ok", text: `Bình luận ${task}: IT xong phần API`, taskId: task },
    });
    const feed = await getActivityFeed("crm");
    expect(feed[0]).toMatchObject({ who: "Atlas", kind: "agent", tool: "tasks.comment", text: expect.stringContaining("IT xong phần API") });
    expect(feed.some((i) => i.tool === "tasks.list")).toBe(false);
    // Dự án khác không thấy.
    expect((await getActivityFeed("rv-app")).some((i) => i.text.includes("IT xong phần API"))).toBe(false);
  });
});
