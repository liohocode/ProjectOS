import type { KnowledgeStripStats } from "@/lib/data/docs";

export function KnowledgeStrip({ stats }: { stats: KnowledgeStripStats }) {
  return (
    <div className="kb-strip kb">
      <span className="kb-title">
        <i className="ph ph-brain" aria-hidden /> KHO TRI THỨC
      </span>
      <Stat label="Tài liệu" value={`${stats.indexedDocs}/${stats.totalDocs} đã index`} />
      <Stat label="Chunk" value={String(stats.chunks)} />
      <Stat label="Revision chờ duyệt" value={String(stats.pendingRevisions)} />
      <Stat label="Agent đã ghi" className="kb-drop" value={String(stats.agentWritten)} />
      <Stat label="Index cuối" className="kb-drop" value={stats.lastIndexedAgo} />
      <Stat label="Embedding" className="kb-drop-2" value={stats.embeddingModel} />
      <span className="kb-spacer" />
      <button type="button" className="btn btn-secondary">
        <i className="ph ph-arrows-clockwise" aria-hidden /> Index lại
      </button>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <span className={`kb-stat ${className}`}>
      <span className="kb-stat-label">{label}</span> <span className="kb-stat-value">{value}</span>
    </span>
  );
}
