"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { getProjectsByMember } from "@/lib/data/projects";
import { searchProject as searchProjectData } from "@/lib/data/search";
import type { SearchResults } from "@/lib/types";
import { fail, type ActionResult } from "./result";

const searchSchema = z.object({
  projectId: z.string().trim().min(1, "Thiếu dự án"),
  q: z.string().trim().min(2, "Gõ ít nhất 2 ký tự").max(100, "Từ khoá tối đa 100 ký tự"),
});

/** Ô tìm kiếm header (F14.2) — chỉ tìm trong dự án mà người dùng là thành viên. Chỉ đọc. */
export async function searchProject(projectId: string, q: string): Promise<ActionResult<{ results: SearchResults }>> {
  const input = searchSchema.safeParse({ projectId, q });
  if (!input.success) return fail(input.error.issues[0].message);

  const myProjects = await getProjectsByMember(await getCurrentUserId());
  if (!myProjects.some((p) => p.id === input.data.projectId)) return fail("Không tìm thấy dự án");

  return { ok: true, results: await searchProjectData(input.data.projectId, input.data.q) };
}
