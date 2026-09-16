/** Định dạng một Date thành chuỗi tương đối tiếng Việt, dùng chung cho mọi nơi hiển thị "x phút trước". */
export function formatRelativeVi(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${Math.max(sec, 1)} giây trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Hôm qua";
  if (day < 7) return `${day} ngày trước`;
  return `${Math.floor(day / 7)} tuần trước`;
}
