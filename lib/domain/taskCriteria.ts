import { prisma } from "@/lib/prisma";
import { reviewBlockReason } from "@/lib/reviewGate";

// Acceptance criteria của task (F21.6): checklist người thêm / sửa / tick trên UI, agent tick qua MCP `criteria_check`.
// Không có "use server"; nơi gọi tự xác thực + kiểm tra quyền (server action: task.write; MCP: task giao cho agent).

export const MAX_CRITERIA = 20;
const MAX_TEXT = 300;

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function cleanText(text: string): Result<{ text: string }> {
  const value = text.trim();
  if (!value) return { ok: false, error: "Nhập nội dung tiêu chí" };
  if (value.length > MAX_TEXT) return { ok: false, error: `Tiêu chí tối đa ${MAX_TEXT} ký tự` };
  return { ok: true, text: value };
}

export async function addCriterion(taskId: string, text: string): Promise<Result<{ criterionId: string }>> {
  const clean = cleanText(text);
  if (!clean.ok) return clean;
  return prisma.$transaction(async (tx) => {
    const count = await tx.taskCriterion.count({ where: { taskId } });
    if (count >= MAX_CRITERIA) return { ok: false as const, error: `Mỗi task tối đa ${MAX_CRITERIA} tiêu chí` };
    const last = await tx.taskCriterion.findFirst({ where: { taskId }, orderBy: { position: "desc" }, select: { position: true } });
    const created = await tx.taskCriterion.create({ data: { taskId, text: clean.text, position: (last?.position ?? 0) + 1 }, select: { id: true } });
    return { ok: true as const, criterionId: created.id };
  });
}

export async function editCriterion(criterionId: string, text: string): Promise<Result> {
  const clean = cleanText(text);
  if (!clean.ok) return clean;
  await prisma.taskCriterion.update({ where: { id: criterionId }, data: { text: clean.text } });
  return { ok: true };
}

export async function removeCriterion(criterionId: string): Promise<Result> {
  await prisma.taskCriterion.delete({ where: { id: criterionId } });
  return { ok: true };
}

/** Tick / bỏ tick; ghi người tick (null khi bỏ). Đã ở đúng trạng thái → không đổi người / thời điểm tick. */
export async function checkCriterion(criterionId: string, done: boolean, actorId: string): Promise<Result> {
  const current = await prisma.taskCriterion.findUniqueOrThrow({ where: { id: criterionId }, select: { doneAt: true } });
  if ((current.doneAt !== null) === done) return { ok: true };
  await prisma.taskCriterion.update({
    where: { id: criterionId },
    data: done ? { doneAt: new Date(), doneById: actorId } : { doneAt: null, doneById: null },
  });
  return { ok: true };
}

/** Task (và dự án) của tiêu chí — null nếu không tồn tại. */
export async function findCriterionTask(criterionId: string): Promise<{ taskId: string; projectId: string; assigneeId: string } | null> {
  const row = await prisma.taskCriterion.findUnique({
    where: { id: criterionId },
    select: { taskId: true, task: { select: { assigneeId: true, feature: { select: { projectId: true } } } } },
  });
  return row ? { taskId: row.taskId, projectId: row.task.feature.projectId, assigneeId: row.task.assigneeId } : null;
}

/** Agent tick tiêu chí của task đang giao cho mình (F21.6 qua MCP). */
export async function checkCriterionByAgent(
  agentId: string,
  taskId: string,
  criterionId: string,
  done: boolean,
): Promise<{ ok: true; text: string; projectId: string } | { ok: false; reason: string; projectId: string | null }> {
  const found = await findCriterionTask(criterionId);
  const member = found && (await prisma.projectMember.findUnique({ where: { projectId_memberId: { projectId: found.projectId, memberId: agentId } } }));
  if (!found || !member || found.taskId !== taskId) return { ok: false, reason: `Không tìm thấy tiêu chí ${criterionId} của ${taskId} trong dự án của bạn`, projectId: null };
  if (found.assigneeId !== agentId) return { ok: false, reason: `${found.taskId} không giao cho bạn — dùng tasks_claim trước`, projectId: found.projectId };
  await checkCriterion(criterionId, done, agentId);
  const { text } = await prisma.taskCriterion.findUniqueOrThrow({ where: { id: criterionId }, select: { text: true } });
  return { ok: true, text, projectId: found.projectId };
}

/** Cổng vào Review (F22.3): mọi acceptance criterion (F21.6) phải đạt. Task không có tiêu chí → không chặn. */
export async function reviewGateBlocker(taskId: string): Promise<string | null> {
  const pending = await prisma.taskCriterion.findMany({
    where: { taskId, doneAt: null },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { text: true },
  });
  return reviewBlockReason(pending.map((c) => c.text));
}
