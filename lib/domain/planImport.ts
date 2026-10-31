import { prisma } from "@/lib/prisma";
import { comparePhaseCodes, type PlanFeature } from "@/lib/planImport";
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
        for (const f of features) {
          for (const dep of f.dependsOn) {
            if (!featureCodes.has(dep)) {
              summary.missingRefs.push(`${f.code} → ${dep}`);
              continue;
            }
            await tx.featureDependency.create({ data: { featureId: f.code, dependsOnId: dep } });
            summary.featureDeps++;
          }
        }

        // Task.
        const existingTasks = await tx.task.findMany({ where: { feature: { projectId: opts.projectId }, code: { not: null } }, select: { id: true, code: true } });
        const taskIds = new Map(existingTasks.map((t) => [t.code!, t.id]));
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('meridian:task-id'))`;
        const [{ max }] = await tx.$queryRaw<{ max: number }[]>`
          SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0) AS max FROM tasks WHERE id ~ '^T-[0-9]+$'`;
        let next = max;
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
              archivedAt: t.superseded ? new Date() : null,
              position: i + 1,
            };
            const id = taskIds.get(t.code);
            if (id) {
              await tx.task.update({ where: { id }, data });
              summary.tasksUpdated++;
            } else {
              const newId = `T-${++next}`;
              await tx.task.create({ data: { id: newId, code: t.code, assigneeId: opts.assigneeId, ...data } });
              await tx.taskTransition.create({ data: { taskId: newId, actorId: opts.assigneeId, via: "web", toStage: t.stage, toStatus: data.status } });
              taskIds.set(t.code, newId);
              summary.tasksCreated++;
            }
            const taskId = taskIds.get(t.code)!;
            await tx.taskCriterion.deleteMany({ where: { taskId } });
            if (t.criteria.length) {
              await tx.taskCriterion.createMany({
                data: t.criteria.map((c, j) => ({ taskId, text: c.text, position: j + 1, ...(c.done && { doneAt: new Date(), doneById: opts.assigneeId }) })),
              });
              summary.criteria += t.criteria.length;
            }
          }
        }
        const imported = [...taskIds.values()];
        await tx.taskDependency.deleteMany({ where: { taskId: { in: imported } } });
        for (const f of features) {
          for (const t of f.tasks) {
            for (const dep of t.dependsOn) {
              const depId = taskIds.get(dep);
              if (!depId || dep === t.code) {
                summary.missingRefs.push(`${t.code} → ${dep}`);
                continue;
              }
              await tx.taskDependency.create({ data: { taskId: taskIds.get(t.code)!, dependsOnId: depId } });
              summary.taskDeps++;
            }
          }
        }
        if (opts.dryRun) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 10_000 },
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
