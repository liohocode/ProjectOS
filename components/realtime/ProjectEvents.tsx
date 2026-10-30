"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActivityItem, McpLogEntry } from "@/lib/types";

// Polling ngắn sự kiện của dự án (F17.3, ADR-016): một vòng poll cho cả trang (layout dự án), gọi
// GET /api/projects/<id>/events mỗi POLL_MS **chỉ khi tab đang hiển thị** — ẩn tab thì dừng để Cloud Run / Neon
// được về 0; hiện lại thì gọi ngay. Thành phần cần dữ liệu mới (activity rail, nhật ký MCP) đăng ký nhận lô sự kiện;
// có sự kiện mới thì `router.refresh()` (giãn cách tối thiểu) để badge nav / banner / số liệu cập nhật.

export const POLL_MS = 12_000;
const REFRESH_MIN_GAP_MS = 15_000;

export interface EventBatch {
  events: ActivityItem[];
  mcpLog: McpLogEntry[];
}
type Listener = (batch: EventBatch) => void;

const ProjectEventsContext = createContext<((listener: Listener) => () => void) | null>(null);

export function ProjectEventsProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const router = useRouter();
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    let cursor: string | null = null;
    let stopped = false;
    let inFlight = false;
    let lastRefresh = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      const wait = lastRefresh + REFRESH_MIN_GAP_MS - Date.now();
      if (wait <= 0) {
        lastRefresh = Date.now();
        router.refresh();
      } else if (!refreshTimer) {
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined;
          lastRefresh = Date.now();
          router.refresh();
        }, wait);
      }
    };

    const poll = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const url = `/api/projects/${encodeURIComponent(projectId)}/events${cursor ? `?after=${cursor}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return; // mất mạng / hết phiên: thử lại ở chu kỳ sau
        const body = (await res.json()) as EventBatch & { cursor: string };
        cursor = body.cursor;
        if (body.events.length || body.mcpLog.length) {
          listeners.current.forEach((fn) => fn({ events: body.events, mcpLog: body.mcpLog }));
          refresh();
        }
      } catch {
        // Lỗi mạng tạm thời — chu kỳ sau thử lại.
      } finally {
        inFlight = false;
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [projectId, router]);

  const subscribe = useMemo(
    () => (listener: Listener) => {
      listeners.current.add(listener);
      return () => {
        listeners.current.delete(listener);
      };
    },
    [],
  );
  return <ProjectEventsContext.Provider value={subscribe}>{children}</ProjectEventsContext.Provider>;
}

/** Nhận lô sự kiện mới (ngoài provider — vd test component rời — thì không làm gì). */
export function useProjectEvents(listener: Listener): void {
  const subscribe = useContext(ProjectEventsContext);
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  useEffect(() => subscribe?.((batch) => latest.current(batch)), [subscribe]);
}
