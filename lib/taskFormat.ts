// Chuyển đổi field task giữa dạng lưu DB (kiểu thật) và chuỗi hiển thị trên UI.
// Thuần — dùng chung cho seed (parse dữ liệu mẫu gốc) và lib/data (format khi đọc).
import type { TaskStatus } from "@/lib/generated/prisma/enums";

const pad = (n: number) => String(n).padStart(2, "0");

// ── Ước lượng (story point) ────────────────────────────────────────────────
/** "5đ" → 5; "—" / rỗng → null */
export function parseEstimate(label: string): number | null {
  const match = /^(\d+)\s*đ$/.exec(label.trim());
  return match ? Number(match[1]) : null;
}

export function formatEstimate(points: number | null): string {
  return points == null ? "—" : `${points}đ`;
}

// ── Hạn ────────────────────────────────────────────────────────────────────
/** "22/08" → 2026-08-22 (UTC, năm truyền vào); không đúng định dạng → null */
export function parseDue(label: string, year: number): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(label.trim());
  return match ? new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1]))) : null;
}

export function formatDue(date: Date | null): string {
  return date ? `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}` : "—";
}

// ── Thời gian đang chạy ───────────────────────────────────────────────────
/** "chạy 14 phút" → thời điểm bắt đầu = now − 14 phút; không khớp → null */
export function parseRunning(label: string, now: Date): Date | null {
  const match = /(\d+)\s*phút/.exec(label);
  return match ? new Date(now.getTime() - Number(match[1]) * 60_000) : null;
}

/** Thời điểm bắt đầu → "chạy N phút" (dưới 1 giờ) / "chạy N giờ" / "chạy N giờ M phút" */
export function formatRunning(since: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60_000));
  if (minutes < 60) return `chạy ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `chạy ${hours} giờ` : `chạy ${hours} giờ ${rest} phút`;
}

// ── Trạng thái ─────────────────────────────────────────────────────────────
// Prisma enum (identifier ASCII, @map giữ giá trị DB tiếng Việt) ↔ chuỗi hiển thị.
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  DangLam: "Đang làm",
  Cho: "Chờ",
  ChoReview: "Chờ review",
  DangChay: "Đang chạy",
  Xong: "Xong",
};

export function parseTaskStatus(label: string): TaskStatus {
  const entry = Object.entries(TASK_STATUS_LABEL).find(([, l]) => l === label);
  if (!entry) throw new Error(`Trạng thái task không hợp lệ: "${label}"`);
  return entry[0] as TaskStatus;
}
