// Token đã dùng và thời lượng phiên MCP: dạng lưu DB ↔ chuỗi hiển thị. Thuần.

/** "182K" → 182000, "2.4M" → 2400000, "410" → 410 */
export function parseTokens(label: string): number {
  const match = /^([\d.]+)\s*([KM]?)$/i.exec(label.trim());
  if (!match) throw new Error(`Số token không đúng định dạng: "${label}"`);
  const unit = match[2].toUpperCase();
  const factor = unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1;
  return Math.round(Number(match[1]) * factor);
}

/** 182000 → "182K", 2400000 → "2.4M", 950 → "950" */
export function formatTokens(tokens: number): string {
  const compact = (n: number) => String(Number(n.toFixed(1)));
  if (tokens >= 1_000_000) return `${compact(tokens / 1_000_000)}M`;
  if (tokens >= 1_000) return `${compact(tokens / 1_000)}K`;
  return String(tokens);
}

/** Số phút của phiên; phiên chưa kết thúc tính tới thời điểm `now`. */
export function sessionDurationMin(startedAt: Date, endedAt: Date | null, now: Date): number {
  const end = endedAt ?? now;
  return Math.max(0, Math.round((end.getTime() - startedAt.getTime()) / 60_000));
}
