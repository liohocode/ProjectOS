import { getDocBody, getDocGroupsByProject, getFirstDocId, getKnowledgeStripStats } from "@/lib/data/docs";
import { KnowledgeStrip } from "@/components/docs/KnowledgeStrip";
import { DocTree } from "@/components/docs/DocTree";
import { DocBodyView } from "@/components/docs/DocBodyView";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DocsPage(props: PageProps<"/[project]/docs">) {
  const { project: projectId } = await props.params;
  const searchParams = await props.searchParams;

  const [groups, stats] = await Promise.all([getDocGroupsByProject(projectId), getKnowledgeStripStats(projectId)]);

  const requestedDoc = typeof searchParams.doc === "string" ? searchParams.doc : undefined;
  const docId = requestedDoc ?? (await getFirstDocId(projectId));
  const body = docId ? await getDocBody(docId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <KnowledgeStrip stats={stats} />
      <div className="docs-shell">
        <DocTree projectId={projectId} groups={groups} activeDocId={docId} />
        {body ? (
          <DocBodyView body={body} projectId={projectId} />
        ) : (
          <div className="doc-body-area">
            <EmptyState
              icon="ph-files"
              title="Dự án chưa có tài liệu nào"
              description="Tài liệu gắn feature và kho tri thức chung của dự án sẽ hiện ở đây. Agent chỉ có thể đề xuất revision — người duyệt mới đưa vào bản chính."
            />
          </div>
        )}
      </div>
    </div>
  );
}
