// Quy đổi giữa ngày kế hoạch của feature và vị trí trên view Timeline (tuần T1–T8,
// T1 bắt đầu từ ngày đầu sprint hiện tại). Thuần — dùng chung cho seed và lib/data.

export const TIMELINE_WEEKS = 8;
const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** Tuần bắt đầu (1-based) + số tuần → ngày bắt đầu/kết thúc (ngày cuối = ngày thứ 7 của tuần cuối). */
export function weeksToDates(start: number, len: number, sprintStart: Date): { plannedStart: Date; plannedEnd: Date } {
  const plannedStart = new Date(sprintStart.getTime() + (start - 1) * WEEK);
  const plannedEnd = new Date(plannedStart.getTime() + len * WEEK - DAY);
  return { plannedStart, plannedEnd };
}

/**
 * Ngày kế hoạch → vị trí bar. Bar nằm ngoài cửa sổ 8 tuần bị cắt cho vừa;
 * nằm hẳn ngoài cửa sổ → null (không vẽ).
 */
export function datesToWeeks(plannedStart: Date, plannedEnd: Date, sprintStart: Date): { start: number; len: number } | null {
  const first = Math.floor((plannedStart.getTime() - sprintStart.getTime()) / WEEK) + 1;
  const last = Math.floor((plannedEnd.getTime() - sprintStart.getTime()) / WEEK) + 1;
  const start = Math.max(1, first);
  const end = Math.min(TIMELINE_WEEKS, last);
  if (end < start) return null;
  return { start, len: end - start + 1 };
}
