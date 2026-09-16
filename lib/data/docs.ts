import type { DocBody, DocGroup } from "@/lib/types";

const DOC_TREES_BY_PROJECT: Record<string, DocGroup[]> = {
  "rv-web": [
    {
      name: "FEAT-118 Listing rework",
      icon: "ph-cube",
      items: [
        { id: "prd-listing", title: "PRD — Listing v3", agent: true },
        { id: "flows", title: "User flows bước 1–4", agent: false },
        { id: "ac-118", title: "Acceptance criteria", agent: true },
        { id: "notes-118", title: "Ghi chú họp review", agent: true },
      ],
    },
    {
      name: "FEAT-119 Search & filter",
      icon: "ph-cube",
      items: [
        { id: "spec-filter", title: "Spec bộ lọc", agent: false },
        { id: "bench", title: "Benchmark hiệu năng", agent: true },
      ],
    },
    {
      name: "FEAT-120 Agent integration",
      icon: "ph-cube",
      items: [
        { id: "mcp-spec", title: "MCP tool spec", agent: true },
        { id: "perm", title: "Quy tắc quyền agent", agent: false },
      ],
    },
    {
      name: "Kho tri thức chung",
      icon: "ph-brain",
      items: [
        { id: "arch", title: "Kiến trúc hệ thống", agent: true },
        { id: "conv", title: "Coding conventions", agent: false },
        { id: "runbook", title: "Runbook release", agent: true },
        { id: "glossary", title: "Glossary domain", agent: true },
      ],
    },
  ],
  "rv-app": [
    {
      name: "FEAT-201 Onboarding lại từ đầu",
      icon: "ph-cube",
      items: [
        { id: "onb-analysis", title: "Phân tích drop-off", agent: true },
        { id: "onb-flow", title: "Flow onboarding mới", agent: false },
      ],
    },
    {
      name: "FEAT-205 Push notification",
      icon: "ph-cube",
      items: [{ id: "push-spec", title: "Spec push notification", agent: false }],
    },
    {
      name: "Kho tri thức chung",
      icon: "ph-brain",
      items: [
        { id: "app-arch", title: "Kiến trúc app", agent: true },
        { id: "app-conv", title: "Convention React Native", agent: false },
      ],
    },
  ],
  crm: [
    {
      name: "FEAT-301 Pipeline deal",
      icon: "ph-cube",
      items: [
        { id: "deal-spec", title: "Spec pipeline deal", agent: false },
        { id: "deal-ac", title: "Acceptance criteria", agent: true },
      ],
    },
    {
      name: "FEAT-304 Import dữ liệu",
      icon: "ph-cube",
      items: [
        { id: "import-map", title: "Bảng mapping cột CSV", agent: true },
        { id: "import-run", title: "Runbook import", agent: true },
      ],
    },
    {
      name: "Kho tri thức chung",
      icon: "ph-brain",
      items: [{ id: "crm-glossary", title: "Glossary sales", agent: false }],
    },
  ],
};

const DOC_BODIES: Record<string, DocBody> = {
  "prd-listing": {
    title: "PRD — Listing v3",
    version: "v4.2",
    status: "Đang review",
    updated: "2 giờ trước",
    author: "Atlas (AI agent)",
    feature: "FEAT-118 · Listing rework",
    indexed: "Đã index · 18 phút trước · 42 chunk",
    readBy: "Atlas, Vega, Scout",
    summary:
      "Định nghĩa lại luồng đăng tin và bộ lọc kết quả cho web v3. Bản này gộp phản hồi vòng review thứ hai và các ràng buộc dữ liệu từ team backend.",
    sections: [
      {
        heading: "Bối cảnh",
        paras: [
          "Luồng đăng tin hiện tại có 7 bước, tỉ lệ hoàn thành 41%. Phần lớn người dùng rơi ở bước nhập thông tin pháp lý và bước tải ảnh.",
          "Mục tiêu của v3 là rút xuống 4 bước, cho phép lưu nháp ở bất kỳ điểm nào và tự động điền các trường suy ra được từ địa chỉ.",
        ],
      },
      {
        heading: "Phạm vi",
        paras: [
          "Trong phạm vi: form đăng tin, lưu nháp, bộ lọc kết quả, trang chi tiết tin. Ngoài phạm vi: thanh toán, hợp đồng điện tử, app mobile.",
          "Ràng buộc: giữ nguyên schema listings hiện có; mọi trường mới nằm ở bảng listing_attributes.",
        ],
      },
      {
        heading: "Tiêu chí hoàn thành",
        paras: ["Tỉ lệ hoàn thành form đạt tối thiểu 65% trong hai tuần sau khi ra mắt, thời gian phản hồi bộ lọc dưới 400ms ở p95."],
      },
    ],
    history: [
      { who: "Atlas", agent: true, what: "Revision mới: cập nhật mục Tiêu chí hoàn thành từ benchmark", when: "2 giờ", pending: true },
      { who: "Hiếu", agent: false, what: "Chốt phạm vi, gỡ phần thanh toán", when: "Hôm qua" },
      { who: "Atlas", agent: true, what: "Sinh bản nháp v4 từ ghi chú họp", when: "3 ngày" },
    ],
  },
  "mcp-spec": {
    title: "MCP tool spec",
    version: "v1.6",
    status: "Đang dùng",
    updated: "6 giờ trước",
    author: "Vega (AI agent)",
    feature: "FEAT-120 · Agent integration",
    indexed: "Đã index · 6 giờ trước · 28 chunk",
    readBy: "Tất cả agent",
    summary: "Danh sách tool mà hệ thống mở ra cho AI coding agent, kèm phạm vi quyền theo role và định dạng dữ liệu trả về.",
    sections: [
      { heading: "Nhóm docs", paras: ["docs.read, docs.search, docs.append. Chỉ docs.append được ghi, và luôn ghi thành một revision mới chờ người review — agent không ghi đè bản đã chốt."] },
      { heading: "Nhóm task", paras: ["tasks.list, tasks.claim, tasks.update_status, tasks.comment. tasks.claim giới hạn hai task đồng thời cho mỗi agent; BA agent được thêm features.propose để đề xuất feature con."] },
      { heading: "Giới hạn", paras: ["60 lệnh/phút cho mỗi client. Mọi lệnh ghi đều được lưu vào nhật ký kèm token đã dùng và task liên quan."] },
    ],
    history: [
      { who: "Vega", agent: true, what: "Revision mới: thêm features.propose cho BA agent", when: "40 phút", pending: true },
      { who: "Vega", agent: true, what: "Thêm tasks.comment vào spec", when: "6 giờ" },
      { who: "Hiếu", agent: false, what: "Buộc docs.append phải qua review", when: "2 ngày" },
    ],
  },
  arch: {
    title: "Kiến trúc hệ thống",
    version: "v2.0",
    status: "Đã chốt",
    updated: "Hôm qua",
    author: "Nam",
    feature: "Kho tri thức chung",
    indexed: "Đã index · hôm qua · 61 chunk",
    readBy: "Atlas, Vega",
    summary: "Sơ đồ thành phần và các quyết định kỹ thuật đang có hiệu lực, kèm ghi chú vì sao chọn từng phương án.",
    sections: [
      { heading: "Thành phần", paras: ["Ba service: web BFF, core API, worker xử lý ảnh và index. Postgres là nguồn sự thật; Redis cho cache và hàng đợi ngắn."] },
      { heading: "Quyết định đang có hiệu lực", paras: ["ADR-07: không dùng GraphQL cho v3. ADR-09: MCP server chạy tách khỏi core API để giới hạn quyền của agent ở tầng mạng. ADR-11 (đang mở): cách versioning schema — đang block T-418."] },
    ],
    history: [
      { who: "Nam", agent: false, what: "Thêm ADR-09 về MCP server", when: "Hôm qua" },
      { who: "Atlas", agent: true, what: "Đồng bộ sơ đồ với code thực tế", when: "4 ngày" },
    ],
  },
};

export async function getDocGroupsByProject(projectId: string): Promise<DocGroup[]> {
  return DOC_TREES_BY_PROJECT[projectId] ?? [];
}

export async function getFirstDocId(projectId: string): Promise<string | null> {
  const groups = await getDocGroupsByProject(projectId);
  return groups[0]?.items[0]?.id ?? null;
}

export async function getDocCountByProject(projectId: string): Promise<number> {
  const groups = await getDocGroupsByProject(projectId);
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}

export async function getPendingRevisionCount(projectId: string): Promise<number> {
  const revisions = await getPendingRevisionsByProject(projectId);
  return revisions.length;
}

export async function getPendingRevisionsByProject(
  projectId: string,
): Promise<{ docTitle: string; who: string; agent: boolean; what: string; when: string }[]> {
  const groups = await getDocGroupsByProject(projectId);
  const ids = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
  return Object.entries(DOC_BODIES)
    .filter(([id]) => ids.has(id))
    .flatMap(([, body]) =>
      body.history
        .filter((h) => h.pending)
        .map((h) => ({ docTitle: body.title, who: h.who, agent: h.agent, what: h.what, when: h.when })),
    );
}

export interface KnowledgeStripStats {
  totalDocs: number;
  indexedDocs: number;
  chunks: number;
  pendingRevisions: number;
  agentWritten: number;
  lastIndexedAgo: string;
  embeddingModel: string;
}

export async function getKnowledgeStripStats(projectId: string): Promise<KnowledgeStripStats> {
  const groups = await getDocGroupsByProject(projectId);
  const items = groups.flatMap((g) => g.items);
  const bodies = items.map((i) => DOC_BODIES[i.id]).filter((b): b is DocBody => Boolean(b));

  const chunks = bodies.reduce((sum, b) => {
    const match = /(\d+)\s*chunk/.exec(b.indexed);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);

  return {
    totalDocs: items.length,
    indexedDocs: bodies.filter((b) => b.indexed.startsWith("Đã index")).length,
    chunks,
    pendingRevisions: await getPendingRevisionCount(projectId),
    agentWritten: items.filter((i) => i.agent).length,
    lastIndexedAgo: bodies[0]?.indexed.split(" · ")[1] ?? "Chưa index",
    embeddingModel: "text-embedding-3-large",
  };
}

export async function getDocBody(id: string): Promise<DocBody> {
  const found = DOC_BODIES[id];
  if (found) return found;

  for (const groups of Object.values(DOC_TREES_BY_PROJECT)) {
    const item = groups.flatMap((g) => g.items).find((d) => d.id === id);
    if (item) {
      return {
        title: item.title,
        version: "v1.0",
        status: "Bản nháp",
        updated: "tuần trước",
        author: "Hiếu",
        feature: "Chưa gắn feature",
        indexed: "Chưa index",
        readBy: "—",
        summary: "Tài liệu này chưa có nội dung chi tiết trong bản prototype.",
        sections: [{ heading: "Nội dung", paras: ["Phần thân tài liệu sẽ hiển thị ở đây."] }],
        history: [{ who: "Hiếu", agent: false, what: "Tạo tài liệu", when: "tuần trước" }],
      };
    }
  }

  return {
    title: "Tài liệu",
    version: "v1.0",
    status: "Bản nháp",
    updated: "tuần trước",
    author: "Hiếu",
    feature: "Chưa gắn feature",
    indexed: "Chưa index",
    readBy: "—",
    summary: "Tài liệu này chưa có nội dung chi tiết trong bản prototype.",
    sections: [{ heading: "Nội dung", paras: ["Phần thân tài liệu sẽ hiển thị ở đây."] }],
    history: [{ who: "Hiếu", agent: false, what: "Tạo tài liệu", when: "tuần trước" }],
  };
}
