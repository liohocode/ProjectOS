-- F12.1: DocRevision — pending Boolean → enum RevisionStatus; thêm nội dung đề xuất, lý do từ chối,
-- version gốc. Chuyển dữ liệu trước khi xoá cột cũ (CLAUDE.md quy tắc 4).

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- Cột mới: baseVersion tạm cho phép null tới khi điền xong.
ALTER TABLE "doc_revisions"
    ADD COLUMN "status" "RevisionStatus" NOT NULL DEFAULT 'pending',
    ADD COLUMN "proposedSummary" TEXT,
    ADD COLUMN "proposedSections" JSONB,
    ADD COLUMN "rejectedReason" TEXT,
    ADD COLUMN "baseVersion" TEXT;

-- Data migration: pending=true → pending; còn lại (đã duyệt hoặc lịch sử cũ) → approved.
UPDATE "doc_revisions" SET "status" = CASE WHEN "pending" THEN 'pending'::"RevisionStatus" ELSE 'approved'::"RevisionStatus" END;
-- Revision cũ không lưu version gốc → lấy version hiện tại của tài liệu.
UPDATE "doc_revisions" r SET "baseVersion" = d."version" FROM "docs" d WHERE d."id" = r."docId";

ALTER TABLE "doc_revisions" ALTER COLUMN "baseVersion" SET NOT NULL;
ALTER TABLE "doc_revisions" DROP COLUMN "pending";
