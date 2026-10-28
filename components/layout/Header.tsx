"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUrlDialog } from "@/components/ui/urlDialog";
import type { Project, ScreenId } from "@/lib/types";
import { SCREEN_META } from "./screenMeta";
import { HeaderSearch } from "./HeaderSearch";

export function Header({ project }: { project: Project }) {
  const pathname = usePathname();
  const screen = (pathname.split("/")[2] as ScreenId | undefined) ?? "work";
  const meta = SCREEN_META[screen];
  const { openHref } = useUrlDialog();

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
        <HeaderSearch projectId={project.id} placeholder={meta.searchPlaceholder} />
        <button type="button" className="btn btn-secondary">
          <i className="ph ph-funnel" aria-hidden /> Lọc
        </button>
        {meta.primaryDialog ? (
          <Link href={openHref} scroll={false} className="btn btn-primary">
            {meta.primaryAction}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary">
            {meta.primaryAction}
          </button>
        )}
      </div>
    </header>
  );
}
