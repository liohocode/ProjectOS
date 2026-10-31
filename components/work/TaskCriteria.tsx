"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { addTaskCriterion, checkTaskCriterion, editTaskCriterion, removeTaskCriterion } from "@/lib/actions/criteria";
import type { ActionResult } from "@/lib/actions/result";
import type { TaskCriterionView } from "@/lib/types";

/** Acceptance criteria trong drawer (F21.6): người tick / thêm / sửa / xoá; agent tick qua MCP `criteria_check`. */
export function TaskCriteria({ taskId, criteria, canWrite }: { taskId: string; criteria: TaskCriterionView[]; canWrite: boolean }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Tick hiện ngay; dữ liệu thật về sau revalidate (lỗi → quay lại giá trị server).
  const [items, setOptimisticDone] = useOptimistic(criteria, (state, change: { id: string; done: boolean }) =>
    state.map((c) => (c.id === change.id ? { ...c, done: change.done } : c)),
  );
  const done = items.filter((c) => c.done).length;

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  function toggle(id: string, value: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimisticDone({ id, done: value });
      const result = await checkTaskCriterion(id, value);
      if (!result.ok) setError(result.error);
    });
  }

  function submitAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(() => addTaskCriterion(taskId, draft), () => setDraft(""));
  }

  function submitEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editing) run(() => editTaskCriterion(editing.id, editing.text), () => setEditing(null));
  }

  if (items.length === 0 && !canWrite) return null;

  return (
    <div className="drawer-section" role="region" aria-label="Tiêu chí hoàn thành">
      <div className="drawer-section-title">
        Tiêu chí hoàn thành{" "}
        {items.length > 0 && (
          <span className="text-muted">
            ({done}/{items.length})
          </span>
        )}
      </div>
      <ul className="criteria-list">
        {items.map((c) =>
          editing?.id === c.id ? (
            <li key={c.id}>
              <form className="criteria-edit" onSubmit={submitEdit}>
                <input
                  className="input"
                  aria-label="Sửa tiêu chí"
                  maxLength={300}
                  value={editing.text}
                  autoFocus
                  onChange={(e) => setEditing({ id: c.id, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setEditing(null);
                    }
                  }}
                />
                <button type="submit" className="btn btn-secondary" disabled={isPending || !editing.text.trim()}>
                  Lưu
                </button>
              </form>
            </li>
          ) : (
            <li key={c.id} className={`criteria-item${c.done ? " is-done" : ""}`}>
              <label className="criteria-check" title={c.done && c.doneBy ? `Đạt — ${c.doneBy}` : undefined}>
                <input
                  type="checkbox"
                  checked={c.done}
                  disabled={isPending || !canWrite}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                />
                <span className="criteria-text">{c.text}</span>
              </label>
              {c.done && c.doneBy && <span className="criteria-by">{c.doneBy}</span>}
              {canWrite && (
                <span className="criteria-actions">
                  <button type="button" className="icon-btn" aria-label={`Sửa tiêu chí: ${c.text}`} disabled={isPending} onClick={() => setEditing({ id: c.id, text: c.text })}>
                    <i className="ph ph-pencil-simple" aria-hidden />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Xoá tiêu chí: ${c.text}`} disabled={isPending} onClick={() => run(() => removeTaskCriterion(c.id))}>
                    <i className="ph ph-x" aria-hidden />
                  </button>
                </span>
              )}
            </li>
          ),
        )}
      </ul>
      {canWrite && (
        <form className="criteria-add" onSubmit={submitAdd}>
          <input
            className="input"
            aria-label="Tiêu chí mới"
            maxLength={300}
            placeholder="Thêm tiêu chí, vd: Có test cho trường hợp mất mạng"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={isPending || !draft.trim()}>
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
