-- AlterTable
ALTER TABLE "members" ADD COLUMN     "isTechLead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- F15.4: chuyển dữ liệu — người đang có vai trò "Tech lead" (dữ liệu mẫu, production) giữ quyền quản trị.
UPDATE "members" SET "isTechLead" = true WHERE "kind" = 'human' AND "role" = 'Tech lead';
