import { describe, expect, it } from "vitest";
import { formatTokens, parseTokens, sessionDurationMin } from "./mcpFormat";

describe("token", () => {
  it("parse nhãn mẫu", () => {
    expect(parseTokens("182K")).toBe(182_000);
    expect(parseTokens("2.4M")).toBe(2_400_000);
    expect(parseTokens("410")).toBe(410);
    expect(() => parseTokens("nhiều")).toThrow(/không đúng định dạng/);
  });

  it("format gọn theo K/M", () => {
    expect(formatTokens(182_000)).toBe("182K");
    expect(formatTokens(2_400_000)).toBe("2.4M");
    expect(formatTokens(1_250)).toBe("1.3K");
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(0)).toBe("0");
  });

  it("khứ hồi với nhãn của dữ liệu mẫu", () => {
    for (const label of ["182K", "54K", "71K", "240K", "88K", "63K", "310K", "95K"]) {
      expect(formatTokens(parseTokens(label))).toBe(label);
    }
  });
});

describe("thời lượng phiên", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const start = new Date("2026-10-14T11:46:00Z");

  it("phiên đã kết thúc tính tới endedAt", () => {
    expect(sessionDurationMin(start, new Date("2026-10-14T11:55:00Z"), now)).toBe(9);
  });

  it("phiên đang chạy tính tới hiện tại", () => {
    expect(sessionDurationMin(start, null, now)).toBe(14);
  });
});
