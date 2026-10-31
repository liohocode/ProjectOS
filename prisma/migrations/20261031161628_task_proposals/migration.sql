-- CreateTable
CREATE TABLE "task_proposals" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "size" "TaskSize",
    "stage" "TaskStage" NOT NULL DEFAULT 'Dev',
    "assigneeId" TEXT,
    "criteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectedReason" TEXT,
    "taskId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "task_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_proposals_featureId_status_idx" ON "task_proposals"("featureId", "status");

-- AddForeignKey
ALTER TABLE "task_proposals" ADD CONSTRAINT "task_proposals_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_proposals" ADD CONSTRAINT "task_proposals_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
