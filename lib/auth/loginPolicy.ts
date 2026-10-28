import { getLoginMemberIdByEmail } from "@/lib/data/team";

// Ai được đăng nhập (ADR-013, ADR-020): chỉ email Google đã xác minh, trùng email của một Member người.
// Không tự đăng ký — người lạ bị từ chối. Tách khỏi lib/auth/auth.ts để test không cần dựng Better Auth.

/** Mã lỗi Better Auth gắn vào `?error=` khi chuyển về /login (xem LOGIN_ERROR_MESSAGES). */
export const NOT_A_MEMBER = "not_a_member";
export const EMAIL_NOT_VERIFIED = "email_not_verified";

export type LoginCheck = { ok: true; memberId: string } | { ok: false; error: string; errorDescription: string };

export async function checkLogin(email: string | undefined, emailVerified: boolean | undefined): Promise<LoginCheck> {
  if (!email) return { ok: false, error: NOT_A_MEMBER, errorDescription: "Tài khoản Google không có email" };
  if (emailVerified !== true) {
    return { ok: false, error: EMAIL_NOT_VERIFIED, errorDescription: "Email Google chưa được xác minh" };
  }
  const memberId = await getLoginMemberIdByEmail(email);
  if (!memberId) return { ok: false, error: NOT_A_MEMBER, errorDescription: `${email} không phải thành viên Meridian` };
  return { ok: true, memberId };
}

/** Thông báo hiện trên /login theo mã lỗi; mã lạ (lỗi OAuth khác của Better Auth) dùng thông báo chung. */
export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  [NOT_A_MEMBER]: "Email này chưa được mời vào Meridian. Nhờ tech lead thêm email của bạn vào hồ sơ thành viên.",
  [EMAIL_NOT_VERIFIED]: "Email Google của bạn chưa được xác minh.",
};
export const GENERIC_LOGIN_ERROR = "Đăng nhập không thành công. Thử lại, hoặc báo tech lead nếu lỗi lặp lại.";
