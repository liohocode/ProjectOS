"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Lọc chỉ số chất lượng theo sprint (F22.7) — tham số URL `?qsprint=`. */
export function QualitySprintFilter({ sprints, value }: { sprints: { id: string; label: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      className="input quality-sprint"
      aria-label="Lọc chỉ số theo sprint"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set("qsprint", e.target.value);
        else next.delete("qsprint");
        const q = next.toString();
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      }}
    >
      <option value="">Mọi sprint</option>
      {sprints.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
