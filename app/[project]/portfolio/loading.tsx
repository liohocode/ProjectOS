import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function PortfolioLoading() {
  return (
    <LoadingRegion label="Đang tải danh sách dự án…" className="portfolio-main">
      <Skeleton width={320} style={{ marginBottom: "var(--space-4)" }} />
      <div className="portfolio-grid">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={230} radius="var(--radius-md)" />
        ))}
      </div>
    </LoadingRegion>
  );
}
