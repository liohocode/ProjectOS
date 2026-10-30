# F20 — Dùng thật nội bộ (go-live)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 6 | F19 | NFR-10, FR-OR-01…03 |

## Mục tiêu
Chuyển production từ bản demo sang **dữ liệu thật của công ty** an toàn: có backup trước, dự án mẫu được lưu trữ (không xoá), lead quản lý được thành viên / tech lead mà không cần đụng DB.

## Phạm vi
- **Trong**: backup Neon, quản trị thành viên (tech lead, email, vai trò), hướng dẫn onboarding dự án thật, tách seed demo khỏi production.
- **Ngoài**: nhiều tổ chức (multi-tenant — backlog), mời qua email (thông báo ra ngoài — backlog).

## Tham chiếu
- `docs/features/F19-deployment.md` (F19.8), `docs/guides/deploy-cloud-run.md`
- Người dùng chốt 2026-10-30: **lưu trữ** 3 dự án mẫu, tạo dự án thật bên cạnh; backup Neon đã duyệt.

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F20.1 | Backup Neon hằng đêm + hướng dẫn khôi phục (= F19.8, đã duyệt) | S | — | Xong — 2026-10-30 |
| F20.2 | Quản trị thành viên: sửa hồ sơ, email đăng nhập, gán / bỏ tech lead | M | — | Chưa làm |
| F20.3 | Hướng dẫn onboarding dự án thật + checklist go-live | S | F20.1, F20.2 | Chưa làm |
| F20.4 | Production không chạy seed demo; seed tách "demo" / "tối thiểu" | S | — | Chưa làm |
| F20.5 | Xoá cột cũ `Member.config` (migration mất dữ liệu — người dùng **đã duyệt** 2026-10-30, làm sau F20.1) | S | F20.1 | Chưa làm |

### F20.1 — Backup Neon
**Làm gì**: workflow GitHub Actions `backup.yml` (cron hằng đêm + chạy tay): `pg_dump` qua `DATABASE_URL_DIRECT` (secret có sẵn) → artifact nén giữ 7 ngày. `docs/guides/backup-restore.md`: khôi phục vào branch Neon mới, kiểm tra, đổi kết nối. Thử khôi phục một lần vào DB local.
**Hoàn thành khi**:
- [x] Có artifact backup từ production; khôi phục thử thành công — *local (DB dev) + tự động mỗi lần chạy workflow (Postgres 17 tạm trong job, so số dòng với production)*

### F20.2 — Quản trị thành viên
**Làm gì**: dialog "Sửa thành viên" ở panel (tech lead): tên, handle, vai trò, skills, email đăng nhập (người), cờ tech lead. Chặn bỏ tech lead cuối cùng. Action `updateMember` + quyền `member.manage` (cấp tổ chức).
**Hoàn thành khi**:
- [ ] Tech lead gán tech lead cho người khác trên UI; không thể bỏ tech lead cuối cùng (integration + e2e)

### F20.3 — Onboarding dự án thật
**Làm gì**: `docs/guides/onboarding.md`: lưu trữ dự án mẫu, tạo dự án, thêm thành viên + email, cấu hình agent + token, kết nối Claude Code, quy ước làm việc (F24.5). Checklist go-live trong HANDOFF.
**Hoàn thành khi**:
- [ ] Lio làm theo tạo được dự án thật với ít nhất 1 người + 1 agent hoạt động qua MCP

### F20.4 — Tách seed
**Làm gì**: `prisma db seed` mặc định = demo (dev/test như hiện tại); thêm chế độ tối thiểu (`SEED_MODE=minimal`: 1 tech lead từ biến môi trường, 2 server MCP nội bộ) cho môi trường mới. Ghi rõ production **không** chạy seed.
**Hoàn thành khi**:
- [ ] DB trống + seed tối thiểu → đăng nhập được và tạo dự án đầu tiên

### F20.5 — Xoá `Member.config`
**Làm gì**: migration xoá cột (dữ liệu đã chuyển sang `AgentConfig` ở F13.5) theo quy trình migration mất dữ liệu trong CLAUDE.md. Chỉ làm sau khi có backup và người dùng duyệt.

## Quyết định / ghi chú
- **F20.1 (2026-10-30)**: artifact GitHub (7 ngày) thay vì Cloud Storage — miễn phí, không tạo tài nguyên cloud mới. Container agent không tải được artifact (host blob của GitHub bị chặn) nên bước kiểm tra khôi phục chạy **ngay trong workflow**: service `postgres:17` → `pg_restore --exit-on-error` → so số dòng `tasks` / `docs` / `_prisma_migrations` với production. `pg_dump` bản 17 (Neon chạy Postgres 16 — client mới hơn dump được).
