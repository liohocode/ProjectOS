import { cache } from "react";
import type { AgentTokenInfo, Member, MemberActivityEntry, MemberOption, Page } from "@/lib/types";
import { toPage } from "./paging";
import { agentConfigRows, DEFAULT_AGENT_CONFIG, type AgentConfigValues } from "@/lib/agentConfig";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";
import { MEMBER_STATUS_LABEL } from "@/lib/memberFormat";

const memberInclude = {
  agentConfig: true,
  skillRows: { orderBy: { sortOrder: "asc" } },
  // Panel "Hoạt động gần đây" — action ghi thêm liên tục (F11.7) nên chỉ lấy các dòng mới nhất.
  activity: { orderBy: { at: "desc" }, take: 10 },
} as const;

type MemberRow = Awaited<ReturnType<typeof prisma.member.findFirstOrThrow<{ include: typeof memberInclude }>>>;

/** Tên mọi thành viên theo id — để hiện "Được phép giao task: Cho Atlas, Scout". */
const getMemberNames = cache(async (): Promise<Map<string, string>> => {
  const rows = await prisma.member.findMany({ select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, r.name]));
});

function configOf(row: MemberRow): AgentConfigValues | undefined {
  const c = row.agentConfig;
  if (!c) return row.kind === "agent" ? { ...DEFAULT_AGENT_CONFIG } : undefined;
  return {
    model: c.model,
    mcpServers: c.mcpServers,
    docsWritePermission: c.docsWritePermission,
    maxConcurrentTasks: c.maxConcurrentTasks,
    canProposeFeatures: c.canProposeFeatures,
    canAssignTo: c.canAssignTo,
    extra: (c.extra as [string, string][] | null) ?? [],
  };
}

function toMember(row: MemberRow, names: Map<string, string>): Member {
  const agentConfig = configOf(row);
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    kind: row.kind,
    role: row.role,
    email: row.email,
    isTechLead: row.isTechLead,
    skills: row.skills,
    current: row.current,
    status: MEMBER_STATUS_LABEL[row.status],
    skillRows: row.skillRows.map((s) => [s.label, s.level, s.percent]),
    activity: row.activity.map((a) => ({ icon: a.icon, text: a.text, when: formatRelativeVi(a.at) })),
    ...(agentConfig && { agentConfig, config: agentConfigRows(agentConfig, (id) => names.get(id)) }),
  };
}

async function toMembers(rows: MemberRow[]): Promise<Member[]> {
  const names = await getMemberNames();
  return rows.map((row) => toMember(row, names));
}

export const getTeam = cache(async (): Promise<Member[]> => {
  const rows = await prisma.member.findMany({ include: memberInclude, orderBy: { id: "asc" } });
  return toMembers(rows);
});

export const getTeamByProject = cache(async (projectId: string): Promise<Member[]> => {
  const rows = await prisma.member.findMany({
    where: { projects: { some: { projectId } } },
    include: memberInclude,
    orderBy: { id: "asc" },
  });
  return toMembers(rows);
});

/** Số thành viên dự án cho badge sidebar — cùng tập với getTeamByProject, không tải hồ sơ. */
export const getMemberCountByProject = cache(async (projectId: string): Promise<number> => {
  return prisma.projectMember.count({ where: { projectId } });
});

/** Member người (human) có email đăng nhập này — null nếu không có (người lạ, hoặc email của agent). So khớp không phân biệt hoa thường. */
export const getLoginMemberIdByEmail = cache(async (email: string): Promise<string | null> => {
  const row = await prisma.member.findFirst({
    where: { kind: "human", email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  return row?.id ?? null;
});

/** Người + agent của dự án (chỉ id, tên, kind) cho panel "Lọc" màn work (F14.3). */
export const getMemberOptionsByProject = cache(async (projectId: string): Promise<MemberOption[]> => {
  return prisma.member.findMany({
    where: { projects: { some: { projectId } } },
    select: { id: true, name: true, kind: true },
    orderBy: { name: "asc" },
  });
});

/** Mọi agent (id, tên) cho panel "Lọc" màn MCP — phiên/nhật ký MCP là của toàn tổ chức. */
export const getAgentOptions = cache(async (): Promise<MemberOption[]> => {
  return prisma.member.findMany({ where: { kind: "agent" }, select: { id: true, name: true, kind: true }, orderBy: { name: "asc" } });
});

export const getMemberById = cache(async (id: string): Promise<Member | undefined> => {
  const row = await prisma.member.findUnique({ where: { id }, include: memberInclude });
  return row ? toMember(row, await getMemberNames()) : undefined;
});

const PIPELINE_STAGE_BY_AGENT_ID: Record<string, string> = {
  "agent-bao": "BA",
  "agent-vega": "TA",
  "agent-atlas": "Dev",
  "agent-scout": "Index",
};

export const getPipelineAgents = cache(async (): Promise<{ stage: string; agent: Member }[]> => {
  const order = Object.keys(PIPELINE_STAGE_BY_AGENT_ID);
  const rows = await prisma.member.findMany({
    where: { id: { in: order } },
    include: memberInclude,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const names = await getMemberNames();
  return order.flatMap((id) => {
    const row = byId.get(id);
    return row ? [{ stage: PIPELINE_STAGE_BY_AGENT_ID[id], agent: toMember(row, names) }] : [];
  });
});

export const MEMBER_ACTIVITY_PAGE_SIZE = 20;

/** Toàn bộ hoạt động của một thành viên, mới nhất trước, từng trang (dialog "Xem log", F13.4). */
export const getMemberActivityPage = cache(
  async (memberId: string, cursor: string | null, limit: number = MEMBER_ACTIVITY_PAGE_SIZE): Promise<Page<MemberActivityEntry>> => {
    const rows = await prisma.memberActivity.findMany({
      where: { memberId },
      orderBy: [{ at: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    return toPage(rows, limit, (a) => ({ id: a.id, icon: a.icon, text: a.text, when: formatRelativeVi(a.at) }));
  },
);

/** Token MCP của agent (F15.5), còn hiệu lực trước, mới tạo trước. */
export const getAgentTokens = cache(async (memberId: string): Promise<AgentTokenInfo[]> => {
  const rows = await prisma.agentToken.findMany({
    where: { memberId },
    orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    select: { id: true, name: true, lastFour: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    lastFour: t.lastFour,
    created: formatRelativeVi(t.createdAt),
    lastUsed: t.lastUsedAt ? formatRelativeVi(t.lastUsedAt) : null,
    revoked: t.revokedAt !== null,
  }));
});
