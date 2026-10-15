import { describe, expect, it } from "vitest";
import { getCurrentUser, getCurrentUserId } from "./currentUser";

describe("người dùng hiện tại", () => {
  it("trả Member đầy đủ khớp với id hiện tại", async () => {
    const user = await getCurrentUser();
    expect(user.id).toBe(await getCurrentUserId());
    expect(user.kind).toBe("human");
  });
});
