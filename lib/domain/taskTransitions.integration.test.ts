import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTask, updateTaskStage, updateTaskStatus } from "@/lib/actions/tasks";
import { claimTask, updateTaskByAgent } from "./tasks";

// F22.1 — mọi đường đổi stage / trạng thái đều có dòng TaskTransition (web: server action; mcp: claim + cập nhật của agent).
const startedAt = new Date();
let taskId = "";

afterAll(async () => {
  if (taskId) await prisma.task.delete({ where: { id: taskId } });
  await prisma.member.update({ where: { id: "agent-scout" }, data: { current: "Chưa có việc" } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

const history = () =>
  prisma.taskTransition.findMany({
    where: { taskId },
    orderBy: { at: "asc" },
    select: { actorId: true, via: true, fromStage: true, toStage: true, fromStatus: true, toStatus: true },
  });

describe("TaskTransition (F22.1)", () => {
  it("tạo → chuyển stage → đổi trạng thái (web) → agent claim + cập nhật (mcp): đủ từng bước, đúng người và kênh", async () => {
    const feature = await prisma.feature.findFirstOrThrow({ where: { projectId: "crm", status: "active" } });
    const created = await createTask({
      projectId: "crm",
      featureId: feature.id,
      title: "IT lịch sử trạng thái",
      stage: "BA",
      assigneeId: "agent-scout",
      estimatePoints: null,
      dueDate: null,
    });
    expect(created).toMatchObject({ ok: true });
    taskId = (created as { taskId: string }).taskId;

    expect(await updateTaskStage(taskId, "Dev")).toEqual({ ok: true });
    expect(await updateTaskStage(taskId, "Dev")).toEqual({ ok: true }); // không đổi → không ghi
    expect(await updateTaskStatus(taskId, "Đang làm")).toEqual({ ok: true });
    expect(await claimTask("agent-scout", taskId)).toMatchObject({ ok: true });
    expect(await updateTaskByAgent("agent-scout", taskId, { stage: "Review", status: "Chờ review" })).toMatchObject({ ok: true });

    expect(await history()).toEqual([
      { actorId: "hieu", via: "web", fromStage: null, toStage: "BA", fromStatus: null, toStatus: "Cho" },
      { actorId: "hieu", via: "web", fromStage: "BA", toStage: "Dev", fromStatus: null, toStatus: null },
      { actorId: "hieu", via: "web", fromStage: null, toStage: null, fromStatus: "Cho", toStatus: "DangLam" },
      { actorId: "agent-scout", via: "mcp", fromStage: null, toStage: null, fromStatus: "DangLam", toStatus: "DangChay" },
      { actorId: "agent-scout", via: "mcp", fromStage: "Dev", toStage: "Review", fromStatus: "DangChay", toStatus: "ChoReview" },
    ]);
  });
});
