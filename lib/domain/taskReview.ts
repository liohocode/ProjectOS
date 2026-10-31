import { prisma } from "@/lib/prisma";
import { transitionTask } from "./taskTransitions";
import { missingDod } from "@/lib/doneDefinition";

// Cổng review của người (F22.2): task ở stage Review chỉ rời Review khi người có quyền duyệt (→ Done)
// hoặc trả lại kèm lý do (→ Dev, lý do lưu ở lịch sử + bình luận để agent / người làm đọc được).
// Quyền kiểm ở server action (`task.review`).

/** `checked`: mục Definition of Done (F22.6) người duyệt đã xác nhận — phải đủ mọi mục của dự án. */
export type ReviewDecision = { approve: true; checked?: string[] } | { approve: false; reason: string };

export async function reviewTask(
  taskId: string,
  reviewerId: string,
  decision: ReviewDecision,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { stage: true, title: true, feature: { select: { project: { select: { doneDefinition: true } } } } },
  });
  if (!task) return { ok: false, error: `Không tìm thấy task ${taskId}` };
  if (task.stage !== "Review") return { ok: false, error: `${taskId} không ở stage Review` };
  const reason = decision.approve ? "" : decision.reason.trim();
  if (!decision.approve && !reason) return { ok: false, error: "Nhập lý do trả lại" };
  if (reason.length > 1000) return { ok: false, error: "Lý do tối đa 1000 ký tự" };
  const dod = task.feature.project.doneDefinition;
  if (decision.approve) {
    const missing = missingDod(dod, decision.checked ?? []);
    if (missing.length) return { ok: false, error: `Chưa xác nhận Definition of Done: ${missing.join("; ")}` };
  }

  await prisma.$transaction(async (tx) => {
    if (decision.approve) {
      // Ghi lại DoD đã xác nhận vào lịch sử (F22.6).
      await transitionTask(tx, taskId, reviewerId, "web", { stage: "Done", status: "Xong" }, { runningSince: null }, dod.length ? `DoD: ${dod.join("; ")}` : undefined);
    } else {
      await transitionTask(tx, taskId, reviewerId, "web", { stage: "Dev", status: "DangLam" }, { runningSince: null }, reason);
      await tx.taskComment.create({ data: { taskId, authorId: reviewerId, body: `Trả lại sau review: ${reason}` } });
    }
  });
  return { ok: true, title: task.title };
}
