/*
  Warnings:

  - Added the required column `projectId` to the `docs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "docs" ADD COLUMN     "projectId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "docs_projectId_idx" ON "docs"("projectId");

-- AddForeignKey
ALTER TABLE "docs" ADD CONSTRAINT "docs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
