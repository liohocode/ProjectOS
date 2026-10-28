"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Deep link màn work (F14.1, ADR-003): `?task=T-401` mở drawer, `?view=timeline` mở timeline.
// Mở task = push (nút Back đóng drawer); đóng drawer / đổi view = replace (không thêm lịch sử).
export type WorkView = "list" | "timeline";

export function useWorkUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function href(changes: { task?: string | null; view?: WorkView }) {
    const params = new URLSearchParams(searchParams.toString());
    if (changes.task !== undefined) {
      if (changes.task) params.set("task", changes.task);
      else params.delete("task");
    }
    if (changes.view !== undefined) {
      if (changes.view === "timeline") params.set("view", "timeline");
      else params.delete("view");
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return {
    taskId: searchParams.get("task"),
    view: (searchParams.get("view") === "timeline" ? "timeline" : "list") as WorkView,
    taskHref: (id: string) => href({ task: id }),
    openTask: (id: string) => router.push(href({ task: id }), { scroll: false }),
    closeTask: () => router.replace(href({ task: null }), { scroll: false }),
    setView: (view: WorkView) => router.replace(href({ view }), { scroll: false }),
  };
}
