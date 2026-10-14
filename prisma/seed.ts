import "dotenv/config";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Nguồn dữ liệu seed: bản sao mock GỐC (chụp từ git HEAD trước khi lib/data/*
// được đổi sang Prisma) — cố tình tách khỏi lib/data/* để seed không phụ
// thuộc vòng vào chính DB mà nó đang tạo ra. Xem README trong thư mục này.
import { getProjects } from "./seed-data/projects";
import { getTeam, getTeamByProject } from "./seed-data/team";
import { getFeaturesByProject } from "./seed-data/features";
import { getDocGroupsByProject, getDocBody } from "./seed-data/docs";
import { getMcpServers, getMcpSessions, getMcpLog } from "./seed-data/mcp";
import { TIMELINE_BY_PROJECT } from "./seed-data/timeline";
import type { SeedMember as Member } from "./seed-data/types";
import { parseSprintLabel } from "../lib/sprint";
import { parseDue, parseEstimate, parseRunning, parseTaskStatus } from "../lib/taskFormat";
import { weeksToDates } from "../lib/timeline";
import { parseTokens } from "../lib/mcpFormat";
import { parseMemberStatus } from "../lib/memberFormat";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** "Atlas (AI agent)" / "Nguyễn Nam" / "Linh" → member id thật, khớp theo tên. */
function resolveMemberId(members: Member[], text: string): string {
  const exact = members.find((m) => m.name === text);
  if (exact) return exact.id;
  const prefix = members.find((m) => text.startsWith(m.name));
  if (prefix) return prefix.id;
  const nickname = members.find((m) => m.name.includes(text));
  if (nickname) return nickname.id;
  throw new Error(`Không tìm thấy member khớp với "${text}"`);
}

/** "18 phút trước" / "2 ngày" / "Hôm qua" / "tuần trước" → Date xấp xỉ, chỉ dùng cho seed. */
function parseRelativeVietnamese(text: string): Date {
  const now = Date.now();
  const match = /(\d+)\s*(giây|phút|giờ|ngày|tuần)/i.exec(text);
  if (match) {
    const n = Number(match[1]);
    const unitMs: Record<string, number> = {
      giây: 1000,
      phút: 60_000,
      giờ: 3_600_000,
      ngày: 86_400_000,
      tuần: 604_800_000,
    };
    return new Date(now - n * unitMs[match[2].toLowerCase()]);
  }
  if (/hôm qua/i.test(text)) return new Date(now - 86_400_000);
  return new Date(now);
}

function parseChunkCount(indexed: string): number | null {
  const match = /(\d+)\s*chunk/.exec(indexed);
  return match ? Number(match[1]) : null;
}

// lib/types dùng chuỗi tiếng Việt hiển thị; Prisma enum (do @map diacritics
// không hợp lệ làm tên identifier) dùng tên ASCII — map qua lại ở biên seed.
const SESSION_RESULT_MAP = {
  Xong: "Xong",
  "Đang chạy": "DangChay",
  "Chờ review": "ChoReview",
  "Bị chặn": "BiChan",
} as const;

const COMMAND_RESULT_MAP = {
  OK: "OK",
  "Chờ review": "ChoReview",
  "Bị chặn": "BiChan",
} as const;

async function clearAll() {
  // Xoá theo thứ tự con → cha để không vướng FK. Script seed idempotent —
  // chạy lại an toàn khi đang phát triển (DB dev, chưa có dữ liệu người dùng thật).
  await prisma.mcpLogEntry.deleteMany();
  await prisma.mcpSession.deleteMany();
  await prisma.docRevision.deleteMany();
  await prisma.doc.deleteMany();
  await prisma.task.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.updateMany({ data: { currentSprintId: null } });
  await prisma.sprint.deleteMany();
  await prisma.memberActivity.deleteMany();
  await prisma.memberSkillRow.deleteMany();
  await prisma.mcpServer.deleteMany();
  await prisma.member.deleteMany();
  await prisma.project.deleteMany();
}

async function main() {
  await clearAll();

  const members = await getTeam();
  const projects = await getProjects();

  console.log(`Seeding ${members.length} members...`);
  for (const m of members) {
    await prisma.member.create({
      data: {
        id: m.id,
        name: m.name,
        handle: m.handle,
        kind: m.kind,
        role: m.role,
        skills: m.skills,
        current: m.current,
        status: parseMemberStatus(m.status),
        config: (m.config as unknown as Prisma.InputJsonValue) ?? undefined,
        skillRows: {
          create: m.skillRows.map(([label, level, percent], sortOrder) => ({ label, level, percent, sortOrder })),
        },
        activity: {
          create: m.activity.map((a) => ({ icon: a.icon, text: a.text, at: parseRelativeVietnamese(a.when) })),
        },
      },
    });
  }

  console.log(`Seeding ${projects.length} projects...`);
  const sprintStartByProject = new Map<string, Date>();
  for (const p of projects) {
    // Dữ liệu mẫu gốc lưu sprint dạng nhãn hiển thị, không có năm — gán năm 2026 (năm của dữ liệu mẫu).
    // Sprint cần project tồn tại trước, project lại trỏ ngược về sprint hiện tại → 3 bước.
    const { sprint, ...project } = p;
    await prisma.project.create({ data: project });
    const created = await prisma.sprint.create({ data: { ...parseSprintLabel(sprint, 2026), projectId: p.id } });
    await prisma.project.update({ where: { id: p.id }, data: { currentSprintId: created.id } });
    sprintStartByProject.set(p.id, created.startDate);
  }

  console.log("Seeding project members (alloc)...");
  for (const p of projects) {
    const projectTeam = await getTeamByProject(p.id);
    await prisma.projectMember.createMany({
      data: projectTeam.map((m) => ({ projectId: p.id, memberId: m.id })),
    });
  }

  console.log("Seeding features + tasks...");
  const featureIdsByProject = new Map<string, string[]>();
  for (const p of projects) {
    const features = await getFeaturesByProject(p.id);
    featureIdsByProject.set(p.id, features.map((f) => f.id));
    for (const f of features) {
      await prisma.feature.create({
        data: {
          id: f.id,
          projectId: p.id,
          name: f.name,
          stage: f.stage,
          ownerId: resolveMemberId(members, f.owner),
          pct: f.pct,
          tasks: {
            create: f.tasks.map((t) => ({
              id: t.id,
              stage: t.stage,
              title: t.title,
              assigneeId: resolveMemberId(members, t.who),
              status: parseTaskStatus(t.status),
              estimatePoints: parseEstimate(t.est),
              dueDate: parseDue(t.due, 2026),
              blocked: t.blocked,
              blockedFull: t.blockedFull,
              runningSince: t.running ? parseRunning(t.running, new Date()) : null,
            })),
          },
        },
      });
    }
  }

  console.log("Seeding timeline (kế hoạch feature + feature chưa giao)...");
  for (const p of projects) {
    const sprintStart = sprintStartByProject.get(p.id)!;
    for (const row of TIMELINE_BY_PROJECT[p.id] ?? []) {
      const dates = weeksToDates(row.start, row.len, sprintStart);
      if (row.featureId) {
        await prisma.feature.update({ where: { id: row.featureId }, data: dates });
      } else {
        // "FEAT-126 Docs index nâng cấp" → id + tên; chưa giao, chưa có task.
        const [, id, name] = /^(\S+)\s+(.+)$/.exec(row.name)!;
        await prisma.feature.create({ data: { id, projectId: p.id, name, stage: "BA", pct: 0, ownerId: null, ...dates } });
      }
    }
  }

  console.log("Seeding docs + revisions...");
  for (const p of projects) {
    const groups = await getDocGroupsByProject(p.id);
    const featureIds = featureIdsByProject.get(p.id) ?? [];
    for (const group of groups) {
      const featureId = featureIds.find((id) => group.name.startsWith(id)) ?? null;
      for (const item of group.items) {
        const body = await getDocBody(item.id);
        await prisma.doc.create({
          data: {
            id: item.id,
            projectId: p.id,
            featureId,
            title: body.title,
            agentWritten: item.agent,
            version: body.version,
            status: body.status,
            summary: body.summary,
            updatedAt: parseRelativeVietnamese(body.updated),
            authorId: resolveMemberId(members, body.author),
            indexedAt: body.indexed.startsWith("Đã index") ? parseRelativeVietnamese(body.indexed) : null,
            chunkCount: parseChunkCount(body.indexed),
            readBy: body.readBy.includes(", ") ? body.readBy.split(", ") : [body.readBy],
            sections: body.sections as unknown as Prisma.InputJsonValue,
            revisions: {
              create: body.history.map((h) => ({
                authorId: resolveMemberId(members, h.who),
                what: h.what,
                createdAt: parseRelativeVietnamese(h.when),
                pending: h.pending ?? false,
              })),
            },
          },
        });
      }
    }
  }

  console.log("Seeding MCP servers/sessions/log...");
  const servers = await getMcpServers();
  for (const s of servers) {
    await prisma.mcpServer.create({
      data: {
        id: s.id,
        name: s.name,
        status: s.status,
        url: s.url,
        tools: s.tools,
        clients: s.clients,
        commandsPerDay: s.commandsPerDay,
        lastCommandAt: parseRelativeVietnamese(s.lastCommandAgo),
      },
    });
  }

  const sessions = await getMcpSessions();
  const seedNow = Date.now();
  for (const s of sessions) {
    // Dữ liệu gốc chỉ có thời lượng: phiên đang chạy bắt đầu cách đây durationMin phút và
    // chưa kết thúc; phiên đã xong coi như vừa kết thúc.
    const running = s.result === "Đang chạy";
    const endedAt = running ? null : new Date(seedNow);
    const startedAt = new Date(seedNow - s.durationMin * 60_000);
    await prisma.mcpSession.create({
      data: {
        id: s.id,
        agentId: resolveMemberId(members, s.agent),
        projectId: s.projectId,
        taskId: s.taskId,
        startedAt,
        endedAt,
        toolCalls: s.toolCalls,
        tokensUsed: parseTokens(s.tokens),
        result: SESSION_RESULT_MAP[s.result],
      },
    });
  }

  const log = await getMcpLog();
  for (const entry of log) {
    await prisma.mcpLogEntry.create({
      data: {
        at: new Date(`${new Date().toDateString()} ${entry.at}`),
        agentId: resolveMemberId(members, entry.agent),
        tool: entry.tool,
        target: entry.target,
        result: COMMAND_RESULT_MAP[entry.result],
      },
    });
  }

  console.log("Seed xong.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
