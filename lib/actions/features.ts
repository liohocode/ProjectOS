"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { reviewFeatureProposal } from "@/lib/domain/features";
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
  await recordActivity("ph-check-circle", `Duyệt feature ${id.data} ${result.name}`);
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
  await recordActivity("ph-x-circle", `Từ chối feature ${id.data} ${result.name}`);
  revalidatePath("/[project]/work", "page");
  return ok();
}
