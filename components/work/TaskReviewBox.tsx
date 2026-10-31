"use client";

import { useState, useTransition } from "react";
import { approveTaskReview, returnTaskReview } from "@/lib/actions/tasks";

/** Cổng review trong drawer (F22.2): task ở Review → Duyệt (Done) hoặc Trả lại kèm lý do (về Dev).
 *  `compact`: chỉ nút + form, không tiêu đề / gợi ý — dùng trong inbox (F25.2). */
export function TaskReviewBox({ taskId, compact = false }: { taskId: string; compact?: boolean }) {
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Không thực hiện được");
    });

  return (
    <div className={compact ? "review-box-compact" : "drawer-section review-box"}>
      {!compact && (
        <>
          <div className="drawer-section-title">Review</div>
          <p className="review-box-hint">Task đang chờ người duyệt. Duyệt để sang Done, hoặc trả lại kèm lý do để người / agent làm sửa tiếp.</p>
        </>
      )}
      {returning ? (
        <form
          className="revision-reject"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => returnTaskReview(taskId, reason));
          }}
        >
          <label htmlFor={`return-${taskId}`} className="revision-reject-label">
            Lý do trả lại
          </label>
          <textarea
            id={`return-${taskId}`}
            className="input revision-reject-input"
            rows={3}
            maxLength={1000}
            value={reason}
            autoFocus
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="revision-reject-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setReturning(false)} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-secondary" disabled={isPending || !reason.trim()}>
              {isPending ? "Đang lưu…" : "Trả lại"}
            </button>
          </div>
        </form>
      ) : (
        <div className="review-box-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setReturning(true)} disabled={isPending}>
            Trả lại
          </button>
          <button type="button" className="btn btn-primary" onClick={() => run(() => approveTaskReview(taskId))} disabled={isPending}>
            {isPending ? "Đang duyệt…" : "Duyệt → Done"}
          </button>
        </div>
      )}
      {error && (
        <span className="revision-error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </span>
      )}
    </div>
  );
}
