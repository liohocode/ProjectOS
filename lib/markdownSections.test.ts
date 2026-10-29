import { describe, expect, it } from "vitest";
import { DEFAULT_HEADING, markdownToSections, sectionsToMarkdown } from "./markdownSections";

describe("markdownToSections", () => {
  it("tách mục theo `## `, đoạn theo dòng trống, nối các dòng trong một đoạn", () => {
    const md = "## Bối cảnh\nDòng một\ndòng hai\n\nĐoạn hai\n\n## Phạm vi\r\n\r\n- Trong: A\n";
    expect(markdownToSections(md)).toEqual([
      { heading: "Bối cảnh", paras: ["Dòng một dòng hai", "Đoạn hai"] },
      { heading: "Phạm vi", paras: ["- Trong: A"] },
    ]);
  });

  it("nội dung trước mục đầu tiên vào mục mặc định; rỗng → không có mục", () => {
    expect(markdownToSections("Mở đầu\n\n## Mục\nThân")).toEqual([
      { heading: DEFAULT_HEADING, paras: ["Mở đầu"] },
      { heading: "Mục", paras: ["Thân"] },
    ]);
    expect(markdownToSections("  \n\n")).toEqual([]);
    expect(markdownToSections("## Trống")).toEqual([{ heading: "Trống", paras: [] }]);
  });

  it("sectionsToMarkdown → markdownToSections giữ nguyên", () => {
    const sections = [
      { heading: "A", paras: ["x", "y"] },
      { heading: "B", paras: ["z"] },
    ];
    expect(markdownToSections(sectionsToMarkdown(sections))).toEqual(sections);
  });
});
