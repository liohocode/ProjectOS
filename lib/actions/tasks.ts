"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseTaskStatus, TASK_STATUS_LABEL } from "@/lib/taskFormat";
import { authorize } from "@/lib/auth/authorize";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { recordTaskCreated, transitionTask } from "@/lib/domain/taskTransitions";
import { reviewTask, type ReviewDecision } from "@/lib/domain/taskReview";
import { commentOnTask } from "@/lib/domain/tasks";
import { reviewGateBlocker } from "@/lib/domain/taskCriteria";
import { addDependency, removeDependency } from "@/lib/domain/taskDependencies";
import { applyBlock } from "@/lib/domain/taskBlocks";
import { allocateTaskId } from "@/lib/domain/taskProposals";
import { parseTaskLinks } from "@/lib/taskLinks";
import { moveInList, type Direction } from "@/lib/reorder";
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
  const input = z.object({ taskId: taskIdSchema, stage: stageSchema }).safeParse({ taskId, stage });
  if (!input.success) return fail(input.error.issues[0].message);

  const projectId = await findTaskProject(input.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  // F22.2: task do agent làm chỉ sang Done qua người có quyền review (cổng chất lượng).
  if (input.data.stage === "Done") {
    const task = await prisma.task.findUnique({ where: { id: input.data.taskId }, select: { stage: true, assignee: { select: { kind: true } } } });
    if (task?.stage !== "Done" && task?.assignee.kind === "agent" && (await authorize("task.review", projectId))) {
      return fail("Task của agent phải được tech lead / người tạo dự án duyệt mới sang Done");
    }
  }
  // F22.3: vào Review cần mọi acceptance criterion đạt.
  if (input.data.stage === "Review") {
    const current = await prisma.task.findUnique({ where: { id: input.data.taskId }, select: { stage: true } });
    const blocked = current?.stage !== "Review" ? await reviewGateBlocker(input.data.taskId) : null;
    if (blocked) return fail(blocked);
  }
  await transitionTask(prisma, input.data.taskId, await getCurrentUserId(), "web", { stage: input.data.stage });
  await recordActivity("ph-arrow-right", `Chuyển ${input.data.taskId} sang ${input.data.stage}`, {
    event: { projectId, type: "task", tone: "ok", taskId: input.data.taskId },
  });
  revalidateTaskViews();
  return ok();
}

export async function updateTaskStatus(taskId: string, status: string): Promise<ActionResult> {
  const input = z.object({ taskId: taskIdSchema, status: statusSchema }).safeParse({ taskId, status });
  if (!input.success) return fail(input.error.issues[0].message);

  const projectId = await findTaskProject(input.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  await transitionTask(prisma, input.data.taskId, await getCurrentUserId(), "web", { status: parseTaskStatus(input.data.status) });
  await recordActivity("ph-check-circle", `Đổi trạng thái ${input.data.taskId} → ${input.data.status}`, {
    event: { projectId, type: "task", tone: input.data.status === "Chờ review" ? "review" : "ok", taskId: input.data.taskId },
  });
  revalidateTaskViews();
  return ok();
}

/** Giao task cho người/agent — chỉ thành viên thuộc dự án của task (bảng ProjectMember). */
export async function assignTask(taskId: string, memberId: string): Promise<ActionResult> {
  const input = z.object({ taskId: taskIdSchema, memberId: memberIdSchema }).safeParse({ taskId, memberId });
  if (!input.success) return fail(input.error.issues[0].message);

  const projectId = await findTaskProject(input.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId, memberId: input.data.memberId } },
    include: { member: { select: { name: true } } },
  });
  if (!membership) return fail("Người/agent này không thuộc dự án của task");

  const task = await prisma.task.update({ where: { id: input.data.taskId }, data: { assigneeId: input.data.memberId }, select: { title: true } });
  // Cột "Đang làm" ở màn team (F13.3): việc vừa được giao.
  await prisma.member.update({ where: { id: input.data.memberId }, data: { current: `${input.data.taskId} ${task.title}` } });
  await recordActivity("ph-share-network", `Giao ${input.data.taskId} cho ${membership.member.name}`, {
    event: { projectId, type: "task", tone: "ok", taskId: input.data.taskId },
  });
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
// F21.7: mô tả markdown, cỡ, mã trong kế hoạch, cần quyết định. Chuỗi rỗng = xoá.
const descriptionSchema = z.string().max(10_000, "Mô tả tối đa 10.000 ký tự").nullable();
const sizeSchema = z.enum(["S", "M", "L"], { error: "Cỡ không hợp lệ" }).nullable();
const codeSchema = z.string().trim().max(20, "Mã tối đa 20 ký tự").regex(/^[\w.-]*$/, "Mã chỉ gồm chữ, số, dấu chấm, gạch").nullable();
const emptyToNull = (v: string | null | undefined) => (v === undefined ? undefined : v && v.trim() ? v : null);
const toDueDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

const newTaskSchema = z.object({
  projectId: z.string().trim().min(1, "Thiếu dự án"),
  featureId: z.string().trim().min(1, "Chọn feature"),
  title: titleSchema,
  stage: stageSchema,
  assigneeId: memberIdSchema,
  estimatePoints: estimateSchema,
  dueDate: dueDateSchema,
  description: descriptionSchema.optional(),
  size: sizeSchema.optional(),
});
export type NewTaskInput = z.input<typeof newTaskSchema>;

/**
 * Tạo task mới với id `T-<số lớn nhất + 1>` (ADR-006, `allocateTaskId` — advisory lock trong transaction).
 */
export async function createTask(input: NewTaskInput): Promise<ActionResult<{ taskId: string }>> {
  const parsed = newTaskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  const feature = await prisma.feature.findUnique({
    where: { id: data.featureId, status: "active", archivedAt: null },
    // F21.3: task mới vào sprint hiện tại của dự án (đổi được ở drawer).
    select: { projectId: true, project: { select: { currentSprintId: true } } },
  });
  const denied = await authorize("task.write", data.projectId);
  if (denied) return fail(denied);
  if (!feature || feature.projectId !== data.projectId) return fail("Feature không thuộc dự án này");
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_memberId: { projectId: data.projectId, memberId: data.assigneeId } },
  });
  if (!membership) return fail("Người/agent này không thuộc dự án");

  const creatorId = await getCurrentUserId();
  const taskId = await prisma.$transaction(async (tx) => {
    const id = await allocateTaskId(tx);
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
        sprintId: feature.project.currentSprintId,
        description: emptyToNull(data.description) ?? null,
        size: data.size ?? null,
      },
    });
    await recordTaskCreated(tx, id, creatorId, "web", data.stage, "Cho");
    return id;
  });

  await recordActivity("ph-plus-circle", `Tạo ${taskId} — ${data.title}`, {
    event: { projectId: data.projectId, type: "task", tone: "ok", taskId, featureId: data.featureId },
  });
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
  const input = z.object({ taskId: taskIdSchema, block: blockSchema }).safeParse({ taskId, block });
  if (!input.success) return fail(input.error.issues[0].message);

  const projectId = await findTaskProject(input.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  const value = input.data.block;
  // F22.7: ghi lịch sử đặt / gỡ block cùng lúc với trạng thái.
  await prisma.$transaction((tx) => applyBlock(tx, input.data.taskId, value));
  await recordActivity(
    value ? "ph-warning" : "ph-check",
    value ? `Đánh dấu ${input.data.taskId} bị block: ${value.short}` : `Gỡ block ${input.data.taskId}`,
    { event: { projectId, type: "task", tone: value ? "block" : "ok", taskId: input.data.taskId } },
  );
  revalidateTaskViews();
  return ok();
}

// F22.4: liên kết code — kiểm tra chi tiết bằng parseTaskLinks (dùng chung với MCP); chuỗi rỗng = xoá.
const linkSchema = z.string().max(500).nullable();
const taskPatchSchema = z
  .object({
    title: titleSchema,
    estimatePoints: estimateSchema,
    dueDate: dueDateSchema,
    prUrl: linkSchema,
    branch: linkSchema,
    commitSha: linkSchema,
    description: descriptionSchema,
    size: sizeSchema,
    code: codeSchema,
    needsDecision: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "Không có gì để cập nhật");
export type TaskPatch = z.input<typeof taskPatchSchema>;

/** Sửa nhanh tiêu đề / ước lượng / hạn / liên kết code (field không có trong patch giữ nguyên). */
export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult> {
  const input = z.object({ taskId: taskIdSchema, patch: taskPatchSchema }).safeParse({ taskId, patch });
  if (!input.success) return fail(input.error.issues[0].message);

  const projectId = await findTaskProject(input.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${input.data.taskId}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  const { title, estimatePoints, dueDate, prUrl, branch, commitSha, description, size, code, needsDecision } = input.data.patch;
  const links = parseTaskLinks({ prUrl, branch, commitSha });
  if (!links.ok) return fail(links.error);
  // Chỉ ghi nhận liên kết thật sự đổi (form gửi lại cả giá trị cũ).
  const current = await prisma.task.findUniqueOrThrow({ where: { id: input.data.taskId }, select: { prUrl: true, branch: true, commitSha: true } });
  const linkChanges = Object.fromEntries(Object.entries(links.links).filter(([k, v]) => current[k as keyof typeof current] !== v));
  await prisma.task.update({
    where: { id: input.data.taskId },
    data: {
      ...(title !== undefined && { title }),
      ...(estimatePoints !== undefined && { estimatePoints }),
      ...(dueDate !== undefined && { dueDate: toDueDate(dueDate) }),
      ...linkChanges,
      ...(description !== undefined && { description: emptyToNull(description) }),
      ...(size !== undefined && { size }),
      ...(code !== undefined && { code: emptyToNull(code) }),
      ...(needsDecision !== undefined && { needsDecision }),
    },
  });
  const changed = [
    title !== undefined && "tiêu đề",
    estimatePoints !== undefined && "ước lượng",
    dueDate !== undefined && "hạn",
    Object.keys(linkChanges).length > 0 && "liên kết",
    (description !== undefined || size !== undefined || code !== undefined || needsDecision !== undefined) && "mô tả",
  ].filter(Boolean);
  await recordActivity("ph-pencil-simple", `Sửa ${input.data.taskId} (${changed.join(", ")})`, {
    event: { projectId, type: "task", tone: "ok", taskId: input.data.taskId },
  });
  revalidateTaskViews();
  return ok();
}

/** Duyệt task đang ở Review → Done (F22.2). */
export async function approveTaskReview(taskId: string, checked: string[] = []): Promise<ActionResult> {
  return review(taskId, { approve: true, checked: Array.isArray(checked) ? checked.map(String) : [] });
}

/** Trả lại task đang ở Review → Dev kèm lý do (F22.2) — lý do vào lịch sử + bình luận, agent đọc được qua MCP. */
export async function returnTaskReview(taskId: string, reason: string): Promise<ActionResult> {
  return review(taskId, { approve: false, reason: String(reason ?? "") });
}

async function review(taskId: string, decision: ReviewDecision): Promise<ActionResult> {
  const id = taskIdSchema.safeParse(taskId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await findTaskProject(id.data);
  if (!projectId) return fail(`Không tìm thấy task ${id.data}`);
  const denied = await authorize("task.review", projectId);
  if (denied) return fail(denied);

  const result = await reviewTask(id.data, await getCurrentUserId(), decision);
  if (!result.ok) return fail(result.error);
  await recordActivity(
    decision.approve ? "ph-seal-check" : "ph-arrow-u-up-left",
    decision.approve ? `Duyệt ${id.data} — ${result.title}` : `Trả lại ${id.data}: ${decision.reason.trim()}`,
    { event: { projectId, type: "task", tone: decision.approve ? "ok" : "block", taskId: id.data } },
  );
  revalidateTaskViews();
  return ok();
}

/** Người bình luận trên task (F21.5) — dùng chung `TaskComment` + kiểm tra với agent (F16.4); thành viên dự án. */
export async function addTaskComment(taskId: string, body: string): Promise<ActionResult> {
  const id = taskIdSchema.safeParse(taskId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await findTaskProject(id.data);
  if (!projectId) return fail(`Không tìm thấy task ${id.data}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);

  const result = await commentOnTask(await getCurrentUserId(), id.data, String(body ?? ""));
  if (!result.ok) return fail(result.reason);
  await recordActivity("ph-chat-circle", `Bình luận ${id.data}`, {
    event: { projectId, type: "task", tone: "ok", taskId: id.data },
  });
  revalidateTaskViews();
  return ok();
}

/** Lưu trữ / khôi phục task (F21.4) — ẩn khỏi list / timeline / inbox / MCP, giữ nguyên lịch sử. Thành viên dự án. */
export async function setTaskArchived(taskId: string, archived: boolean): Promise<ActionResult> {
  const id = taskIdSchema.safeParse(taskId);
  if (!id.success) return fail(id.error.issues[0].message);
  const task = await prisma.task.findUnique({
    where: { id: id.data },
    select: { archivedAt: true, runningSince: true, feature: { select: { projectId: true } } },
  });
  if (!task) return fail(`Không tìm thấy task ${id.data}`);
  const projectId = task.feature.projectId;
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);
  if (archived === (task.archivedAt !== null)) return fail(archived ? "Task đã được lưu trữ" : "Task chưa được lưu trữ");
  if (archived && task.runningSince) return fail("Task đang chạy — dừng (đổi trạng thái) trước khi lưu trữ");

  await prisma.task.update({ where: { id: id.data }, data: { archivedAt: archived ? new Date() : null } });
  await recordActivity(archived ? "ph-archive" : "ph-arrow-counter-clockwise", `${archived ? "Lưu trữ" : "Khôi phục"} ${id.data}`, {
    event: { projectId, type: "task", tone: "ok", taskId: id.data },
  });
  revalidateTaskViews();
  return ok();
}

/** Thêm / bỏ phụ thuộc giữa hai task cùng dự án (F21.8) — thành viên dự án; không cho tạo vòng. */
export async function setTaskDependency(taskId: string, dependsOnId: string, add: boolean): Promise<ActionResult> {
  const ids = z.object({ taskId: taskIdSchema, dependsOnId: taskIdSchema }).safeParse({ taskId, dependsOnId });
  if (!ids.success) return fail(ids.error.issues[0].message);
  const projectId = await findTaskProject(ids.data.taskId);
  if (!projectId) return fail(`Không tìm thấy task ${ids.data.taskId}`);
  const denied = await authorize("task.write", projectId);
  if (denied) return fail(denied);

  const result = add ? await addDependency(ids.data.taskId, ids.data.dependsOnId) : await removeDependency(ids.data.taskId, ids.data.dependsOnId);
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-link", `${add ? "Thêm" : "Bỏ"} phụ thuộc ${ids.data.taskId} → ${ids.data.dependsOnId}`, {
    event: { projectId, type: "task", tone: "ok", taskId: ids.data.taskId },
  });
  revalidateTaskViews();
  return ok();
}

/** Đổi thứ tự ưu tiên task trong feature (F21.10) — thành viên dự án. */
export async function moveTask(taskId: string, dir: Direction): Promise<ActionResult> {
  const id = taskIdSchema.safeParse(taskId);
  if (!id.success || (dir !== "up" && dir !== "down")) return fail("Thiếu mã task");
  const task = await prisma.task.findUnique({ where: { id: id.data }, select: { featureId: true, feature: { select: { projectId: true } } } });
  if (!task) return fail(`Không tìm thấy task ${id.data}`);
  const denied = await authorize("task.write", task.feature.projectId);
  if (denied) return fail(denied);

  const rows = await prisma.task.findMany({
    where: { featureId: task.featureId, archivedAt: null },
    orderBy: [{ position: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    select: { id: true },
  });
  const next = moveInList(rows.map((r) => r.id), id.data, dir);
  if (!next) return ok();
  await prisma.$transaction(next.map((tid, i) => prisma.task.update({ where: { id: tid }, data: { position: i + 1 } })));
  revalidateTaskViews();
  return ok();
}
