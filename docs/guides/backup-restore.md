# Sao lưu & khôi phục DB production (Neon)

Hai lớp bảo vệ, dùng theo thứ tự:
1. **Khôi phục theo thời điểm của Neon** (có sẵn, gói Free giữ lịch sử ngắn — xem mục "History retention" của project trên Neon Console). Nhanh nhất khi vừa xảy ra sự cố (xoá nhầm, migration lỗi).
2. **Bản sao lưu hằng đêm** của Meridian (F20.1): workflow GitHub Actions `Backup Neon` chạy `pg_dump` lúc 02:17 giờ Việt Nam, lưu thành artifact **7 ngày**. Dùng khi lịch sử Neon đã hết hạn hoặc cần dữ liệu của một ngày cụ thể.

> Artifact chứa **toàn bộ dữ liệu production**. Ai có quyền đọc repo đều tải được → giữ repo private, không chia sẻ file dump.

## Chạy sao lưu ngay
GitHub → **Actions → Backup Neon → Run workflow** (nhánh `main`). Xong sau ~1 phút; file ở mục **Artifacts** của lần chạy: `meridian-db-<UTC>.zip` gồm `meridian-<UTC>.dump` + `.sha256`.

Mỗi lần chạy, workflow **khôi phục thử** bản dump vào một Postgres 17 tạm trong job và so số dòng `tasks` / `docs` / `_prisma_migrations` với production; lệch hoặc lỗi → lần chạy đỏ (GitHub gửi email cho người bật workflow).

## Khôi phục từ bản sao lưu
Không ghi đè thẳng DB đang chạy — khôi phục vào **branch Neon mới**, kiểm tra, rồi mới chuyển app sang.

1. Tải artifact, giải nén, kiểm tra: `sha256sum -c meridian-<UTC>.dump.sha256`.
2. Neon Console → project `meridian` → **Branches → Create branch** (từ `main`, tên vd `restore-<ngày>`) → lấy **connection string direct** (không `-pooler`) của branch mới.
3. Xoá schema cũ trên branch mới rồi khôi phục (cần `pg_restore` bản 17 trở lên, hoặc chạy qua Docker `postgres:17`):
   ```bash
   psql "<URL_BRANCH_MOI>" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
   pg_restore --no-owner --no-privileges -d "<URL_BRANCH_MOI>" meridian-<UTC>.dump
   ```
4. Kiểm tra nhanh: `psql "<URL_BRANCH_MOI>" -c 'select count(*) from tasks; select count(*) from _prisma_migrations;'`.
5. Chuyển app sang branch mới: cập nhật 2 secret trên Google Secret Manager (`DATABASE_URL` = URL pooled, `DATABASE_URL_DIRECT` = URL direct của branch mới) → GitHub **Actions → Deploy → Run workflow** (deploy lại để Cloud Run đọc secret mới; migration chạy lại an toàn — bản dump đã có bảng `_prisma_migrations`).
6. Đăng nhập kiểm tra; ổn thì có thể đặt branch mới làm **default** trên Neon và xoá branch cũ sau vài ngày.

## Đã thử (2026-10-30)
- Dump định dạng custom từ DB dev → khôi phục vào DB mới bằng đúng các lệnh trên → số dòng `tasks`, `activity_events`, `_prisma_migrations` khớp bản gốc (extension `unaccent` khôi phục cùng).
- Production: lần chạy tay đầu tiên thành công (artifact `meridian-db-20261030-234509`); từ đó mỗi lần chạy đều tự khôi phục thử.
