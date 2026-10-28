import { getDocBody, getDocGroupsByProject, getDocIdsWithPendingRevision, getKnowledgeStripStats } from "@/lib/data/docs";
import { filterDocGroups, parseDocsFilter } from "@/lib/filters";
import { KnowledgeStrip } from "@/components/docs/KnowledgeStrip";
import { DocTree } from "@/components/docs/DocTree";
import { DocBodyView } from "@/components/docs/DocBodyView";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DocsPage(props: PageProps<"/[project]/docs">) {
  const { project: projectId } = await props.params;
  const searchParams = await props.searchParams;

  const filter = parseDocsFilter(searchParams);
  const filtered = Boolean(filter.agent || filter.pending);
  const [allGroups, stats, pendingDocIds] = await Promise.all([
    getDocGroupsByProject(projectId),
    getKnowledgeStripStats(projectId),
    getDocIdsWithPendingRevision(projectId),
  ]);
  const groups = filterDocGroups(allGroups, filter, pendingDocIds);
  // Link trong cây giữ tiêu chí lọc (F14.3).
  const filterQuery = [filter.agent && "agent=1", filter.pending && "pending=1"].filter(Boolean).map((q) => `&${q}`).join("");

  const requestedDoc = typeof searchParams.doc === "string" ? searchParams.doc : undefined;
  const docId = requestedDoc ?? groups[0]?.items[0]?.id ?? null;
  const body = docId ? await getDocBody(docId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <KnowledgeStrip stats={stats} />
      <div className="docs-shell">
        <DocTree projectId={projectId} groups={groups} activeDocId={docId} filterQuery={filterQuery} filtered={filtered} />
        {body ? (
          <DocBodyView body={body} projectId={projectId} />
        ) : (
          <div className="doc-body-area">
            {filtered ? (
              <EmptyState icon="ph-funnel" title="Không có tài liệu nào khớp bộ lọc" description="Đổi tiêu chí hoặc bấm “Xoá lọc” trong nút Lọc ở header." />
            ) : (
              <EmptyState
                icon="ph-files"
                title="Dự án chưa có tài liệu nào"
                description="Tài liệu gắn feature và kho tri thức chung của dự án sẽ hiện ở đây. Agent chỉ có thể đề xuất revision — người duyệt mới đưa vào bản chính."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
