// Definition of Done theo dự án (F22.6) — hàm thuần.

export const MAX_DOD_ITEMS = 12;
const MAX_ITEM = 120;

/** Ô nhập (mỗi dòng một mục, bỏ dấu "- " đầu dòng) → danh sách mục; lỗi khi quá dài / quá nhiều. */
export function parseDodInput(text: string): { ok: true; items: string[] } | { ok: false; error: string } {
  const items = [...new Set(text.split("\n").map((l) => l.replace(/^\s*[-*]\s*(\[[ xX]\]\s*)?/, "").trim()).filter(Boolean))];
  if (items.length > MAX_DOD_ITEMS) return { ok: false, error: `Tối đa ${MAX_DOD_ITEMS} mục` };
  const long = items.find((i) => i.length > MAX_ITEM);
  if (long) return { ok: false, error: `Mỗi mục tối đa ${MAX_ITEM} ký tự` };
  return { ok: true, items };
}

/** Mục DoD chưa được người duyệt xác nhận. */
export function missingDod(dod: readonly string[], checked: readonly string[]): string[] {
  const set = new Set(checked);
  return dod.filter((d) => !set.has(d));
}
