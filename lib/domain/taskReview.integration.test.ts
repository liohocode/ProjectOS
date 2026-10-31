import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { approveTaskReview, returnTaskReview, updateTaskStage } from "@/lib/actions/tasks";
import { claimTask, listTasksForMember, updateTaskByAgent } from "./tasks";

// F22.2 — cổng review: agent đẩy Review → lead trả lại kèm lý do → agent thấy lý do, làm lại → lead duyệt Done.
const startedAt = new Date();
let taskId = "";
let snapshot: { assigneeId: string; stage: string; status: string; runningSince: Date | null } | null = null;

afterAll(async () => {
  if (snapshot) await prisma.task.update({ where: { id: taskId }, data: { ...snapshot, stage: snapshot.stage as never, status: snapshot.status as never } });
  await prisma.taskTransition.deleteMany({ where: { taskId, at: { gte: startedAt } } });
  await prisma.taskComment.deleteMany({ where: { taskId, createdAt: { gte: startedAt } } });
  await prisma.member.update({ where: { id: "agent-scout" }, data: { current: "Chưa có việc" } });
  await prisma.activityEvent.deleteMany({ where: { at: { gte: startedAt } } });
  await prisma.memberActivity.deleteMany({ where: { at: { gte: startedAt } } });
});

const asNam = () => vi.mocked(getSessionMemberId).mockResolvedValue("nam");
const asHieu = () => vi.mocked(getSessionMemberId).mockResolvedValue("hieu");

describe("cổng review (F22.2)", () => {
  it("trả lại kèm lý do → về Dev, agent thấy lý do qua MCP; làm lại → duyệt Done", async () => {
    const t = await prisma.task.findFirstOrThrow({
      where: { feature: { projectId: "rv-web" }, stage: { notIn: ["Done", "Review"] }, blocked: null, runningSince: null },
      orderBy: { id: "asc" },
    });
    taskId = t.id;
    snapshot = { assigneeId: t.assigneeId, stage: t.stage, status: t.status, runningSince: t.runningSince };

    expect(await claimTask("agent-scout", taskId)).toMatchObject({ ok: true });
    expect(await updateTaskByAgent("agent-scout", taskId, { stage: "Review", status: "Chờ review" })).toMatchObject({ ok: true });

    // Thành viên thường không duyệt được, cũng không đẩy thẳng task của agent sang Done.
    asNam();
    try {
      expect(await approveTaskReview(taskId)).toEqual({ ok: false, error: "Chỉ tech lead hoặc người tạo dự án được duyệt / trả lại task" });
      expect(await updateTaskStage(taskId, "Done")).toEqual({ ok: false, error: "Task của agent phải được tech lead / người tạo dự án duyệt mới sang Done" });
    } finally {
      asHieu();
    }

    expect(await returnTaskReview(taskId, " ")).toEqual({ ok: false, error: "Nhập lý do trả lại" });
    expect(await returnTaskReview(taskId, "Thiếu test cho trường hợp lọc rỗng")).toEqual({ ok: true });
    const returned = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    expect(returned).toMatchObject({ stage: "Dev", status: "DangLam", runningSince: null });
    const [view] = (await listTasksForMember("agent-scout", { projectId: "rv-web" })).filter((x) => x.id === taskId);
    expect(view.lastReturn).toMatchObject({ reason: "Thiếu test cho trường hợp lọc rỗng" });
    expect(await prisma.taskComment.count({ where: { taskId, body: { contains: "Thiếu test" } } })).toBe(1);

    // Agent làm lại, đẩy Review lần hai; lead duyệt.
    expect(await updateTaskByAgent("agent-scout", taskId, { stage: "Review", status: "Chờ review" })).toMatchObject({ ok: true });
    expect(await approveTaskReview(taskId)).toEqual({ ok: true });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: taskId } })).toMatchObject({ stage: "Done", status: "Xong" });
    expect(await approveTaskReview(taskId)).toEqual({ ok: false, error: `${taskId} không ở stage Review` });

    const history = await prisma.taskTransition.findMany({ where: { taskId, at: { gte: startedAt } }, orderBy: { at: "asc" }, select: { toStage: true, note: true } });
    expect(history.filter((h) => h.toStage).map((h) => [h.toStage, h.note])).toEqual([
      ["Review", null],
      ["Dev", "Thiếu test cho trường hợp lọc rỗng"],
      ["Review", null],
      ["Done", null],
    ]);
  });
});
