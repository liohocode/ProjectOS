import { getPortfolioSummaries } from "@/lib/data/portfolio";
import { getTeam } from "@/lib/data/team";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function PortfolioPage(props: PageProps<"/[project]/portfolio">) {
  const { project: currentProjectId } = await props.params;
  const [summaries, orgTeam] = await Promise.all([getPortfolioSummaries(), getTeam()]);
  const totalBlocked = summaries.reduce((sum, p) => sum + p.blockedCount, 0);

  return (
    <div className="portfolio-main">
      <div className="portfolio-summary">
        {summaries.length} dự án · {orgTeam.length} người và agent dùng chung · {totalBlocked} task đang bị block
      </div>
      {summaries.length === 0 ? (
        <EmptyState icon="ph-squares-four" title="Chưa có dự án nào" description="Tạo dự án đầu tiên bằng nút “Dự án mới”." />
      ) : (
        <div className="portfolio-grid">
          {summaries.map((project) => (
            <ProjectCard key={project.id} project={project} isOpen={project.id === currentProjectId} />
          ))}
        </div>
      )}
    </div>
  );
}
