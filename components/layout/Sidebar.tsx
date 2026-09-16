"use client";

import { usePathname } from "next/navigation";
import type { Member, Project, ScreenId } from "@/lib/types";
import { NAV_ITEMS } from "./screenMeta";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { NavItem } from "./NavItem";

export function Sidebar({
  project,
  projects,
  navCounts,
  navAlerts,
  pipeline,
  mcpOnline,
  mcpTotal,
  currentUser,
}: {
  project: Project;
  projects: Project[];
  navCounts: Record<ScreenId, number>;
  navAlerts: Record<ScreenId, number>;
  pipeline: { stage: string; agent: Member }[];
  mcpOnline: number;
  mcpTotal: number;
  currentUser: Member;
}) {
  const pathname = usePathname();
  const activeScreen = pathname.split("/")[2] as ScreenId | undefined;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <i className="ph ph-compass" aria-hidden />
        </span>
        <span className="sidebar-brand-name">Meridian</span>
      </div>

      <ProjectSwitcher project={project} projects={projects} />

      <nav className="nav-list">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            href={`/${project.id}/${item.id}`}
            icon={item.icon}
            label={item.label}
            count={navCounts[item.id]}
            alert={navAlerts[item.id]}
            active={activeScreen === item.id}
          />
        ))}
      </nav>

      <div className="pipeline">
        {pipeline.map(({ stage, agent }) => (
          <div className="pipeline-row" key={agent.id}>
            <span className="pipeline-dot" />
            <span className="pipeline-stage">{stage}</span>
            <span>{agent.name}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-mcp">
          <span className="sidebar-footer-dot" />
          <span>
            MCP: {mcpOnline}/{mcpTotal} server online
          </span>
        </div>
        <div className="sidebar-footer-user">
          <span className="avatar avatar-human">{initials(currentUser.name)}</span>
          <span>
            {currentUser.name} · {currentUser.role}
          </span>
        </div>
      </div>
    </aside>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
