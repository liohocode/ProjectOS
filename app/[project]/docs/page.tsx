import { getDocBody, getDocGroupsByProject, getFirstDocId, getKnowledgeStripStats } from "@/lib/data/docs";
import { KnowledgeStrip } from "@/components/docs/KnowledgeStrip";
import { DocTree } from "@/components/docs/DocTree";
import { DocBodyView } from "@/components/docs/DocBodyView";

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
        {body ? <DocBodyView body={body} projectId={projectId} /> : <div className="screen-placeholder">Chưa có tài liệu nào.</div>}
      </div>
    </div>
  );
}
