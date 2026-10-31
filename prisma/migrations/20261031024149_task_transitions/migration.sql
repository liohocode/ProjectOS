-- CreateEnum
CREATE TYPE "TransitionVia" AS ENUM ('web', 'mcp');

-- CreateTable
CREATE TABLE "task_transitions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStage" "TaskStage",
    "toStage" "TaskStage",
    "fromStatus" "TaskStatus",
    "toStatus" "TaskStatus",
    "via" "TransitionVia" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_transitions_taskId_at_idx" ON "task_transitions"("taskId", "at");

-- AddForeignKey
ALTER TABLE "task_transitions" ADD CONSTRAINT "task_transitions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_transitions" ADD CONSTRAINT "task_transitions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
