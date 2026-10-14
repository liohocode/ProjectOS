import { describe, expect, it } from "vitest";
import { datesToWeeks, weeksToDates } from "./timeline";

const sprintStart = new Date(Date.UTC(2026, 7, 12)); // 12/08/2026
const utc = (m: number, d: number) => new Date(Date.UTC(2026, m - 1, d));

describe("weeksToDates", () => {
  it("T1 dài 5 tuần bắt đầu đúng ngày đầu sprint", () => {
    expect(weeksToDates(1, 5, sprintStart)).toEqual({ plannedStart: utc(8, 12), plannedEnd: utc(9, 15) });
  });

  it("T7 dài 2 tuần", () => {
    expect(weeksToDates(7, 2, sprintStart)).toEqual({ plannedStart: utc(9, 23), plannedEnd: utc(10, 6) });
  });
});

describe("datesToWeeks", () => {
  it("khứ hồi với mọi vị trí của dữ liệu mẫu", () => {
    for (const [start, len] of [[1, 5], [3, 4], [2, 3], [5, 3], [7, 2], [4, 3], [6, 2]]) {
      const { plannedStart, plannedEnd } = weeksToDates(start, len, sprintStart);
      expect(datesToWeeks(plannedStart, plannedEnd, sprintStart)).toEqual({ start, len });
    }
  });

  it("cắt bar vượt ra ngoài cửa sổ 8 tuần", () => {
    expect(datesToWeeks(utc(8, 1), utc(8, 20), sprintStart)).toEqual({ start: 1, len: 2 });
    expect(datesToWeeks(utc(9, 30), utc(12, 31), sprintStart)).toEqual({ start: 8, len: 1 });
  });

  it("nằm hẳn ngoài cửa sổ thì không vẽ", () => {
    expect(datesToWeeks(utc(1, 1), utc(1, 31), sprintStart)).toBeNull();
    expect(datesToWeeks(utc(12, 1), utc(12, 31), sprintStart)).toBeNull();
  });
});
