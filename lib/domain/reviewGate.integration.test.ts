import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateTaskStage } from "@/lib/actions/tasks";
import { updateTaskByAgent } from "./tasks";

// F22.3 — vào Review cần mọi acceptance criterion (F21.6) đạt, cả từ web lẫn MCP.
// Task rv-app (không đụng feed rv-web của aggregates.integration.test.ts); trả lại trạng thái seed sau khi chạy.
let task: { id: string; stage: string; status: string; assigneeId: string; runningSince: Date | null };
let agentId = "";
const startedAt = new Date();

beforeAll(async () => {
  const row = await prisma.task.findFirstOrThrow({
    where: { feature: { projectId: "rv-app", status: "active" }, stage: { in: ["BA", "TA", "Dev"] }, blocked: null },
    orderBy: { id: "asc" },
  });
  task = { id: row.id, stage: row.stage, status: row.status, assigneeId: row.assigneeId, runningSince: row.runningSince };
  agentId = (await prisma.projectMember.findFirstOrThrow({ where: { projectId: "rv-app", member: { kind: "agent" } }, orderBy: { memberId: "asc" } })).memberId;
  await prisma.task.update({ where: { id: task.id }, data: { stage: "Dev", assigneeId: agentId } });
  await prisma.taskCriterion.create({ data: { taskId: task.id, text: "IT có test mất mạng", position: 1 } });
});
afterAll(async () => {
  await prisma.taskCriterion.deleteMany({ where: { text: "IT có test mất mạng" } });
  await prisma.task.update({
    where: { id: task.id },
    data: { stage: task.stage as never, status: task.status as never, assigneeId: task.assigneeId, runningSince: task.runningSince },
  });
  await prisma.taskTransition.deleteMany({ where: { taskId: task.id, at: { gte: startedAt } } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

describe("cổng vào Review (F22.3)", () => {
  it("còn tiêu chí chưa đạt → chặn cả web lẫn MCP, task giữ nguyên stage", async () => {
    const reason = 'Còn 1 tiêu chí chưa đạt: "IT có test mất mạng" — tick khi đã đạt rồi mới chuyển sang Review';
    expect(await updateTaskStage(task.id, "Review")).toEqual({ ok: false, error: reason });
    expect(await updateTaskByAgent(agentId, task.id, { stage: "Review", status: "Chờ review" })).toMatchObject({ ok: false, reason });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).stage).toBe("Dev");
  });

  it("tick đủ → chuyển được", async () => {
    await prisma.taskCriterion.updateMany({ where: { taskId: task.id }, data: { doneAt: new Date(), doneById: agentId } });
    expect(await updateTaskByAgent(agentId, task.id, { stage: "Review", status: "Chờ review" })).toMatchObject({ ok: true, task: { stage: "Review" } });
  });
});
