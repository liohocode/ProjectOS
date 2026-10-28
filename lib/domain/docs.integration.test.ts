import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPendingRevisionCount } from "@/lib/data/docs";
import { createRevision } from "./docs";

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
