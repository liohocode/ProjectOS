// Chuyển đổi giữa nhãn sprint hiển thị ("Sprint 14 · 12–26/08") và dữ liệu
// có cấu trúc (tên + ngày bắt đầu/kết thúc). Thuần — dùng chung cho seed và lib/data.

export interface SprintRange {
  name: string;
  startDate: Date;
  endDate: Date;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "Sprint 14 · 12–26/08" | "Sprint 22 · 18/08–01/09" → tên + ngày (UTC, theo năm truyền vào). */
export function parseSprintLabel(label: string, year: number): SprintRange {
  const match = /^(.+?)\s*·\s*(\d{1,2})(?:\/(\d{1,2}))?\s*[–-]\s*(\d{1,2})\/(\d{1,2})$/.exec(label.trim());
  if (!match) throw new Error(`Nhãn sprint không đúng định dạng: "${label}"`);
  const [, name, startDay, startMonth, endDay, endMonth] = match;
  const startDate = new Date(Date.UTC(year, Number(startMonth ?? endMonth) - 1, Number(startDay)));
  const endDate = new Date(Date.UTC(year, Number(endMonth) - 1, Number(endDay)));
  if (endDate < startDate) endDate.setUTCFullYear(year + 1); // sprint vắt qua năm mới
  return { name: name.trim(), startDate, endDate };
}

/** Ngược lại với parseSprintLabel: gọn "12–26/08" khi cùng tháng, đầy đủ "18/08–01/09" khi khác tháng. */
export function formatSprintLabel({ name, startDate, endDate }: SprintRange): string {
  const sd = startDate.getUTCDate();
  const sm = startDate.getUTCMonth() + 1;
  const ed = endDate.getUTCDate();
  const em = endDate.getUTCMonth() + 1;
  const range = sm === em ? `${pad(sd)}–${pad(ed)}/${pad(em)}` : `${pad(sd)}/${pad(sm)}–${pad(ed)}/${pad(em)}`;
  return `${name} · ${range}`;
}
