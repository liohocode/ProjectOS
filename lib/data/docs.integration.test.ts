import { describe, expect, it } from "vitest";
import {
  getDocBody,
  getDocCountByProject,
  getDocGroupsByProject,
  getFirstDocId,
  getKnowledgeStripStats,
  getPendingRevisionCount,
  getPendingRevisionsByProject,
} from "./docs";

describe("cây tài liệu", () => {
  it("nhóm theo feature, 'Kho tri thức chung' nằm cuối và theo từng project", async () => {
    const groups = await getDocGroupsByProject("rv-web");
    expect(groups.map((g) => g.name)).toEqual([
      "FEAT-118 Listing rework",
      "FEAT-119 Search & filter",
      "FEAT-120 Agent integration (MCP)",
      "Kho tri thức chung",
    ]);
    expect(groups.at(-1)?.items.map((i) => i.id)).toEqual(["arch", "conv", "glossary", "runbook"]);

    const crmGeneral = (await getDocGroupsByProject("crm")).at(-1);
    expect(crmGeneral?.items.map((i) => i.id)).toEqual(["crm-glossary"]);
  });

  it("tài liệu đầu tiên và tổng số tài liệu", async () => {
    expect(await getFirstDocId("rv-web")).toBe("ac-118");
    expect(await getDocCountByProject("rv-web")).toBe(12);
    expect(await getFirstDocId("khong-ton-tai")).toBeNull();
  });
});

describe("thân tài liệu", () => {
  it("PRD Listing v3 có tác giả agent, feature, index, section, lịch sử có id", async () => {
    const body = await getDocBody("prd-listing");
    expect(body.author).toBe("Atlas (AI agent)");
    expect(body.feature).toBe("FEAT-118 · Listing rework");
    expect(body.indexed).toMatch(/^Đã index · .* · 42 chunk$/);
    expect(body.sections.map((s) => s.heading)).toEqual(["Bối cảnh", "Phạm vi", "Tiêu chí hoàn thành"]);
    expect(body.history).toHaveLength(3);
    expect(body.history.every((h) => h.id)).toBe(true);
    expect(body.history.filter((h) => h.status === "pending")).toHaveLength(1);
  });

  it("tài liệu thuộc kho chung hiển thị đúng nhóm", async () => {
    expect((await getDocBody("arch")).feature).toBe("Kho tri thức chung");
  });

  it("id lạ trả nội dung mặc định thay vì lỗi", async () => {
    expect((await getDocBody("khong-ton-tai")).title).toBe("Tài liệu");
  });
});

describe("revision chờ duyệt & strip kho tri thức", () => {
  it("rv-web có 2 revision chờ duyệt, project khác không có", async () => {
    expect(await getPendingRevisionCount("rv-web")).toBe(2);
    expect(await getPendingRevisionCount("rv-app")).toBe(0);
    const pending = await getPendingRevisionsByProject("rv-web");
    expect(pending.map((p) => p.docTitle).sort()).toEqual(["MCP tool spec", "PRD — Listing v3"]);
  });

  it("thống kê strip tính từ dữ liệu thật", async () => {
    expect(await getKnowledgeStripStats("rv-web")).toMatchObject({
      totalDocs: 12,
      indexedDocs: 3,
      chunks: 131,
      pendingRevisions: 2,
      agentWritten: 8,
      embeddingModel: "text-embedding-3-large",
    });
  });
});
