"use client";

import { useState, useTransition } from "react";
import type { McpLogEntry, McpSession, Page } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/result";
import { loadMoreMcpLog, loadMoreMcpSessions } from "@/lib/actions/mcp";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectEvents } from "@/components/realtime/ProjectEvents";

// Bảng phiên chạy + nhật ký lệnh MCP (F14.4): server render trang đầu, "Xem thêm" tải trang sau
// qua server action (cùng bộ lọc F14.3) và nối vào cuối bảng.

const RESULT_TAG_CLASS: Record<string, string> = {
  Xong: "tag-neutral",
  "Đang chạy": "tag-accent",
  "Chờ review": "tag-outline",
  "Bị chặn": "tag-outline",
  OK: "tag-neutral",
};

type Filter = Record<string, string | undefined>;

function usePaged<T>(first: Page<T>, load: (cursor: string, filter: Filter) => Promise<ActionResult<{ page: Page<T> }>>, filter: Filter) {
  const [items, setItems] = useState(first.items);
  const [cursor, setCursor] = useState(first.nextCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const more = () =>
    startTransition(async () => {
      if (!cursor) return;
      const result = await load(cursor, filter);
      if (!result.ok) return setError(result.error);
      setItems((prev) => [...prev, ...result.page.items]);
      setCursor(result.page.nextCursor);
      setError(null);
    });
  return { items, setItems, hasMore: cursor !== null, more, isPending, error };
}

function MoreButton({ hasMore, more, isPending, error, shown }: { hasMore: boolean; more: () => void; isPending: boolean; error: string | null; shown: number }) {
  if (!hasMore && !error) return null;
  return (
    <div className="table-more">
      {error && <span className="revision-error" role="alert">{error}</span>}
      {hasMore && (
        <button type="button" className="btn btn-secondary" onClick={more} disabled={isPending}>
          {isPending ? "Đang tải…" : `Xem thêm (đang hiện ${shown})`}
        </button>
      )}
    </div>
  );
}

export function McpSessionTable({
  first,
  filter,
  filtered,
  projectNames,
}: {
  first: Page<McpSession>;
  filter: Filter;
  filtered: boolean;
  projectNames: Record<string, string>;
}) {
  const { items, hasMore, more, isPending, error } = usePaged(first, loadMoreMcpSessions, filter);
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={filtered ? "ph-funnel" : "ph-plugs"}
        title={filtered ? "Không có phiên nào khớp bộ lọc" : "Chưa có phiên chạy nào"}
        description="Khi agent kết nối MCP server của Meridian, mỗi phiên sẽ được ghi lại ở đây."
      />
    );
  }
  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>Phiên</th>
            <th>Agent</th>
            <th>Dự án</th>
            <th>Task</th>
            <th>Thời lượng</th>
            <th>Tool calls</th>
            <th>Token</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td className="mono">{s.id}</td>
              <td>{s.agent}</td>
              <td style={{ color: "var(--color-accent-300)" }}>{projectNames[s.projectId] ?? s.projectId}</td>
              <td>{s.taskId}</td>
              <td>{s.durationMin} phút</td>
              <td>{s.toolCalls}</td>
              <td>{s.tokens}</td>
              <td>
                <span className={`tag ${RESULT_TAG_CLASS[s.result]} nowrap`}>{s.result}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MoreButton hasMore={hasMore} more={more} isPending={isPending} error={error} shown={items.length} />
    </>
  );
}

export function McpLogTable({ first, filter, filtered }: { first: Page<McpLogEntry>; filter: Filter; filtered: boolean }) {
  const { items, setItems, hasMore, more, isPending, error } = usePaged(first, loadMoreMcpLog, filter);
  // F17.3: dòng nhật ký mới từ polling chèn lên đầu (theo bộ lọc agent nếu có).
  useProjectEvents(({ mcpLog }) => {
    const fresh = filter.agent ? mcpLog.filter((e) => e.agentId === filter.agent) : mcpLog;
    if (!fresh.length) return;
    setItems((prev) => {
      const known = new Set(prev.map((e) => e.id));
      return [...fresh.filter((e) => !known.has(e.id)), ...prev];
    });
  });
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={filtered ? "ph-funnel" : "ph-terminal-window"}
        title={filtered ? "Không có lệnh nào khớp bộ lọc" : "Chưa có lệnh nào"}
        description="Mọi lệnh agent gọi qua MCP (kèm kết quả OK / Chờ review / Bị chặn) sẽ hiện ở đây."
      />
    );
  }
  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>Thời điểm</th>
            <th>Agent</th>
            <th>Tool</th>
            <th>Đối tượng</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => (
            <tr key={entry.id}>
              <td className="mono">{entry.at}</td>
              <td>{entry.agent}</td>
              <td className="mono" style={{ color: "var(--color-accent-300)" }}>
                {entry.tool}
              </td>
              <td>{entry.target}</td>
              <td>
                <span className={`tag ${RESULT_TAG_CLASS[entry.result]} nowrap`}>{entry.result}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MoreButton hasMore={hasMore} more={more} isPending={isPending} error={error} shown={items.length} />
    </>
  );
}
