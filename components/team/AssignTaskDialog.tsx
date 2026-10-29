"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { assignTask } from "@/lib/actions/tasks";
import type { Member } from "@/lib/types";

/** Task giao được của dự án (chưa Done), nhóm theo feature — page tải sẵn. */
export interface AssignableFeature {
  id: string;
  name: string;
  tasks: { id: string; title: string; stage: string; assigneeId: string; who: string }[];
}

const FORM_ID = "assign-task-form";

/** "Giao task" từ panel thành viên (F13.3): chọn task chưa Done, chưa giao cho thành viên này → `assignTask`. */
export function AssignTaskDialog({ member, features, onClose }: { member: Member; features: AssignableFeature[]; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groups = features
    .map((f) => ({ ...f, tasks: f.tasks.filter((t) => t.assigneeId !== member.id) }))
    .filter((f) => f.tasks.length > 0);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const taskId = String(new FormData(e.currentTarget).get("taskId") ?? "");
    if (!taskId) return setError("Chọn một task");
    setError(null);
    startTransition(async () => {
      const result = await assignTask(taskId, member.id);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={`Giao task cho ${member.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending || groups.length === 0}>
            {isPending ? "Đang giao…" : "Giao task"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        {groups.length === 0 ? (
          <p className="text-muted">Không còn task chưa Done nào để giao cho {member.name}.</p>
        ) : (
          <div className="assign-list" role="radiogroup" aria-label="Task">
            {groups.map((f) => (
              <fieldset className="assign-group" key={f.id}>
                <legend className="assign-group-title">
                  {f.id} · {f.name}
                </legend>
                {f.tasks.map((t) => (
                  <label className="assign-item" key={t.id}>
                    <input type="radio" name="taskId" value={t.id} />
                    <span className="assign-item-id">{t.id}</span>
                    <span className="assign-item-title">{t.title}</span>
                    <span className="assign-item-meta">
                      {t.stage} · {t.who}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        )}
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không giao được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
