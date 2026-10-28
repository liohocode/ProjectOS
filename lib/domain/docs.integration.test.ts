import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPendingRevisionCount } from "@/lib/data/docs";
import { applyRevision, createRevision } from "./docs";

const created: string[] = [];
afterAll(async () => {
  await prisma.docRevision.deleteMany({ where: { id: { in: created } } });
});

describe("createRevision (F12.1)", () => {
  it("tạo revision chờ duyệt với nội dung đề xuất và version gốc của tài liệu", async () => {
    const before = await getPendingRevisionCount("rv-web");
    const sections = [{ heading: "Bối cảnh", paras: ["Đoạn mới."] }];
    const result = await createRevision("prd-listing", "agent-atlas", "Viết lại bối cảnh", { sections });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    created.push(result.revisionId);

    const rev = await prisma.docRevision.findUniqueOrThrow({ where: { id: result.revisionId } });
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: "prd-listing" } });
    expect(rev).toMatchObject({ status: "pending", baseVersion: doc.version, proposedSummary: null, proposedSections: sections, authorId: "agent-atlas" });
    expect(await getPendingRevisionCount("rv-web")).toBe(before + 1);
  });

  it("từ chối khi thiếu nội dung, sai shape, tài liệu/người không tồn tại", async () => {
    expect(await createRevision("prd-listing", "agent-atlas", "x", {})).toMatchObject({ ok: false, error: "Revision cần nội dung đề xuất (tóm tắt hoặc các mục)" });
    expect(await createRevision("prd-listing", "agent-atlas", "x", { sections: [] })).toMatchObject({ ok: false, error: "Tài liệu cần ít nhất một mục" });
    expect(await createRevision("khong-co", "agent-atlas", "x", { summary: "y" })).toMatchObject({ ok: false, error: "Không tìm thấy tài liệu khong-co" });
    expect(await createRevision("prd-listing", "ai-do", "x", { summary: "y" })).toMatchObject({ ok: false, error: "Không tìm thấy người đề xuất" });
    expect(await createRevision("prd-listing", "agent-atlas", " ", { summary: "y" })).toMatchObject({ ok: false, error: "Mô tả ngắn thay đổi" });
  });
});

describe("dữ liệu mẫu sau migration revision_status_content", () => {
  it("2 revision chờ của rv-web có nội dung đề xuất = bản hiện tại + thay đổi", async () => {
    const pending = await prisma.docRevision.findMany({
      where: { status: "pending", doc: { projectId: "rv-web" }, id: { notIn: created } },
      include: { doc: true },
      orderBy: { docId: "asc" },
    });
    expect(pending.map((r) => r.docId)).toEqual(["mcp-spec", "prd-listing"]);
    for (const r of pending) {
      expect(r.baseVersion).toBe(r.doc.version);
      const proposed = r.proposedSections as { heading: string; paras: string[] }[];
      const current = r.doc.sections as { heading: string; paras: string[] }[];
      expect(proposed.length).toBeGreaterThanOrEqual(current.length);
      expect(JSON.stringify(proposed)).not.toBe(JSON.stringify(current));
    }
    const prd = pending.find((r) => r.docId === "prd-listing")!;
    const criteria = (prd.proposedSections as { heading: string; paras: string[] }[]).find((s) => s.heading === "Tiêu chí hoàn thành")!;
    expect(criteria.paras.at(-1)).toContain("Benchmark");
  });
});

describe("applyRevision (F12.2)", () => {
  // Lưu tài liệu + revision chờ của prd-listing để trả lại seed sau khi duyệt thật.
  let seedDoc: { summary: string; sections: unknown; version: string; updatedAt: Date };
  let pendingId: string;
  const extra: string[] = [];

  afterAll(async () => {
    await prisma.docRevision.deleteMany({ where: { id: { in: extra } } });
    await prisma.docRevision.update({ where: { id: pendingId }, data: { status: "pending", approvedById: null, approvedAt: null } });
    await prisma.doc.update({ where: { id: "prd-listing" }, data: { ...seedDoc, sections: seedDoc.sections as object } });
  });

  it("áp nội dung đề xuất, tăng version phụ, cập nhật updatedAt, ghi người duyệt", async () => {
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id: "prd-listing" } });
    seedDoc = { summary: doc.summary, sections: doc.sections, version: doc.version, updatedAt: doc.updatedAt };
    const rev = await prisma.docRevision.findFirstOrThrow({ where: { docId: "prd-listing", status: "pending" } });
    pendingId = rev.id;

    expect(await applyRevision(rev.id, "hieu")).toEqual({ ok: true, version: "v4.3" });
    const after = await prisma.doc.findUniqueOrThrow({ where: { id: "prd-listing" } });
    expect(after).toMatchObject({ version: "v4.3", sections: rev.proposedSections, summary: doc.summary });
    expect(after.updatedAt.getTime()).toBeGreaterThan(doc.updatedAt.getTime());
    expect(await prisma.docRevision.findUniqueOrThrow({ where: { id: rev.id } })).toMatchObject({ status: "approved", approvedById: "hieu" });

    expect(await applyRevision(rev.id, "hieu")).toEqual({ ok: false, error: "Revision này không còn chờ duyệt" });
  });

  it("hai revision cùng gốc: duyệt cái đầu xong, cái sau bị từ chối (không ghi đè)", async () => {
    const a = await createRevision("prd-listing", "agent-atlas", "Sửa tóm tắt A", { summary: "Tóm tắt A" });
    const b = await createRevision("prd-listing", "agent-vega", "Sửa tóm tắt B", { summary: "Tóm tắt B" });
    if (!a.ok || !b.ok) throw new Error("tạo revision lỗi");
    extra.push(a.revisionId, b.revisionId);

    expect(await applyRevision(a.revisionId, "hieu")).toEqual({ ok: true, version: "v4.4" });
    expect(await applyRevision(b.revisionId, "hieu")).toEqual({ ok: false, error: "Tài liệu đã thay đổi từ khi revision được tạo" });
    expect((await prisma.doc.findUniqueOrThrow({ where: { id: "prd-listing" } })).summary).toBe("Tóm tắt A");
    expect((await prisma.docRevision.findUniqueOrThrow({ where: { id: b.revisionId } })).status).toBe("pending");
  });

  it("duyệt đồng thời hai revision cùng gốc → đúng một cái thành công", async () => {
    const a = await createRevision("prd-listing", "agent-atlas", "C", { summary: "Tóm tắt C" });
    const b = await createRevision("prd-listing", "agent-vega", "D", { summary: "Tóm tắt D" });
    if (!a.ok || !b.ok) throw new Error("tạo revision lỗi");
    extra.push(a.revisionId, b.revisionId);
    const results = await Promise.all([applyRevision(a.revisionId, "hieu"), applyRevision(b.revisionId, "hieu")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
});
