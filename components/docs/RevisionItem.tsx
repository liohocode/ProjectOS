"use client";

import { useId, useState, useTransition } from "react";
import type { DocRevision } from "@/lib/types";
import { rejectRevision } from "@/lib/actions/docs";
import { ApproveButton } from "./ApproveButton";
import { RevisionDiff } from "./RevisionDiff";

// Một dòng revision (F12.3): revision đang chờ có "Xem thay đổi", "Từ chối" (nhập lý do), "Duyệt".
export function RevisionItem({ rev, projectId }: { rev: DocRevision; projectId: string }) {
  const [showDiff, setShowDiff] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const diffId = useId();
  const reasonId = useId();
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
        <span className="revision-what">
          {rev.what}
          {rev.status === "rejected" && rev.rejectedReason && <span className="revision-reason"> — Từ chối: {rev.rejectedReason}</span>}
        </span>
        <span className="revision-when">{rev.when}</span>
        {pending && hasDiff && (
          <button type="button" className="btn btn-ghost revision-approve" aria-expanded={showDiff} aria-controls={diffId} onClick={() => setShowDiff((v) => !v)}>
            <i className={`ph ${showDiff ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden /> Xem thay đổi
          </button>
        )}
        {pending && !rejecting && (
          <button type="button" className="btn btn-secondary revision-approve" onClick={() => setRejecting(true)}>
            Từ chối
          </button>
        )}
        {pending && <ApproveButton revisionId={rev.id} projectId={projectId} />}
      </div>
      {pending && rejecting && (
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
