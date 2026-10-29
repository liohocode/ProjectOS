"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { createProject } from "@/lib/actions/projects";
import { slugify } from "@/lib/slug";
import { PROJECT_STATUSES, suggestProjectCode } from "@/lib/projectRules";

const FORM_ID = "new-project-form";

/** "Dự án mới" (F13.1) — mở bằng `?new=1` ở màn portfolio; tạo xong sang `/<id>/work`. */
export function NewProjectDialog() {
  const router = useRouter();
  const { close } = useUrlDialog();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  // Id và mã tự gợi ý theo tên cho tới khi người dùng tự sửa.
  const [id, setId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const shownId = id ?? (name.trim() ? slugify(name, "") : "");
  const shownCode = code ?? suggestProjectCode(name);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");
    setError(null);
    startTransition(async () => {
      const result = await createProject({
        id: text("id"),
        code: text("code"),
        name: text("name"),
        desc: text("desc"),
        status: text("status") as (typeof PROJECT_STATUSES)[number], // server validate lại
        sprintName: text("sprintName"),
        sprintStart: text("sprintStart"),
        sprintEnd: text("sprintEnd"),
      });
      if (result.ok) router.push(`/${result.projectId}/work`);
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title="Dự án mới"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang tạo…" : "Tạo dự án"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <Field label="Tên dự án" htmlFor="np-name">
          <input id="np-name" name="name" className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="vd: Rever Partner Portal" />
        </Field>
        <div className="field-row">
          <Field label="Id (đường dẫn)" htmlFor="np-id" hint="Chữ thường không dấu, số, gạch ngang — không đổi được sau này">
            <input id="np-id" name="id" className="input" required maxLength={40} value={shownId} onChange={(e) => setId(e.target.value)} />
          </Field>
          <Field label="Mã" htmlFor="np-code" hint="2 ký tự">
            <input id="np-code" name="code" className="input" required maxLength={2} value={shownCode} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </Field>
        </div>
        <Field label="Mô tả" htmlFor="np-desc">
          <textarea id="np-desc" name="desc" className="input textarea" rows={2} maxLength={500} />
        </Field>
        <Field label="Trạng thái" htmlFor="np-status">
          <select id="np-status" name="status" className="input" defaultValue="Chuẩn bị">
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="field-row">
          <Field label="Sprint đầu tiên" htmlFor="np-sprint" hint="Tuỳ chọn">
            <input id="np-sprint" name="sprintName" className="input" maxLength={60} placeholder="vd: Sprint 1" />
          </Field>
          <Field label="Bắt đầu" htmlFor="np-sprint-start">
            <input id="np-sprint-start" name="sprintStart" type="date" className="input" />
          </Field>
          <Field label="Kết thúc" htmlFor="np-sprint-end">
            <input id="np-sprint-end" name="sprintEnd" type="date" className="input" />
          </Field>
        </div>
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không tạo được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
