import { prisma } from "@/lib/prisma";
import { comparePhaseCodes, type PlanDoc, type PlanFeature, type PlanTask } from "@/lib/planImport";
import type { Prisma } from "@/lib/generated/prisma/client";
import { markdownToSections } from "@/lib/markdownSections";
import { parseTaskStatus } from "@/lib/taskFormat";

// Ghi kế hoạch đã parse (lib/planImport.ts) vào một dự án (F28.2). Chạy lại nhiều lần không nhân đôi:
// phase khớp theo (dự án, code), feature theo id = mã kế hoạch ("F21"), task theo (dự án, code "F21.3").
// Mỗi lần chạy ghi đè nội dung từ `.md` (tiêu đề, stage, mô tả, tiêu chí, phụ thuộc) — `.md` là nguồn tới khi chuyển
// nguồn sự thật sang DB (F28.5); sau đó không chạy lại nữa.

export interface ImportOptions {
  projectId: string;
  /** Tạo dự án nếu chưa có */
  project?: { code: string; name: string; desc: string };
  /** Người / agent nhận task mới (bắt buộc là thành viên dự án — tự thêm nếu chưa) */
  assigneeId: string;
  /** Tên phase lấy từ ROADMAP ("7b" → "Kế hoạch …") */
  phaseNames?: Map<string, string>;
  dryRun?: boolean;
}

export interface ImportSummary {
  phases: number;
  featuresCreated: number;
  featuresUpdated: number;
  tasksCreated: number;
  tasksUpdated: number;
  criteria: number;
  featureDeps: number;
  taskDeps: number;
  /** Phụ thuộc trỏ tới mã không có trong kế hoạch — bỏ qua */
  missingRefs: string[];
}

class DryRun extends Error {}

export async function importPlan(features: PlanFeature[], opts: ImportOptions): Promise<ImportSummary> {
  const summary: ImportSummary = { phases: 0, featuresCreated: 0, featuresUpdated: 0, tasksCreated: 0, tasksUpdated: 0, criteria: 0, featureDeps: 0, taskDeps: 0, missingRefs: [] };
  try {
    await prisma.$transaction(
      async (tx) => {
        const project = await tx.project.findUnique({ where: { id: opts.projectId } });
        if (!project) {
          if (!opts.project) throw new Error(`Dự án ${opts.projectId} chưa có — truyền thông tin dự án để tạo`);
          await tx.project.create({ data: { id: opts.projectId, ...opts.project, status: "Đang chạy" } });
        }
        await tx.projectMember.upsert({
          where: { projectId_memberId: { projectId: opts.projectId, memberId: opts.assigneeId } },
          create: { projectId: opts.projectId, memberId: opts.assigneeId },
          update: {},
        });

        // Phase.
        const codes = [...new Set(features.map((f) => f.phase).filter((p): p is string => p !== null))].sort(comparePhaseCodes);
        const phaseIds = new Map<string, string>();
        for (const [i, code] of codes.entries()) {
          const name = opts.phaseNames?.get(code) ?? `Phase ${code}`;
          const phase = await tx.projectPhase.upsert({
            where: { projectId_code: { projectId: opts.projectId, code } },
            create: { projectId: opts.projectId, code, name, position: i + 1 },
            update: { name, position: i + 1 },
          });
          phaseIds.set(code, phase.id);
        }
        summary.phases = codes.length;

        // Feature.
        const featureCodes = new Set(features.map((f) => f.code));
        for (const [i, f] of features.entries()) {
          const existing = await tx.feature.findUnique({ where: { id: f.code }, select: { projectId: true } });
          if (existing && existing.projectId !== opts.projectId) throw new Error(`Feature ${f.code} đã thuộc dự án ${existing.projectId}`);
          const data = { name: f.name, stage: f.stage, goal: f.goal, scope: f.scope, notes: f.notes, phaseId: f.phase ? phaseIds.get(f.phase)! : null, position: i + 1 };
          await tx.feature.upsert({ where: { id: f.code }, create: { id: f.code, projectId: opts.projectId, pct: 0, ...data }, update: data });
          summary[existing ? "featuresUpdated" : "featuresCreated"]++;
        }
        await tx.featureDependency.deleteMany({ where: { feature: { projectId: opts.projectId } } });
        const featureDeps = features.flatMap((f) =>
          f.dependsOn.flatMap((dep) => {
            if (featureCodes.has(dep)) return [{ featureId: f.code, dependsOnId: dep }];
            summary.missingRefs.push(`${f.code} → ${dep}`);
            return [];
          }),
        );
        if (featureDeps.length) await tx.featureDependency.createMany({ data: featureDeps });
        summary.featureDeps = featureDeps.length;

        // Task.
        const existingTasks = await tx.task.findMany({ where: { feature: { projectId: opts.projectId }, code: { not: null } }, select: { id: true, code: true } });
        const taskIds = new Map(existingTasks.map((t) => [t.code!, t.id]));
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('meridian:task-id'))`;
        const [{ max }] = await tx.$queryRaw<{ max: number }[]>`
          SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0) AS max FROM tasks WHERE id ~ '^T-[0-9]+$'`;
        let next = max;
        // Gom lệnh theo lô: DB production ở xa runner CI (mỗi lệnh ~200 ms) — tránh hàng nghìn lệnh tuần tự trong transaction.
        const now = new Date();
        const creates: Prisma.TaskCreateManyInput[] = [];
        const rows: { taskId: string; t: PlanTask; blocked: string | null; blockedFull: string | null }[] = [];
        for (const f of features) {
          for (const [i, t] of f.tasks.entries()) {
            const data = {
              featureId: f.code,
              title: t.title,
              stage: t.stage,
              status: parseTaskStatus(t.status),
              size: t.size,
              description: t.description,
              needsDecision: t.needsDecision,
              // Task đã chuyển / thay bằng task khác: lưu trữ (F21.4), lý do giữ trong blockedFull để xem lại.
              blocked: t.blocked && !t.superseded ? shortReason(t.blocked) : null,
              blockedFull: t.blocked,
              archivedAt: t.superseded ? now : null,
              position: i + 1,
            };
            let taskId = taskIds.get(t.code);
            if (taskId) {
              await tx.task.update({ where: { id: taskId }, data });
              summary.tasksUpdated++;
            } else {
              taskId = `T-${++next}`;
              creates.push({ id: taskId, code: t.code, assigneeId: opts.assigneeId, ...data });
              taskIds.set(t.code, taskId);
              summary.tasksCreated++;
            }
            rows.push({ taskId, t, blocked: data.blocked, blockedFull: data.blockedFull });
          }
        }
        if (creates.length) {
          await tx.task.createMany({ data: creates });
          await tx.taskTransition.createMany({
            data: creates.map((c) => ({ taskId: c.id, actorId: opts.assigneeId, via: "web" as const, toStage: c.stage, toStatus: c.status })),
          });
        }
        const imported = rows.map((r) => r.taskId);

        // F22.7: lịch sử block khớp trạng thái block từ `.md` — mở dòng cho task mới bị block, đóng dòng của task hết block.
        const open = await tx.taskBlock.findMany({ where: { taskId: { in: imported }, unblockedAt: null }, select: { id: true, taskId: true, reason: true } });
        const openByTask = new Map(open.map((b) => [b.taskId, b]));
        const toOpen = rows.filter((r) => r.blocked && !openByTask.has(r.taskId));
        if (toOpen.length) await tx.taskBlock.createMany({ data: toOpen.map((r) => ({ taskId: r.taskId, reason: r.blocked!, blockedAt: now })) });
        const toClose = rows.filter((r) => !r.blocked && openByTask.has(r.taskId)).map((r) => openByTask.get(r.taskId)!.id);
        if (toClose.length) await tx.taskBlock.updateMany({ where: { id: { in: toClose } }, data: { unblockedAt: now } });

        // Tiêu chí: thay toàn bộ.
        await tx.taskCriterion.deleteMany({ where: { taskId: { in: imported } } });
        const criteria = rows.flatMap((r) =>
          r.t.criteria.map((c, j) => ({ taskId: r.taskId, text: c.text, position: j + 1, ...(c.done && { doneAt: now, doneById: opts.assigneeId }) })),
        );
        if (criteria.length) await tx.taskCriterion.createMany({ data: criteria });
        summary.criteria = criteria.length;

        // Phụ thuộc task.
        await tx.taskDependency.deleteMany({ where: { taskId: { in: imported } } });
        const deps: { taskId: string; dependsOnId: string }[] = [];
        for (const r of rows) {
          for (const dep of r.t.dependsOn) {
            const depId = taskIds.get(dep);
            if (!depId || dep === r.t.code) {
              summary.missingRefs.push(`${r.t.code} → ${dep}`);
              continue;
            }
            deps.push({ taskId: r.taskId, dependsOnId: depId });
          }
        }
        if (deps.length) await tx.taskDependency.createMany({ data: deps, skipDuplicates: true });
        summary.taskDeps = deps.length;
        if (opts.dryRun) throw new DryRun();
      },
      // Lần đầu ~vài chục lệnh; chạy lại cập nhật từng task (~170 lệnh) — đủ rộng cho DB ở xa.
      { timeout: 600_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  return summary;
}

/** Lý do ngắn (≤ 40 ký tự, hiện ở hàng task): bỏ ngày / ngoặc, cắt ở dấu "—". */
function shortReason(text: string): string {
  const head = text.replace(/\([^)]*\)/g, "").split("—")[0].trim();
  const short = head.length >= 4 ? head : text;
  return short.length > 40 ? `${short.slice(0, 39)}…` : short;
}

/**
 * Import tài liệu kỹ thuật (F28.3) vào dự án — Doc id = slug ("meridian-architecture-decisions"); chạy lại thì ghi đè
 * tiêu đề / tóm tắt / nội dung từ `.md` (`.md` là nguồn tới F28.6). Trả số tài liệu tạo mới / cập nhật.
 */
export async function importDocs(projectId: string, docs: PlanDoc[], authorId: string, dryRun = false): Promise<{ created: number; updated: number }> {
  const result = { created: 0, updated: 0 };
  // Dry-run lần đầu: importPlan đã rollback nên dự án chưa có — chỉ đếm, không ghi (ghi sẽ vi phạm khoá ngoại).
  if (dryRun && !(await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }))) {
    return { created: docs.length, updated: 0 };
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const d of docs) {
          const existing = await tx.doc.findUnique({ where: { id: d.slug }, select: { projectId: true } });
          if (existing && existing.projectId !== projectId) throw new Error(`Tài liệu ${d.slug} đã thuộc dự án ${existing.projectId}`);
          const data = { title: d.title, summary: d.summary, sections: markdownToSections(d.body) as never, updatedAt: new Date() };
          await tx.doc.upsert({
            where: { id: d.slug },
            create: { id: d.slug, projectId, authorId, version: "v1.0", status: "Đang dùng", readBy: [], ...data },
            update: data,
          });
          result[existing ? "updated" : "created"]++;
        }
        if (dryRun) throw new DryRun();
      },
      { timeout: 300_000, maxWait: 10_000 },
    );
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  return result;
}
