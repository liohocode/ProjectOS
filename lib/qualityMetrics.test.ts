import { describe, expect, it } from "vitest";
import { blockedDuration, formatDuration, formatRate, median, summarize, taskQuality, type TransitionPoint } from "./qualityMetrics";

const day = (d: number, h = 0) => new Date(Date.UTC(2026, 9, d, h));
const t = (fromStage: string | null, toStage: string | null, at: Date, note: string | null = null): TransitionPoint => ({ fromStage, toStage, at, note });

describe("taskQuality (F22.5)", () => {
  it("cycle time từ lần đầu vào Dev tới lần cuối vào Done; đếm số lần trả lại", () => {
    const q = taskQuality("Done", [
      t(null, "BA", day(1)),
      t("BA", "Dev", day(2)),
      t("Dev", "Review", day(3)),
      t("Review", "Dev", day(3, 6), "thiếu test"),
      t("Dev", "Review", day(4)),
      t("Review", "Done", day(5)),
    ]);
    expect(q).toEqual({ cycleMs: 3 * 86_400_000, returns: 1, reachedReview: true, blockedMs: 0 });
  });

  it("chưa Done hoặc không có mốc Dev → không có cycle time; Review → Dev không lý do không tính trả lại", () => {
    expect(taskQuality("Review", [t("BA", "Dev", day(1)), t("Dev", "Review", day(2))]).cycleMs).toBeNull();
    expect(taskQuality("Done", [t("Review", "Done", day(2))]).cycleMs).toBeNull();
    expect(taskQuality("Dev", [t("Review", "Dev", day(2))]).returns).toBe(0);
  });
});

describe("blockedDuration (F22.7)", () => {
  it("cộng các lần block, lần chưa gỡ tính tới now", () => {
    const now = day(10);
    expect(blockedDuration([{ blockedAt: day(1), unblockedAt: day(2) }, { blockedAt: day(9), unblockedAt: null }], now)).toBe(2 * 86_400_000);
    expect(taskQuality("Dev", [], [{ blockedAt: day(9), unblockedAt: null }], now).blockedMs).toBe(86_400_000);
  });
});

describe("summarize / định dạng", () => {
  it("trung vị + tỉ lệ trả lại", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    const s = summarize([
      { cycleMs: 2 * 86_400_000, returns: 1, reachedReview: true, blockedMs: 0 },
      { cycleMs: 4 * 86_400_000, returns: 0, reachedReview: true, blockedMs: 3_600_000 },
      { cycleMs: null, returns: 0, reachedReview: false, blockedMs: 7_200_000 },
    ]);
    expect(s).toEqual({
      measured: 2,
      medianCycleMs: 3 * 86_400_000,
      reviewed: 2,
      returnedTasks: 1,
      totalReturns: 1,
      returnRate: 0.5,
      totalBlockedMs: 10_800_000,
      blockedTasks: 2,
    });
    expect(summarize([]).returnRate).toBeNull();
  });

  it("định dạng thời lượng + tỉ lệ", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(6 * 3_600_000)).toBe("6 giờ");
    expect(formatDuration(3.5 * 86_400_000)).toBe("3,5 ngày");
    expect(formatRate(0.333)).toBe("33%");
    expect(formatRate(null)).toBe("—");
  });
});
