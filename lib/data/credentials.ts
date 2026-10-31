import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { masterKeyFromEnv } from "@/lib/crypto/secretBox";
import { PROVIDERS, type Provider } from "@/lib/domain/apiCredentials";
import { formatRelativeVi } from "@/lib/relativeTime";
import type { ApiCredentialView } from "@/lib/types";

/** API key đang dùng của dự án (F29.2) — chỉ thông tin nhận diện, không bao giờ có key. Key dự án trước, rồi theo feature. */
export const getCredentialsByProject = cache(async (projectId: string): Promise<ApiCredentialView[]> => {
  const rows = await prisma.apiCredential.findMany({
    where: { projectId, revokedAt: null },
    orderBy: [{ featureId: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    select: {
      id: true,
      provider: true,
      label: true,
      last4: true,
      createdAt: true,
      featureId: true,
      feature: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    provider: PROVIDERS[r.provider as Provider] ?? r.provider,
    label: r.label,
    last4: r.last4,
    featureId: r.featureId,
    featureName: r.feature?.name ?? null,
    createdBy: r.createdBy?.name ?? "—",
    when: formatRelativeVi(r.createdAt),
  }));
});

/** Server đã có khoá chủ chưa — không có thì form gắn key bị khoá (ADR-025). */
export const isEncryptionConfigured = cache(async (): Promise<boolean> => masterKeyFromEnv() !== null);
