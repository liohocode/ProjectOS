import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { trapTab, useDismiss } from "@/components/ui/a11y";
import { assignTask, setTaskBlocked, updateTask, updateTaskStage } from "@/lib/actions/tasks";
import { Field } from "@/components/ui/Field";
import type { ActionResult } from "@/lib/actions/result";
import type { Feature, Member, Task, TaskDrawerInfo } from "@/lib/types";
import { initials, nextStage, stageTagClass } from "./taskStyle";

export function TaskDrawer({
  task,
  feature,
  info,
  agents,
  onClose,
}: {
  task: Task;
  feature: Feature;
  info: TaskDrawerInfo | undefined;
  agents: Member[];
  onClose: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Form phụ mở trong drawer: sửa nhanh (F11.6) hoặc đặt block (F11.5) — mỗi lúc một form.
  const [form, setForm] = useState<"edit" | "block" | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  // Esc do drawer xử lý (đóng picker / form block trước, rồi mới đóng drawer) → picker chỉ dùng click-ra-ngoài.
  useDismiss(pickerOpen, closePicker, pickerRef, { escape: false });

  // Mở drawer: focus vào panel; đóng: trả focus về phần tử đã mở drawer (hàng task).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Ghi qua server action; dữ liệu mới về theo props sau revalidatePath (không sửa tạm ở client).
  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  function submitBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const block = { short: String(form.get("short") ?? ""), full: String(form.get("full") ?? "") };
    run(() => setTaskBlocked(task.id, block), () => setForm(null));
  }

  function submitEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const estimate = String(data.get("estimate") ?? "").trim();
    const due = String(data.get("due") ?? "");
    const patch = {
      title: String(data.get("title") ?? ""),
      estimatePoints: estimate === "" ? null : Number(estimate),
      dueDate: due === "" ? null : due,
    };
    run(() => updateTask(task.id, patch), () => setForm(null));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (pickerOpen) setPickerOpen(false);
      else if (form) setForm(null);
      else onClose();
      return;
    }
    trapTab(e, panelRef.current);
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <span className="trow-id nowrap">{task.id}</span>
          <span className={stageTagClass(task.stage)}>{task.stage}</span>
          <span className={`tag ${task.kind === "agent" ? "tag-accent" : "tag-neutral"} nowrap`}>
            {task.kind === "agent" ? task.who : "Người"}
          </span>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Đóng">
            <i className="ph ph-x" aria-hidden />
          </button>
        </div>
        <h4 id="task-drawer-title">{task.title}</h4>

        {task.blocked && <div className="drawer-warning">{task.blockedFull ?? task.blocked}</div>}
        {error && (
          <div className="drawer-warning" role="alert">
            <i className="ph ph-warning-circle" aria-hidden /> Không lưu được: {error}
          </div>
        )}

        <div className="drawer-meta">
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Feature</span>
            <span>{feature.name}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Người/agent</span>
            <span className="trow-assignee">
              <span className={`avatar ${task.kind === "agent" ? "avatar-agent" : "avatar-human"}`} style={{ width: 18, height: 18, fontSize: 8 }}>
                {initials(task.who)}
              </span>
              {task.who}
            </span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Stage</span>
            <span>{task.stage}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Ước lượng</span>
            <span>{task.est}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Hạn</span>
            <span>{task.due}</span>
          </div>
        </div>

        {info && info.contextDocs.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Context agent đã pull</div>
            {info.contextDocs.map((doc) => (
              <div className="drawer-doc-item" key={doc}>
                <i className="ph ph-file-text" aria-hidden /> {doc}
              </div>
            ))}
          </div>
        )}

        {info && info.sessionLog.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Log phiên chạy</div>
            {info.sessionLog.map((step, i) => (
              <div className="drawer-log-item" key={i}>
                <span className="drawer-log-dot" />
                <div>
                  <div>{step.text}</div>
                  <div className="drawer-log-when">{step.when}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {form === "edit" && (
          <form className="drawer-section dialog-form" onSubmit={submitEdit} aria-label="Sửa task">
            <div className="drawer-section-title">Sửa task</div>
            <Field label="Tiêu đề" htmlFor="edit-title">
              <input id="edit-title" name="title" className="input" required maxLength={200} defaultValue={task.title} autoFocus />
            </Field>
            <div className="field-row">
              <Field label="Ước lượng (điểm)" htmlFor="edit-estimate" hint="Bỏ trống = chưa ước lượng">
                <input id="edit-estimate" name="estimate" type="number" min={0} max={100} step={1} className="input" defaultValue={task.estimatePoints ?? ""} />
              </Field>
              <Field label="Hạn" htmlFor="edit-due">
                <input id="edit-due" name="due" type="date" className="input" defaultValue={task.dueIso ?? ""} />
              </Field>
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)} disabled={isPending}>
                Huỷ
              </button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </form>
        )}

        {form === "block" && (
          <form className="drawer-section dialog-form" onSubmit={submitBlock} aria-label="Đánh dấu bị block">
            <div className="drawer-section-title">Đánh dấu bị block</div>
            <Field label="Lý do ngắn (hiện ở hàng task)" htmlFor="block-short">
              <input id="block-short" name="short" className="input" required maxLength={40} autoFocus placeholder="vd: chờ ADR-11" />
            </Field>
            <Field label="Mô tả đầy đủ" htmlFor="block-full">
              <textarea id="block-full" name="full" className="input" rows={3} maxLength={500} placeholder="Bị chặn bởi gì, cần ai làm gì để gỡ" />
            </Field>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)} disabled={isPending}>
                Huỷ
              </button>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Đang lưu…" : "Lưu block"}
              </button>
            </div>
          </form>
        )}

        <div className="drawer-footer" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isPending}
            onClick={() => run(() => updateTaskStage(task.id, nextStage(task.stage)))}
          >
            {isPending ? "Đang lưu…" : "Chuyển stage"}
          </button>
          {form !== "edit" && (
            <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => setForm("edit")}>
              <i className="ph ph-pencil-simple" aria-hidden /> Sửa
            </button>
          )}
          {task.blocked ? (
            <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => run(() => setTaskBlocked(task.id, null))}>
              Gỡ block
            </button>
          ) : (
            form !== "block" && (
              <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => setForm("block")}>
                Đánh dấu bị block
              </button>
            )
          )}
          <div ref={pickerRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isPending}
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((v) => !v)}
            >
              Giao cho agent
            </button>
            {pickerOpen && (
              <div className="switcher-dropdown" style={{ top: "100%", left: 0, right: "auto", width: 220, marginTop: 4 }}>
                {agents.length === 0 && <div className="switcher-item">Không có agent nào trong dự án</div>}
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    className={`switcher-item${agent.name === task.who ? " is-active" : ""}`}
                    onClick={() => {
                      setPickerOpen(false);
                      run(() => assignTask(task.id, agent.id));
                    }}
                  >
                    <span className="avatar avatar-agent" style={{ width: 20, height: 20, fontSize: 8.5 }}>
                      {initials(agent.name)}
                    </span>
                    {agent.name} · {agent.role}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
