-- AlterTable
ALTER TABLE "features" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "position" INTEGER;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "position" INTEGER;
