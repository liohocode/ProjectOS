// Chỉ số chất lượng (F22.5) — hàm thuần trên lịch sử chuyển trạng thái (F22.1).
// - Cycle time: từ lần đầu vào Dev tới lần cuối vào Done (task hiện ở Done).
// - Trả lại: số lần Review → Dev sau review của người (F22.2, có lý do).
// Task cũ không có lịch sử (trước F22.1) không có cycle time — không tính vào trung vị.

export interface TransitionPoint {
  fromStage: string | null;
  toStage: string | null;
  at: Date;
  note: string | null;
}

export interface TaskQuality {
  /** ms; null = chưa Done hoặc thiếu mốc vào Dev */
  cycleMs: number | null;
  returns: number;
  reachedReview: boolean;
  /** F22.7: tổng thời gian bị block (ms), tính tới `now` với lần block chưa gỡ */
  blockedMs: number;
}

export interface BlockSpan {
  blockedAt: Date;
  unblockedAt: Date | null;
}

/** Tổng thời gian bị block (F22.7). */
export function blockedDuration(blocks: readonly BlockSpan[], now: Date): number {
  return blocks.reduce((s, b) => s + Math.max(0, (b.unblockedAt ?? now).getTime() - b.blockedAt.getTime()), 0);
}

export function taskQuality(stage: string, transitions: readonly TransitionPoint[], blocks: readonly BlockSpan[] = [], now = new Date()): TaskQuality {
  const sorted = [...transitions].sort((a, b) => a.at.getTime() - b.at.getTime());
  const firstDev = sorted.find((t) => t.toStage === "Dev");
  const lastDone = stage === "Done" ? [...sorted].reverse().find((t) => t.toStage === "Done") : undefined;
  return {
    cycleMs: firstDev && lastDone && lastDone.at >= firstDev.at ? lastDone.at.getTime() - firstDev.at.getTime() : null,
    returns: sorted.filter((t) => t.fromStage === "Review" && t.toStage === "Dev" && t.note).length,
    reachedReview: sorted.some((t) => t.toStage === "Review"),
    blockedMs: blockedDuration(blocks, now),
  };
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface QualitySummary {
  /** Số task có cycle time */
  measured: number;
  medianCycleMs: number | null;
  /** Task đã vào Review ít nhất một lần */
  reviewed: number;
  /** Task bị trả lại ít nhất một lần */
  returnedTasks: number;
  totalReturns: number;
  /** returnedTasks / reviewed, 0–1; null khi chưa task nào vào Review */
  returnRate: number | null;
  /** F22.7: tổng thời gian bị block + số task từng bị block */
  totalBlockedMs: number;
  blockedTasks: number;
}

export function summarize(items: readonly TaskQuality[]): QualitySummary {
  const cycles = items.flatMap((i) => (i.cycleMs === null ? [] : [i.cycleMs]));
  const reviewed = items.filter((i) => i.reachedReview).length;
  const returnedTasks = items.filter((i) => i.returns > 0).length;
  return {
    measured: cycles.length,
    medianCycleMs: median(cycles),
    reviewed,
    returnedTasks,
    totalReturns: items.reduce((s, i) => s + i.returns, 0),
    returnRate: reviewed ? returnedTasks / reviewed : null,
    totalBlockedMs: items.reduce((s, i) => s + i.blockedMs, 0),
    blockedTasks: items.filter((i) => i.blockedMs > 0).length,
  };
}

/** "3,5 ngày" / "6 giờ" / "—". */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const hours = ms / 3_600_000;
  if (hours < 24) return `${Math.max(1, Math.round(hours))} giờ`;
  return `${(Math.round((hours / 24) * 10) / 10).toString().replace(".", ",")} ngày`;
}

export const formatRate = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);
