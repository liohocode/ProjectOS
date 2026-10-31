-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "doneDefinition" TEXT[] DEFAULT ARRAY[]::TEXT[];
