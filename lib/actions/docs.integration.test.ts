import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveRevision } from "./docs";
import { getPendingRevisionCount } from "@/lib/data/docs";
import { getCurrentUserId } from "@/lib/auth/currentUser";

describe("approveRevision", () => {
  let revisionId: string;

  beforeAll(async () => {
    const rev = await prisma.docRevision.findFirstOrThrow({ where: { pending: true, docId: "prd-listing" } });
    revisionId = rev.id;
  });

  // Trả lại trạng thái seed để test đọc ở file khác không phụ thuộc thứ tự chạy.
  afterAll(async () => {
    await prisma.docRevision.update({
      where: { id: revisionId },
      data: { pending: true, approvedById: null, approvedAt: null },
    });
  });

  it("đánh dấu revision đã duyệt bởi người dùng hiện tại và revalidate màn docs", async () => {
    expect(await approveRevision(revisionId, "rv-web")).toEqual({ ok: true });

    const rev = await prisma.docRevision.findUniqueOrThrow({ where: { id: revisionId } });
    expect(rev.pending).toBe(false);
    expect(rev.approvedById).toBe(await getCurrentUserId());
    expect(rev.approvedAt).toBeInstanceOf(Date);
    expect(await getPendingRevisionCount("rv-web")).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web/docs");
  });

  it("từ chối duyệt lại, revision của dự án khác, revision không tồn tại và input rỗng", async () => {
    // Chạy sau test trên: revision đã duyệt.
    expect(await approveRevision(revisionId, "rv-web")).toEqual({ ok: false, error: "Revision này đã được duyệt" });

    const other = await prisma.docRevision.findFirstOrThrow({ where: { pending: true, doc: { projectId: "rv-web" } } });
    expect(await approveRevision(other.id, "crm")).toEqual({ ok: false, error: "Không tìm thấy revision trong dự án này" });
    expect((await prisma.docRevision.findUniqueOrThrow({ where: { id: other.id } })).pending).toBe(true);

    expect(await approveRevision("rev-khong-ton-tai", "rv-web")).toEqual({ ok: false, error: "Không tìm thấy revision trong dự án này" });
    expect(await approveRevision(" ", "rv-web")).toEqual({ ok: false, error: "Thiếu mã revision" });
  });
});
