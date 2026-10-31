import type { DocSection } from "@/lib/types";

// Nội dung tài liệu lưu dạng sections ({ heading, paras[] }); form nhập/sửa dùng markdown đơn giản (F12.5/F12.6):
// mỗi dòng `## Tiêu đề` mở một mục, đoạn văn cách nhau bằng dòng trống. Phần trước mục đầu tiên → mục DEFAULT_HEADING.
// F21.11: mỗi đoạn là markdown (hiển thị bằng components/ui/Markdown) — giữ nguyên xuống dòng + thụt lề để bảng,
// danh sách lồng nhau còn nguyên; khối code ``` giữ trọn (kể cả dòng trống, dòng `##` bên trong).
export const DEFAULT_HEADING = "Nội dung";

export function markdownToSections(markdown: string): DocSection[] {
  const sections: DocSection[] = [];
  let current: DocSection | null = null;
  let para: string[] = [];

  let inFence = false;
  const flushPara = () => {
    const text = para.join("\n").trim();
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
    if (line.startsWith("```")) inFence = !inFence;
    else if (inFence) {
      para.push(raw.trimEnd());
      continue;
    }
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading && !line.startsWith("```")) {
      flushPara();
      current = { heading: heading[1].trim(), paras: [] };
      sections.push(current);
    } else if (line === "") {
      flushPara();
    } else {
      para.push(raw.trimEnd());
    }
  }
  flushPara();
  return sections;
}

export function sectionsToMarkdown(sections: DocSection[]): string {
  return sections.map((s) => [`## ${s.heading}`, ...s.paras].join("\n\n")).join("\n\n");
}
