import { describe, expect, it } from "vitest";
import { moveInList } from "./reorder";

describe("moveInList (F21.10)", () => {
  it("đổi chỗ với hàng xóm", () => {
    expect(moveInList(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveInList(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
  });
  it("đầu / cuối / không có → null", () => {
    expect(moveInList(["a", "b"], "a", "up")).toBeNull();
    expect(moveInList(["a", "b"], "b", "down")).toBeNull();
    expect(moveInList(["a"], "x", "up")).toBeNull();
  });
});
