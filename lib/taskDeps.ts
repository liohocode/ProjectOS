// Phụ thuộc giữa task (F21.8) — hàm thuần.

/** Thêm cạnh `taskId` → `dependsOnId` có tạo vòng không (kể cả tự phụ thuộc). `edges`: [task, phụ thuộc] hiện có. */
export function wouldCreateCycle(edges: readonly (readonly [string, string])[], taskId: string, dependsOnId: string): boolean {
  if (taskId === dependsOnId) return true;
  // Vòng xảy ra khi từ dependsOnId đi theo các cạnh "phụ thuộc" tới được taskId.
  const next = new Map<string, string[]>();
  for (const [from, to] of edges) next.set(from, [...(next.get(from) ?? []), to]);
  const seen = new Set<string>();
  const stack = [dependsOnId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === taskId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(next.get(cur) ?? []));
  }
  return false;
}

/** Lý do chặn bắt đầu task khi còn phụ thuộc chưa Done — null = được. */
export function dependencyBlockReason(taskId: string, pending: readonly string[]): string | null {
  if (pending.length === 0) return null;
  return `${taskId} đang chờ ${pending.join(", ")} xong trước`;
}
