"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Dialog điều khiển bằng URL (ADR-018): `?new=1` mở dialog hành động chính của màn hiện tại.
// Header (ở layout) chỉ đặt query; page.tsx của màn đọc searchParams và render dialog.
export const NEW_DIALOG_PARAM = "new";

export function useUrlDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefWith(open: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set(NEW_DIALOG_PARAM, "1");
    else params.delete(NEW_DIALOG_PARAM);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return {
    openHref: hrefWith(true),
    close: () => router.replace(hrefWith(false), { scroll: false }),
  };
}
