"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { addCredential, credentialProject, revokeCredential } from "@/lib/domain/apiCredentials";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

// API key của dự án / feature (F29.2, ADR-025) — chỉ tech lead (`credential.manage`). Không bao giờ trả key về client.

const inputSchema = z.object({
  projectId: z.string().trim().min(1, "Thiếu dự án"),
  featureId: z.string().trim().min(1).nullable(),
  provider: z.string().trim().min(1, "Chọn nhà cung cấp"),
  label: z.string().trim().min(1, "Nhập tên gợi nhớ").max(60, "Tên gợi nhớ tối đa 60 ký tự"),
  key: z.string().min(1, "Nhập API key").max(500, "API key không hợp lệ"),
});
export type CredentialFormInput = z.input<typeof inputSchema>;

export async function addApiCredential(input: CredentialFormInput): Promise<ActionResult<{ last4: string }>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { projectId, ...rest } = parsed.data;
  const denied = await authorize("credential.manage", projectId);
  if (denied) return fail(denied);

  const result = await addCredential(projectId, rest, await getCurrentUserId());
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-key", `Gắn API key ${rest.label} (…${result.last4})${rest.featureId ? ` cho ${rest.featureId}` : ""}`, {
    event: { projectId, type: "feature", tone: "ok", ...(rest.featureId && { featureId: rest.featureId }) },
  });
  revalidatePath("/[project]", "layout");
  return { ok: true, last4: result.last4 };
}

export async function revokeApiCredential(id: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(1, "Thiếu API key").safeParse(id);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const projectId = await credentialProject(parsed.data);
  if (!projectId) return fail("Không tìm thấy API key");
  const denied = await authorize("credential.manage", projectId);
  if (denied) return fail(denied);

  const result = await revokeCredential(parsed.data, await getCurrentUserId());
  if (!result.ok) return fail(result.error);
  await recordActivity("ph-key", `Thu hồi API key ${result.label}`, { event: { projectId, type: "feature", tone: "ok" } });
  revalidatePath("/[project]", "layout");
  return ok();
}
