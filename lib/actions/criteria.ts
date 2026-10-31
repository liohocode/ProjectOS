"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/authorize";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { addCriterion, checkCriterion, editCriterion, findCriterionTask, removeCriterion } from "@/lib/domain/taskCriteria";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

// Acceptance criteria trên task (F21.6) — thành viên dự án (`task.write`) thêm / sửa / xoá / tick trong drawer.

const idSchema = z.string().trim().min(1);

async function authorizeTask(taskId: string): Promise<{ projectId: string } | { error: string }> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { feature: { select: { projectId: true } } } });
  if (!task) return { error: `Không tìm thấy task ${taskId}` };
  const denied = await authorize("task.write", task.feature.projectId);
  return denied ? { error: denied } : { projectId: task.feature.projectId };
}

async function authorizeCriterion(criterionId: string): Promise<{ taskId: string; projectId: string } | { error: string }> {
  const id = idSchema.safeParse(criterionId);
  const found = id.success ? await findCriterionTask(id.data) : null;
  if (!found) return { error: "Không tìm thấy tiêu chí" };
  const denied = await authorize("task.write", found.projectId);
  return denied ? { error: denied } : found;
}

export async function addTaskCriterion(taskId: string, text: string): Promise<ActionResult<{ criterionId: string }>> {
  const id = idSchema.safeParse(taskId);
  if (!id.success) return fail("Thiếu mã task");
  const auth = await authorizeTask(id.data);
  if ("error" in auth) return fail(auth.error);
  const result = await addCriterion(id.data, String(text ?? ""));
  if (!result.ok) return fail(result.error);
  revalidatePath("/[project]", "layout");
  return { ok: true, criterionId: result.criterionId };
}

export async function editTaskCriterion(criterionId: string, text: string): Promise<ActionResult> {
  const auth = await authorizeCriterion(criterionId);
  if ("error" in auth) return fail(auth.error);
  const result = await editCriterion(criterionId, String(text ?? ""));
  if (!result.ok) return fail(result.error);
  revalidatePath("/[project]", "layout");
  return ok();
}

export async function removeTaskCriterion(criterionId: string): Promise<ActionResult> {
  const auth = await authorizeCriterion(criterionId);
  if ("error" in auth) return fail(auth.error);
  await removeCriterion(criterionId);
  revalidatePath("/[project]", "layout");
  return ok();
}

export async function checkTaskCriterion(criterionId: string, done: boolean): Promise<ActionResult> {
  const auth = await authorizeCriterion(criterionId);
  if ("error" in auth) return fail(auth.error);
  await checkCriterion(criterionId, Boolean(done), await getCurrentUserId());
  const { text } = await prisma.taskCriterion.findUniqueOrThrow({ where: { id: criterionId }, select: { text: true } });
  await recordActivity(done ? "ph-check-square" : "ph-square", `${auth.taskId} ${done ? "đạt" : "bỏ tick"}: ${text.slice(0, 120)}`, {
    event: { projectId: auth.projectId, type: "task", tone: "ok", taskId: auth.taskId },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}
