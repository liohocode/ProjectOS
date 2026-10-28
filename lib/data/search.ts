import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { SearchResults } from "@/lib/types";

/** Số kết quả tối đa mỗi nhóm trong dropdown tìm kiếm. */
export const SEARCH_LIMIT = 5;

/** Chuỗi người dùng gõ → mẫu ILIKE: escape %, _ và \ để chúng được tìm như ký tự thường. */
export function toLikePattern(q: string): string {
  return `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Tìm trong một dự án (F14.2): task (mã, tiêu đề), feature (mã, tên), tài liệu (tiêu đề, tóm tắt).
 * Không phân biệt hoa thường và dấu tiếng Việt (extension `unaccent`, migration unaccent_search).
 */
export const searchProject = cache(async (projectId: string, q: string): Promise<SearchResults> => {
  const pattern = toLikePattern(q);
  const [tasks, features, docs] = await Promise.all([
    prisma.$queryRaw<SearchResults["tasks"]>`
      SELECT t.id, t.title, t."featureId" FROM tasks t JOIN features f ON f.id = t."featureId"
      WHERE f."projectId" = ${projectId}
        AND (unaccent(t.id) ILIKE unaccent(${pattern}) OR unaccent(t.title) ILIKE unaccent(${pattern}))
      ORDER BY t.id LIMIT ${SEARCH_LIMIT}`,
    prisma.$queryRaw<SearchResults["features"]>`
      SELECT id, name FROM features
      WHERE "projectId" = ${projectId}
        AND (unaccent(id) ILIKE unaccent(${pattern}) OR unaccent(name) ILIKE unaccent(${pattern}))
      ORDER BY id LIMIT ${SEARCH_LIMIT}`,
    prisma.$queryRaw<SearchResults["docs"]>`
      SELECT id, title FROM docs
      WHERE "projectId" = ${projectId}
        AND (unaccent(title) ILIKE unaccent(${pattern}) OR unaccent(summary) ILIKE unaccent(${pattern}))
      ORDER BY title LIMIT ${SEARCH_LIMIT}`,
  ]);
  return { tasks, features, docs };
});
