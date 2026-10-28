import { describe, expect, it, vi } from "vitest";
import { searchProject as searchData, toLikePattern } from "./search";
import { searchProject } from "@/lib/actions/search";
import { getSessionMemberId } from "@/lib/auth/session";

describe("searchProject (lib/data) — F14.2", () => {
  it("tìm theo mã task, từ trong tiêu đề, tiêu đề tài liệu", async () => {
    expect((await searchData("rv-web", "T-418")).tasks.map((t) => t.id)).toEqual(["T-418"]);
    expect((await searchData("rv-web", "migration")).tasks).toMatchObject([{ id: "T-418", featureId: expect.any(String) }]);
    expect((await searchData("rv-web", "PRD")).docs).toMatchObject([{ id: "prd-listing" }]);
    expect((await searchData("rv-web", "listing")).features.map((f) => f.id)).toContain("FEAT-118");
  });

  it("không phân biệt hoa thường và dấu tiếng Việt", async () => {
    expect((await searchData("rv-web", "PHAP LY")).tasks.map((t) => t.id)).toEqual(["T-418"]);
    expect((await searchData("rv-web", "nâng cấp")).features.map((f) => f.id)).toEqual(["FEAT-126"]);
    expect((await searchData("rv-web", "nang cap")).features.map((f) => f.id)).toEqual(["FEAT-126"]);
  });

  it("chỉ trong dự án được hỏi; ký tự %/_ tìm như chữ thường", async () => {
    expect((await searchData("crm", "T-418")).tasks).toEqual([]);
    expect(await searchData("rv-web", "%")).toEqual({ tasks: [], features: [], docs: [] });
    expect(toLikePattern(" 50%_a\\b ")).toBe("%50\\%\\_a\\\\b%");
  });
});

describe("searchProject (server action)", () => {
  it("trả kết quả cho thành viên dự án", async () => {
    const result = await searchProject("rv-web", "T-418");
    expect(result.ok && result.results.tasks.map((t) => t.id)).toEqual(["T-418"]);
  });

  it("từ chối dự án người dùng không thuộc, từ khoá quá ngắn", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValueOnce("nam"); // nam không thuộc rv-app
    expect(await searchProject("rv-app", "task")).toEqual({ ok: false, error: "Không tìm thấy dự án" });
    expect(await searchProject("rv-web", "T")).toEqual({ ok: false, error: "Gõ ít nhất 2 ký tự" });
  });
});
