"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { removeProjectMember } from "@/lib/actions/members";
import type { Member } from "@/lib/types";

/** Xác nhận gỡ thành viên khỏi dự án (F13.7). Ràng buộc (còn task/feature chưa Done, tự gỡ mình) kiểm tra ở action. */
export function RemoveMemberDialog({
  member,
  projectId,
  onClose,
  onRemoved,
}: {
  member: Member;
  projectId: string;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      title={`Gỡ ${member.name} khỏi dự án?`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await removeProjectMember(projectId, member.id);
                if (result.ok) onRemoved();
                else setError(result.error);
              })
            }
          >
            {isPending ? "Đang gỡ…" : "Gỡ khỏi dự án"}
          </button>
        </>
      }
    >
      <p>
        {member.name} không còn thấy dự án này và không được giao task mới ở đây. Hồ sơ vẫn còn trong tổ chức — thêm lại bất cứ lúc nào. Task chưa
        Done phải giao lại cho người khác trước.
      </p>
      {error && (
        <div className="drawer-warning" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </div>
      )}
    </Dialog>
  );
}
