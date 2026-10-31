// Import kế hoạch `.md` → dữ liệu Meridian (F28.2) — parser thuần, không đụng DB.
// Đọc một file feature theo mẫu `docs/features/_TEMPLATE.md`: tiêu đề "# F21 — Tên", bảng đầu (Trạng thái | Phase |
// Phụ thuộc | Yêu cầu), các mục "## Mục tiêu" / "## Phạm vi" / "## Tham chiếu" / "## Quyết định / ghi chú", bảng
// "## Tasks" (Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái) và mục chi tiết "### F21.3 — …" (Làm gì, Hoàn thành khi).

export type PlanStage = "BA" | "TA" | "Dev" | "Review" | "Done";
export type PlanStatus = "Chờ" | "Đang làm" | "Xong";

export interface PlanTask {
  /** "F21.3" */
  code: string;
  title: string;
  size: "S" | "M" | "L" | null;
  /** Mã task phụ thuộc trong kế hoạch ("F21.6") — cả task của feature khác */
  dependsOn: string[];
  stage: PlanStage;
  status: PlanStatus;
  /** Ghi chú trạng thái gốc khi không phải Xong / Chưa làm (vd "Hoãn (Lio, …)") → lý do block */
  blocked: string | null;
  needsDecision: boolean;
  /** Đã chuyển / thay bằng / gộp vào task khác → import thành task lưu trữ (F21.4) */
  superseded: boolean;
  description: string | null;
  criteria: { text: string; done: boolean }[];
}

export interface PlanFeature {
  /** "F21" */
  code: string;
  name: string;
  stage: PlanStage;
  /** "7", "7b" — null nếu bảng đầu không có */
  phase: string | null;
  /** Mã feature phụ thuộc ("F16") — rút từ cột "Phụ thuộc" (kể cả "F16.6" → F16, "F01–F06" → F01…F06) */
  dependsOn: string[];
  goal: string | null;
  scope: string | null;
  notes: string | null;
  tasks: PlanTask[];
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

/** Các mục "## …" → map tiêu đề → nội dung (giữ nguyên markdown, bỏ dòng trống đầu / cuối). */
function sections(md: string, level: "##" | "###"): Map<string, string> {
  const out = new Map<string, string>();
  const re = new RegExp(`^${level} (.+)$`);
  let current: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current !== null) out.set(current, buf.join("\n").trim());
  };
  for (const line of md.split("\n")) {
    const m = re.exec(line);
    // "## " không khớp "### " (và ngược lại) nhờ regex đầy đủ tiền tố + dấu cách.
    if (m && !(level === "##" && line.startsWith("###"))) {
      flush();
      current = m[1].trim();
      buf = [];
    } else if (level === "###" && current !== null && /^## /.test(line)) {
      flush();
      current = null;
      buf = [];
    } else if (current !== null) buf.push(line);
  }
  flush();
  return out;
}

/** "F01–F06, F11.1" → ["F01","F02",…,"F06","F11"] (chỉ mã feature). */
export function featureRefs(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/F(\d{2})(?:\.\d+)?(?:\s*[–-]\s*F(\d{2}))?/g)) {
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let n = from; n <= to; n++) out.add(`F${String(n).padStart(2, "0")}`);
  }
  return [...out];
}

/** "F21.6, F22.1" → mã task ("—" → []). */
export function taskRefs(text: string): string[] {
  return [...new Set([...text.matchAll(/F\d{2}\.\d+/g)].map((m) => m[0]))];
}

export function mapFeatureStatus(text: string): PlanStage {
  const t = text.toLowerCase();
  if (t.startsWith("xong")) return "Done";
  if (t.startsWith("đang làm")) return "Dev";
  return "TA";
}

export function mapTaskStatus(text: string): { stage: PlanStage; status: PlanStatus; blocked: string | null; needsDecision: boolean; superseded: boolean } {
  const t = text.trim().replace(/\*\*/g, "");
  const lower = t.toLowerCase();
  const base = { blocked: null, needsDecision: false, superseded: false };
  if (lower.startsWith("xong")) return { ...base, stage: "Done", status: "Xong" };
  if (lower.startsWith("đang làm")) return { ...base, stage: "Dev", status: "Đang làm" };
  // "Chuyển → F20.1", "Chưa làm — thay bằng F28", "Hoãn … — gộp vào F28.6": việc nằm ở task khác → lưu trữ, giữ ghi chú.
  if (/chuyển|thay bằng|gộp vào/.test(lower)) return { ...base, stage: "TA", status: "Chờ", blocked: t.slice(0, 200), superseded: true };
  if (lower.startsWith("chưa làm") && !/—/.test(t)) return { ...base, stage: "TA", status: "Chờ" };
  // "Chưa làm — cần Lio …", "Hoãn (…)", "Chặn — …", "Chờ Lio": chưa làm được → block kèm lý do gốc.
  return { ...base, stage: "TA", status: "Chờ", blocked: t.slice(0, 200), needsDecision: /quyết định|chờ lio|cần lio/i.test(t) };
}

export function parseFeatureMd(md: string): PlanFeature | null {
  const text = md.replace(/\r\n?/g, "\n");
  const head = /^# (F\d{2})\s*[—-]\s*(.+)$/m.exec(text);
  if (!head) return null;
  const lines = text.split("\n");

  // Bảng đầu: dòng ngay sau "|---" đầu tiên.
  const headerIdx = lines.findIndex((l) => /^\|\s*Trạng thái\s*\|/.test(l));
  const headerRow = headerIdx >= 0 ? cells(lines[headerIdx + 2] ?? "") : [];
  const [statusText = "", phaseText = "", depsText = ""] = headerRow;

  const h2 = sections(text, "##");
  const h3 = sections(text, "###");
  const refs = h2.get("Tham chiếu");
  const scopeParts = [h2.get("Phạm vi"), refs && `**Tham chiếu**\n${refs}`].filter(Boolean) as string[];
  const notesParts = [h2.get("Quyết định / ghi chú"), h2.get("Đã chuyển sang feature khác") && `**Đã chuyển sang feature khác**\n${h2.get("Đã chuyển sang feature khác")}`].filter(
    Boolean,
  ) as string[];

  // Bảng Tasks.
  const tasks: PlanTask[] = [];
  const tasksIdx = lines.findIndex((l) => /^\|\s*Task\s*\|/.test(l));
  if (tasksIdx >= 0) {
    for (let i = tasksIdx + 2; i < lines.length && lines[i].startsWith("|"); i++) {
      const [code, title, size, deps, status] = cells(lines[i]);
      if (!/^F\d{2}\.\d+$/.test(code ?? "")) continue;
      const mapped = mapTaskStatus(status ?? "");
      const detail = [...h3.entries()].find(([k]) => k.startsWith(`${code} `) || k === code)?.[1] ?? null;
      const { description, criteria } = splitDetail(detail);
      tasks.push({
        code,
        title: title.replace(/\*\*/g, "").trim(),
        size: /^[SML]\b/.test(size ?? "") ? ((size as string)[0] as "S" | "M" | "L") : null,
        dependsOn: taskRefs(deps ?? ""),
        ...mapped,
        needsDecision: mapped.needsDecision || /\*\*Quyết định\*\*/.test(title),
        description,
        criteria,
      });
    }
  }

  // Feature "Hoãn" (vd F18): task chưa xong của nó coi như bị chặn cùng lý do — không lọt vào "việc nên nhận tiếp".
  if (/^hoãn/i.test(statusText)) {
    for (const t of tasks) if (t.stage !== "Done" && !t.blocked) t.blocked = `Feature hoãn: ${statusText.replace(/\*\*/g, "")}`.slice(0, 200);
  }

  const code = head[1];
  return {
    code,
    name: head[2].trim(),
    stage: mapFeatureStatus(statusText),
    phase: /^\d+[a-z]?$/.test(phaseText) ? phaseText : null,
    dependsOn: featureRefs(depsText).filter((f) => f !== code),
    goal: h2.get("Mục tiêu") || null,
    scope: scopeParts.join("\n\n") || null,
    notes: notesParts.join("\n\n") || null,
    tasks,
  };
}

/** Mục chi tiết task → mô tả (mọi thứ trừ danh sách "Hoàn thành khi") + tiêu chí ([x] = đã đạt). */
function splitDetail(detail: string | null): { description: string | null; criteria: { text: string; done: boolean }[] } {
  if (!detail) return { description: null, criteria: [] };
  const criteria: { text: string; done: boolean }[] = [];
  const keep: string[] = [];
  let inCriteria = false;
  for (const line of detail.split("\n")) {
    if (/^\*\*Hoàn thành khi\*\*/.test(line)) {
      inCriteria = true;
      const rest = line.replace(/^\*\*Hoàn thành khi\*\*:?\s*/, "").trim();
      if (rest) keep.push(`**Hoàn thành khi**: ${rest}`);
      continue;
    }
    const item = /^\s*- \[([ xX])\]\s+(.+)$/.exec(line);
    if (inCriteria && item) {
      criteria.push({ text: item[2].trim().slice(0, 300), done: item[1] !== " " });
      continue;
    }
    if (inCriteria && line.trim() && !/^\s*- /.test(line)) inCriteria = false;
    keep.push(line);
  }
  const description = keep.join("\n").trim();
  return { description: description || null, criteria };
}

/** Tên phase từ ROADMAP: "### Phase 7b — Kế hoạch …" → { "7b": "Kế hoạch …" } (bỏ phần "(ưu tiên n)"). */
export function parsePhaseNames(roadmap: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of roadmap.matchAll(/^### Phase (\d+[a-z]?) — (.+)$/gm)) out.set(m[1], m[2].replace(/\s*\(ưu tiên \d+\)\s*$/, "").trim());
  return out;
}

/** So sánh mã phase để xếp thứ tự: "7" < "7b" < "8". */
export function comparePhaseCodes(a: string, b: string): number {
  const pa = /^(\d+)([a-z]?)$/.exec(a)!;
  const pb = /^(\d+)([a-z]?)$/.exec(b)!;
  return Number(pa[1]) - Number(pb[1]) || pa[2].localeCompare(pb[2]);
}

export interface PlanDoc {
  /** Id tài liệu trong Meridian — `<dự án>-<đường dẫn>` (vd "meridian-architecture-decisions") */
  slug: string;
  title: string;
  summary: string;
  /** Markdown phần thân (bỏ dòng tiêu đề "# …") — tách mục bằng markdownToSections khi ghi */
  body: string;
}

/** Tài liệu kỹ thuật `.md` → Doc (F28.3): tiêu đề = dòng "# " đầu, tóm tắt = đoạn văn đầu tiên trước mục "## " đầu. */
export function parseDocMd(path: string, md: string, prefix: string): PlanDoc {
  const text = md.replace(/\r\n?/g, "\n");
  const title = /^# (.+)$/m.exec(text)?.[1].trim() ?? path;
  let body = text.replace(/^# .+\n?/m, "").trim();
  // Tài liệu chỉ có mục "### " (vd nhật ký ADR) → nâng thành "## " để mỗi mục là một section trên màn Docs.
  if (!/^## /m.test(body) && /^### /m.test(body)) body = body.replace(/^### /gm, "## ");
  const intro = body.split(/\n## /)[0];
  const summary =
    intro
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("|") && !p.startsWith("```") && !p.startsWith("#")) ?? title;
  const slug = `${prefix}-${path.replace(/\.md$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.replace(/-+$/, "");
  return { slug, title, summary: summary.replace(/\s+/g, " ").slice(0, 500), body };
}
