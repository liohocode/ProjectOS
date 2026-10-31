"use client";

import { useTransition } from "react";
import type { ActionResult } from "@/lib/actions/result";
import type { Direction } from "@/lib/reorder";

/** Nút đưa lên / xuống trong thứ tự ưu tiên (F21.10). */
export function MoveButtons({ label, onMove }: { label: string; onMove: (dir: Direction) => Promise<ActionResult> }) {
  const [isPending, startTransition] = useTransition();
  const move = (dir: Direction) => startTransition(async () => void (await onMove(dir)));
  return (
    <span className="move-buttons">
      <button type="button" className="icon-btn" aria-label={`Đưa ${label} lên`} title="Ưu tiên cao hơn" disabled={isPending} onClick={() => move("up")}>
        <i className="ph ph-caret-up" aria-hidden />
      </button>
      <button type="button" className="icon-btn" aria-label={`Đưa ${label} xuống`} title="Ưu tiên thấp hơn" disabled={isPending} onClick={() => move("down")}>
        <i className="ph ph-caret-down" aria-hidden />
      </button>
    </span>
  );
}
