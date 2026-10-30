"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { setProjectArchived } from "@/lib/actions/projects";
import type { Project } from "@/lib/types";

/** Lưu trữ / khôi phục dự án từ thẻ portfolio (F13.7) — luôn qua dialog xác nhận. */
export function ArchiveProjectButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const archive = !project.archived;
  const verb = archive ? "Lưu trữ" : "Khôi phục";
  const close = () => {
    setOpen(false);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost project-card-action"
        aria-label={`${verb} ${project.name}`}
        title={`${verb} dự án`}
        onClick={() => setOpen(true)}
      >
        <i className={`ph ${archive ? "ph-archive" : "ph-arrow-counter-clockwise"}`} aria-hidden />
      </button>
      {open && (
        <Dialog
          title={`${verb} dự án ${project.name}?`}
          onClose={close}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setProjectArchived(project.id, archive);
                    if (result.ok) close();
                    else setError(result.error);
                  })
                }
              >
                {isPending ? "Đang lưu…" : `${verb} dự án`}
              </button>
            </>
          }
        >
          <p>
            {archive
              ? "Dự án sẽ ẩn khỏi danh sách chuyển dự án và hiện mờ ở portfolio. Dữ liệu giữ nguyên — khôi phục bất cứ lúc nào."
              : "Dự án sẽ hiện lại trong danh sách chuyển dự án."}
          </p>
          {error && (
            <div className="drawer-warning" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> {error}
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
