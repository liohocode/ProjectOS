"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { createFeature as createFeatureDomain, reviewFeatureProposal, updateFeature as updateFeatureDomain } from "@/lib/domain/features";
import { fail, ok, type ActionResult } from "./result";
import { PRIORITY_ORDER } from "@/lib/data/features";
import { moveInList, type Direction } from "@/lib/reorder";
import { wouldCreateCycle } from "@/lib/taskDeps";
import { recordActivity } from "./_activity";

// Duyệt / từ chối feature agent đề xuất (F16.6) — tech lead hoặc người tạo dự án (`feature.review`).

const featureIdSchema = z.string().trim().min(1, "Thiếu feature");

async function projectOf(featureId: string): Promise<string | null> {
  return (await prisma.feature.findUnique({ where: { id: featureId }, select: { projectId: true } }))?.projectId ?? null;
}

export async function approveFeatureProposal(featureId: string): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await projectOf(id.data);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.review", projectId);
  if (denied) return fail(denied);

  const result = await reviewFeatureProposal(id.data, { approve: true });
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-check-circle", `Duyệt feature ${id.data} ${result.name}`, {
    event: { projectId, type: "feature", tone: "ok", featureId: id.data },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}

export async function rejectFeatureProposal(featureId: string, reason: string): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await projectOf(id.data);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.review", projectId);
  if (denied) return fail(denied);

  const result = await reviewFeatureProposal(id.data, { approve: false, reason: String(reason ?? "") });
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-x-circle", `Từ chối feature ${id.data} ${result.name}`, {
    event: { projectId, type: "feature", tone: "ok", featureId: id.data },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}

const featureFieldsSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên feature").max(120, "Tên tối đa 120 ký tự"),
  stage: z.enum(["BA", "TA", "Dev", "Review", "Done"], { error: "Stage không hợp lệ" }),
  ownerId: z.string().trim().min(1).nullable(),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ").nullable(),
  plannedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ").nullable(),
});
export type FeatureFieldsInput = z.input<typeof featureFieldsSchema>;

/** Tạo feature trực tiếp (F21.1) — thành viên dự án. */
export async function createFeature(projectId: string, input: FeatureFieldsInput): Promise<ActionResult<{ featureId: string }>> {
  const project = z.string().trim().min(1, "Thiếu dự án").safeParse(projectId);
  if (!project.success) return fail(project.error.issues[0].message);
  const denied = await authorize("feature.create", project.data);
  if (denied) return fail(denied);
  const parsed = featureFieldsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const result = await createFeatureDomain(project.data, parsed.data);
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-cube", `Tạo feature ${result.featureId} ${parsed.data.name}`, {
    event: { projectId: project.data, type: "feature", tone: "ok", featureId: result.featureId },
  });
  revalidatePath("/[project]", "layout");
  return { ok: true, featureId: result.featureId };
}

/** Sửa feature (F21.1) — tech lead / người tạo dự án. */
export async function updateFeature(featureId: string, input: FeatureFieldsInput): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await projectOf(id.data);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.manage", projectId);
  if (denied) return fail(denied);
  const parsed = featureFieldsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const result = await updateFeatureDomain(id.data, parsed.data);
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-pencil-simple", `Sửa feature ${id.data} ${parsed.data.name}`, {
    event: { projectId, type: "feature", tone: "ok", featureId: id.data },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}

const contentSchema = z.object({
  goal: z.string().max(10_000, "Tối đa 10.000 ký tự"),
  scope: z.string().max(10_000, "Tối đa 10.000 ký tự"),
  notes: z.string().max(50_000, "Ghi chú tối đa 50.000 ký tự"),
});
export type FeatureContentInput = z.input<typeof contentSchema>;

/** Sửa nội dung trang chi tiết feature (F21.9): mục tiêu, phạm vi, ghi chú quyết định — markdown; rỗng = xoá. */
export async function updateFeatureContent(featureId: string, input: FeatureContentInput): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await projectOf(id.data);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.manage", projectId);
  if (denied) return fail(denied);
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const clean = (v: string) => (v.trim() ? v.trim() : null);
  await prisma.feature.update({
    where: { id: id.data },
    data: { goal: clean(parsed.data.goal), scope: clean(parsed.data.scope), notes: clean(parsed.data.notes) },
  });
  await recordActivity("ph-note-pencil", `Sửa nội dung feature ${id.data}`, {
    event: { projectId, type: "feature", tone: "ok", featureId: id.data },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}

/** Lưu trữ / khôi phục feature (F21.10) — ẩn feature + task của nó, giữ lịch sử; feature.manage. */
export async function setFeatureArchived(featureId: string, archived: boolean): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success) return fail(id.error.issues[0].message);
  const feature = await prisma.feature.findUnique({ where: { id: id.data }, select: { projectId: true, name: true, archivedAt: true, status: true } });
  if (!feature || feature.status !== "active") return fail("Không tìm thấy feature");
  const denied = await authorize("feature.manage", feature.projectId);
  if (denied) return fail(denied);
  if (archived === (feature.archivedAt !== null)) return fail(archived ? "Feature đã được lưu trữ" : "Feature chưa được lưu trữ");
  const running = archived ? await prisma.task.count({ where: { featureId: id.data, runningSince: { not: null }, archivedAt: null } }) : 0;
  if (running > 0) return fail(`Feature còn ${running} task đang chạy — dừng trước khi lưu trữ`);

  await prisma.feature.update({ where: { id: id.data }, data: { archivedAt: archived ? new Date() : null } });
  await recordActivity(archived ? "ph-archive" : "ph-arrow-counter-clockwise", `${archived ? "Lưu trữ" : "Khôi phục"} feature ${id.data} ${feature.name}`, {
    event: { projectId: feature.projectId, type: "feature", tone: "ok", featureId: id.data },
  });
  revalidatePath("/[project]", "layout");
  return ok();
}

/** Đổi thứ tự ưu tiên feature trong dự án (F21.10) — feature.manage. Ghi lại position 1..n cho cả danh sách. */
export async function moveFeature(featureId: string, dir: Direction): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success || (dir !== "up" && dir !== "down")) return fail("Thiếu feature");
  const projectId = await projectOf(id.data);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.manage", projectId);
  if (denied) return fail(denied);

  const rows = await prisma.feature.findMany({ where: { projectId, status: "active", archivedAt: null }, orderBy: PRIORITY_ORDER, select: { id: true } });
  const next = moveInList(rows.map((r) => r.id), id.data, dir);
  if (!next) return ok();
  await prisma.$transaction(next.map((fid, i) => prisma.feature.update({ where: { id: fid }, data: { position: i + 1 } })));
  revalidatePath("/[project]", "layout");
  return ok();
}

/** Gắn feature vào phase của kế hoạch (F28.1) — null = bỏ khỏi phase; feature.manage. */
export async function setFeaturePhase(featureId: string, phaseId: string | null): Promise<ActionResult> {
  const id = featureIdSchema.safeParse(featureId);
  if (!id.success) return fail(id.error.issues[0].message);
  const projectId = await projectOf(id.data);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.manage", projectId);
  if (denied) return fail(denied);
  if (phaseId) {
    const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId }, select: { projectId: true } });
    if (!phase || phase.projectId !== projectId) return fail("Không tìm thấy phase");
  }
  await prisma.feature.update({ where: { id: id.data }, data: { phaseId } });
  revalidatePath("/[project]", "layout");
  return ok();
}

/** Thêm / bỏ phụ thuộc giữa hai feature cùng dự án (F28.1) — không vòng; feature.manage. */
export async function setFeatureDependency(featureId: string, dependsOnId: string, add: boolean): Promise<ActionResult> {
  const ids = z.object({ featureId: featureIdSchema, dependsOnId: featureIdSchema }).safeParse({ featureId, dependsOnId });
  if (!ids.success) return fail(ids.error.issues[0].message);
  const projectId = await projectOf(ids.data.featureId);
  if (!projectId) return fail("Không tìm thấy feature");
  const denied = await authorize("feature.manage", projectId);
  if (denied) return fail(denied);

  if (!add) {
    await prisma.featureDependency.deleteMany({ where: ids.data });
  } else {
    if (ids.data.featureId === ids.data.dependsOnId) return fail("Feature không phụ thuộc chính nó");
    if ((await projectOf(ids.data.dependsOnId)) !== projectId) return fail(`Không tìm thấy feature ${ids.data.dependsOnId} trong dự án`);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`meridian:feature-deps:${projectId}`}))`;
      const edges = await tx.featureDependency.findMany({ where: { feature: { projectId } }, select: { featureId: true, dependsOnId: true } });
      if (edges.some((e) => e.featureId === ids.data.featureId && e.dependsOnId === ids.data.dependsOnId)) return null;
      if (wouldCreateCycle(edges.map((e) => [e.featureId, e.dependsOnId] as const), ids.data.featureId, ids.data.dependsOnId)) {
        return `Không thêm được: ${ids.data.dependsOnId} đang (gián tiếp) phụ thuộc ${ids.data.featureId} — sẽ tạo vòng`;
      }
      await tx.featureDependency.create({ data: ids.data });
      return null;
    });
    if (result) return fail(result);
  }
  revalidatePath("/[project]", "layout");
  return ok();
}
