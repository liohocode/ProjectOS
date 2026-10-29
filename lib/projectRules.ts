// Ràng buộc chung cho dự án (F13.1) — dùng ở cả form (client) và server action.

/** Trạng thái chọn được khi tạo dự án ("Đang chạy" được tô accent ở ProjectCard). */
export const PROJECT_STATUSES = ["Chuẩn bị", "Đang chạy", "Chuẩn bị release", "Tạm dừng"] as const;

/** Id dự án là đoạn đầu URL `/<id>/…` → không trùng các route cấp gốc của app. */
export const RESERVED_PROJECT_IDS = ["api", "login", "logout", "auth", "_next", "favicon.ico", "new", "admin", "settings"];

export const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const PROJECT_CODE_PATTERN = /^[A-Z0-9]{2}$/;

/** Gợi ý mã 2 ký tự từ tên: chữ cái đầu của 2 từ đầu ("Rever Mobile App" → "RM"), hoặc 2 ký tự đầu. */
export function suggestProjectCode(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (words.length >= 2) return words[0][0] + words[1][0];
  return (words[0] ?? "").slice(0, 2);
}
