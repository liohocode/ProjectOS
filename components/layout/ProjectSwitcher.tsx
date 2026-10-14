"use client";

import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/components/ui/a11y";
import { useRouter, usePathname } from "next/navigation";
import type { Project } from "@/lib/types";

export function ProjectSwitcher({
  project,
  projects,
}: {
  project: Project;
  projects: Project[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const screen = pathname.split("/")[2] ?? "work";
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  function pick(id: string) {
    setOpen(false);
    router.push(`/${id}/${screen}`);
  }

  return (
    <div className="switcher" ref={ref}>
      <div className="switcher-label">Dự án đang mở</div>
      <button type="button" className="switcher-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="switcher-badge">{project.code}</span>
        <span className="switcher-name">{project.name}</span>
        <i className="ph ph-caret-up-down" aria-hidden />
      </button>
      {open && (
        <div className="switcher-dropdown">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`switcher-item${p.id === project.id ? " is-active" : ""}`}
              onClick={() => pick(p.id)}
            >
              <span className="switcher-badge">{p.code}</span>
              <span>{p.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="switcher-item switcher-viewall"
            onClick={() => {
              setOpen(false);
              router.push(`/${project.id}/portfolio`);
            }}
          >
            Xem tất cả dự án →
          </button>
        </div>
      )}
    </div>
  );
}
