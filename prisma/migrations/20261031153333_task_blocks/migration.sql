-- CreateTable
CREATE TABLE "task_blocks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblockedAt" TIMESTAMP(3),

    CONSTRAINT "task_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_blocks_taskId_blockedAt_idx" ON "task_blocks"("taskId", "blockedAt");

-- AddForeignKey
ALTER TABLE "task_blocks" ADD CONSTRAINT "task_blocks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
