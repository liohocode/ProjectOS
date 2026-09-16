import Link from "next/link";
import type { ProjectSummary } from "@/lib/data/portfolio";
import { initials } from "@/components/work/taskStyle";

export function ProjectCard({ project, isOpen }: { project: ProjectSummary; isOpen: boolean }) {
  return (
    <Link href={`/${project.id}/work`} className={`project-card${isOpen ? " is-open" : ""}`}>
      <div className="project-card-head">
        <span className="project-card-badge">{project.code}</span>
        <span className="project-card-name">{project.name}</span>
        <span className={`tag ${project.status === "Đang chạy" ? "tag-accent" : "tag-outline"} nowrap`}>{project.status}</span>
      </div>
      <p className="project-card-desc">{project.desc}</p>

      <div className="frow-progress-track">
        <div className="frow-progress-fill" style={{ width: `${project.avgPct}%` }} />
      </div>
      <span className="frow-pct">{project.avgPct}%</span>

      <div className="project-card-stats">
        <Stat label="Feature" value={project.featureCount} />
        <Stat label="Task" value={project.taskCount} />
        <Stat label="Agent" value={project.agentCount} />
        <Stat label="Người" value={project.humanCount} />
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="project-card-avatars">
          {project.avatars.map((m) => (
            <span key={m.id} className={`avatar ${m.kind === "agent" ? "avatar-agent" : "avatar-human"}`} style={{ width: 20, height: 20, fontSize: 8.5 }}>
              {initials(m.name)}
            </span>
          ))}
        </div>
        {project.blockedCount > 0 && (
          <span className="project-card-blocked">
            <i className="ph ph-warning" aria-hidden /> {project.blockedCount} task bị block
          </span>
        )}
      </div>

      <div className="project-card-sprint">{project.sprint}</div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="project-stat-label">{label}</div>
      <div className="project-stat-value">{value}</div>
    </div>
  );
}
