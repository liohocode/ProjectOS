"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { createFeature as createFeatureDomain, reviewFeatureProposal, updateFeature as updateFeatureDomain } from "@/lib/domain/features";
import { fail, ok, type ActionResult } from "./result";
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
  revalidatePath("/[project]/work", "page");
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
