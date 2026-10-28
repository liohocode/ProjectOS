import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// F15.3 — chưa có cookie session → về /login?from=<trang đang mở>. Chỉ kiểm tra cookie CÓ TỒN TẠI
// (không đọc DB, không verify chữ ký): cookie giả vẫn lọt qua đây nhưng bị getCurrentUser() chặn ở server.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const login = new URL("/login", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/") login.searchParams.set("from", from);
  return NextResponse.redirect(login);
}

export const config = {
  // Trừ: trang login, API của Better Auth, MCP (F16 — xác thực bằng token agent), file tĩnh của Next.
  matcher: ["/((?!login|api/auth|api/mcp|_next/static|_next/image|favicon.ico).*)"],
};
