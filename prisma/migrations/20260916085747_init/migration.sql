-- CreateEnum
CREATE TYPE "MemberKind" AS ENUM ('human', 'agent');

-- CreateEnum
CREATE TYPE "TaskStage" AS ENUM ('BA', 'TA', 'Dev', 'Review', 'Done');

-- CreateEnum
CREATE TYPE "McpServerStatus" AS ENUM ('online', 'limited');

-- CreateEnum
CREATE TYPE "SessionResult" AS ENUM ('Xong', 'Đang chạy', 'Chờ review', 'Bị chặn');

-- CreateEnum
CREATE TYPE "CommandResult" AS ENUM ('OK', 'Chờ review', 'Bị chặn');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "sprint" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "kind" "MemberKind" NOT NULL,
    "role" TEXT NOT NULL,
    "skills" TEXT[],
    "current" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "config" JSONB,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_skill_rows" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "member_skill_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_activity" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "projectId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("projectId","memberId")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "TaskStage" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "pct" INTEGER NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "stage" "TaskStage" NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "est" TEXT NOT NULL,
    "due" TEXT NOT NULL,
    "blocked" TEXT,
    "blockedFull" TEXT,
    "running" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docs" (
    "id" TEXT NOT NULL,
    "featureId" TEXT,
    "title" TEXT NOT NULL,
    "agentWritten" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "indexedAt" TIMESTAMP(3),
    "chunkCount" INTEGER,
    "readBy" TEXT[],
    "sections" JSONB NOT NULL,

    CONSTRAINT "docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_revisions" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "doc_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "McpServerStatus" NOT NULL,
    "url" TEXT NOT NULL,
    "tools" TEXT[],
    "clients" INTEGER NOT NULL,
    "commandsPerDay" INTEGER NOT NULL,
    "lastCommandAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_sessions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMin" INTEGER NOT NULL,
    "toolCalls" INTEGER NOT NULL,
    "tokens" TEXT NOT NULL,
    "result" "SessionResult" NOT NULL,

    CONSTRAINT "mcp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_log_entries" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "result" "CommandResult" NOT NULL,

    CONSTRAINT "mcp_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_activity_memberId_at_idx" ON "member_activity"("memberId", "at" DESC);

-- CreateIndex
CREATE INDEX "features_projectId_idx" ON "features"("projectId");

-- CreateIndex
CREATE INDEX "tasks_featureId_idx" ON "tasks"("featureId");

-- CreateIndex
CREATE INDEX "docs_featureId_idx" ON "docs"("featureId");

-- CreateIndex
CREATE INDEX "doc_revisions_docId_createdAt_idx" ON "doc_revisions"("docId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mcp_sessions_projectId_idx" ON "mcp_sessions"("projectId");

-- CreateIndex
CREATE INDEX "mcp_log_entries_at_idx" ON "mcp_log_entries"("at" DESC);

-- AddForeignKey
ALTER TABLE "member_skill_rows" ADD CONSTRAINT "member_skill_rows_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_activity" ADD CONSTRAINT "member_activity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docs" ADD CONSTRAINT "docs_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docs" ADD CONSTRAINT "docs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_docId_fkey" FOREIGN KEY ("docId") REFERENCES "docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_revisions" ADD CONSTRAINT "doc_revisions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_sessions" ADD CONSTRAINT "mcp_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_sessions" ADD CONSTRAINT "mcp_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_sessions" ADD CONSTRAINT "mcp_sessions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_log_entries" ADD CONSTRAINT "mcp_log_entries_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
