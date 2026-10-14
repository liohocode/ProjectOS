-- F09.4: McpSession — tokens chuỗi ("182K") → tokensUsed số; durationMin cố định → endedAt
-- (thời lượng tính từ startedAt/endedAt, phiên đang chạy tính tới hiện tại).
-- Member.status chuỗi tự do → enum MemberStatus. Chuyển dữ liệu trước khi xoá cột cũ.

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('Đang chạy', 'Đang làm', 'Đang review', 'Chờ');

-- AlterTable
ALTER TABLE "mcp_sessions"
    ADD COLUMN "endedAt" TIMESTAMP(3),
    ADD COLUMN "tokensUsed" INTEGER NOT NULL DEFAULT 0;

-- Data migration (cùng quy tắc với lib/mcpFormat.ts → parseTokens):
--   "182K" → 182000, "2.4M" → 2400000, "410" → 410
UPDATE "mcp_sessions" SET "tokensUsed" = ROUND(
    (substring("tokens" from '^\s*([\d.]+)'))::numeric *
    CASE upper(substring("tokens" from '([KkMm])\s*$')) WHEN 'M' THEN 1000000 WHEN 'K' THEN 1000 ELSE 1 END
)::int
WHERE "tokens" ~ '^\s*[\d.]+\s*[KkMm]?\s*$';

-- Phiên đang chạy: bắt đầu cách đây durationMin phút, chưa kết thúc.
UPDATE "mcp_sessions" SET "startedAt" = CURRENT_TIMESTAMP - make_interval(mins => "durationMin"), "endedAt" = NULL
WHERE "result" = 'Đang chạy';
-- Phiên đã kết thúc: kết thúc sau startedAt đúng durationMin phút.
UPDATE "mcp_sessions" SET "endedAt" = "startedAt" + make_interval(mins => "durationMin")
WHERE "result" <> 'Đang chạy';

ALTER TABLE "mcp_sessions" DROP COLUMN "durationMin", DROP COLUMN "tokens";

-- members.status: giá trị chuỗi hiện có trùng đúng giá trị enum → đổi kiểu tại chỗ
ALTER TABLE "members" ALTER COLUMN "status" TYPE "MemberStatus" USING "status"::"MemberStatus";
