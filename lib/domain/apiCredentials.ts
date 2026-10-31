import { prisma } from "@/lib/prisma";
import { keyHint, masterKeyFromEnv, open, seal } from "@/lib/crypto/secretBox";

// API key của dự án / feature (F29.2, ADR-025). Nơi gọi tự kiểm quyền (`credential.manage`).
// Bản rõ chỉ tồn tại trong bộ nhớ lúc lưu và lúc dispatch lượt chạy (F29.4) — không log, không trả về client / MCP.

export const PROVIDERS = { anthropic: "Anthropic" } as const;
export type Provider = keyof typeof PROVIDERS;
export const isProvider = (v: string): v is Provider => Object.hasOwn(PROVIDERS, v);

export const ENCRYPTION_MISSING = "Server chưa cấu hình khoá mã hoá (MERIDIAN_ENCRYPTION_KEY) — chưa gắn được API key";

export interface CredentialInput {
  /** null = cả dự án */
  featureId: string | null;
  provider: string;
  label: string;
  key: string;
}

export async function addCredential(
  projectId: string,
  input: CredentialInput,
  actorId: string,
): Promise<{ ok: true; id: string; last4: string } | { ok: false; error: string }> {
  const master = masterKeyFromEnv();
  if (!master) return { ok: false, error: ENCRYPTION_MISSING };
  if (!isProvider(input.provider)) return { ok: false, error: "Nhà cung cấp không hỗ trợ" };
  const label = input.label.trim();
  if (!label || label.length > 60) return { ok: false, error: "Tên gợi nhớ 1–60 ký tự" };
  const key = input.key.trim();
  if (key.length < 16 || key.length > 500 || /\s/.test(key)) return { ok: false, error: "API key không hợp lệ" };
  if (input.featureId) {
    const feature = await prisma.feature.findUnique({ where: { id: input.featureId }, select: { projectId: true } });
    if (!feature || feature.projectId !== projectId) return { ok: false, error: "Feature không thuộc dự án này" };
  }

  const sealed = seal(key, master);
  const scope = { projectId, featureId: input.featureId, provider: input.provider, revokedAt: null };
  // Một key đang dùng mỗi phạm vi + provider: thêm key mới thu hồi key cũ (cùng transaction).
  const created = await prisma.$transaction(async (tx) => {
    await tx.apiCredential.updateMany({ where: scope, data: { revokedAt: new Date(), revokedById: actorId } });
    return tx.apiCredential.create({
      data: { projectId, featureId: input.featureId, provider: input.provider, label, ...sealed, last4: keyHint(key), createdById: actorId },
      select: { id: true, last4: true },
    });
  });
  return { ok: true, ...created };
}

export async function revokeCredential(id: string, actorId: string): Promise<{ ok: true; projectId: string; label: string } | { ok: false; error: string }> {
  const row = await prisma.apiCredential.findUnique({ where: { id }, select: { projectId: true, label: true } });
  if (!row) return { ok: false, error: "Không tìm thấy API key" };
  const { count } = await prisma.apiCredential.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), revokedById: actorId } });
  if (count === 0) return { ok: false, error: "API key đã bị thu hồi" };
  return { ok: true, ...row };
}

/** Dự án của một key (để server action kiểm quyền); null = không tồn tại. */
export async function credentialProject(id: string): Promise<string | null> {
  return (await prisma.apiCredential.findUnique({ where: { id }, select: { projectId: true } }))?.projectId ?? null;
}

/**
 * Key dùng cho một lượt chạy (F29.4): key của feature nếu có, không thì key của dự án. Giải mã tại chỗ.
 * Chỉ gọi ở server ngay lúc dispatch; không lưu / log kết quả.
 */
export async function resolveCredential(
  projectId: string,
  featureId: string | null,
  provider: Provider,
): Promise<{ ok: true; id: string; key: string } | { ok: false; error: string }> {
  const rows = await prisma.apiCredential.findMany({
    where: { projectId, provider, revokedAt: null, OR: [{ featureId: null }, ...(featureId ? [{ featureId }] : [])] },
    orderBy: { createdAt: "desc" },
  });
  const row = rows.find((r) => r.featureId !== null) ?? rows[0];
  if (!row) return { ok: false, error: `Dự án chưa gắn API key ${PROVIDERS[provider]}` };
  const master = masterKeyFromEnv();
  if (!master) return { ok: false, error: ENCRYPTION_MISSING };
  try {
    return { ok: true, id: row.id, key: open(row, master) };
  } catch {
    return { ok: false, error: "Không giải mã được API key (khoá chủ đã đổi?) — gắn lại key" };
  }
}
