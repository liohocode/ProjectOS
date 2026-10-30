import { describe, expect, it } from "vitest";
import { generateAgentToken, hashAgentToken, isAgentTokenFormat } from "./tokenFormat";

describe("token agent (F15.5)", () => {
  it("token mới đúng định dạng, không trùng nhau", () => {
    const a = generateAgentToken();
    const b = generateAgentToken();
    expect(isAgentTokenFormat(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("hash ổn định, 64 ký tự hex, khác token gốc", () => {
    const t = generateAgentToken();
    expect(hashAgentToken(t)).toBe(hashAgentToken(t));
    expect(hashAgentToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAgentToken(t)).not.toContain(t.slice(4));
  });

  it("từ chối chuỗi sai định dạng", () => {
    expect(isAgentTokenFormat("")).toBe(false);
    expect(isAgentTokenFormat("mrd_ngan")).toBe(false);
    expect(isAgentTokenFormat(`xyz_${"a".repeat(43)}`)).toBe(false);
  });
});
