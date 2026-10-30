"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDismiss } from "@/components/ui/a11y";
import { authClient } from "@/lib/auth/client";
import type { Member } from "@/lib/types";
import { initials } from "@/components/work/taskStyle";

/** Footer sidebar: người đang đăng nhập + menu "Đăng xuất" (F15.6). */
export function UserMenu({ user }: { user: Member }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="sidebar-footer-user user-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản: ${user.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar avatar-human">{initials(user.name)}</span>
        <span className="user-menu-name">
          {user.name} · {user.role}
        </span>
        <i className="ph ph-caret-up-down" aria-hidden />
      </button>
      {open && (
        <div className="switcher-dropdown user-menu-dropdown" role="menu">
          <button type="button" role="menuitem" className="switcher-item" onClick={signOut} disabled={isPending}>
            <i className="ph ph-sign-out" aria-hidden /> {isPending ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}
