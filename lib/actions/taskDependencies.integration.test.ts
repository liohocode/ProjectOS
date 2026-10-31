import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFeaturesByProject } from "@/lib/data/features";
import { claimTask, listTasksForMember } from "@/lib/domain/tasks";
import { setTaskDependency } from "./tasks";

// F21.8 — phụ thuộc giữa task, trên rv-app (task không chạy, chưa Done).
let a = "";
let b = "";
let c = "";
let agentId = "";
let crmTask = "";

beforeAll(async () => {
  // b, c: không chạy, không block (để claim thử ra đúng lý do "đang chờ"); a: task bất kỳ chưa Done.
  const free = await prisma.task.findMany({
    where: { feature: { projectId: "rv-app", status: "active" }, stage: { not: "Done" }, runningSince: null, blocked: null },
    orderBy: { id: "asc" },
    take: 2,
  });
  [b, c] = free.map((t) => t.id);
  a = (await prisma.task.findFirstOrThrow({
    where: { feature: { projectId: "rv-app", status: "active" }, stage: { not: "Done" }, id: { notIn: [b, c] } },
    orderBy: { id: "asc" },
  })).id;
  expect(c).toBeTruthy();
  agentId = (await prisma.projectMember.findFirstOrThrow({ where: { projectId: "rv-app", member: { kind: "agent" } }, orderBy: { memberId: "asc" } })).memberId;
  crmTask = (await prisma.task.findFirstOrThrow({ where: { feature: { projectId: "crm" } } })).id;
});
afterAll(async () => {
  await prisma.taskDependency.deleteMany({ where: { taskId: { in: [a, b, c] } } });
});

const view = async (id: string) => (await getFeaturesByProject("rv-app")).flatMap((f) => f.tasks).find((t) => t.id === id)!;

describe("phụ thuộc giữa task (F21.8)", () => {
  it("thêm phụ thuộc → hiện hai chiều; chặn tự phụ thuộc, vòng, khác dự án", async () => {
    expect(await setTaskDependency(b, a, true)).toEqual({ ok: true });
    expect(await setTaskDependency(c, b, true)).toEqual({ ok: true });
    expect((await view(b)).dependsOn.map((d) => d.id)).toEqual([a]);
    expect((await view(a)).blocking.map((d) => d.id)).toEqual([b]);

    expect(await setTaskDependency(a, a, true)).toEqual({ ok: false, error: "Task không phụ thuộc chính nó" });
    expect(await setTaskDependency(a, c, true)).toMatchObject({ ok: false, error: expect.stringContaining("sẽ tạo vòng") });
    expect(await setTaskDependency(a, crmTask, true)).toMatchObject({ ok: false, error: expect.stringContaining("Không tìm thấy task") });
    // Thêm lại cạnh đã có → không lỗi, không nhân đôi.
    expect(await setTaskDependency(b, a, true)).toEqual({ ok: true });
    expect(await prisma.taskDependency.count({ where: { taskId: b } })).toBe(1);
  });

  it("agent không claim được task còn chờ; MCP tasks_list trả waitingOn", async () => {
    expect(await claimTask(agentId, b)).toMatchObject({ ok: false, reason: `${b} đang chờ ${a} xong trước` });
    expect((await listTasksForMember(agentId, { projectId: "rv-app" })).find((t) => t.id === b)?.waitingOn).toEqual([a]);
  });

  it("bỏ phụ thuộc", async () => {
    expect(await setTaskDependency(b, a, false)).toEqual({ ok: true });
    expect((await view(b)).dependsOn).toEqual([]);
  });
});
