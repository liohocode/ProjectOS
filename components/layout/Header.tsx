"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUrlDialog } from "@/components/ui/urlDialog";
import type { Project, ScreenId } from "@/lib/types";
import { useCan } from "@/components/auth/PermissionsProvider";
import { deniedMessage } from "@/lib/auth/permissions";
import { SCREEN_META, type ScreenMeta } from "./screenMeta";
import { HeaderSearch } from "./HeaderSearch";
import { FilterMenu, type FilterOptions } from "./FilterMenu";

export function Header({ project, filterOptions }: { project: Project; filterOptions: FilterOptions }) {
  const pathname = usePathname();
  const screen = (pathname.split("/")[2] as ScreenId | undefined) ?? "work";
  const meta = SCREEN_META[screen] ?? SCREEN_META.work;

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
        <FilterMenu options={filterOptions} />
        {meta.primary && <PrimaryAction {...meta.primary} />}
      </div>
    </header>
  );
}

function PrimaryAction({ label, dialog, permission }: NonNullable<ScreenMeta["primary"]>) {
  const { openHref } = useUrlDialog();
  const allowed = useCan(permission);
  if (!allowed) {
    // F15.6: không đủ quyền → khoá nút kèm lý do.
    return (
      <button type="button" className="btn btn-primary" disabled title={deniedMessage(permission)}>
        {label}
      </button>
    );
  }
  return dialog ? (
    <Link href={openHref} scroll={false} className="btn btn-primary">
      {label}
    </Link>
  ) : (
    <button type="button" className="btn btn-primary">
      {label}
    </button>
  );
}
