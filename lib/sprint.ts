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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Sprint dài tối đa (ngày) — chặn nhập nhầm năm. */
export const MAX_SPRINT_DAYS = 60;

/** Kiểm tra form tạo sprint (F21.3): tên 1–60 ký tự, ngày ISO, kết thúc không trước bắt đầu, tối đa 60 ngày. */
export function parseSprintInput(input: { name: string; startDate: string; endDate: string }): { ok: true; value: SprintRange } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nhập tên sprint" };
  if (name.length > 60) return { ok: false, error: "Tên sprint tối đa 60 ký tự" };
  if (!ISO_DATE.test(input.startDate) || !ISO_DATE.test(input.endDate)) return { ok: false, error: "Chọn ngày bắt đầu và kết thúc" };
  const startDate = new Date(`${input.startDate}T00:00:00Z`);
  const endDate = new Date(`${input.endDate}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { ok: false, error: "Ngày không hợp lệ" };
  if (endDate < startDate) return { ok: false, error: "Ngày kết thúc phải sau ngày bắt đầu" };
  if ((endDate.getTime() - startDate.getTime()) / 86_400_000 > MAX_SPRINT_DAYS) return { ok: false, error: `Sprint dài tối đa ${MAX_SPRINT_DAYS} ngày` };
  return { ok: true, value: { name, startDate, endDate } };
}
