"use client";

import { useState, useTransition } from "react";
import { approveRevision } from "@/lib/actions/docs";

export function ApproveButton({ revisionId, projectId }: { revisionId: string; projectId: string }) {
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (approved) {
    return <span className="tag tag-neutral nowrap revision-approve">Đã duyệt</span>;
  }

  return (
    <>
      {error && (
        <span className="revision-error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </span>
      )}
      <button
        type="button"
        className="btn btn-primary revision-approve"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await approveRevision(revisionId, projectId);
            if (result.ok) setApproved(true);
            else setError(result.error);
          })
        }
      >
        {isPending ? "Đang duyệt…" : "Duyệt"}
      </button>
    </>
  );
}
