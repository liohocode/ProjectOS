"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseTaskStatus, TASK_STATUS_LABEL } from "@/lib/taskFormat";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

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
  await recordActivity("ph-arrow-right", `Chuyển ${input.data.taskId} sang ${input.data.stage}`);
  revalidateTaskViews();
  return ok();
}

export async function updateTaskStatus(taskId: string, status: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ taskId: taskIdSchema, status: statusSchema }).safeParse({ taskId, status });
  if (!input.success) return fail(input.error.issues[0].message);

  if (!(await findTaskProject(input.data.taskId))) return fail(`Không tìm thấy task ${input.data.taskId}`);
  await prisma.task.update({ where: { id: input.data.taskId }, data: { status: parseTaskStatus(input.data.status) } });
  await recordActivity("ph-check-circle", `Đổi trạng thái ${input.data.taskId} → ${input.data.status}`);
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
    include: { member: { select: { name: true } } },
  });
  if (!membership) return fail("Người/agent này không thuộc dự án của task");

  const task = await prisma.task.update({ where: { id: input.data.taskId }, data: { assigneeId: input.data.memberId }, select: { title: true } });
  // Cột "Đang làm" ở màn team (F13.3): việc vừa được giao.
  await prisma.member.update({ where: { id: input.data.memberId }, data: { current: `${input.data.taskId} ${task.title}` } });
  await recordActivity("ph-share-network", `Giao ${input.data.taskId} cho ${membership.member.name}`);
  revalidateTaskViews();
  return ok();
}

const titleSchema = z.string().trim().min(1, "Nhập tiêu đề task").max(200, "Tiêu đề tối đa 200 ký tự");
const estimateSchema = z
  .number({ error: "Ước lượng phải là số" })
  .int("Ước lượng là số nguyên")
  .min(0, "Ước lượng không âm")
  .max(100, "Ước lượng tối đa 100 điểm")
  .nullable();
/** "YYYY-MM-DD" từ <input type="date">; null = chưa có hạn */
const dueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Hạn không hợp lệ").nullable();
const toDueDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

const newTaskSchema = z.object({
  projectId: z.string().trim().min(1, "Thiếu dự án"),
  featureId: z.string().trim().min(1, "Chọn feature"),
  title: titleSchema,
  stage: stageSchema,
  assigneeId: memberIdSchema,
  estimatePoints: estimateSchema,
  dueDate: dueDateSchema,
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
        dueDate: toDueDate(data.dueDate),
      },
    });
    return id;
  });

  await recordActivity("ph-plus-circle", `Tạo ${taskId} — ${data.title}`);
  revalidateTaskViews();
  return { ok: true, taskId };
}

const blockSchema = z
  .object({
    short: z.string().trim().min(1, "Nhập lý do ngắn").max(40, "Lý do ngắn tối đa 40 ký tự"),
    full: z.string().trim().max(500, "Mô tả tối đa 500 ký tự"),
  })
  .nullable();

/** Đặt block (lý do ngắn hiện ở hàng task/banner, mô tả đầy đủ trong drawer) hoặc gỡ block khi `block = null`. */
export async function setTaskBlocked(taskId: string, block: { short: string; full: string } | null): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ taskId: taskIdSchema, block: blockSchema }).safeParse({ taskId, block });
  if (!input.success) return fail(input.error.issues[0].message);

  if (!(await findTaskProject(input.data.taskId))) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const value = input.data.block;
  await prisma.task.update({
    where: { id: input.data.taskId },
    data: { blocked: value?.short ?? null, blockedFull: value ? value.full || null : null },
  });
  await recordActivity(
    value ? "ph-warning" : "ph-check",
    value ? `Đánh dấu ${input.data.taskId} bị block: ${value.short}` : `Gỡ block ${input.data.taskId}`,
  );
  revalidateTaskViews();
  return ok();
}

const taskPatchSchema = z
  .object({ title: titleSchema, estimatePoints: estimateSchema, dueDate: dueDateSchema })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Không có gì để cập nhật");
export type TaskPatch = z.input<typeof taskPatchSchema>;

/** Sửa nhanh tiêu đề / ước lượng / hạn (field không có trong patch giữ nguyên). */
export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ taskId: taskIdSchema, patch: taskPatchSchema }).safeParse({ taskId, patch });
  if (!input.success) return fail(input.error.issues[0].message);

  if (!(await findTaskProject(input.data.taskId))) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const { title, estimatePoints, dueDate } = input.data.patch;
  await prisma.task.update({
    where: { id: input.data.taskId },
    data: {
      ...(title !== undefined && { title }),
      ...(estimatePoints !== undefined && { estimatePoints }),
      ...(dueDate !== undefined && { dueDate: toDueDate(dueDate) }),
    },
  });
  const changed = [title !== undefined && "tiêu đề", estimatePoints !== undefined && "ước lượng", dueDate !== undefined && "hạn"].filter(Boolean);
  await recordActivity("ph-pencil-simple", `Sửa ${input.data.taskId} (${changed.join(", ")})`);
  revalidateTaskViews();
  return ok();
}
