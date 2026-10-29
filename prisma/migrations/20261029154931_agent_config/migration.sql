-- CreateEnum
CREATE TYPE "DocsWritePermission" AS ENUM ('read_only', 'append_review', 'append_edit_spec');

-- CreateTable
CREATE TABLE "agent_configs" (
    "memberId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mcpServers" TEXT[],
    "docsWritePermission" "DocsWritePermission" NOT NULL DEFAULT 'read_only',
    "maxConcurrentTasks" INTEGER NOT NULL DEFAULT 2,
    "canProposeFeatures" BOOLEAN NOT NULL DEFAULT false,
    "canAssignTo" TEXT[],
    "extra" JSONB,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("memberId")
);

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
