-- F09.2: field kiểu thật cho tasks — thay chuỗi hiển thị ("5đ", "22/08", "chạy 14 phút")
-- bằng giá trị có kiểu; status chuỗi tự do → enum TaskStatus. Chuyển dữ liệu trước khi xoá cột cũ.

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Đang làm', 'Chờ', 'Chờ review', 'Đang chạy', 'Xong');

-- AlterTable: thêm cột mới
ALTER TABLE "tasks"
    ADD COLUMN "estimatePoints" INTEGER,
    ADD COLUMN "dueDate" DATE,
    ADD COLUMN "runningSince" TIMESTAMP(3);

-- Data migration (cùng quy tắc với lib/taskFormat.ts):
--   est "5đ" → 5, "—" → NULL
--   due "dd/MM" → ngày trong năm hiện tại (nhãn cũ không có năm)
--   running "chạy N phút" → thời điểm hiện tại trừ N phút
UPDATE "tasks" SET
    "estimatePoints" = (substring("est" from '^\s*(\d+)\s*đ\s*$'))::int,
    "dueDate" = CASE WHEN "due" ~ '^\s*\d{1,2}/\d{1,2}\s*$'
                     THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                    split_part(trim("due"), '/', 2)::int,
                                    split_part(trim("due"), '/', 1)::int)
                END,
    "runningSince" = CASE WHEN "running" ~ '\d+\s*phút'
                          THEN CURRENT_TIMESTAMP - make_interval(mins => (substring("running" from '(\d+)\s*phút'))::int)
                     END;

-- status: giá trị chuỗi hiện có trùng đúng giá trị enum → đổi kiểu tại chỗ (giá trị lạ sẽ làm migration lỗi, đúng ý muốn)
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus" USING "status"::"TaskStatus";

-- AlterTable: bỏ cột chuỗi cũ
ALTER TABLE "tasks"
    DROP COLUMN "est",
    DROP COLUMN "due",
    DROP COLUMN "running";
