"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchProject } from "@/lib/actions/search";
import type { SearchResults } from "@/lib/types";
import { useDismiss } from "@/components/ui/a11y";

// Ô tìm kiếm header (F14.2): gõ → chờ 250ms → server action; ↑↓ chọn, Enter mở, Esc đóng, "/" để focus.
const DEBOUNCE_MS = 250;

interface Hit {
  key: string;
  group: "Task" | "Feature" | "Tài liệu";
  code: string;
  label: string;
  href: string;
}

function toHits(projectId: string, r: SearchResults): Hit[] {
  return [
    ...r.tasks.map((t) => ({ key: `t-${t.id}`, group: "Task" as const, code: t.id, label: t.title, href: `/${projectId}/work?task=${encodeURIComponent(t.id)}` })),
    ...r.features.map((f) => ({ key: `f-${f.id}`, group: "Feature" as const, code: f.id, label: f.name, href: `/${projectId}/work#feature-${f.id}` })),
    ...r.docs.map((d) => ({ key: `d-${d.id}`, group: "Tài liệu" as const, code: "", label: d.title, href: `/${projectId}/docs?doc=${encodeURIComponent(d.id)}` })),
  ];
}

export function HeaderSearch({ projectId, placeholder }: { projectId: string; placeholder: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(0);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrapRef);

  // Gõ → đợi DEBOUNCE_MS rồi tìm; chỉ nhận kết quả của lần gõ mới nhất (bỏ phản hồi về muộn).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++latest.current;
    const timer = setTimeout(async () => {
      const result = await searchProject(projectId, term);
      if (id !== latest.current) return;
      if (result.ok) {
        setHits(toHits(projectId, result.results));
        setError(null);
      } else {
        setHits(null);
        setError(result.error);
      }
      setActive(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, projectId]);

  // "/" ở bất kỳ đâu (trừ khi đang gõ trong ô nhập) → focus ô tìm kiếm.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: Hit) {
    setOpen(false);
    setQ("");
    setHits(null);
    router.push(hit.href);
    // Feature (`#feature-…`) đang ở ngay màn này: đổi hash không làm Next cuộn trong khung danh sách → tự cuộn.
    // Đến từ màn khác thì WorkScreen cuộn lúc mount.
    const hash = hit.href.split("#")[1];
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const list = hits ?? [];
    if (e.key === "ArrowDown" && list.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % list.length);
    } else if (e.key === "ArrowUp" && list.length > 0) {
      e.preventDefault();
      setActive((i) => (i - 1 + list.length) % list.length);
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      go(list[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && q.trim().length >= 2 && (hits !== null || error !== null);

  return (
    <div className="header-search-wrap" ref={wrapRef}>
      <input
        ref={inputRef}
        className="input header-search"
        type="search"
        placeholder={placeholder}
        aria-label="Tìm trong dự án"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="header-search-results"
        aria-activedescendant={showDropdown && hits?.[active] ? `search-hit-${hits[active].key}` : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          if (e.target.value.trim().length < 2) setHits(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <div className="switcher-dropdown search-dropdown" id="header-search-results" role="listbox" aria-label="Kết quả tìm kiếm">
          {error && <div className="search-empty">{error}</div>}
          {hits?.length === 0 && <div className="search-empty">Không có kết quả cho “{q.trim()}”</div>}
          {hits?.map((hit, i) => (
            <div key={hit.key}>
              {(i === 0 || hits[i - 1].group !== hit.group) && <div className="search-group">{hit.group}</div>}
              <div
                id={`search-hit-${hit.key}`}
                role="option"
                aria-selected={i === active}
                className={`switcher-item search-hit${i === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(hit)}
              >
                {hit.code && <span className="search-code">{hit.code}</span>}
                <span className="search-label">{hit.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
