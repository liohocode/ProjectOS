import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function TeamLoading() {
  return (
    <LoadingRegion label="Đang tải thành viên…" className="team-shell">
      <div className="team-main">
        <div className="pipeline-cards">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius="var(--radius-md)" style={{ flex: 1, minWidth: 172 }} />
          ))}
        </div>
        <div className="team-toolbar">
          <Skeleton width={320} height={32} radius="var(--radius-md)" />
        </div>
        <div className="member-list">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={40} radius="var(--radius-md)" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
