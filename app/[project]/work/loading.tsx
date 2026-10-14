import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function WorkLoading() {
  return (
    <LoadingRegion label="Đang tải feature và task…" className="work-shell">
      <div className="work-main">
        <div className="work-toolbar">
          <Skeleton width={220} height={32} radius="var(--radius-md)" />
          <Skeleton width={60} />
        </div>
        {[5, 3, 3].map((rows, i) => (
          <section className="feature-section" key={i}>
            <div className="frow">
              <Skeleton width={16} height={16} onSurface />
              <Skeleton width={56} onSurface />
              <Skeleton width="40%" height={14} onSurface />
            </div>
            <div className="skeleton-stack" style={{ padding: "var(--space-3) var(--space-4)" }}>
              {Array.from({ length: rows }, (_, r) => (
                <div className="skeleton-row" key={r}>
                  <Skeleton width={40} onSurface />
                  <Skeleton width={44} height={18} onSurface />
                  <Skeleton width={`${55 - r * 6}%`} onSurface />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </LoadingRegion>
  );
}
