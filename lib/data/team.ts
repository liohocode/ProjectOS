import { cache } from "react";
import type { Member, MemberActivityEntry, MemberOption, Page } from "@/lib/types";
import { toPage } from "./paging";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";
import { MEMBER_STATUS_LABEL } from "@/lib/memberFormat";

const memberInclude = {
  skillRows: { orderBy: { sortOrder: "asc" } },
  // Panel "Hoạt động gần đây" — action ghi thêm liên tục (F11.7) nên chỉ lấy các dòng mới nhất.
  activity: { orderBy: { at: "desc" }, take: 10 },
} as const;

type MemberRow = Awaited<ReturnType<typeof prisma.member.findFirstOrThrow<{ include: typeof memberInclude }>>>;

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    kind: row.kind,
    role: row.role,
    skills: row.skills,
    current: row.current,
    status: MEMBER_STATUS_LABEL[row.status],
    skillRows: row.skillRows.map((s) => [s.label, s.level, s.percent]),
    activity: row.activity.map((a) => ({ icon: a.icon, text: a.text, when: formatRelativeVi(a.at) })),
    config: (row.config as [string, string][] | null) ?? undefined,
  };
}

export const getTeam = cache(async (): Promise<Member[]> => {
  const rows = await prisma.member.findMany({ include: memberInclude, orderBy: { id: "asc" } });
  return rows.map(toMember);
});

export const getTeamByProject = cache(async (projectId: string): Promise<Member[]> => {
  const rows = await prisma.member.findMany({
    where: { projects: { some: { projectId } } },
    include: memberInclude,
    orderBy: { id: "asc" },
  });
  return rows.map(toMember);
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
  return row ? toMember(row) : undefined;
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
  return order.flatMap((id) => {
    const row = byId.get(id);
    return row ? [{ stage: PIPELINE_STAGE_BY_AGENT_ID[id], agent: toMember(row) }] : [];
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
