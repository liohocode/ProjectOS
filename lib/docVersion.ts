/**
 * Tăng version phụ của tài liệu khi duyệt revision (F12.2): "v4.2" → "v4.3", "v1.9" → "v1.10", "v2" → "v2.1".
 * Chuỗi không theo dạng vX[.Y] → thêm ".1" (không làm mất thông tin version cũ).
 */
export function bumpMinorVersion(version: string): string {
  const m = /^(v?)(\d+)(?:\.(\d+))?$/.exec(version.trim());
  if (!m) return `${version.trim()}.1`;
  const [, prefix, major, minor] = m;
  return `${prefix}${major}.${minor === undefined ? 1 : Number(minor) + 1}`;
}
