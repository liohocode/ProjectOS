import { prisma } from "@/lib/prisma";

// Feature do agent đề xuất (F16.6, FR-AG-04). Agent (BA, `canProposeFeatures` — kiểm ở governance F16.7) tạo feature
// trạng thái `proposed`; lead duyệt → `active` (vào list chính / timeline) hoặc từ chối → `rejected` (giữ lịch sử).

const FEATURE_ID = /^FEAT-(\d+)$/;

/** Mã tiếp theo dạng FEAT-<n> (id feature là duy nhất toàn hệ thống). */
async function nextFeatureId(): Promise<string> {
  const ids = await prisma.feature.findMany({ where: { id: { startsWith: "FEAT-" } }, select: { id: true } });
  const max = ids.reduce((m, { id }) => Math.max(m, Number(FEATURE_ID.exec(id)?.[1] ?? 0)), 0);
  return `FEAT-${max + 1}`;
}

export type ProposeResult = { ok: true; featureId: string; projectId: string } | { ok: false; reason: string; projectId: string | null };

export async function proposeFeature(agentId: string, input: { projectId: string; name: string; description: string }): Promise<ProposeResult> {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || name.length > 120) return { ok: false, reason: "Tên feature 1–120 ký tự", projectId: null };
  if (!description || description.length > 4000) return { ok: false, reason: "Mô tả 1–4000 ký tự", projectId: null };
  const member = await prisma.projectMember.findUnique({ where: { projectId_memberId: { projectId: input.projectId, memberId: agentId } } });
  if (!member) return { ok: false, reason: `Không tìm thấy dự án ${input.projectId} trong các dự án của bạn`, projectId: null };

  // Hai đề xuất cùng lúc có thể lấy trùng mã → lần sau vi phạm khoá chính, thử lại với mã mới.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = await nextFeatureId();
    try {
      await prisma.feature.create({
        data: {
          id,
          projectId: input.projectId,
          name,
          stage: "BA",
          pct: 0,
          status: "proposed",
          proposedById: agentId,
          proposal: description,
          proposedAt: new Date(),
        },
      });
      return { ok: true, featureId: id, projectId: input.projectId };
    } catch (e) {
      if ((e as { code?: unknown }).code !== "P2002") throw e;
    }
  }
  return { ok: false, reason: "Không cấp được mã feature, thử lại", projectId: input.projectId };
}

/** Lead duyệt (→ active) hoặc từ chối (→ rejected, kèm lý do) feature đang chờ. Quyền kiểm ở server action. */
export async function reviewFeatureProposal(
  featureId: string,
  decision: { approve: true } | { approve: false; reason: string },
): Promise<{ ok: true; projectId: string; name: string } | { ok: false; error: string }> {
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, select: { projectId: true, name: true, status: true } });
  if (!feature) return { ok: false, error: "Không tìm thấy feature" };
  if (feature.status !== "proposed") return { ok: false, error: "Feature không còn chờ duyệt" };
  if (!decision.approve && !decision.reason.trim()) return { ok: false, error: "Nhập lý do từ chối" };
  // Điều kiện status = proposed trong câu ghi → hai người duyệt cùng lúc, người sau nhận lỗi thay vì ghi đè.
  const { count } = await prisma.feature.updateMany({
    where: { id: featureId, status: "proposed" },
    data: decision.approve ? { status: "active" } : { status: "rejected", rejectedReason: decision.reason.trim().slice(0, 500) },
  });
  if (count === 0) return { ok: false, error: "Feature không còn chờ duyệt" };
  return { ok: true, projectId: feature.projectId, name: feature.name };
}
