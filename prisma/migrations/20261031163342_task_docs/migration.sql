-- CreateTable
CREATE TABLE "task_docs" (
    "taskId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_docs_pkey" PRIMARY KEY ("taskId","docId")
);

-- CreateIndex
CREATE INDEX "task_docs_docId_idx" ON "task_docs"("docId");

-- AddForeignKey
ALTER TABLE "task_docs" ADD CONSTRAINT "task_docs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_docs" ADD CONSTRAINT "task_docs_docId_fkey" FOREIGN KEY ("docId") REFERENCES "docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
