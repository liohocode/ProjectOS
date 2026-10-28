import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveRevision } from "./docs";
import { getPendingRevisionCount } from "@/lib/data/docs";
import { getCurrentUserId } from "@/lib/auth/currentUser";

describe("approveRevision", () => {
  let revisionId: string;

  beforeAll(async () => {
    const rev = await prisma.docRevision.findFirstOrThrow({ where: { status: "pending", docId: "prd-listing" } });
    revisionId = rev.id;
  });

  // Duyệt áp nội dung vào tài liệu (F12.2) → lưu bản seed của tài liệu để trả lại.
  let seedDoc: { summary: string; sections: unknown; version: string; updatedAt: Date };
  beforeAll(async () => {
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: "prd-listing" } });
    seedDoc = { summary: doc.summary, sections: doc.sections, version: doc.version, updatedAt: doc.updatedAt };
  });

  // Trả lại trạng thái seed để test đọc ở file khác không phụ thuộc thứ tự chạy.
  afterAll(async () => {
    await prisma.docRevision.update({
      where: { id: revisionId },
      data: { status: "pending", approvedById: null, approvedAt: null },
    });
    await prisma.doc.update({ where: { id: "prd-listing" }, data: { ...seedDoc, sections: seedDoc.sections as object } });
  });

  it("đánh dấu revision đã duyệt bởi người dùng hiện tại và revalidate màn docs", async () => {
    expect(await approveRevision(revisionId, "rv-web")).toEqual({ ok: true });

    const rev = await prisma.docRevision.findUniqueOrThrow({ where: { id: revisionId } });
    expect(rev.status).toBe("approved");
    expect(rev.approvedById).toBe(await getCurrentUserId());
    expect(rev.approvedAt).toBeInstanceOf(Date);
    expect(await getPendingRevisionCount("rv-web")).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web/docs");
  });

  it("từ chối duyệt lại, revision của dự án khác, revision không tồn tại và input rỗng", async () => {
    // Chạy sau test trên: revision đã duyệt.
    expect(await approveRevision(revisionId, "rv-web")).toEqual({ ok: false, error: "Revision này không còn chờ duyệt" });

    const other = await prisma.docRevision.findFirstOrThrow({ where: { status: "pending", doc: { projectId: "rv-web" } } });
    expect(await approveRevision(other.id, "crm")).toEqual({ ok: false, error: "Không tìm thấy revision trong dự án này" });
    expect((await prisma.docRevision.findUniqueOrThrow({ where: { id: other.id } })).status).toBe("pending");

    expect(await approveRevision("rev-khong-ton-tai", "rv-web")).toEqual({ ok: false, error: "Không tìm thấy revision trong dự án này" });
    expect(await approveRevision(" ", "rv-web")).toEqual({ ok: false, error: "Thiếu mã revision" });
  });
});
