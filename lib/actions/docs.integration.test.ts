import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveRevision, createDoc, rejectRevision } from "./docs";
import { getDocBody, getDocCountByProject, getDocGroupsByProject, getPendingRevisionCount } from "@/lib/data/docs";
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

    // F12.4 — lịch sử hiện người duyệt; revision seed đã duyệt từ trước không có người duyệt.
    const history = (await getDocBody("prd-listing")).history;
    expect(history.find((r) => r.id === revisionId)).toMatchObject({ status: "approved", approvedBy: "Trung Hiếu", approvedWhen: expect.stringMatching(/giây trước$/) });
    expect(history.find((r) => r.id !== revisionId && r.status === "approved")?.approvedBy).toBeUndefined();
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

describe("createDoc (F12.5)", () => {
  const TITLE = "Đặc tả thanh toán điện tử";
  afterAll(async () => {
    await prisma.doc.deleteMany({ where: { id: { startsWith: "dac-ta-thanh-toan-dien-tu" } } });
  });

  it("tạo tài liệu id slug, tác giả = người đăng nhập, v1.0, nội dung tách từ markdown, đúng nhóm feature", async () => {
    const before = await getDocCountByProject("rv-web");
    const feature = await prisma.feature.findFirstOrThrow({ where: { projectId: "rv-web" }, orderBy: { id: "asc" } });
    const result = await createDoc({
      projectId: "rv-web",
      featureId: feature.id,
      title: `  ${TITLE} `,
      summary: "Luồng thanh toán qua ví điện tử.",
      content: "## Bối cảnh\nNgười mua cần\nthanh toán nhanh.\n\n## Phạm vi\nVí MoMo, ZaloPay.",
    });
    expect(result).toEqual({ ok: true, docId: "dac-ta-thanh-toan-dien-tu" });

    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: "dac-ta-thanh-toan-dien-tu" }, include: { revisions: true } });
    expect(doc).toMatchObject({
      projectId: "rv-web",
      featureId: feature.id,
      title: TITLE,
      version: "v1.0",
      status: "Bản nháp",
      agentWritten: false,
      authorId: await getCurrentUserId(),
      sections: [
        { heading: "Bối cảnh", paras: ["Người mua cần thanh toán nhanh."] },
        { heading: "Phạm vi", paras: ["Ví MoMo, ZaloPay."] },
      ],
    });
    expect(doc.revisions).toMatchObject([{ what: "Tạo tài liệu", status: "approved", approvedById: await getCurrentUserId() }]);
    expect(await getDocCountByProject("rv-web")).toBe(before + 1);
    const group = (await getDocGroupsByProject("rv-web")).find((g) => g.name.startsWith(feature.id))!;
    expect(group.items.map((i) => i.id)).toContain("dac-ta-thanh-toan-dien-tu");
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web", "layout");
    expect((await getDocBody("dac-ta-thanh-toan-dien-tu")).history[0]).toMatchObject({ what: "Tạo tài liệu", approvedBy: "Trung Hiếu" });
  });

  it("trùng tiêu đề → thêm hậu tố; không gắn feature → Kho tri thức chung", async () => {
    const base = { projectId: "rv-web", featureId: "", title: TITLE, summary: "x", content: "Chỉ một đoạn." };
    expect(await createDoc(base)).toEqual({ ok: true, docId: "dac-ta-thanh-toan-dien-tu-2" });
    expect(await createDoc(base)).toEqual({ ok: true, docId: "dac-ta-thanh-toan-dien-tu-3" });
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: "dac-ta-thanh-toan-dien-tu-2" } });
    expect(doc.featureId).toBeNull();
    expect(doc.sections).toEqual([{ heading: "Nội dung", paras: ["Chỉ một đoạn."] }]);
  });

  it("chặn input thiếu, nội dung rỗng, feature của dự án khác, dự án không tồn tại", async () => {
    const base = { projectId: "rv-web", featureId: "", title: "Tài liệu thử", summary: "x", content: "## A\nb" };
    expect(await createDoc({ ...base, title: "  " })).toEqual({ ok: false, error: "Nhập tiêu đề" });
    expect(await createDoc({ ...base, summary: "" })).toEqual({ ok: false, error: "Nhập tóm tắt" });
    expect(await createDoc({ ...base, content: "  \n " })).toEqual({ ok: false, error: "Tài liệu cần ít nhất một mục" });
    const other = await prisma.feature.findFirstOrThrow({ where: { projectId: { not: "rv-web" } } });
    expect(await createDoc({ ...base, featureId: other.id })).toEqual({ ok: false, error: "Feature không thuộc dự án này" });
    expect(await createDoc({ ...base, projectId: "khong-co" })).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    expect(await prisma.doc.count({ where: { title: "Tài liệu thử" } })).toBe(0);
  });
});
