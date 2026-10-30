"use client";

import { useState, useTransition } from "react";
import { useCan } from "@/components/auth/PermissionsProvider";
import { approveFeatureProposal, rejectFeatureProposal } from "@/lib/actions/features";
import type { ProposedFeature } from "@/lib/types";

/** Khu "Feature đề xuất — chờ duyệt" ở màn work (F16.6). Ai cũng xem; chỉ tech lead / người tạo dự án duyệt. */
export function ProposedFeatures({ proposals }: { proposals: ProposedFeature[] }) {
  const canReview = useCan("feature.review");
  if (proposals.length === 0) return null;
  return (
    <section className="proposals" aria-label="Feature đề xuất — chờ duyệt">
      <div className="proposals-title">
        <i className="ph ph-lightbulb" aria-hidden /> Feature đề xuất — chờ duyệt <span className="text-muted">({proposals.length})</span>
      </div>
      {proposals.map((p) => (
        <ProposalRow key={p.id} proposal={p} canReview={canReview} />
      ))}
    </section>
  );
}

function ProposalRow({ proposal, canReview }: { proposal: ProposedFeature; canReview: boolean }) {
  const [rejecting, setRejecting] = useState(false);
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
    <div className="proposal-row">
      <div className="proposal-main">
        <div className="proposal-head">
          <span className="mono text-muted">{proposal.id}</span>
          <span className="proposal-name">{proposal.name}</span>
          <span className="tag tag-accent nowrap">{proposal.proposedBy}</span>
          <span className="text-muted proposal-when">{proposal.when}</span>
        </div>
        <p className="proposal-desc">{proposal.proposal}</p>
        {rejecting && (
          <form
            className="revision-reject"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => rejectFeatureProposal(proposal.id, reason));
            }}
          >
            <label htmlFor={`reject-${proposal.id}`} className="revision-reject-label">
              Lý do từ chối
            </label>
            <textarea
              id={`reject-${proposal.id}`}
              className="input revision-reject-input"
              rows={2}
              maxLength={500}
              value={reason}
              autoFocus
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setRejecting(false)}
            />
            <div className="revision-reject-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setRejecting(false)} disabled={isPending}>
                Huỷ
              </button>
              <button type="submit" className="btn btn-secondary" disabled={isPending || !reason.trim()}>
                {isPending ? "Đang lưu…" : "Từ chối feature"}
              </button>
            </div>
          </form>
        )}
        {error && (
          <span className="revision-error" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> {error}
          </span>
        )}
      </div>
      {canReview && !rejecting && (
        <div className="proposal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setRejecting(true)} disabled={isPending}>
            Từ chối
          </button>
          <button type="button" className="btn btn-primary" onClick={() => run(() => approveFeatureProposal(proposal.id))} disabled={isPending}>
            {isPending ? "Đang duyệt…" : "Duyệt"}
          </button>
        </div>
      )}
    </div>
  );
}
