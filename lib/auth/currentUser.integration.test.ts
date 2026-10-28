import { describe, expect, it, vi } from "vitest";
import { getCurrentUser, getCurrentUserId } from "./currentUser";
import { getSessionMemberId } from "./session";

// lib/auth/session được mock trong test/integration-env.ts (mặc định: Trung Hiếu đang đăng nhập).
describe("người dùng hiện tại (đọc từ session — F15.3)", () => {
  it("trả Member đầy đủ khớp với memberId trong session", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValueOnce("nam");
    const user = await getCurrentUser();
    expect(user).toMatchObject({ id: "nam", kind: "human" });
  });

  it("chưa đăng nhập → chuyển về /login (redirect của Next, không trả id rỗng)", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValueOnce(null);
    await expect(getCurrentUserId()).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
  });

  it("session trỏ tới Member đã bị xoá → chuyển về /login", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValue("khong-ton-tai");
    try {
      await expect(getCurrentUser()).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
  });
});
