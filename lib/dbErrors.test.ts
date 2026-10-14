import { describe, expect, it } from "vitest";
import { DB_UNAVAILABLE_MESSAGE, DatabaseUnavailableError, isDatabaseConnectionError } from "./dbErrors";

describe("isDatabaseConnectionError", () => {
  it("nhận diện mã lỗi kết nối ở chính lỗi hoặc ở cause", () => {
    expect(isDatabaseConnectionError(Object.assign(new Error("Invalid invocation"), { code: "ECONNREFUSED" }))).toBe(true);
    expect(isDatabaseConnectionError(Object.assign(new Error("x"), { code: "P1001" }))).toBe(true);
    expect(isDatabaseConnectionError(new Error("wrap", { cause: Object.assign(new Error("y"), { code: "ETIMEDOUT" }) }))).toBe(true);
  });

  it("không nhầm lỗi khác (vd vi phạm unique P2002) là mất kết nối", () => {
    expect(isDatabaseConnectionError(Object.assign(new Error("Unique"), { code: "P2002" }))).toBe(false);
    expect(isDatabaseConnectionError(new Error("boom"))).toBe(false);
    expect(isDatabaseConnectionError(null)).toBe(false);
  });
});

describe("DatabaseUnavailableError", () => {
  it("message cố định để error boundary nhận diện, giữ lỗi gốc ở cause", () => {
    const cause = new Error("gốc");
    const err = new DatabaseUnavailableError(cause);
    expect(err.message).toBe(DB_UNAVAILABLE_MESSAGE);
    expect(err.cause).toBe(cause);
  });
});
