import type { DocSection } from "@/lib/types";

// Nội dung tài liệu lưu dạng sections ({ heading, paras[] }); form nhập/sửa dùng markdown đơn giản (F12.5/F12.6):
// mỗi dòng `## Tiêu đề` mở một mục, đoạn văn cách nhau bằng dòng trống. Phần trước mục đầu tiên → mục DEFAULT_HEADING.
export const DEFAULT_HEADING = "Nội dung";

export function markdownToSections(markdown: string): DocSection[] {
  const sections: DocSection[] = [];
  let current: DocSection | null = null;
  let para: string[] = [];

  const flushPara = () => {
    const text = para.join(" ").trim();
    para = [];
    if (!text) return;
    if (!current) {
      current = { heading: DEFAULT_HEADING, paras: [] };
      sections.push(current);
    }
    current.paras.push(text);
  };

  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flushPara();
      current = { heading: heading[1].trim(), paras: [] };
      sections.push(current);
    } else if (line === "") {
      flushPara();
    } else {
      para.push(line);
    }
  }
  flushPara();
  return sections;
}

export function sectionsToMarkdown(sections: DocSection[]): string {
  return sections.map((s) => [`## ${s.heading}`, ...s.paras].join("\n\n")).join("\n\n");
}
