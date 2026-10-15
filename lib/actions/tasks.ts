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
