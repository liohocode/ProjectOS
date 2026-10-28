import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveRevision, rejectRevision } from "./docs";
import { getDocBody, getPendingRevisionCount } from "@/lib/data/docs";
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
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web", "layout");
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

describe("rejectRevision (F12.3)", () => {
  let revisionId: string;

  beforeAll(async () => {
    revisionId = (await prisma.docRevision.findFirstOrThrow({ where: { status: "pending", docId: "mcp-spec" } })).id;
  });

  afterAll(async () => {
    await prisma.docRevision.update({ where: { id: revisionId }, data: { status: "pending", rejectedReason: null } });
  });

  it("revision chờ có diff so với bản hiện tại", async () => {
    const rev = (await getDocBody("mcp-spec")).history.find((r) => r.id === revisionId)!;
    expect(rev.diff?.some((s) => s.kind !== "same")).toBe(true);
    expect(rev.rejectedReason).toBeUndefined();
  });

  it("từ chối kèm lý do: rời trạng thái chờ, giảm badge, giữ nguyên tài liệu", async () => {
    const before = await getPendingRevisionCount("rv-web");
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: "mcp-spec" } });

    expect(await rejectRevision(revisionId, "rv-web", "  Thiếu ví dụ  ")).toEqual({ ok: true });

    const rev = await prisma.docRevision.findUniqueOrThrow({ where: { id: revisionId } });
    expect(rev).toMatchObject({ status: "rejected", rejectedReason: "Thiếu ví dụ" });
    expect(await getPendingRevisionCount("rv-web")).toBe(before - 1);
    expect(await prisma.doc.findUniqueOrThrow({ where: { id: "mcp-spec" } })).toEqual(doc);
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web", "layout");

    const shown = (await getDocBody("mcp-spec")).history.find((r) => r.id === revisionId)!;
    expect(shown).toMatchObject({ status: "rejected", rejectedReason: "Thiếu ví dụ" });
    expect(shown.diff).toBeUndefined();
  });

  it("chặn lý do rỗng, revision đã xử lý, revision của dự án khác", async () => {
    expect(await rejectRevision(revisionId, "rv-web", "lại")).toEqual({ ok: false, error: "Revision này không còn chờ duyệt" });
    const other = await prisma.docRevision.findFirstOrThrow({ where: { status: "pending", doc: { projectId: "rv-web" } } });
    expect(await rejectRevision(other.id, "rv-web", "   ")).toEqual({ ok: false, error: "Nhập lý do từ chối" });
    expect(await rejectRevision(other.id, "crm", "x")).toEqual({ ok: false, error: "Không tìm thấy revision trong dự án này" });
    expect((await prisma.docRevision.findUniqueOrThrow({ where: { id: other.id } })).status).toBe("pending");
  });
});
