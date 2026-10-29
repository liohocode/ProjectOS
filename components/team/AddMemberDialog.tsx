"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { useUrlDialog } from "@/components/ui/urlDialog";
import { addProjectMember, createMember } from "@/lib/actions/members";
import type { MemberOption } from "@/lib/types";

const FORM_ID = "add-member-form";
type Tab = "existing" | "new";

/** "Thêm thành viên" (F13.2) — mở bằng `?new=1` ở màn team: gán người/agent có sẵn hoặc tạo mới. */
export function AddMemberDialog({ projectId, candidates }: { projectId: string; candidates: MemberOption[] }) {
  const { close } = useUrlDialog();
  const [tab, setTab] = useState<Tab>(candidates.length > 0 ? "existing" : "new");
  const [kind, setKind] = useState<"human" | "agent">("human");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const humans = candidates.filter((m) => m.kind === "human");
  const agents = candidates.filter((m) => m.kind === "agent");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");
    setError(null);
    startTransition(async () => {
      const result =
        tab === "existing"
          ? await addProjectMember(projectId, text("memberId"))
          : await createMember({
              projectId,
              kind,
              name: text("name"),
              handle: text("handle"),
              role: text("role"),
              skills: text("skills"),
              email: kind === "human" ? text("email") : "",
            });
      if (result.ok) close();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title="Thêm thành viên"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending || (tab === "existing" && candidates.length === 0)}>
            {isPending ? "Đang thêm…" : "Thêm vào dự án"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <div className="seg" role="radiogroup" aria-label="Cách thêm">
          <label className="seg-opt">
            <input type="radio" checked={tab === "existing"} onChange={() => setTab("existing")} />
            Từ tổ chức
          </label>
          <label className="seg-opt">
            <input type="radio" checked={tab === "new"} onChange={() => setTab("new")} />
            Tạo mới
          </label>
        </div>

        {tab === "existing" ? (
          candidates.length === 0 ? (
            <p className="text-muted">Mọi người và agent trong tổ chức đã thuộc dự án này — chọn “Tạo mới”.</p>
          ) : (
            <Field label="Người / agent" htmlFor="am-member">
              <select id="am-member" name="memberId" className="input" defaultValue={candidates[0].id}>
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
          )
        ) : (
          <>
            <div className="field-row">
              <Field label="Loại" htmlFor="am-kind">
                <select id="am-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "human" | "agent")}>
                  <option value="human">Người</option>
                  <option value="agent">AI agent</option>
                </select>
              </Field>
              <Field label="Tên" htmlFor="am-name">
                <input id="am-name" name="name" className="input" required maxLength={60} />
              </Field>
            </div>
            <div className="field-row">
              <Field label="Vai trò" htmlFor="am-role">
                <input id="am-role" name="role" className="input" required maxLength={60} placeholder={kind === "agent" ? "vd: QA agent" : "vd: Frontend dev"} />
              </Field>
              <Field label="Handle" htmlFor="am-handle" hint="Bỏ trống để tự đặt">
                <input id="am-handle" name="handle" className="input" maxLength={60} placeholder={kind === "agent" ? "agent · claude-sonnet" : "@ten"} />
              </Field>
            </div>
            <Field label="Skills" htmlFor="am-skills" hint="Cách nhau bằng dấu phẩy">
              <input id="am-skills" name="skills" className="input" maxLength={300} placeholder="vd: React, Testing" />
            </Field>
            {kind === "human" && (
              <Field label="Email Google" htmlFor="am-email" hint="Để người này đăng nhập được — bỏ trống nếu chưa cần">
                <input id="am-email" name="email" type="email" className="input" maxLength={200} />
              </Field>
            )}
          </>
        )}
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không thêm được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
