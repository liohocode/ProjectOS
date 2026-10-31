"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { createTask } from "@/lib/actions/tasks";
import type { Member, TaskStage } from "@/lib/types";

const STAGES: TaskStage[] = ["BA", "TA", "Dev", "Review", "Done"];
const FORM_ID = "new-task-form";

export function NewTaskDialog({
  projectId,
  features,
  members,
}: {
  projectId: string;
  features: { id: string; name: string }[];
  members: Member[];
}) {
  const { close } = useUrlDialog();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const humans = members.filter((m) => m.kind === "human");
  const agents = members.filter((m) => m.kind === "agent");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const estimate = String(form.get("estimate") ?? "").trim();
    const due = String(form.get("due") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await createTask({
        projectId,
        featureId: String(form.get("featureId") ?? ""),
        title: String(form.get("title") ?? ""),
        stage: String(form.get("stage") ?? "") as TaskStage, // server validate lại
        assigneeId: String(form.get("assigneeId") ?? ""),
        estimatePoints: estimate === "" ? null : Number(estimate),
        dueDate: due === "" ? null : due,
        description: String(form.get("description") ?? ""),
        size: (String(form.get("size") ?? "") || null) as "S" | "M" | "L" | null,
      });
      if (result.ok) close();
      else setError(result.error);
    });
  }

  if (features.length === 0) {
    return (
      <Dialog title="Task mới" onClose={close} footer={<button type="button" className="btn btn-secondary" onClick={close}>Đóng</button>}>
        <p className="text-muted">Dự án chưa có feature nào — task phải thuộc một feature, hãy tạo feature trước.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Task mới"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang tạo…" : "Tạo task"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <Field label="Tiêu đề" htmlFor="nt-title">
          <input id="nt-title" name="title" className="input" required maxLength={200} placeholder="vd: Viết API lọc tin theo khu vực" />
        </Field>
        <Field label="Feature" htmlFor="nt-feature">
          <select id="nt-feature" name="featureId" className="input" defaultValue={features[0].id}>
            {features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {f.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="field-row">
          <Field label="Stage" htmlFor="nt-stage">
            <select id="nt-stage" name="stage" className="input" defaultValue="BA">
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Người/agent thực hiện" htmlFor="nt-assignee">
            <select id="nt-assignee" name="assigneeId" className="input" defaultValue={(humans[0] ?? agents[0])?.id}>
              {humans.length > 0 && (
                <optgroup label="Người">
                  {humans.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {agents.length > 0 && (
                <optgroup label="AI agent">
                  {agents.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.role}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Ước lượng (điểm)" htmlFor="nt-estimate" hint="Bỏ trống nếu chưa ước lượng">
            <input id="nt-estimate" name="estimate" type="number" min={0} max={100} step={1} className="input" />
          </Field>
          <Field label="Hạn" htmlFor="nt-due">
            <input id="nt-due" name="due" type="date" className="input" />
          </Field>
          <Field label="Cỡ" htmlFor="nt-size">
            <select id="nt-size" name="size" className="input" defaultValue="">
              <option value="">Chưa đặt</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
            </select>
          </Field>
        </div>
        <Field label="Mô tả (markdown)" htmlFor="nt-description" hint="Làm gì, phạm vi — agent đọc qua context_get">
          <textarea id="nt-description" name="description" className="input" rows={4} maxLength={10_000} />
        </Field>
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không tạo được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
