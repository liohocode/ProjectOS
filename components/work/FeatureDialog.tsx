"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { createFeature, updateFeature } from "@/lib/actions/features";
import type { Feature, MemberOption, TaskStage } from "@/lib/types";

const STAGES: TaskStage[] = ["BA", "TA", "Dev", "Review", "Done"];
const FORM_ID = "feature-form";

/** Tạo (không truyền `feature`) hoặc sửa feature (F21.1): tên, stage, người phụ trách, kế hoạch cho timeline. */
export function FeatureDialog({
  projectId,
  feature,
  members,
  onClose,
}: {
  projectId: string;
  feature?: Feature;
  members: MemberOption[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const humans = members.filter((m) => m.kind === "human");
  const agents = members.filter((m) => m.kind === "agent");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const input = {
      name: value("name"),
      stage: value("stage") as TaskStage, // server validate lại
      ownerId: value("ownerId") || null,
      plannedStart: value("plannedStart") || null,
      plannedEnd: value("plannedEnd") || null,
    };
    setError(null);
    startTransition(async () => {
      const result = feature ? await updateFeature(feature.id, input) : await createFeature(projectId, input);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={feature ? `Sửa feature ${feature.id}` : "Feature mới"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu…" : feature ? "Lưu" : "Tạo feature"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <Field label="Tên feature" htmlFor="ft-name">
          <input id="ft-name" name="name" className="input" required maxLength={120} defaultValue={feature?.name} placeholder="vd: Lưu tin yêu thích" />
        </Field>
        <div className="field-row">
          <Field label="Stage" htmlFor="ft-stage">
            <select id="ft-stage" name="stage" className="input" defaultValue={feature?.stage ?? "BA"}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Người phụ trách" htmlFor="ft-owner">
            <select id="ft-owner" name="ownerId" className="input" defaultValue={feature?.ownerId ?? ""}>
              <option value="">Chưa giao</option>
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
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
        </div>
        <div className="field-row">
          <Field label="Bắt đầu" htmlFor="ft-start" hint="Để trống nếu chưa lên kế hoạch">
            <input id="ft-start" name="plannedStart" type="date" className="input" defaultValue={feature?.plannedStart ?? ""} />
          </Field>
          <Field label="Kết thúc" htmlFor="ft-end">
            <input id="ft-end" name="plannedEnd" type="date" className="input" defaultValue={feature?.plannedEnd ?? ""} />
          </Field>
        </div>
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
