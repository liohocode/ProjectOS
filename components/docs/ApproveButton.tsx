"use client";

import { useState, useTransition } from "react";
import { approveRevision } from "@/lib/actions/docs";

export function ApproveButton({ revisionId, projectId }: { revisionId: string; projectId: string }) {
  const [approved, setApproved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (approved) {
    return <span className="tag tag-neutral nowrap revision-approve">Đã duyệt</span>;
  }

  return (
    <button
      type="button"
      className="btn btn-primary revision-approve"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await approveRevision(revisionId, projectId);
          setApproved(true);
        })
      }
    >
      {isPending ? "Đang duyệt…" : "Duyệt"}
    </button>
  );
}
