"use client";

import { useState, useTransition } from "react";
import { approveRevision } from "@/lib/actions/docs";

// Duyệt xong server revalidate → dòng revision render lại thành "Đã duyệt bởi …" (F12.4), không giữ state cục bộ.
export function ApproveButton({ revisionId, projectId }: { revisionId: string; projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
            if (!result.ok) setError(result.error);
          })
        }
      >
        {isPending ? "Đang duyệt…" : "Duyệt"}
      </button>
    </>
  );
}
