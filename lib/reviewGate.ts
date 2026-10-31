// Cổng vào Review (F22.3) — phần thuần: thông báo khi còn acceptance criteria (F21.6) chưa đạt.

/** Lý do chặn chuyển sang Review (F22.3) từ danh sách tiêu chí chưa đạt — null = được chuyển. Thuần. */
export function reviewBlockReason(pending: readonly string[]): string | null {
  if (pending.length === 0) return null;
  const shown = pending.slice(0, 3).map((t) => `"${t.length > 60 ? `${t.slice(0, 57)}…` : t}"`).join(", ");
  const more = pending.length > 3 ? ` và ${pending.length - 3} tiêu chí khác` : "";
  return `Còn ${pending.length} tiêu chí chưa đạt: ${shown}${more} — tick khi đã đạt rồi mới chuyển sang Review`;
}
