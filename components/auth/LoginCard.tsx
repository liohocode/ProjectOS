"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth/client";

interface LoginCardProps {
  /** Path nội bộ để quay lại sau khi đăng nhập (đã lọc bằng safeReturnPath). */
  returnTo: string;
  error: string | null;
  signedInAs: { name: string; email: string } | null;
  googleConfigured: boolean;
}

export function LoginCard({ returnTo, error, signedInAs, googleConfigured }: LoginCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);
  const shownError = clientError ?? error;

  function signIn() {
    setClientError(null);
    startTransition(async () => {
      // Better Auth chuyển sang Google; bị từ chối thì quay về /login?error=<mã>.
      const errorCallbackURL = `/login?from=${encodeURIComponent(returnTo)}`;
      const { error: signInError } = await authClient.signIn.social({ provider: "google", callbackURL: returnTo, errorCallbackURL });
      if (signInError) setClientError(signInError.message ?? "Không mở được trang đăng nhập Google");
    });
  }

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.refresh();
    });
  }

  return (
    <div className="error-state login-card">
      <div className="sidebar-brand login-brand">
        <span className="sidebar-brand-mark">
          <i className="ph ph-compass" aria-hidden />
        </span>
        <span className="sidebar-brand-name">Meridian</span>
      </div>

      {signedInAs ? (
        <>
          <h4>Bạn đang đăng nhập</h4>
          <p className="text-muted">
            {signedInAs.name} · {signedInAs.email}
          </p>
          <div className="error-state-actions">
            <Link href={returnTo} className="btn btn-primary">
              Vào Meridian
            </Link>
            <button type="button" className="btn" onClick={signOut} disabled={isPending}>
              {isPending ? "Đang đăng xuất…" : "Đăng xuất"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h4>Đăng nhập</h4>
          <p className="text-muted">Dùng tài khoản Google có email đã được mời vào Meridian.</p>
          {shownError && (
            <div className="drawer-warning login-error" role="alert">
              <i className="ph ph-warning-circle" aria-hidden /> {shownError}
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary login-google"
            onClick={signIn}
            disabled={isPending || !googleConfigured}
          >
            <i className="ph ph-google-logo" aria-hidden />
            {isPending ? "Đang chuyển sang Google…" : "Đăng nhập bằng Google"}
          </button>
          {!googleConfigured && (
            <p className="field-hint login-hint">
              Chưa cấu hình <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> — xem docs/guides/google-oauth.md.
            </p>
          )}
        </>
      )}
    </div>
  );
}
