"use client";

import { useEffect, type KeyboardEvent, type RefObject } from "react";

/**
 * Cho phần tử không phải <button> (vd hàng grid .trow/.mrow — đổi sang <button> sẽ vỡ grid)
 * hoạt động như nút: focus được bằng Tab, kích hoạt bằng Enter/Space.
 */
export function buttonLikeProps(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/** Đóng popover/dropdown khi bấm Esc (tuỳ chọn) hoặc click ra ngoài vùng `ref`. */
export function useDismiss(open: boolean, onDismiss: () => void, ref: RefObject<HTMLElement | null>, { escape = true } = {}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (escape && e.key === "Escape") onDismiss();
    };
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, onDismiss, ref, escape]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Giữ Tab/Shift+Tab xoay vòng trong `container` (dialog/drawer). */
export function trapTab(e: KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== "Tab" || !container) return;
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === container)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
