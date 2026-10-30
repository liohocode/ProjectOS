/** Gộp mục mới (đầu) với danh sách hiện có, bỏ trùng theo id (mục không có id giữ nguyên), giữ tối đa `limit` (F17.3). */
export function mergeById<T extends { id?: string }>(fresh: T[], current: T[], limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of [...fresh, ...current]) {
    if (item.id) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
