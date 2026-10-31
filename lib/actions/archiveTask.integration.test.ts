import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getArchivedTask, getFeaturesByProject, getTaskCountsByProject } from "@/lib/data/features";
import { claimTask, listTasksForMember } from "@/lib/domain/tasks";
import { setTaskArchived } from "./tasks";

// F21.4 — lưu trữ task. Task rv-app không chạy (không đụng feed rv-web của aggregates.integration.test.ts).
let taskId = "";
let agentId = "";
const startedAt = new Date();

beforeAll(async () => {
  taskId = (await prisma.task.findFirstOrThrow({
    where: { feature: { projectId: "rv-app", status: "active" }, runningSince: null, stage: { not: "Done" }, blocked: null },
    orderBy: { id: "desc" },
  })).id;
  agentId = (await prisma.projectMember.findFirstOrThrow({ where: { projectId: "rv-app", member: { kind: "agent" } }, orderBy: { memberId: "asc" } })).memberId;
});
afterAll(async () => {
  await prisma.task.update({ where: { id: taskId }, data: { archivedAt: null } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

const inList = async () => (await getFeaturesByProject("rv-app")).some((f) => f.tasks.some((t) => t.id === taskId));

describe("lưu trữ task (F21.4)", () => {
  it("lưu trữ → ẩn khỏi list, đếm, MCP; vẫn mở được qua deep link; agent không claim được", async () => {
    const before = await getTaskCountsByProject("rv-app");
    expect(await setTaskArchived(taskId, true)).toEqual({ ok: true });
    expect(await inList()).toBe(false);
    expect((await getTaskCountsByProject("rv-app")).total).toBe(before.total - 1);
    expect(await getArchivedTask("rv-app", taskId)).toMatchObject({ task: { id: taskId, archived: true } });
    expect(await getArchivedTask("crm", taskId)).toBeNull();
    expect((await listTasksForMember(agentId, { projectId: "rv-app" })).some((t) => t.id === taskId)).toBe(false);
    expect(await claimTask(agentId, taskId)).toMatchObject({ ok: false, reason: `${taskId} đã được lưu trữ` });
    expect(await setTaskArchived(taskId, true)).toEqual({ ok: false, error: "Task đã được lưu trữ" });
  });

  it("khôi phục → về list; task đang chạy không lưu trữ được", async () => {
    expect(await setTaskArchived(taskId, false)).toEqual({ ok: true });
    expect(await inList()).toBe(true);
    expect(await getArchivedTask("rv-app", taskId)).toBeNull();
    const running = await prisma.task.findFirstOrThrow({ where: { runningSince: { not: null } } });
    expect(await setTaskArchived(running.id, true)).toEqual({ ok: false, error: "Task đang chạy — dừng (đổi trạng thái) trước khi lưu trữ" });
  });
});
