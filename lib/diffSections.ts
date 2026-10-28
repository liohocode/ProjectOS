import type { DocSection } from "@/lib/types";

// So sánh nội dung tài liệu theo mục (F12.3): mục ghép theo tiêu đề, trong mục so theo đoạn (LCS) —
// đủ cho người duyệt thấy thêm/xoá/sửa đoạn nào, không cần diff từng ký tự.

export type ParaChange = { kind: "same" | "added" | "removed"; text: string };
export type SectionDiff = {
  heading: string;
  kind: "same" | "added" | "removed" | "changed";
  paras: ParaChange[];
};

/** Diff 2 dãy đoạn văn bằng LCS: giữ thứ tự, đoạn sửa hiện thành 1 đoạn xoá + 1 đoạn thêm. */
export function diffParas(before: string[], after: string[]): ParaChange[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: ParaChange[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push({ kind: "same", text: before[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: "removed", text: before[i++] });
    } else {
      out.push({ kind: "added", text: after[j++] });
    }
  }
  while (i < n) out.push({ kind: "removed", text: before[i++] });
  while (j < m) out.push({ kind: "added", text: after[j++] });
  return out;
}

/**
 * Mục theo thứ tự bản đề xuất; mục bị xoá chèn vào đúng vị trí cũ của nó (sau mục đứng trước nó ở bản hiện tại).
 */
export function diffSections(current: DocSection[], proposed: DocSection[]): SectionDiff[] {
  const currentByHeading = new Map(current.map((s) => [s.heading, s]));
  const proposedHeadings = new Set(proposed.map((s) => s.heading));

  const out: SectionDiff[] = proposed.map((p) => {
    const before = currentByHeading.get(p.heading);
    if (!before) return { heading: p.heading, kind: "added", paras: p.paras.map((text) => ({ kind: "added", text })) };
    const paras = diffParas(before.paras, p.paras);
    return { heading: p.heading, kind: paras.every((c) => c.kind === "same") ? "same" : "changed", paras };
  });

  current.forEach((s, idx) => {
    if (proposedHeadings.has(s.heading)) return;
    const removed: SectionDiff = { heading: s.heading, kind: "removed", paras: s.paras.map((text) => ({ kind: "removed", text })) };
    // Chèn sau mục đứng ngay trước nó (ở bản hiện tại) nếu mục đó còn; không thì lên đầu.
    const prev = current.slice(0, idx).reverse().find((c) => proposedHeadings.has(c.heading));
    const at = prev ? out.findIndex((d) => d.heading === prev.heading) + 1 : 0;
    out.splice(at, 0, removed);
  });
  return out;
}

/** Có thay đổi thật không (để ẩn nút "Xem thay đổi" khi đề xuất trùng bản hiện tại). */
export function hasChanges(diff: SectionDiff[]): boolean {
  return diff.some((d) => d.kind !== "same");
}
