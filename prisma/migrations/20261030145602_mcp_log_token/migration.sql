-- AlterTable
ALTER TABLE "mcp_log_entries" ADD COLUMN     "tokenId" TEXT;

-- CreateIndex
CREATE INDEX "mcp_log_entries_tokenId_at_idx" ON "mcp_log_entries"("tokenId", "at");

-- AddForeignKey
ALTER TABLE "mcp_log_entries" ADD CONSTRAINT "mcp_log_entries_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "agent_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
