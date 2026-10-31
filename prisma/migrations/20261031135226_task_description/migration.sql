-- CreateEnum
CREATE TYPE "TaskSize" AS ENUM ('S', 'M', 'L');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "code" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "needsDecision" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "size" "TaskSize";
