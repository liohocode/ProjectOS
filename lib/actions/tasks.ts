"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseTaskStatus, TASK_STATUS_LABEL } from "@/lib/taskFormat";
import { fail, ok, type ActionResult } from "./result";

const TASK_STAGES = ["BA", "TA", "Dev", "Review", "Done"] as const;

const taskIdSchema = z.string().trim().min(1, "Thiếu mã task");
const stageSchema = z.enum(TASK_STAGES, { error: "Stage không hợp lệ" });
const statusSchema = z.enum(Object.values(TASK_STATUS_LABEL) as [string, ...string[]], { error: "Trạng thái không hợp lệ" });
const memberIdSchema = z.string().trim().min(1, "Thiếu người/agent thực hiện");

/** Lấy projectId của task; null nếu task không tồn tại. */
async function findTaskProject(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { feature: { select: { projectId: true } } } });
  return task?.feature.projectId ?? null;
}

// Thay đổi task ảnh hưởng màn work, badge nav (layout), số liệu team và portfolio (portfolio liệt kê
// mọi dự án dưới mọi /[project]) → revalidate toàn bộ cây /[project].
function revalidateTaskViews() {
  revalidatePath("/[project]", "layout");
}

export async function updateTaskStage(taskId: string, stage: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ taskId: taskIdSchema, stage: stageSchema }).safeParse({ taskId, stage });
  if (!input.success) return fail(input.error.issues[0].message);

  if (!(await findTaskProject(input.data.taskId))) return fail(`Không tìm thấy task ${input.data.taskId}`);
  await prisma.task.update({ where: { id: input.data.taskId }, data: { stage: input.data.stage } });
  revalidateTaskViews();
  return ok();
}

export async function updateTaskStatus(taskId: string, status: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ taskId: taskIdSchema, status: statusSchema }).safeParse({ taskId, status });
  if (!input.success) return fail(input.error.issues[0].message);

  if (!(await findTaskProject(input.data.taskId))) return fail(`Không tìm thấy task ${input.data.taskId}`);
  await prisma.task.update({ where: { id: input.data.taskId }, data: { status: parseTaskStatus(input.data.status) } });
  revalidateTaskViews();
  return ok();
}

/** Giao task cho người/agent — chỉ thành viên thuộc dự án của task (bảng ProjectMember). */
export async function assignTask(taskId: string, memberId: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ taskId: taskIdSchema, memberId: memberIdSchema }).safeParse({ taskId, memberId });
  if (!input.success) return fail(input.error.issues[0].message);

  const projectId = await findTaskProject(input.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId, memberId: input.data.memberId } },
  });
  if (!membership) return fail("Người/agent này không thuộc dự án của task");

  await prisma.task.update({ where: { id: input.data.taskId }, data: { assigneeId: input.data.memberId } });
  revalidateTaskViews();
  return ok();
}

const newTaskSchema = z.object({
  projectId: z.string().trim().min(1, "Thiếu dự án"),
  featureId: z.string().trim().min(1, "Chọn feature"),
  title: z.string().trim().min(1, "Nhập tiêu đề task").max(200, "Tiêu đề tối đa 200 ký tự"),
  stage: stageSchema,
  assigneeId: memberIdSchema,
  estimatePoints: z.number({ error: "Ước lượng phải là số" }).int("Ước lượng là số nguyên").min(0).max(100, "Ước lượng tối đa 100 điểm").nullable(),
  /** "YYYY-MM-DD" từ <input type="date">; null = chưa có hạn */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Hạn không hợp lệ").nullable(),
});
export type NewTaskInput = z.input<typeof newTaskSchema>;

/**
 * Tạo task mới với id `T-<số lớn nhất + 1>` (ADR-006). Sinh id trong transaction có advisory lock
 * để hai request tạo cùng lúc không lấy trùng số.
 */
export async function createTask(input: NewTaskInput): Promise<ActionResult<{ taskId: string }>> {
  // TODO(F15.4): kiểm tra quyền
  const parsed = newTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  const feature = await prisma.feature.findUnique({ where: { id: data.featureId }, select: { projectId: true } });
  if (!feature || feature.projectId !== data.projectId) return fail("Feature không thuộc dự án này");
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId: data.projectId, memberId: data.assigneeId } },
  });
  if (!membership) return fail("Người/agent này không thuộc dự án");

  const taskId = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('meridian:task-id'))`;
    const [{ max }] = await tx.$queryRaw<{ max: number }[]>`
      SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0) AS max FROM tasks WHERE id ~ '^T-[0-9]+$'`;
    const id = `T-${max + 1}`;
    await tx.task.create({
      data: {
        id,
        featureId: data.featureId,
        title: data.title,
        stage: data.stage,
        assigneeId: data.assigneeId,
        status: "Cho",
        estimatePoints: data.estimatePoints,
        dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00Z`) : null,
      },
    });
    return id;
  });

  revalidateTaskViews();
  return { ok: true, taskId };
}
