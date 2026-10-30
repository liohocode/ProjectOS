import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordToolCall } from "@/lib/mcp/audit";
import { claimTask } from "@/lib/domain/tasks";
import { getTaskDrawerInfo } from "./taskDrawer";

// F17.4 — drawer của task vừa được agent claim qua MCP hiển thị đúng các bước đã diễn ra (theo thứ tự) + tài liệu đã đọc.
const startedAt = new Date();
let task = "";
let snapshot: { assigneeId: string; status: string; runningSince: Date | null } | null = null;
let current = "";

afterAll(async () => {
  if (task && snapshot) await prisma.task.update({ where: { id: task }, data: { ...snapshot, status: snapshot.status as never } });
  await prisma.member.update({ where: { id: "agent-scout" }, data: { current } });
  await prisma.mcpLogEntry.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.mcpSession.deleteMany({ where: { startedAt: { gte: startedAt } } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

describe("getTaskDrawerInfo — log phiên thật (F17.4)", () => {
  it("claim → đọc tài liệu → bình luận: log đúng thứ tự, context docs từ docs.read trong phiên", async () => {
    const t = await prisma.task.findFirstOrThrow({
      where: { feature: { projectId: "crm" }, stage: { not: "Done" }, blocked: null, runningSince: null },
      orderBy: { id: "asc" },
    });
    task = t.id;
    snapshot = { assigneeId: t.assigneeId, status: t.status, runningSince: t.runningSince };
    current = (await prisma.member.findUniqueOrThrow({ where: { id: "agent-scout" } })).current;
    const doc = await prisma.doc.findFirstOrThrow({ where: { projectId: "crm" } });

    const claim = await claimTask("agent-scout", task);
    expect(claim.ok).toBe(true);
    const base = Date.now();
    await recordToolCall({ agentId: "agent-scout", tool: "tasks_claim", target: task, result: "OK", projectId: "crm", taskId: task }, new Date(base));
    await recordToolCall({ agentId: "agent-scout", tool: "docs_read", target: doc.id, result: "OK", projectId: "crm" }, new Date(base + 1000));
    await recordToolCall({ agentId: "agent-scout", tool: "tasks_comment", target: task, result: "OK", projectId: "crm", taskId: task }, new Date(base + 2000));

    const info = await getTaskDrawerInfo("crm", task);
    expect(info!.sessionLog.map((s) => s.text)).toEqual([
      `Scout gọi tasks.claim — ${task}`,
      `Scout gọi tasks.comment — ${task}`,
      "Đang chạy",
    ]);
    expect(info!.contextDocs).toEqual([doc.title]);
  });
});
