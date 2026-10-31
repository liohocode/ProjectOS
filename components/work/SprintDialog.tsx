"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { useCan } from "@/components/auth/PermissionsProvider";
import { deniedMessage } from "@/lib/auth/permissions";
import { createSprint, setCurrentSprint } from "@/lib/actions/sprints";
import type { ActionResult } from "@/lib/actions/result";
import type { SprintOption } from "@/lib/types";
import { SPRINTS_PARAM } from "./featureDialogParam";

const FORM_ID = "sprint-form";

/** Dialog "Sprint" (F21.3, `?sprints=1`): ai cũng xem; tạo / đặt sprint hiện tại cần `sprint.manage`. */
export function SprintDialog({ projectId, sprints }: { projectId: string; sprints: SprintOption[] }) {
  const { close } = useUrlDialog(SPRINTS_PARAM);
  const canManage = useCan("sprint.manage");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const input = {
      projectId,
      name: String(data.get("name") ?? ""),
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      makeCurrent: data.get("makeCurrent") === "on",
    };
    run(() => createSprint(input), () => form.reset());
  }

  return (
    <Dialog
      title="Sprint"
      onClose={close}
      footer={
        canManage && (
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu…" : "Tạo sprint"}
          </button>
        )
      }
    >
      <div className="sprint-list" aria-label="Danh sách sprint" role="list">
        {sprints.length === 0 && <p className="text-muted sprint-empty">Dự án chưa có sprint nào.</p>}
        {sprints.map((s) => (
          <div className="sprint-row" role="listitem" key={s.id}>
            <span className="sprint-label">{s.label}</span>
            {s.current ? (
              <span className="tag tag-accent nowrap">Hiện tại</span>
            ) : (
              canManage && (
                <button type="button" className="btn btn-ghost" disabled={isPending} onClick={() => run(() => setCurrentSprint(projectId, s.id))}>
                  Đặt làm hiện tại
                </button>
              )
            )}
          </div>
        ))}
      </div>

      {canManage ? (
        <form id={FORM_ID} className="dialog-form sprint-form" onSubmit={onSubmit} aria-label="Sprint mới">
          <div className="drawer-section-title">Sprint mới</div>
          <Field label="Tên sprint" htmlFor="sp-name">
            <input id="sp-name" name="name" className="input" required maxLength={60} placeholder="vd: Sprint 15" />
          </Field>
          <div className="field-row">
            <Field label="Bắt đầu" htmlFor="sp-start">
              <input id="sp-start" name="startDate" type="date" className="input" required />
            </Field>
            <Field label="Kết thúc" htmlFor="sp-end">
              <input id="sp-end" name="endDate" type="date" className="input" required />
            </Field>
          </div>
          <label className="filter-check">
            <input type="checkbox" name="makeCurrent" defaultChecked /> Đặt làm sprint hiện tại (header + timeline)
          </label>
        </form>
      ) : (
        <p className="text-muted sprint-empty">{deniedMessage("sprint.manage")}.</p>
      )}
      {error && (
        <div className="drawer-warning" role="alert">
          <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
        </div>
      )}
    </Dialog>
  );
}
