import { getPortfolioSummaries } from "@/lib/data/portfolio";
import { getTeam } from "@/lib/data/team";
import { getActor } from "@/lib/data/permissions";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewProjectDialog } from "@/components/portfolio/NewProjectDialog";

export default async function PortfolioPage(props: PageProps<"/[project]/portfolio">) {
  const { project: currentProjectId } = await props.params;
  const { new: newParam } = await props.searchParams;
  const [summaries, orgTeam, actor] = await Promise.all([getPortfolioSummaries(), getTeam(), getActor(await getCurrentUserId())]);
  const totalBlocked = summaries.reduce((sum, p) => sum + p.blockedCount, 0);
  const archivedCount = summaries.filter((p) => p.archived).length;

  return (
    <div className="portfolio-main">
      <div className="portfolio-summary">
        {summaries.length} dự án{archivedCount > 0 && ` (${archivedCount} lưu trữ)`} · {orgTeam.length} người và agent dùng chung · {totalBlocked} task đang bị block
      </div>
      {summaries.length === 0 ? (
        <EmptyState icon="ph-squares-four" title="Chưa có dự án nào" description="Tạo dự án đầu tiên bằng nút “Dự án mới”." />
      ) : (
        <div className="portfolio-grid">
          {summaries.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isOpen={project.id === currentProjectId}
              // F15.6: nút lưu trữ chỉ cho người có quyền trên dự án đó (lưu trữ không cần người tạo dự án).
              canArchive={actor !== null && can(actor, "project.archive", { id: project.id, createdById: null })}
            />
          ))}
        </div>
      )}
      {/* "Dự án mới" ở header đặt ?new=1 (ADR-018) */}
      {newParam === "1" && <NewProjectDialog />}
    </div>
  );
}
