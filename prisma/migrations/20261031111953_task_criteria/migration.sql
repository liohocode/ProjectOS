-- CreateTable
CREATE TABLE "task_criteria" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_criteria_taskId_position_idx" ON "task_criteria"("taskId", "position");

-- AddForeignKey
ALTER TABLE "task_criteria" ADD CONSTRAINT "task_criteria_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_criteria" ADD CONSTRAINT "task_criteria_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
