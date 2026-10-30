import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { applyRevision } from "./docs";
import { appendDocForAgent, readDocForAgent, searchDocsForAgent } from "./agentDocs";

// F16.5 — tool tài liệu. Vega thuộc rv-web + rv-app (không thuộc crm). Trả lại readBy / revision / nội dung sau khi chạy.
const VEGA = { memberId: "agent-vega", name: "Vega" };
let flows: { readBy: string[]; version: string; summary: string; sections: unknown; updatedAt: Date };

beforeAll(async () => {
  flows = await prisma.doc.findUniqueOrThrow({ where: { id: "flows" }, select: { readBy: true, version: true, summary: true, sections: true, updatedAt: true } });
});
afterAll(async () => {
  await prisma.docRevision.deleteMany({ where: { authorId: "agent-vega", what: { startsWith: "IT " } } });
  await prisma.doc.update({
    where: { id: "flows" },
    data: { readBy: flows.readBy, version: flows.version, summary: flows.summary, sections: flows.sections as never, updatedAt: flows.updatedAt },
  });
});

describe("tool tài liệu cho agent (F16.5)", () => {
  it("docs_read: trả nội dung, thêm tên agent vào 'đã đọc' một lần (bỏ '—')", async () => {
    const r = await readDocForAgent(VEGA, "flows");
    expect(r).toMatchObject({ ok: true, doc: { id: "flows", projectId: "rv-web", title: "User flows bước 1–4" } });
    await readDocForAgent(VEGA, "flows");
    expect((await prisma.doc.findUniqueOrThrow({ where: { id: "flows" } })).readBy).toEqual(["Vega"]);
    expect(await readDocForAgent(VEGA, "crm-glossary")).toMatchObject({ ok: false, projectId: null });
  });

  it("docs_search: không dấu khớp có dấu, chỉ dự án của agent", async () => {
    const hits = await searchDocsForAgent(VEGA.memberId, "quy tac quyen");
    expect(hits.map((h) => h.id)).toContain("perm");
    expect((await searchDocsForAgent(VEGA.memberId, "glossary")).every((h) => h.projectId !== "crm")).toBe(true);
    expect((await searchDocsForAgent(VEGA.memberId, "glossary", "rv-web")).map((h) => h.id)).toEqual(["glossary"]);
  });

  it("docs_append: tạo revision chờ duyệt, tài liệu không đổi; người duyệt áp được (F12.2)", async () => {
    const r = await appendDocForAgent(VEGA.memberId, { docId: "flows", what: "IT thêm bước 5", content: "## Bước 5\n\nXác nhận đăng tin." });
    expect(r).toMatchObject({ ok: true, projectId: "rv-web" });
    const before = await prisma.doc.findUniqueOrThrow({ where: { id: "flows" } });
    expect(before.version).toBe(flows.version);
    const rev = await prisma.docRevision.findUniqueOrThrow({ where: { id: (r as { revisionId: string }).revisionId } });
    expect(rev).toMatchObject({ status: "pending", authorId: "agent-vega", baseVersion: flows.version });

    expect(await applyRevision(rev.id, "hieu")).toMatchObject({ ok: true });
    const after = await prisma.doc.findUniqueOrThrow({ where: { id: "flows" } });
    expect(after.sections).toEqual([{ heading: "Bước 5", paras: ["Xác nhận đăng tin."] }]);
  });

  it("docs_append: chặn thiếu nội dung, tài liệu ngoài dự án", async () => {
    expect(await appendDocForAgent(VEGA.memberId, { docId: "flows", what: "IT rỗng" })).toMatchObject({ ok: false, reason: "Cần summary hoặc content đề xuất" });
    expect(await appendDocForAgent(VEGA.memberId, { docId: "deal-spec", what: "IT x", summary: "x" })).toMatchObject({ ok: false, projectId: null });
  });
});
