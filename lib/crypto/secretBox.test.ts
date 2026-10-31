import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { keyHint, open, parseMasterKey, seal } from "./secretBox";

describe("secretBox (F29.2, ADR-025)", () => {
  const key = randomBytes(32);

  it("mã hoá rồi giải mã ra đúng bản rõ; mỗi lần IV khác nhau", () => {
    const a = seal("sk-ant-api03-abcd", key);
    const b = seal("sk-ant-api03-abcd", key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toContain("abcd");
    expect(open(a, key)).toBe("sk-ant-api03-abcd");
    expect(a.keyVersion).toBe(1);
  });

  it("sai khoá hoặc dữ liệu bị sửa → lỗi", () => {
    const s = seal("secret", key);
    expect(() => open(s, randomBytes(32))).toThrow();
    const tampered = Buffer.from(s.ciphertext, "base64");
    tampered[0] ^= 1;
    expect(() => open({ ...s, ciphertext: tampered.toString("base64") }, key)).toThrow();
  });

  it("khoá chủ: chỉ nhận base64 đúng 32 byte", () => {
    expect(parseMasterKey(undefined)).toBeNull();
    expect(parseMasterKey("")).toBeNull();
    expect(parseMasterKey(randomBytes(16).toString("base64"))).toBeNull();
    expect(parseMasterKey(key.toString("base64"))?.equals(key)).toBe(true);
  });

  it("gợi ý 4 ký tự cuối", () => {
    expect(keyHint(" sk-ant-xyz1234 ")).toBe("1234");
  });
});
