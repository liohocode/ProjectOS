import { describe, expect, it } from "vitest";
import { DEFAULT_HEADING, markdownToSections, sectionsToMarkdown } from "./markdownSections";

describe("markdownToSections", () => {
  it("tách mục theo `## `, đoạn theo dòng trống, giữ xuống dòng trong một đoạn (markdown — F21.11)", () => {
    const md = "## Bối cảnh\nDòng một\ndòng hai\n\nĐoạn hai\n\n## Phạm vi\r\n\r\n- Trong: A\n";
    expect(markdownToSections(md)).toEqual([
      { heading: "Bối cảnh", paras: ["Dòng một\ndòng hai", "Đoạn hai"] },
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

  it("bảng, danh sách lồng nhau, khối code (kể cả dòng trống / `##` bên trong) giữ nguyên trong một đoạn", () => {
    const table = "| A | B |\n|---|---|\n| 1 | 2 |";
    const list = "- Một\n  - con\n- Hai";
    const code = "```ts\nconst a = 1;\n\n## không phải mục\n```";
    expect(markdownToSections(`## Mục\n${table}\n\n${list}\n\n${code}`)).toEqual([{ heading: "Mục", paras: [table, list, code] }]);
  });

  it("sectionsToMarkdown → markdownToSections giữ nguyên", () => {
    const sections = [
      { heading: "A", paras: ["x", "y"] },
      { heading: "B", paras: ["z"] },
    ];
    expect(markdownToSections(sectionsToMarkdown(sections))).toEqual(sections);
  });
});
