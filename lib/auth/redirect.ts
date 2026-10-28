/** Đường dẫn quay lại sau đăng nhập: chỉ nhận path nội bộ ("/rv-web/work"), chặn open redirect ("//evil.com", "https://…"). */
export function safeReturnPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  return path;
}
