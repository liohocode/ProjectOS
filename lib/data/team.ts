import type { Member } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { formatRelativeVi } from "@/lib/relativeTime";

const memberInclude = {
  skillRows: { orderBy: { sortOrder: "asc" } },
  activity: { orderBy: { at: "desc" } },
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
    status: row.status,
    skillRows: row.skillRows.map((s) => [s.label, s.level, s.percent]),
    activity: row.activity.map((a) => ({ icon: a.icon, text: a.text, when: formatRelativeVi(a.at) })),
    config: (row.config as [string, string][] | null) ?? undefined,
  };
}

export async function getTeam(): Promise<Member[]> {
  const rows = await prisma.member.findMany({ include: memberInclude, orderBy: { id: "asc" } });
  return rows.map(toMember);
}

export async function getTeamByProject(projectId: string): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    where: { projects: { some: { projectId } } },
    include: memberInclude,
    orderBy: { id: "asc" },
  });
  return rows.map(toMember);
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  const row = await prisma.member.findUnique({ where: { id }, include: memberInclude });
  return row ? toMember(row) : undefined;
}

const PIPELINE_STAGE_BY_AGENT_ID: Record<string, string> = {
  "agent-bao": "BA",
  "agent-vega": "TA",
  "agent-atlas": "Dev",
  "agent-scout": "Index",
};

export async function getPipelineAgents(): Promise<{ stage: string; agent: Member }[]> {
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
}
