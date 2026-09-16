"use client";

import { usePathname } from "next/navigation";
import type { Project, ScreenId } from "@/lib/types";
import { SCREEN_META } from "./screenMeta";

export function Header({ project }: { project: Project }) {
  const pathname = usePathname();
  const screen = (pathname.split("/")[2] as ScreenId | undefined) ?? "work";
  const meta = SCREEN_META[screen];

  return (
    <header className="header">
      <div>
        <div className="header-kicker">{meta.kicker}</div>
        <h4>{meta.title}</h4>
        <div className="header-context">
          {project.name} · {project.sprint}
        </div>
      </div>
      <div className="header-actions">
        <input className="input header-search" placeholder={meta.searchPlaceholder} />
        <button type="button" className="btn btn-secondary">
          <i className="ph ph-funnel" aria-hidden /> Lọc
        </button>
        <button type="button" className="btn btn-primary">
          {meta.primaryAction}
        </button>
      </div>
    </header>
  );
}
