"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { updateAgentConfig } from "@/lib/actions/members";
import { DOCS_WRITE_LABEL, DOCS_WRITE_PERMISSIONS, type AgentConfigValues, type DocsWritePermission } from "@/lib/agentConfig";
import type { Member, MemberOption } from "@/lib/types";

const FORM_ID = "agent-config-form";

/** Sửa cấu hình agent (F13.5) — model, MCP server, quyền ghi docs, số task đồng thời, quyền đặc thù. */
export function AgentConfigDialog({
  member,
  config,
  mcpServers,
  agents,
  onClose,
}: {
  member: Member;
  config: AgentConfigValues;
  /** Id MCP server đã đăng ký (màn MCP) */
  mcpServers: string[];
  /** Mọi agent của tổ chức (để chọn "được giao task cho") */
  agents: MemberOption[];
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Giữ cả server cũ chưa đăng ký ở màn MCP (vd "docs" trong dữ liệu mẫu) để không mất khi lưu.
  const serverOptions = [...new Set([...mcpServers, ...config.mcpServers])];
  const otherAgents = agents.filter((a) => a.id !== member.id);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateAgentConfig(member.id, {
        model: String(form.get("model") ?? ""),
        mcpServers: form.getAll("mcpServers").map(String),
        docsWritePermission: String(form.get("docsWritePermission")) as DocsWritePermission, // server validate lại
        maxConcurrentTasks: Number(form.get("maxConcurrentTasks")),
        canProposeFeatures: form.get("canProposeFeatures") === "on",
        canAssignTo: form.getAll("canAssignTo").map(String),
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog
      title={`Cấu hình ${member.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPending}>
            Huỷ
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="dialog-form" onSubmit={onSubmit}>
        <div className="field-row">
          <Field label="Model" htmlFor="ac-model">
            <input id="ac-model" name="model" className="input" required maxLength={80} defaultValue={config.model} placeholder="vd: claude-sonnet-4.5" />
          </Field>
          <Field label="Task đồng thời tối đa" htmlFor="ac-max">
            <input id="ac-max" name="maxConcurrentTasks" type="number" min={1} max={10} step={1} className="input" required defaultValue={config.maxConcurrentTasks} />
          </Field>
        </div>
        <Field label="Quyền ghi docs" htmlFor="ac-docs">
          <select id="ac-docs" name="docsWritePermission" className="input" defaultValue={config.docsWritePermission}>
            {DOCS_WRITE_PERMISSIONS.map((p) => (
              <option key={p} value={p}>
                {DOCS_WRITE_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="check-group">
          <legend className="field-label">MCP server</legend>
          {serverOptions.length === 0 && <span className="field-hint">Chưa có MCP server nào — thêm ở màn MCP.</span>}
          {serverOptions.map((id) => (
            <label className="filter-check" key={id}>
              <input type="checkbox" name="mcpServers" value={id} defaultChecked={config.mcpServers.includes(id)} />
              {id}
            </label>
          ))}
        </fieldset>
        <fieldset className="check-group">
          <legend className="field-label">Được giao task cho</legend>
          {otherAgents.map((a) => (
            <label className="filter-check" key={a.id}>
              <input type="checkbox" name="canAssignTo" value={a.id} defaultChecked={config.canAssignTo.includes(a.id)} />
              {a.name}
            </label>
          ))}
        </fieldset>
        <label className="filter-check">
          <input type="checkbox" name="canProposeFeatures" defaultChecked={config.canProposeFeatures} />
          Được đề xuất feature (<span className="mono">features.propose</span>)
        </label>
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
