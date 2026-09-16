import Link from "next/link";
import type { DocGroup } from "@/lib/types";

export function DocTree({
  projectId,
  groups,
  activeDocId,
}: {
  projectId: string;
  groups: DocGroup[];
  activeDocId: string | null;
}) {
  return (
    <nav className="doc-tree">
      {groups.map((group) => (
        <div className="doc-group" key={group.name}>
          <div className="doc-group-title">
            <i className={`ph ${group.icon}`} aria-hidden />
            {group.name} · {group.items.length}
          </div>
          {group.items.map((item) => (
            <Link
              key={item.id}
              href={`/${projectId}/docs?doc=${item.id}`}
              className={`doc-tree-item${item.id === activeDocId ? " is-active" : ""}`}
            >
              <i className="ph ph-file-text" aria-hidden />
              <span className="doc-tree-item-title">{item.title}</span>
              {item.agent && <i className="ph ph-sparkle" style={{ color: "var(--color-accent)" }} aria-hidden />}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
