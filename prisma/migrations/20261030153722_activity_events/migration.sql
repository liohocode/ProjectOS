-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('task', 'doc', 'feature', 'mcp');

-- CreateEnum
CREATE TYPE "ActivityTone" AS ENUM ('run', 'ok', 'review', 'block');

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "taskId" TEXT,
    "docId" TEXT,
    "featureId" TEXT,
    "text" TEXT NOT NULL,
    "tool" TEXT,
    "tone" "ActivityTone" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_projectId_at_idx" ON "activity_events"("projectId", "at" DESC);

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- F17.1: chuyển dữ liệu — dựng sự kiện ban đầu từ trạng thái hiện có (trước đây activity rail suy ra từ đây),
-- để rail của dự án đang chạy không trống sau khi chuyển sang đọc bảng sự kiện.
INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "taskId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, f."projectId", t."assigneeId", 'task', t.id, f.id, t.title, 'tasks.claim', 'run', t."runningSince"
FROM "tasks" t JOIN "features" f ON f.id = t."featureId"
WHERE t."runningSince" IS NOT NULL;

INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "taskId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, f."projectId", t."assigneeId", 'task', t.id, f.id,
       t.id || ' bị block: ' || COALESCE(t."blockedFull", t."blocked"), NULL, 'block', NOW() - INTERVAL '1 hour'
FROM "tasks" t JOIN "features" f ON f.id = t."featureId"
WHERE t."blocked" IS NOT NULL AND t."stage" <> 'Done';

INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "taskId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, f."projectId", t."assigneeId", 'task', t.id, f.id, t.title || ' — chờ review', 'tasks.update_status', 'review', NOW() - INTERVAL '2 hours'
FROM "tasks" t JOIN "features" f ON f.id = t."featureId"
WHERE t."status" = 'Chờ review';

INSERT INTO "activity_events" ("id", "projectId", "actorId", "type", "docId", "featureId", "text", "tool", "tone", "at")
SELECT gen_random_uuid()::text, d."projectId", r."authorId", 'doc', d.id, d."featureId", r.what || ' — ' || d.title,
       CASE WHEN m.kind = 'agent' THEN 'docs.append' END, 'review', r."createdAt"
FROM "doc_revisions" r JOIN "docs" d ON d.id = r."docId" JOIN "members" m ON m.id = r."authorId"
WHERE r."status" = 'pending';
