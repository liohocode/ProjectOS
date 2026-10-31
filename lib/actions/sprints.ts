"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/authorize";
import { formatSprintLabel, parseSprintInput } from "@/lib/sprint";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

// Sprint (F21.3): tạo + đặt sprint hiện tại (tech lead / người tạo dự án — `sprint.manage`),
// xếp task vào sprint (thành viên dự án — `task.write`). Sprint hiện tại hiện ở header + timeline.

const idSchema = z.string().trim().min(1);

export interface NewSprintInput {
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  makeCurrent: boolean;
}

export async function createSprint(input: NewSprintInput): Promise<ActionResult<{ sprintId: string }>> {
  const projectId = idSchema.safeParse(input.projectId);
  if (!projectId.success) return fail("Thiếu dự án");
  const denied = await authorize("sprint.manage", projectId.data);
  if (denied) return fail(denied);
  const parsed = parseSprintInput(input);
  if (!parsed.ok) return fail(parsed.error);

  const sprint = await prisma.$transaction(async (tx) => {
    const created = await tx.sprint.create({ data: { projectId: projectId.data, ...parsed.value }, select: { id: true } });
    if (input.makeCurrent) await tx.project.update({ where: { id: projectId.data }, data: { currentSprintId: created.id } });
    return created;
  });
  await recordActivity("ph-calendar-plus", `Tạo ${formatSprintLabel(parsed.value)}${input.makeCurrent ? " (sprint hiện tại)" : ""}`);
  revalidatePath("/[project]", "layout");
  return { ok: true, sprintId: sprint.id };
}

export async function setCurrentSprint(projectId: string, sprintId: string): Promise<ActionResult> {
  const ids = z.object({ projectId: idSchema, sprintId: idSchema }).safeParse({ projectId, sprintId });
  if (!ids.success) return fail("Thiếu sprint");
  const denied = await authorize("sprint.manage", ids.data.projectId);
  if (denied) return fail(denied);
  const sprint = await prisma.sprint.findUnique({ where: { id: ids.data.sprintId } });
  if (!sprint || sprint.projectId !== ids.data.projectId) return fail("Không tìm thấy sprint");

  await prisma.project.update({ where: { id: ids.data.projectId }, data: { currentSprintId: sprint.id } });
  await recordActivity("ph-calendar-check", `Đặt ${formatSprintLabel(sprint)} làm sprint hiện tại`);
  revalidatePath("/[project]", "layout");
  return ok();
}

/** Xếp task vào sprint (null = bỏ khỏi sprint). Sprint phải cùng dự án với task. */
export async function setTaskSprint(taskId: string, sprintId: string | null): Promise<ActionResult> {
  const id = idSchema.safeParse(taskId);
  if (!id.success) return fail("Thiếu mã task");
  const task = await prisma.task.findUnique({ where: { id: id.data }, select: { sprintId: true, feature: { select: { projectId: true } } } });
  if (!task) return fail(`Không tìm thấy task ${id.data}`);
  const projectId = task.feature.projectId;
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  const sprint = sprintId ? await prisma.sprint.findUnique({ where: { id: sprintId }, select: { projectId: true, name: true } }) : null;
  if (sprintId && (!sprint || sprint.projectId !== projectId)) return fail("Không tìm thấy sprint");
  if (task.sprintId === (sprintId ?? null)) return ok();

  await prisma.task.update({ where: { id: id.data }, data: { sprintId: sprintId ?? null } });
  await recordActivity("ph-calendar", sprint ? `Xếp ${id.data} vào ${sprint.name}` : `Bỏ ${id.data} khỏi sprint`, {
    event: { projectId, type: "task", tone: "ok", taskId: id.data },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}
