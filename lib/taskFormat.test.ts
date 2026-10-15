import { describe, expect, it } from "vitest";
import { TaskStatus } from "@/lib/generated/prisma/enums";
import {
  TASK_STATUS_LABEL,
  formatDue,
  formatEstimate,
  formatRunning,
  parseDue,
  parseEstimate,
  parseRunning,
  parseTaskStatus,
  toIsoDate,
} from "./taskFormat";

const NOW = new Date("2026-10-14T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("ước lượng", () => {
  it("parse + format khứ hồi", () => {
    expect(parseEstimate("5đ")).toBe(5);
    expect(parseEstimate("—")).toBeNull();
    expect(formatEstimate(5)).toBe("5đ");
    expect(formatEstimate(null)).toBe("—");
    expect(formatEstimate(0)).toBe("0đ");
  });
});

describe("hạn", () => {
  it("parse + format khứ hồi", () => {
    const due = parseDue("22/08", 2026);
    expect(due).toEqual(new Date(Date.UTC(2026, 7, 22)));
    expect(formatDue(due)).toBe("22/08");
    expect(formatDue(parseDue("01/09", 2026))).toBe("01/09");
  });

  it("không đúng định dạng / rỗng", () => {
    expect(parseDue("—", 2026)).toBeNull();
    expect(formatDue(null)).toBe("—");
  });
});

describe("thời gian đang chạy", () => {
  it("parse nhãn cũ thành thời điểm bắt đầu", () => {
    expect(parseRunning("chạy 14 phút", NOW)).toEqual(minutesAgo(14));
    expect(parseRunning("", NOW)).toBeNull();
  });

  it("format theo phút / giờ", () => {
    expect(formatRunning(minutesAgo(14), NOW)).toBe("chạy 14 phút");
    expect(formatRunning(minutesAgo(0), NOW)).toBe("chạy 0 phút");
    expect(formatRunning(minutesAgo(120), NOW)).toBe("chạy 2 giờ");
    expect(formatRunning(minutesAgo(125), NOW)).toBe("chạy 2 giờ 5 phút");
  });

  it("khứ hồi với nhãn mẫu", () => {
    for (const label of ["chạy 14 phút", "chạy 3 phút", "chạy 6 phút"]) {
      expect(formatRunning(parseRunning(label, NOW)!, NOW)).toBe(label);
    }
  });
});

describe("trạng thái task", () => {
  it("mọi giá trị enum đều có nhãn và parse ngược được", () => {
    for (const value of Object.values(TaskStatus)) {
      expect(parseTaskStatus(TASK_STATUS_LABEL[value])).toBe(value);
    }
  });

  it("nhãn lạ báo lỗi", () => {
    expect(() => parseTaskStatus("Không rõ")).toThrow(/không hợp lệ/);
  });
});

describe("toIsoDate", () => {
  it("DATE → YYYY-MM-DD cho <input type=date>", () => {
    expect(toIsoDate(parseDue("02/11", 2026))).toBe("2026-11-02");
    expect(toIsoDate(null)).toBeNull();
  });
});
