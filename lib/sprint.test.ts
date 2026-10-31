import { describe, expect, it } from "vitest";
import { formatSprintLabel, parseSprintInput, parseSprintLabel } from "./sprint";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("parseSprintLabel", () => {
  it("sprint trong cùng một tháng", () => {
    expect(parseSprintLabel("Sprint 14 · 12–26/08", 2026)).toEqual({
      name: "Sprint 14",
      startDate: utc(2026, 8, 12),
      endDate: utc(2026, 8, 26),
    });
  });

  it("sprint vắt qua hai tháng", () => {
    expect(parseSprintLabel("Sprint 22 · 18/08–01/09", 2026)).toEqual({
      name: "Sprint 22",
      startDate: utc(2026, 8, 18),
      endDate: utc(2026, 9, 1),
    });
  });

  it("sprint vắt qua năm mới", () => {
    const s = parseSprintLabel("Sprint 1 · 28/12–08/01", 2026);
    expect(s.startDate).toEqual(utc(2026, 12, 28));
    expect(s.endDate).toEqual(utc(2027, 1, 8));
  });

  it("nhãn sai định dạng thì báo lỗi", () => {
    expect(() => parseSprintLabel("Sprint 14", 2026)).toThrow(/không đúng định dạng/);
  });
});

describe("formatSprintLabel", () => {
  it("khứ hồi với nhãn gốc của dữ liệu mẫu", () => {
    for (const label of ["Sprint 14 · 12–26/08", "Sprint 9 · 11–25/08", "Sprint 22 · 18/08–01/09"]) {
      expect(formatSprintLabel(parseSprintLabel(label, 2026))).toBe(label);
    }
  });
});

describe("parseSprintInput (F21.3)", () => {
  it("hợp lệ → tên đã trim + ngày UTC", () => {
    expect(parseSprintInput({ name: " Sprint 15 ", startDate: "2026-08-27", endDate: "2026-09-09" })).toEqual({
      ok: true,
      value: { name: "Sprint 15", startDate: utc(2026, 8, 27), endDate: utc(2026, 9, 9) },
    });
  });

  it.each([
    [{ name: "  ", startDate: "2026-08-27", endDate: "2026-09-09" }, "Nhập tên sprint"],
    [{ name: "S", startDate: "", endDate: "2026-09-09" }, "Chọn ngày bắt đầu và kết thúc"],
    [{ name: "S", startDate: "2026-09-10", endDate: "2026-09-09" }, "Ngày kết thúc phải sau ngày bắt đầu"],
    [{ name: "S", startDate: "2026-01-01", endDate: "2026-12-31" }, "Sprint dài tối đa 60 ngày"],
  ])("từ chối %o", (input, error) => {
    expect(parseSprintInput(input)).toEqual({ ok: false, error });
  });
});
