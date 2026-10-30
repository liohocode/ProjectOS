import Link from "next/link";
import type { ActivityItem } from "@/lib/types";
import { initials } from "./taskStyle";
import { EmptyState } from "@/components/ui/EmptyState";
import { RunningTime } from "@/components/ui/RunningTime";

export function ActivityRail({
  items,
  taskHref,
  onClose,
}: {
  items: ActivityItem[];
  /** Link mở task trong drawer (`?task=`, F14.1). */
  taskHref: (taskId: string) => string;
  onClose: () => void;
}) {
  return (
    <aside className="rail">
      <div className="rail-header">
        <span className="rail-title">Agent đang làm gì</span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng activity feed">
          <i className="ph ph-x" aria-hidden />
        </button>
      </div>
      {items.length === 0 && (
        <EmptyState compact icon="ph-activity" title="Chưa có hoạt động nào" description="Thao tác của người và agent trong dự án (claim task, chuyển stage, block, đề xuất tài liệu…) sẽ hiện ở đây." />
      )}
      {items.map((item, i) => {
        const body = (
          <>
            <span
              className={`avatar ${item.kind === "agent" ? "avatar-agent" : "avatar-human"}`}
              style={{ width: 20, height: 20, fontSize: 8.5 }}
            >
              {initials(item.who)}
            </span>
            <div>
              <div className="rail-item-text">{item.text}</div>
              <div className="rail-item-meta">
                {item.tool} · <span className="rail-item-when">{item.runningSince ? <RunningTime since={item.runningSince} label={item.when} /> : item.when}</span>
              </div>
            </div>
          </>
        );
        // Mục gắn task → link mở drawer task đó; mục khác (revision chờ duyệt) giữ dạng tĩnh.
        return item.taskId ? (
          <Link href={taskHref(item.taskId)} scroll={false} className={`rail-item rail-item-link tone-${item.tone}`} key={i}>
            {body}
          </Link>
        ) : (
          <div className={`rail-item tone-${item.tone}`} key={i}>
            {body}
          </div>
        );
      })}
    </aside>
  );
}
