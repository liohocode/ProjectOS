import type { PrismaClient } from "../../lib/generated/prisma/client";

// F17.1 — sự kiện ban đầu cho activity rail, dựng từ trạng thái task / revision vừa seed.
// CÙNG câu SQL với phần chuyển dữ liệu của migration `activity_events` (production chạy migration, dev/test chạy seed) —
// sửa một bên thì sửa cả bên kia.
const STATEMENTS = [
  `INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "taskId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, f."projectId", t."assigneeId", 'task', t.id, f.id, t.title, 'tasks.claim', 'run', t."runningSince"
FROM "tasks" t JOIN "features" f ON f.id = t."featureId"
WHERE t."runningSince" IS NOT NULL`,
  `INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "taskId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, f."projectId", t."assigneeId", 'task', t.id, f.id,
       t.id || ' bị block: ' || COALESCE(t."blockedFull", t."blocked"), NULL, 'block', NOW() - INTERVAL '1 hour'
FROM "tasks" t JOIN "features" f ON f.id = t."featureId"
WHERE t."blocked" IS NOT NULL AND t."stage" <> 'Done'`,
  `INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "taskId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, f."projectId", t."assigneeId", 'task', t.id, f.id, t.title || ' — chờ review', 'tasks.update_status', 'review', NOW() - INTERVAL '2 hours'
FROM "tasks" t JOIN "features" f ON f.id = t."featureId"
WHERE t."status" = 'Chờ review'`,
  `INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "docId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, d."projectId", r."authorId", 'doc', d.id, d."featureId", r.what || ' — ' || d.title,
       CASE WHEN m.kind = 'agent' THEN 'docs.append' END, 'review', r."createdAt"
FROM "doc_revisions" r JOIN "docs" d ON d.id = r."docId" JOIN "members" m ON m.id = r."authorId"
WHERE r."status" = 'pending'`,
]

export async function seedActivityEvents(prisma: Pick<PrismaClient, "$executeRawUnsafe">): Promise<void> {
  for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
}
