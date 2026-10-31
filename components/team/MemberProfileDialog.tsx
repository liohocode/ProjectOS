"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { updateMember } from "@/lib/actions/members";
import type { Member } from "@/lib/types";

const FORM_ID = "member-profile-form";

/** Sửa hồ sơ + quyền thành viên (F20.2) — tech lead. Email đăng nhập và quyền tech lead chỉ cho người. */
export function MemberProfileDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const human = member.kind === "human";

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");
    setError(null);
    startTransition(async () => {
      const result = await updateMember(member.id, {
        name: value("name"),
        handle: value("handle"),
        role: value("role"),
        skills: value("skills"),
        email: human ? value("email") : "",
        isTechLead: human && form.get("isTechLead") === "on",
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={`Sửa thành viên ${member.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <div className="field-row">
          <Field label="Tên" htmlFor="mp-name">
            <input id="mp-name" name="name" className="input" required maxLength={60} defaultValue={member.name} />
          </Field>
          <Field label="Handle" htmlFor="mp-handle">
            <input id="mp-handle" name="handle" className="input" required maxLength={60} defaultValue={member.handle} />
          </Field>
        </div>
        <Field label="Vai trò" htmlFor="mp-role">
          <input id="mp-role" name="role" className="input" required maxLength={60} defaultValue={member.role} />
        </Field>
        <Field label="Skills" htmlFor="mp-skills" hint="Cách nhau bằng dấu phẩy">
          <input id="mp-skills" name="skills" className="input" maxLength={300} defaultValue={member.skills.join(", ")} />
        </Field>
        {human && (
          <>
            <Field label="Email Google đăng nhập" htmlFor="mp-email" hint="Để trống = không cho đăng nhập">
              <input id="mp-email" name="email" type="email" className="input" maxLength={200} defaultValue={member.email ?? ""} />
            </Field>
            <label className="filter-check" htmlFor="mp-lead">
              <input id="mp-lead" name="isTechLead" type="checkbox" defaultChecked={member.isTechLead} />
              Tech lead — quản trị dự án, thành viên, cấu hình agent, MCP server; duyệt tài liệu / feature
            </label>
          </>
        )}
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
