import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function InboxLoading() {
  return (
    <LoadingRegion label="Đang tải việc cần xử lý…" className="inbox-main">
      {[3, 2].map((rows, i) => (
        <section className="inbox-section" key={i}>
          <Skeleton width={200} height={14} style={{ marginBottom: "var(--space-3)" }} />
          <div className="skeleton-stack">
            {Array.from({ length: rows }, (_, r) => (
              <Skeleton key={r} height={40} radius="var(--radius-sm)" />
            ))}
          </div>
        </section>
      ))}
    </LoadingRegion>
  );
}
