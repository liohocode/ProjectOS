// Id tài liệu sinh từ tiêu đề (F12.5): bỏ dấu tiếng Việt, chữ thường, nối bằng "-".
const MAX_LEN = 60;

export function slugify(text: string, fallback = "tai-lieu"): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LEN)
    .replace(/-+$/, "");
  return slug || fallback;
}
