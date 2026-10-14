import type { CSSProperties } from "react";

/** Khối giữ chỗ khi đang tải. `onSurface` dùng khi nằm trên nền surface (card, section). */
export function Skeleton({
  width = "100%",
  height = 12,
  radius,
  onSurface = false,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  onSurface?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`skeleton${onSurface ? " skeleton-on-surface" : ""}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** Vùng loading cho trình đọc màn hình: thông báo đang tải, ẩn các khối giữ chỗ. */
export function LoadingRegion({ label, children, className, style }: { label: string; children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} style={style}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
