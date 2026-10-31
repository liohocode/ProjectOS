// Sắp xếp thứ tự ưu tiên (F21.10) — hàm thuần: đổi chỗ phần tử với hàng xóm. Trả null khi không đổi được (đầu / cuối / không có).
export type Direction = "up" | "down";

export function moveInList(ids: readonly string[], id: string, dir: Direction): string[] | null {
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
