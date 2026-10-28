import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * memberId của người đang đăng nhập (AuthUser.memberId, gán lúc tạo tài khoản — ADR-020); null nếu chưa đăng nhập.
 * Đọc qua Better Auth: cookie cache 5 phút → phần lớn request không chạm DB.
 * Integration test mock module này (test/integration-env.ts) vì ngoài request Next không có headers().
 */
export const getSessionMemberId = cache(async (): Promise<string | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.memberId ?? null;
});
