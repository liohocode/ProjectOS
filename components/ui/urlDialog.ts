"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Dialog điều khiển bằng URL (ADR-018): `?new=1` mở dialog hành động chính của màn hiện tại.
// Header (ở layout) chỉ đặt query; page.tsx của màn đọc searchParams và render dialog.
// Dialog khác dùng tham số riêng (vd `?edit=1` — sửa tài liệu, F12.6).
export const NEW_DIALOG_PARAM = "new";

export function useUrlDialog(param: string = NEW_DIALOG_PARAM) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefWith(open: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set(param, "1");
    else params.delete(param);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return {
    openHref: hrefWith(true),
    close: () => router.replace(hrefWith(false), { scroll: false }),
  };
}
