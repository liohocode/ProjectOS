import type { Member } from "@/lib/types";

const TEAM: Member[] = [
  {
    id: "agent-bao",
    name: "Bảo",
    handle: "agent · claude-opus",
    kind: "agent",
    role: "BA agent",
    skills: ["Phân tích YC", "Chia feature"],
    current: "T-430 Phân tích yêu cầu mobile parity",
    status: "Đang chạy",
    config: [
      ["Model", "claude-opus-4.1"],
      ["MCP server", "meridian-core, docs"],
      ["Tool đặc thù", "features.propose"],
      ["Quyền ghi docs", "Append (chờ review)"],
      ["Token tuần này", "2.4M"],
    ],
    skillRows: [
      ["Phân tích yêu cầu", "Cao", 90],
      ["Chia feature / scope", "Cao", 84],
      ["Viết acceptance criteria", "Cao", 80],
      ["Code", "Không dùng", 8],
    ],
    activity: [
      { icon: "ph-plugs", text: "features.propose — đề xuất 3 feature con cho mobile parity", when: "6 phút" },
      { icon: "ph-file-text", text: "docs.append vào Acceptance criteria", when: "25 phút" },
    ],
  },
  {
    id: "agent-vega",
    name: "Vega",
    handle: "agent · claude-opus",
    kind: "agent",
    role: "TA agent",
    skills: ["Chia task", "Review", "MCP"],
    current: "T-407 Cache kết quả bộ lọc",
    status: "Đang chạy",
    config: [
      ["Model", "claude-opus-4.1"],
      ["MCP server", "meridian-core, redis-tools"],
      ["Được phép giao task", "Cho Atlas, Scout"],
      ["Quyền ghi docs", "Append + sửa spec"],
      ["Token tuần này", "3.2M"],
    ],
    skillRows: [
      ["Phân tích kỹ thuật", "Cao", 92],
      ["Code review", "Cao", 94],
      ["Tối ưu hiệu năng", "Cao", 82],
      ["Migration DB", "Trung bình", 48],
    ],
    activity: [
      { icon: "ph-share-network", text: "Chuyển T-418 sang Atlas để code", when: "2 phút" },
      { icon: "ph-plugs", text: "tasks.update_status T-407 → doing", when: "3 phút" },
      { icon: "ph-file-text", text: "Cập nhật MCP tool spec v1.6", when: "6 giờ" },
    ],
  },
  {
    id: "agent-atlas",
    name: "Atlas",
    handle: "agent · claude-sonnet",
    kind: "agent",
    role: "Dev agent",
    skills: ["Migration", "Testing", "Docs"],
    current: "T-405 Sinh test cho API bộ lọc",
    status: "Đang chạy",
    config: [
      ["Model", "claude-sonnet-4.5"],
      ["MCP server", "meridian-core"],
      ["Task đồng thời", "2 (tối đa 2)"],
      ["Quyền ghi docs", "Append (chờ review)"],
      ["Token tuần này", "1.8M"],
    ],
    skillRows: [
      ["Viết test", "Cao", 88],
      ["Migration DB", "Cao", 80],
      ["Soạn docs", "Trung bình", 70],
      ["Thiết kế UI", "Không dùng", 12],
    ],
    activity: [
      { icon: "ph-plugs", text: "tasks.claim T-405 qua MCP", when: "14 phút" },
      { icon: "ph-file-text", text: "docs.append vào PRD Listing v3 — chờ review", when: "2 giờ" },
      { icon: "ph-warning", text: "Bị chặn: docs.write vào bản đã chốt", when: "5 giờ" },
    ],
  },
  {
    id: "agent-scout",
    name: "Scout",
    handle: "agent · claude-haiku",
    kind: "agent",
    role: "Index agent",
    skills: ["Index", "Search"],
    current: "Index kho tri thức định kỳ",
    status: "Chờ",
    config: [
      ["Model", "claude-haiku-4.5"],
      ["MCP server", "meridian-docs"],
      ["Embedding", "text-embedding-3-large"],
      ["Quyền ghi docs", "Chỉ đọc"],
      ["Token tuần này", "410K"],
    ],
    skillRows: [
      ["Index tài liệu", "Cao", 90],
      ["Tóm tắt", "Trung bình", 64],
    ],
    activity: [
      { icon: "ph-magnifying-glass", text: 'docs.search "listing_attributes"', when: "9 phút" },
      { icon: "ph-arrows-clockwise", text: "Index lại 12 tài liệu", when: "18 phút" },
    ],
  },
  {
    id: "nam",
    name: "Nguyễn Nam",
    handle: "@nam",
    kind: "human",
    role: "Backend lead",
    skills: ["Go", "Postgres", "Infra"],
    current: "T-399 Rate limit cho MCP server",
    status: "Đang làm",
    skillRows: [
      ["Go", "Cao", 90],
      ["Postgres", "Cao", 84],
      ["Infra / K8s", "Trung bình", 62],
      ["Frontend", "Cơ bản", 28],
    ],
    activity: [
      { icon: "ph-git-pull-request", text: "Mở PR #482 — rate limit middleware", when: "1 giờ" },
      { icon: "ph-chat-circle", text: "Bình luận trên T-405 về schema test", when: "3 giờ" },
    ],
  },
  {
    id: "linh",
    name: "Trần Mỹ Linh",
    handle: "@linh",
    kind: "human",
    role: "Frontend",
    skills: ["React", "CSS", "A11y"],
    current: "T-401 Form đăng tin bước 1–2",
    status: "Đang làm",
    skillRows: [
      ["React", "Cao", 92],
      ["CSS / layout", "Cao", 88],
      ["Accessibility", "Trung bình", 66],
      ["Testing", "Trung bình", 54],
    ],
    activity: [
      { icon: "ph-git-commit", text: "6 commit trên nhánh feat/listing-step2", when: "20 phút" },
      { icon: "ph-check-circle", text: "Đóng T-390 Trang chi tiết tin", when: "2 ngày" },
    ],
  },
  {
    id: "hieu",
    name: "Trung Hiếu",
    handle: "@hieu",
    kind: "human",
    role: "Tech lead",
    skills: ["Product", "Review", "Kiến trúc"],
    current: "Review T-396, T-399 và revision docs",
    status: "Đang review",
    skillRows: [
      ["Kiến trúc", "Cao", 86],
      ["Product", "Cao", 80],
      ["Code review", "Cao", 84],
      ["Frontend", "Trung bình", 58],
    ],
    activity: [
      { icon: "ph-seal-check", text: "Duyệt revision docs của Atlas", when: "30 phút" },
      { icon: "ph-user-gear", text: "Giới hạn quyền ghi của Scout về chỉ đọc", when: "Hôm qua" },
    ],
  },
];

const ALLOC: Record<string, string[]> = {
  "agent-bao": ["rv-web", "rv-app", "crm"],
  "agent-vega": ["rv-web", "rv-app"],
  "agent-atlas": ["rv-web", "rv-app", "crm"],
  "agent-scout": ["rv-web", "rv-app", "crm"],
  nam: ["rv-web", "crm"],
  linh: ["rv-web", "rv-app"],
  hieu: ["rv-web", "rv-app", "crm"],
};

export async function getTeam(): Promise<Member[]> {
  return TEAM;
}

export async function getTeamByProject(projectId: string): Promise<Member[]> {
  return TEAM.filter((m) => (ALLOC[m.id] ?? []).includes(projectId));
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  return TEAM.find((m) => m.id === id);
}

/** Fixed pipeline roles shown in the sidebar, resolved against the team roster. */
export async function getPipelineAgents(): Promise<{ stage: string; agent: Member }[]> {
  const stageByAgentId: Record<string, string> = {
    "agent-bao": "BA",
    "agent-vega": "TA",
    "agent-atlas": "Dev",
    "agent-scout": "Index",
  };
  return TEAM.filter((m) => m.id in stageByAgentId).map((agent) => ({
    stage: stageByAgentId[agent.id],
    agent,
  }));
}
