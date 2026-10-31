"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setTaskDependency } from "@/lib/actions/tasks";
import type { Task, TaskRef } from "@/lib/types";
import { stageTagClass } from "./taskStyle";
import { useWorkUrl } from "./workUrl";

/** Phụ thuộc giữa task trong drawer (F21.8): task này chờ task nào, task nào đang chờ task này. */
export function TaskDependencies({ task, candidates, canWrite }: { task: Task; candidates: TaskRef[]; canWrite: boolean }) {
  const { taskHref } = useWorkUrl();
  const [picked, setPicked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const existing = new Set(task.dependsOn.map((d) => d.id));
  const options = candidates.filter((c) => c.id !== task.id && !existing.has(c.id));

  function run(dependsOnId: string, add: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setTaskDependency(task.id, dependsOnId, add);
      if (!result.ok) setError(result.error);
      else if (add) setPicked("");
    });
  }

  if (task.dependsOn.length === 0 && task.blocking.length === 0 && !canWrite) return null;

  const row = (d: TaskRef, removable: boolean) => (
    <li key={d.id} className={`dep-item${d.done ? " is-done" : ""}`}>
      <Link href={taskHref(d.id)} scroll={false} className="dep-link">
        <span className="mono text-muted">{d.id}</span>
        <span className={stageTagClass(d.stage)}>{d.stage}</span>
        <span className="dep-title">{d.title}</span>
      </Link>
      {removable && canWrite && (
        <button type="button" className="icon-btn" aria-label={`Bỏ phụ thuộc ${d.id}`} disabled={isPending} onClick={() => run(d.id, false)}>
          <i className="ph ph-x" aria-hidden />
        </button>
      )}
    </li>
  );

  return (
    <div className="drawer-section" role="region" aria-label="Phụ thuộc">
      <div className="drawer-section-title">Phụ thuộc</div>
      {task.dependsOn.length > 0 && (
        <>
          <div className="dep-label">Chờ các task này xong trước</div>
          <ul className="dep-list">{task.dependsOn.map((d) => row(d, true))}</ul>
        </>
      )}
      {task.blocking.length > 0 && (
        <>
          <div className="dep-label">Đang chờ task này</div>
          <ul className="dep-list">{task.blocking.map((d) => row(d, false))}</ul>
        </>
      )}
      {canWrite && options.length > 0 && (
        <form
          className="criteria-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (picked) run(picked, true);
          }}
        >
          <select className="input" aria-label="Thêm task phụ thuộc" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">Chọn task cần xong trước…</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary" disabled={isPending || !picked}>
            Thêm
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
