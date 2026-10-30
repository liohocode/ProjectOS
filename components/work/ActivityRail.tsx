"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjectEvents } from "@/components/realtime/ProjectEvents";
import { mergeById } from "@/lib/mergeById";
import type { ActivityItem } from "@/lib/types";
import { initials } from "./taskStyle";
import { EmptyState } from "@/components/ui/EmptyState";
import { RunningTime } from "@/components/ui/RunningTime";

/** Khớp ACTIVITY_FEED_LIMIT ở lib/data/activity.ts. */
const RAIL_LIMIT = 30;

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
  // F17.3: sự kiện mới từ polling chèn lên đầu ngay; khi trang refresh, `items` từ server đã có chúng → bỏ trùng theo id.
  const [live, setLive] = useState<ActivityItem[]>([]);
  useProjectEvents(({ events }) => {
    if (events.length) setLive((prev) => mergeById(events, prev, RAIL_LIMIT));
  });
  const shown = mergeById(live, items, RAIL_LIMIT);
  return (
    <aside className="rail">
      <div className="rail-header">
        <span className="rail-title">Agent đang làm gì</span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Đóng activity feed">
          <i className="ph ph-x" aria-hidden />
        </button>
      </div>
      {shown.length === 0 && (
        <EmptyState compact icon="ph-activity" title="Chưa có hoạt động nào" description="Thao tác của người và agent trong dự án (claim task, chuyển stage, block, đề xuất tài liệu…) sẽ hiện ở đây." />
      )}
      {shown.map((item, i) => {
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
          <Link href={taskHref(item.taskId)} scroll={false} className={`rail-item rail-item-link tone-${item.tone}`} key={item.id ?? i}>
            {body}
          </Link>
        ) : (
          <div className={`rail-item tone-${item.tone}`} key={item.id ?? i}>
            {body}
          </div>
        );
      })}
    </aside>
  );
}
