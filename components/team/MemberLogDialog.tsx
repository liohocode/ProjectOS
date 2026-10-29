"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { loadMemberActivity } from "@/lib/actions/members";
import type { Member, MemberActivityEntry } from "@/lib/types";

/** "Xem log" của người (F13.4): toàn bộ hoạt động, mới nhất trước, "Xem thêm" theo trang. */
export function MemberLogDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const [items, setItems] = useState<MemberActivityEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(after: string | null) {
    startTransition(async () => {
      const result = await loadMemberActivity(member.id, after);
      if (!result.ok) return setError(result.error);
      setError(null);
      setItems((prev) => [...(after ? (prev ?? []) : []), ...result.page.items]);
      setCursor(result.page.nextCursor);
    });
  }

  // Tải trang đầu khi mở.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(null), [member.id]);

  return (
    <Dialog
      title={`Hoạt động của ${member.name}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="member-log">
        {items === null && !error && <p className="text-muted">Đang tải…</p>}
        {items?.length === 0 && <p className="text-muted">Chưa có hoạt động nào.</p>}
        {items?.map((a) => (
          <div className="panel-activity-item" key={a.id}>
            <i className={`ph ${a.icon}`} aria-hidden />
            <div>
              <div>{a.text}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                {a.when}
              </div>
            </div>
          </div>
        ))}
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> {error}
          </div>
        )}
        {cursor && (
          <button type="button" className="btn btn-ghost member-log-more" onClick={() => load(cursor)} disabled={isPending}>
            {isPending ? "Đang tải…" : "Xem thêm"}
          </button>
        )}
      </div>
    </Dialog>
  );
}
