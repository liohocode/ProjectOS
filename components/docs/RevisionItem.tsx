"use client";

import { useId, useState, useTransition } from "react";
import type { DocRevision } from "@/lib/types";
import { rejectRevision } from "@/lib/actions/docs";
import { ApproveButton } from "./ApproveButton";
import { RevisionDiff } from "./RevisionDiff";
import { useCan } from "@/components/auth/PermissionsProvider";

// Một dòng revision: đang chờ → "Xem thay đổi", "Từ chối" (nhập lý do), "Duyệt" (F12.3);
// đã xử lý → "Đã duyệt bởi … · …" / "Bị từ chối: <lý do>" lấy từ server (F12.4).
export function RevisionItem({ rev, projectId }: { rev: DocRevision; projectId: string }) {
  const [showDiff, setShowDiff] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const diffId = useId();
  const reasonId = useId();
  // F15.6: không có quyền duyệt → chỉ xem thay đổi, không có nút Duyệt / Từ chối.
  const canReview = useCan("doc.review");
  const pending = rev.status === "pending";
  const hasDiff = Boolean(rev.diff || rev.summaryChange);

  function submitReject(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const result = await rejectRevision(rev.id, projectId, reason);
      if (result.ok) setRejecting(false);
      else setError(result.error);
    });
  }

  return (
    <div className="revision-item">
      <div className="revision-row">
        <span className={`tag ${rev.agent ? "tag-accent" : "tag-neutral"} nowrap revision-tag`}>{rev.who}</span>
        <span className="revision-what">{rev.what}</span>
        <span className="revision-when">{rev.when}</span>
        {rev.status === "approved" && (
          <span className="revision-status is-approved">
            <i className="ph ph-check-circle" aria-hidden />{" "}
            {rev.approvedBy ? `Đã duyệt bởi ${rev.approvedBy}${rev.approvedWhen ? ` · ${rev.approvedWhen}` : ""}` : "Đã duyệt"}
          </span>
        )}
        {rev.status === "rejected" && (
          <span className="revision-status is-rejected" title={rev.rejectedReason}>
            <i className="ph ph-x-circle" aria-hidden /> Bị từ chối{rev.rejectedReason ? `: ${rev.rejectedReason}` : ""}
          </span>
        )}
        {pending && hasDiff && (
          <button type="button" className="btn btn-ghost revision-approve" aria-expanded={showDiff} aria-controls={diffId} onClick={() => setShowDiff((v) => !v)}>
            <i className={`ph ${showDiff ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden /> Xem thay đổi
          </button>
        )}
        {pending && canReview && !rejecting && (
          <button type="button" className="btn btn-secondary revision-approve" onClick={() => setRejecting(true)}>
            Từ chối
          </button>
        )}
        {pending && canReview && <ApproveButton revisionId={rev.id} projectId={projectId} />}
      </div>
      {pending && canReview && rejecting && (
        <form className="revision-reject" onSubmit={submitReject}>
          <label htmlFor={reasonId} className="revision-reject-label">
            Lý do từ chối
          </label>
          <textarea
            id={reasonId}
            className="input revision-reject-input"
            rows={2}
            maxLength={500}
            value={reason}
            autoFocus
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setRejecting(false)}
          />
          {error && (
            <span className="revision-error" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> {error}
            </span>
          )}
          <div className="revision-reject-actions">
            <button type="button" className="btn btn-ghost revision-approve" onClick={() => setRejecting(false)} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary revision-approve" disabled={isPending || reason.trim() === ""}>
              {isPending ? "Đang từ chối…" : "Xác nhận từ chối"}
            </button>
          </div>
        </form>
      )}
      {pending && showDiff && <RevisionDiff id={diffId} diff={rev.diff} summaryChange={rev.summaryChange} />}
    </div>
  );
}
