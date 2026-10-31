-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "branch" TEXT,
ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "prUrl" TEXT;
