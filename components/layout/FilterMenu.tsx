"use client";

import { useCallback, useOptimistic, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MemberOption } from "@/lib/types";
import { countActiveFilters, FILTER_KEYS, SESSION_RESULT_KEYS, TASK_STAGES, type FilterScreen } from "@/lib/filters";
import { Field } from "@/components/ui/Field";
import { useDismiss } from "@/components/ui/a11y";

// Nút "Lọc" ở header (F14.3): tiêu chí theo màn nằm trong URL; đổi tiêu chí = router.replace
// (giữ các tham số khác như ?task=, ?view=, ?doc=). Server đọc lại searchParams và lọc.

const SESSION_RESULT_TEXT: Record<(typeof SESSION_RESULT_KEYS)[number], string> = {
  DangChay: "Đang chạy",
  ChoReview: "Chờ review",
  BiChan: "Bị chặn",
  Xong: "Xong",
};

export interface FilterOptions {
  /** Người + agent của dự án (màn work) */
  members: MemberOption[];
  /** Mọi agent (màn MCP) */
  agents: MemberOption[];
  /** Dự án người dùng thuộc về (màn MCP) */
  projects: { id: string; name: string }[];
}

export function FilterMenu({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  // URL cập nhật sau khi router.replace xong → hiện ngay giá trị vừa chọn (optimistic) để ô chọn không "nhảy lại".
  const [query, setOptimisticQuery] = useOptimistic(searchParams.toString());
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const segment = pathname.split("/")[2];
  const screen = (["work", "docs", "mcp"] as const).find((s) => s === segment) as FilterScreen | undefined;

  if (!screen) {
    return (
      <button type="button" className="btn btn-secondary" disabled title="Màn này không có bộ lọc">
        <i className="ph ph-funnel" aria-hidden /> Lọc
      </button>
    );
  }

  const current = new URLSearchParams(query);
  const count = countActiveFilters(screen, current);
  const get = (key: string) => current.get(key) ?? "";

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(query);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const next = params.toString();
    startTransition(() => {
      setOptimisticQuery(next);
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }

  const clearAll = () => apply(Object.fromEntries(FILTER_KEYS[screen!].map((k) => [k, null])));
  const select = (key: string, label: string, choices: { value: string; text: string }[]) => (
    <Field label={label} htmlFor={`filter-${key}`}>
      <select id={`filter-${key}`} className="input" value={get(key)} onChange={(e) => apply({ [key]: e.target.value || null })}>
        <option value="">Tất cả</option>
        {choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.text}
          </option>
        ))}
      </select>
    </Field>
  );
  const check = (key: string, label: string) => (
    <label className="filter-check">
      <input type="checkbox" checked={get(key) === "1"} onChange={(e) => apply({ [key]: e.target.checked ? "1" : null })} />
      {label}
    </label>
  );
  const memberText = (m: MemberOption) => (m.kind === "agent" ? `${m.name} (agent)` : m.name);

  return (
    <div className="filter-wrap" ref={ref}>
      <button type="button" className="btn btn-secondary" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        <i className="ph ph-funnel" aria-hidden /> Lọc
        {count > 0 && <span className="filter-count" aria-label={`${count} tiêu chí đang bật`}>{count}</span>}
      </button>
      {open && (
        <div className="switcher-dropdown filter-panel" role="dialog" aria-label="Bộ lọc">
          {screen === "work" && (
            <>
              {select("stage", "Stage", TASK_STAGES.map((s) => ({ value: s, text: s })))}
              {select("who", "Người / agent thực hiện", options.members.map((m) => ({ value: m.id, text: memberText(m) })))}
              {check("blocked", "Chỉ task bị block")}
              {check("running", "Chỉ task đang chạy")}
            </>
          )}
          {screen === "docs" && (
            <>
              {check("agent", "Chỉ tài liệu agent viết")}
              {check("pending", "Chỉ tài liệu có revision chờ duyệt")}
            </>
          )}
          {screen === "mcp" && (
            <>
              {select("agent", "Agent", options.agents.map((m) => ({ value: m.id, text: m.name })))}
              {select("project", "Dự án (phiên chạy)", options.projects.map((p) => ({ value: p.id, text: p.name })))}
              {select("result", "Kết quả phiên", SESSION_RESULT_KEYS.map((k) => ({ value: k, text: SESSION_RESULT_TEXT[k] })))}
            </>
          )}
          <button type="button" className="btn btn-ghost filter-clear" onClick={clearAll} disabled={count === 0}>
            Xoá lọc
          </button>
        </div>
      )}
    </div>
  );
}
