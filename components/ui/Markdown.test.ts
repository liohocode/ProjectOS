import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

const html = (md: string) => renderToStaticMarkup(createElement(Markdown, null, md));

describe("Markdown (F21.11)", () => {
  it("GFM: bảng trong khung cuộn, danh sách việc, code", () => {
    const out = html("| A | B |\n|---|---|\n| 1 | 2 |\n\n- [x] xong\n- [ ] chưa\n\n`npm test`");
    expect(out).toContain('<div class="md-table"><table>');
    expect(out).toContain("<td>1</td>");
    expect(out).toContain('type="checkbox"');
    expect(out).toContain("<code>npm test</code>");
  });

  it("không render HTML thô; link ngoài mở tab mới, link nội bộ giữ nguyên", () => {
    const out = html('<script>alert(1)</script>\n\n[ngoài](https://example.com) [nội bộ](/rv-web/work)');
    expect(out).not.toContain("<script>");
    expect(out).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">ngoài</a>');
    expect(out).toContain('<a href="/rv-web/work">nội bộ</a>');
  });
});
