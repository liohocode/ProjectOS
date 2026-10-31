"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useTransition } from "react";
import { setTaskDoc } from "@/lib/actions/tasks";
import type { DocRef, Task } from "@/lib/types";

/** Tài liệu spec của task trong drawer (F24.6) — agent nhận kèm qua `context_get`. */
export function TaskDocs({ task, candidates, canWrite }: { task: Task; candidates: DocRef[]; canWrite: boolean }) {
  const { project } = useParams<{ project: string }>();
  const [picked, setPicked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const linked = new Set(task.docs.map((d) => d.id));
  const options = candidates.filter((d) => !linked.has(d.id));

  function run(docId: string, add: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setTaskDoc(task.id, docId, add);
      if (!result.ok) setError(result.error);
      else if (add) setPicked("");
    });
  }

  if (task.docs.length === 0 && !canWrite) return null;

  return (
    <div className="drawer-section" role="region" aria-label="Tài liệu của task">
      <div className="drawer-section-title">Tài liệu</div>
      {task.docs.length > 0 ? (
        <ul className="dep-list">
          {task.docs.map((d) => (
            <li key={d.id} className="dep-item">
              <Link href={`/${project}/docs?doc=${d.id}`} className="dep-link">
                <i className="ph ph-file-text text-muted" aria-hidden />
                <span className="dep-title">{d.title}</span>
              </Link>
              {canWrite && (
                <button type="button" className="icon-btn" aria-label={`Bỏ tài liệu ${d.title}`} disabled={isPending} onClick={() => run(d.id, false)}>
                  <i className="ph ph-x" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="dep-label">Chưa gắn tài liệu — agent chỉ nhận tài liệu của feature.</p>
      )}
      {canWrite && options.length > 0 && (
        <form
          className="criteria-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (picked) run(picked, true);
          }}
        >
          <select className="input" aria-label="Gắn tài liệu" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">Chọn tài liệu spec…</option>
            {options.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary" disabled={isPending || !picked}>
            Gắn
          </button>
        </form>
      )}
      {error && (
        <span className="revision-error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> {error}
        </span>
      )}
    </div>
  );
}
