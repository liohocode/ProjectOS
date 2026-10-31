import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveRevision, createDoc, editDoc, rejectRevision } from "./docs";
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
        { heading: "Bối cảnh", paras: ["Người mua cần\nthanh toán nhanh."] },
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

describe("editDoc (F12.6)", () => {
  // "glossary" (rv-web) không có revision chờ → sửa không làm lệch dữ liệu mẫu của test khác; trả lại sau.
  const DOC = "glossary";
  let seed: { summary: string; sections: unknown; version: string; updatedAt: Date };
  let seedRevisionIds: string[];
  beforeAll(async () => {
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: DOC }, include: { revisions: { select: { id: true } } } });
    seed = { summary: doc.summary, sections: doc.sections, version: doc.version, updatedAt: doc.updatedAt };
    seedRevisionIds = doc.revisions.map((r) => r.id);
  });
  afterAll(async () => {
    await prisma.docRevision.deleteMany({ where: { docId: DOC, id: { notIn: seedRevisionIds } } });
    await prisma.doc.update({ where: { id: DOC }, data: { ...seed, sections: seed.sections as object } });
  });

  const input = (over: Partial<Parameters<typeof editDoc>[0]> = {}) => ({
    docId: DOC,
    projectId: "rv-web",
    baseVersion: seed.version,
    what: "",
    summary: "Thuật ngữ dùng chung, bản sửa.",
    content: "## Thuật ngữ\nTin đăng: bài đăng bán/cho thuê.\n\n## Viết tắt\nBA: business analyst.",
    ...over,
  });

  it("áp nội dung, tăng version, lịch sử 'Sửa trực tiếp' đã duyệt bởi người sửa", async () => {
    expect(await editDoc(input())).toEqual({ ok: true, version: "v1.1" });
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: DOC } });
    expect(doc).toMatchObject({
      version: "v1.1",
      summary: "Thuật ngữ dùng chung, bản sửa.",
      sections: [
        { heading: "Thuật ngữ", paras: ["Tin đăng: bài đăng bán/cho thuê."] },
        { heading: "Viết tắt", paras: ["BA: business analyst."] },
      ],
    });
    expect(doc.updatedAt.getTime()).toBeGreaterThan(seed.updatedAt.getTime());
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web", "layout");
    const top = (await getDocBody(DOC)).history[0];
    expect(top).toMatchObject({ what: "Sửa trực tiếp", status: "approved", who: "Trung Hiếu", approvedBy: "Trung Hiếu" });
    expect(await getPendingRevisionCount("rv-web")).toBe(await prisma.docRevision.count({ where: { status: "pending", doc: { projectId: "rv-web" } } }));
  });

  it("sửa trên version cũ, không đổi gì, tài liệu dự án khác, input lỗi → từ chối, không ghi", async () => {
    // Chạy sau test trên: version hiện tại v1.1, form cũ còn baseVersion v1.0.
    expect(await editDoc(input({ summary: "khác" }))).toEqual({
      ok: false,
      error: "Tài liệu đã thay đổi từ khi bạn mở form — tải lại để sửa trên bản mới",
    });
    const current = await prisma.doc.findUniqueOrThrow({ where: { id: DOC } });
    expect(await editDoc(input({ baseVersion: "v1.1", summary: current.summary }))).toEqual({ ok: false, error: "Nội dung không có thay đổi" });
    expect(await editDoc(input({ baseVersion: "v1.1", projectId: "crm" }))).toEqual({ ok: false, error: "Không tìm thấy tài liệu trong dự án này" });
    expect(await editDoc(input({ baseVersion: "v1.1", content: " " }))).toEqual({ ok: false, error: "Tài liệu cần ít nhất một mục" });
    expect(await editDoc(input({ baseVersion: "v1.1", summary: "" }))).toEqual({ ok: false, error: "Nhập tóm tắt" });
    expect((await prisma.doc.findUniqueOrThrow({ where: { id: DOC } })).version).toBe("v1.1");
    expect(await prisma.docRevision.count({ where: { docId: DOC, id: { notIn: seedRevisionIds } } })).toBe(1);
  });
});
