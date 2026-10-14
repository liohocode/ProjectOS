import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeVi } from "./relativeTime";

const NOW = new Date("2026-10-14T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeVi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("dưới 1 phút hiển thị theo giây, tối thiểu 1 giây", () => {
    expect(formatRelativeVi(ago(0))).toBe("1 giây trước");
    expect(formatRelativeVi(ago(12 * SEC))).toBe("12 giây trước");
  });

  it("dưới 1 giờ hiển thị theo phút", () => {
    expect(formatRelativeVi(ago(MIN))).toBe("1 phút trước");
    expect(formatRelativeVi(ago(59 * MIN))).toBe("59 phút trước");
  });

  it("dưới 1 ngày hiển thị theo giờ", () => {
    expect(formatRelativeVi(ago(HOUR))).toBe("1 giờ trước");
    expect(formatRelativeVi(ago(23 * HOUR))).toBe("23 giờ trước");
  });

  it("đúng 1 ngày là 'Hôm qua', dưới 1 tuần theo ngày", () => {
    expect(formatRelativeVi(ago(DAY))).toBe("Hôm qua");
    expect(formatRelativeVi(ago(2 * DAY))).toBe("2 ngày trước");
    expect(formatRelativeVi(ago(6 * DAY))).toBe("6 ngày trước");
  });

  it("từ 1 tuần trở lên hiển thị theo tuần", () => {
    expect(formatRelativeVi(ago(7 * DAY))).toBe("1 tuần trước");
    expect(formatRelativeVi(ago(20 * DAY))).toBe("2 tuần trước");
  });
});
