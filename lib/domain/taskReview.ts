import { prisma } from "@/lib/prisma";
import { transitionTask } from "./taskTransitions";

// Cổng review của người (F22.2): task ở stage Review chỉ rời Review khi người có quyền duyệt (→ Done)
// hoặc trả lại kèm lý do (→ Dev, lý do lưu ở lịch sử + bình luận để agent / người làm đọc được).
// Quyền kiểm ở server action (`task.review`).

export type ReviewDecision = { approve: true } | { approve: false; reason: string };

export async function reviewTask(
  taskId: string,
  reviewerId: string,
  decision: ReviewDecision,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { stage: true, title: true } });
  if (!task) return { ok: false, error: `Không tìm thấy task ${taskId}` };
  if (task.stage !== "Review") return { ok: false, error: `${taskId} không ở stage Review` };
  const reason = decision.approve ? "" : decision.reason.trim();
  if (!decision.approve && !reason) return { ok: false, error: "Nhập lý do trả lại" };
  if (reason.length > 1000) return { ok: false, error: "Lý do tối đa 1000 ký tự" };

  await prisma.$transaction(async (tx) => {
    if (decision.approve) {
      await transitionTask(tx, taskId, reviewerId, "web", { stage: "Done", status: "Xong" }, { runningSince: null });
    } else {
      await transitionTask(tx, taskId, reviewerId, "web", { stage: "Dev", status: "DangLam" }, { runningSince: null }, reason);
      await tx.taskComment.create({ data: { taskId, authorId: reviewerId, body: `Trả lại sau review: ${reason}` } });
    }
  });
  return { ok: true, title: task.title };
}
