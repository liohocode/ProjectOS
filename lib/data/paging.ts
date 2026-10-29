import type { Page } from "@/lib/types";

/** Cắt `limit + 1` dòng đã tải thành một trang; còn dòng thứ `limit + 1` → `nextCursor` = id dòng cuối trang (cursor Prisma). */
export function toPage<R extends { id: string }, T>(rows: R[], limit: number, map: (row: R) => T): Page<T> {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  return { items: pageRows.map(map), nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null };
}
