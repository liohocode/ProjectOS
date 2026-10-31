import { describe, expect, it } from "vitest";
import { parseTaskLinks, prLabel } from "./taskLinks";

describe("parseTaskLinks (F22.4)", () => {
  it("nhận link hợp lệ, chuẩn hoá commit về chữ thường", () => {
    expect(parseTaskLinks({ prUrl: " https://github.com/acme/web/pull/12 ", branch: "feat/F22.4-links", commitSha: "ABCDEF1" })).toEqual({
      ok: true,
      links: { prUrl: "https://github.com/acme/web/pull/12", branch: "feat/F22.4-links", commitSha: "abcdef1" },
    });
  });

  it("chuỗi rỗng = xoá, undefined = giữ nguyên", () => {
    expect(parseTaskLinks({ prUrl: "", branch: null })).toEqual({ ok: true, links: { prUrl: null, branch: null } });
  });

  it.each([
    [{ prUrl: "javascript:alert(1)" }, "Link PR phải là URL http(s)"],
    [{ prUrl: "không phải url" }, "Link PR phải là URL http(s)"],
    [{ branch: "feat/có khoảng trắng" }, "Tên branch không hợp lệ"],
    [{ branch: "a..b" }, "Tên branch không hợp lệ"],
    [{ commitSha: "xyz1234" }, "Commit phải là mã hash 7–40 ký tự hex"],
    [{ commitSha: "abc12" }, "Commit phải là mã hash 7–40 ký tự hex"],
  ])("từ chối %o", (input, error) => {
    expect(parseTaskLinks(input)).toEqual({ ok: false, error });
  });
});

describe("prLabel", () => {
  it("PR GitHub / MR GitLab → repo#số", () => {
    expect(prLabel("https://github.com/acme/web/pull/12")).toBe("acme/web#12");
    expect(prLabel("https://gitlab.com/acme/web/-/merge_requests/7")).toBe("acme/web#7");
  });
  it("URL khác → host + path", () => {
    expect(prLabel("https://bitbucket.org/acme/web")).toBe("bitbucket.org/acme/web");
  });
});
