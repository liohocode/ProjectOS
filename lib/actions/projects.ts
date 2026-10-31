"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { PROJECT_CODE_PATTERN, PROJECT_ID_PATTERN, PROJECT_STATUSES, RESERVED_PROJECT_IDS } from "@/lib/projectRules";
import { authorize } from "@/lib/auth/authorize";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";
import { parseDodInput } from "@/lib/doneDefinition";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");

const newProjectSchema = z
  .object({
    id: z
      .string()
      .trim()
      .regex(PROJECT_ID_PATTERN, "Id 2–40 ký tự: chữ thường không dấu, số, dấu gạch ngang")
      .refine((id) => !RESERVED_PROJECT_IDS.includes(id), "Id này trùng đường dẫn của hệ thống, chọn id khác"),
    code: z.string().trim().toUpperCase().regex(PROJECT_CODE_PATTERN, "Mã gồm đúng 2 ký tự chữ hoặc số"),
    name: z.string().trim().min(1, "Nhập tên dự án").max(100, "Tên tối đa 100 ký tự"),
    desc: z.string().trim().max(500, "Mô tả tối đa 500 ký tự"),
    status: z.enum(PROJECT_STATUSES, { message: "Trạng thái không hợp lệ" }),
    /** Sprint đầu tiên (tuỳ chọn): tên trống = không tạo sprint */
    sprintName: z.string().trim().max(60, "Tên sprint tối đa 60 ký tự"),
    sprintStart: dateString.or(z.literal("")),
    sprintEnd: dateString.or(z.literal("")),
  })
  .refine((p) => !p.sprintName || (p.sprintStart && p.sprintEnd), "Sprint cần ngày bắt đầu và kết thúc")
  .refine((p) => !p.sprintName || p.sprintStart <= p.sprintEnd, "Ngày kết thúc sprint phải sau ngày bắt đầu");

export type NewProjectInput = z.input<typeof newProjectSchema>;

/** Tạo dự án (F13.1): kiểm tra id/mã không trùng, người tạo thành thành viên, tuỳ chọn sprint đầu tiên. */
export async function createProject(input: NewProjectInput): Promise<ActionResult<{ projectId: string }>> {
  const denied = await authorize("project.create");
  if (denied) return fail(denied);
  const parsed = newProjectSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;
  const creatorId = await getCurrentUserId();

  const [idTaken, codeTaken] = await Promise.all([
    prisma.project.findUnique({ where: { id: data.id }, select: { id: true } }),
    prisma.project.findFirst({ where: { code: data.code }, select: { id: true } }),
  ]);
  if (idTaken) return fail(`Id "${data.id}" đã có dự án dùng`);
  if (codeTaken) return fail(`Mã "${data.code}" đã có dự án dùng`);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.project.create({
        data: {
          id: data.id,
          code: data.code,
          name: data.name,
          desc: data.desc,
          status: data.status,
          createdById: creatorId,
          members: { create: { memberId: creatorId } },
        },
      });
      if (data.sprintName) {
        const sprint = await tx.sprint.create({
          data: {
            projectId: data.id,
            name: data.sprintName,
            startDate: new Date(`${data.sprintStart}T00:00:00Z`),
            endDate: new Date(`${data.sprintEnd}T00:00:00Z`),
          },
        });
        await tx.project.update({ where: { id: data.id }, data: { currentSprintId: sprint.id } });
      }
    });
  } catch (e) {
    // Hai người tạo cùng id cùng lúc: bản sau vi phạm khoá chính.
    if ((e as { code?: unknown }).code === "P2002") return fail(`Id "${data.id}" đã có dự án dùng`);
    throw e;
  }

  // Portfolio + project switcher của mọi dự án.
  revalidatePath("/[project]", "layout");
  return { ok: true, projectId: data.id };
}

/** Lưu trữ / khôi phục dự án (F13.7). Tech lead thuộc dự án (F15.4); dữ liệu giữ nguyên, chỉ ẩn khỏi switcher. */
export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionResult> {
  const id = z.string().trim().min(1, "Thiếu dự án").safeParse(projectId);
  if (!id.success) return fail(id.error.issues[0].message);
  const denied = await authorize("project.archive", id.data);
  if (denied) return fail(denied);

  const project = await prisma.project.findUniqueOrThrow({ where: { id: id.data }, select: { name: true, archivedAt: true } });
  if (archived === (project.archivedAt !== null)) return fail(archived ? "Dự án đã được lưu trữ" : "Dự án chưa được lưu trữ");

  await prisma.project.update({ where: { id: id.data }, data: { archivedAt: archived ? new Date() : null } });
  await recordActivity(archived ? "ph-archive" : "ph-arrow-counter-clockwise", `${archived ? "Lưu trữ" : "Khôi phục"} dự án ${project.name}`);
  // Portfolio + project switcher của mọi dự án.
  revalidatePath("/[project]", "layout");
  return ok();
}

/** Sửa Definition of Done của dự án (F22.6) — mỗi dòng một mục; tech lead / người tạo dự án (`feature.manage`). */
export async function setDoneDefinition(projectId: string, text: string): Promise<ActionResult> {
  const id = z.string().trim().min(1, "Thiếu dự án").safeParse(projectId);
  if (!id.success) return fail(id.error.issues[0].message);
  const denied = await authorize("feature.manage", id.data);
  if (denied) return fail(denied);
  const parsed = parseDodInput(String(text ?? ""));
  if (!parsed.ok) return fail(parsed.error);
  await prisma.project.update({ where: { id: id.data }, data: { doneDefinition: parsed.items } });
  await recordActivity("ph-list-checks", `Sửa Definition of Done (${parsed.items.length} mục)`);
  revalidatePath("/[project]", "layout");
  return ok();
}
