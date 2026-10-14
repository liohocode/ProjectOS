import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function McpLoading() {
  return (
    <LoadingRegion label="Đang tải MCP…" className="mcp-main">
      <div className="mcp-grid">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={132} radius="var(--radius-md)" />
        ))}
      </div>
      {[0, 1].map((t) => (
        <div key={t} className="skeleton-stack" style={{ marginTop: "var(--space-8)" }}>
          <Skeleton width={180} height={16} />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={20} />
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}
