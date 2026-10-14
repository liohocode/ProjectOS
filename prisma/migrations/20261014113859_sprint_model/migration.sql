-- F09.1: thay chuỗi hiển thị Project.sprint ("Sprint 14 · 12–26/08") bằng model Sprint.
-- Chuyển dữ liệu cũ sang bảng sprints TRƯỚC khi xoá cột để không mất dữ liệu.

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "currentSprintId" TEXT;

-- Data migration: parse nhãn cũ (cùng định dạng với lib/sprint.ts → parseSprintLabel).
-- Nhãn cũ không có năm → dùng năm hiện tại; sprint có ngày kết thúc trước ngày bắt đầu thì vắt sang năm sau.
WITH parsed AS (
    SELECT p."id" AS project_id,
           m[1] AS name,
           m[2]::int AS start_day,
           COALESCE(m[3], m[5])::int AS start_month,
           m[4]::int AS end_day,
           m[5]::int AS end_month,
           EXTRACT(YEAR FROM CURRENT_DATE)::int AS yr
    FROM "projects" p,
         LATERAL regexp_match(trim(p."sprint"), '^(.+?)\s*·\s*(\d{1,2})(?:/(\d{1,2}))?\s*[–-]\s*(\d{1,2})/(\d{1,2})$') AS m
    WHERE m IS NOT NULL
)
INSERT INTO "sprints" ("id", "projectId", "name", "startDate", "endDate")
SELECT 'spr_' || project_id,
       project_id,
       trim(name),
       make_date(yr, start_month, start_day),
       CASE WHEN make_date(yr, end_month, end_day) < make_date(yr, start_month, start_day)
            THEN make_date(yr + 1, end_month, end_day)
            ELSE make_date(yr, end_month, end_day) END
FROM parsed;

UPDATE "projects" p SET "currentSprintId" = s."id" FROM "sprints" s WHERE s."projectId" = p."id";

ALTER TABLE "projects" DROP COLUMN "sprint";

-- CreateIndex
CREATE INDEX "sprints_projectId_idx" ON "sprints"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_currentSprintId_key" ON "projects"("currentSprintId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_currentSprintId_fkey" FOREIGN KEY ("currentSprintId") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
