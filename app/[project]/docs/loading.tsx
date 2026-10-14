import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function DocsLoading() {
  return (
    <LoadingRegion label="Đang tải tài liệu…" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div className="kb-strip">
        {[90, 110, 80, 140, 100].map((w, i) => (
          <Skeleton key={i} width={w} onSurface />
        ))}
      </div>
      <div className="docs-shell">
        <div className="doc-tree skeleton-stack">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} width={i % 4 === 0 ? "60%" : "85%"} height={i % 4 === 0 ? 10 : 14} />
          ))}
        </div>
        <div className="doc-body-area">
          <div className="doc-body-inner skeleton-stack">
            <Skeleton width={160} height={18} />
            <Skeleton width="70%" height={26} />
            <Skeleton width="100%" />
            <Skeleton width="90%" />
            <div className="skeleton-row" style={{ marginTop: "var(--space-4)" }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={56} radius="var(--radius-md)" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
