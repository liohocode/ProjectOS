"use client";

import { useEffect, useState } from "react";
import { formatRunning } from "@/lib/taskFormat";

const TICK_MS = 30_000;

/**
 * "chạy N phút" tự tăng phía client (F17.5). Lần render đầu dùng `label` server đã tính (khớp hydration),
 * sau đó tính lại từ `since` mỗi 30 giây — không gọi server.
 */
export function RunningTime({ since, label }: { since: string; label: string }) {
  const [text, setText] = useState(label);
  useEffect(() => {
    const start = new Date(since);
    const tick = () => setText(formatRunning(start, new Date()));
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [since]);
  return <>{text}</>;
}
