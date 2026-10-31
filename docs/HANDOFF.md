# Bàn giao cho phiên agent mới

Đọc file này khi bắt đầu phiên mới (kể cả trên tài khoản Claude khác). Cập nhật mục **Trạng thái** và **Việc tiếp theo** mỗi khi kết thúc một đợt việc lớn.

## 1. Prompt mở đầu (copy nguyên văn)
```
Bạn là Ali, mình là Lio. Repo liohocode/ProjectOS (Meridian), làm trên branch claude/<tên-branch-phiên-này>.
Đọc lần lượt: CLAUDE.md → docs/HANDOFF.md → docs/ROADMAP.md → docs/WORKFLOW.md.
Làm theo "Mức tự quyết của agent" trong CLAUDE.md: tự chọn task tiếp theo trong ROADMAP, mỗi task một commit,
mở PR, CI xanh thì tự merge (rebase), rồi làm tiếp. Chỉ hỏi mình ở mục "Phải hỏi".
Trả lời tiếng Việt, ngắn gọn. Bắt đầu với: <task hoặc "việc tiếp theo trong ROADMAP">.
```

## 2. Trạng thái (cập nhật 2026-10-30)
- **ROADMAP 101/148** — giai đoạn 1 (MVP) 94/103, **giai đoạn 2 lập + duyệt 2026-10-30** (F20–F27, F27 = skills hub, mục tiêu "data foundation", xem đầu `docs/ROADMAP.md`). Xong: F08–F14, F16, F17; F15 5/6 (F15.4 phân quyền, F15.5 token agent, F15.6 UI theo quyền — tech lead = `Member.isTechLead`; F15.2 đăng nhập Google chạy thật trên production, còn thử đăng xuất + email lạ); F19 8/9 (F19.8 chuyển sang F20.1; còn F19.9 tên miền tuỳ chọn).
- **Production**: https://meridian-669737756643.asia-southeast1.run.app — Cloud Run (`pdos-513017`, `asia-southeast1`) + Neon Free (project `meridian`). Đăng nhập: `liohocompany@gmail.com` = Trung Hiếu (tech lead) trong **dữ liệu mẫu** (người dùng chọn giữ dữ liệu mẫu trên production).
- **Deploy tự động**: merge vào `main` → CI xanh → workflow `Deploy` (`.github/workflows/deploy.yml`): build image → `prisma migrate deploy` lên Neon → `gcloud run deploy` → smoke `/login`. Chạy tay: GitHub → Actions → Deploy → Run workflow (agent chạy được bằng GitHub MCP `actions_run_trigger`).
- Hạ tầng + giá trị cấu hình: `docs/guides/deploy-cloud-run.md` (mục 1–4). Secret Manager: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## 3. Việc tiếp theo
| Việc | Ai | Ghi chú |
|---|---|---|
| F19.7 thử rollback; F19.8 backup Neon; F19.9 tên miền (tuỳ chọn) | Agent (+ Lio nếu tốn tiền) | Rollback: `docs/guides/deploy-cloud-run.md` mục 4 |
| F20.2, F22.2, F21.3 (F20.1 backup, F21.1 feature CRUD, F21.2 tiến độ, F22.1 lịch sử trạng thái xong — `docs/guides/backup-restore.md`) | Agent | Theo "Thứ tự làm" trong ROADMAP |
| Bỏ override org policy chặn tạo key (mục 5) | **Lio** | Service account tạm đã xoá |

## 4. Giới hạn của môi trường agent (đã gặp — đừng thử lại vô ích)
- Container cloud **không kết nối được** `*.neon.tech` (5432 và HTTPS), `*.pkg.dev` (Docker registry), `*.run.app`. → Không chạy Prisma/psql vào Neon, không `docker push`, không curl production từ container.
  - Đọc/ghi Neon: **Neon MCP** (`run_sql`, `run_sql_transaction`) — thao tác DB production phải hỏi Lio trước.
  - Build/deploy/migrate production: **chỉ qua workflow** trên GitHub Actions (WIF, service account `meridian-deploy`): `Deploy`, `Rollback` (target `previous` / `latest` / tên revision), `Backup Neon`. Agent chạy được bằng `gh api -X POST repos/liohocode/projectos/actions/workflows/<file>.yml/dispatches -f ref=main` (quyền trong `.claude/settings.json`, Lio cấp 2026-10-31) — vẫn cần Lio duyệt hành động trong chat.
  - Kiểm tra production: log Cloud Run (`gcloud logging read …`), kết quả workflow (GitHub MCP `actions_list` / `get_job_logs`), hoặc nhờ Lio mở trình duyệt.
- `gcloud` trong container chỉ có quyền khi có key service account; phiên mới **không có** (key cũ chỉ nằm trong container phiên trước). Mặc định không cần — deploy đi qua GitHub Actions.
- Classifier của Claude Code chặn: cấp quyền IAM, ghi Secret Manager, chạy Cloud Build bằng SA quyền cao. Quy tắc cho phép nằm ở `.claude/settings.json` (người dùng sửa; agent không tự sửa được file này). Có thể phải mở phiên mới để quy tắc mới có hiệu lực.
- Playwright: nếu báo thiếu Chromium bản khác, symlink bản có sẵn trong `/opt/pw-browsers` (không `playwright install`). Postgres local: `service postgresql start` nếu test báo ECONNREFUSED.

## 5. Dọn dẹp quyền tạm
- ✅ 2026-10-30: đã xoá service account `meridian-agent` (Owner, dùng lúc thiết lập F19.3) và mọi bản sao key trong container. Agent không còn quyền Google Cloud trực tiếp — việc trên GCP đi qua workflow Deploy (`meridian-deploy`, WIF).
- ⬜ **Lio**: bỏ override 2 org policy chặn tạo key trên project `pdos-513017` (cần quyền admin tổ chức — service account không gỡ được): Console → IAM & Admin → **Organization Policies** (chọn project `pdos-513017`) → *Disable service account key creation* và bản *(managed)* → **Manage policy → Inherit parent's policy → Set policy**. Hoặc Cloud Shell:
  ```bash
  gcloud resource-manager org-policies delete iam.disableServiceAccountKeyCreation --project=pdos-513017
  gcloud org-policies delete iam.managed.disableServiceAccountKeyCreation --project=pdos-513017
  ```

## 6. Chuẩn bị tài khoản Claude mới (Lio)
1. claude.ai/code trên tài khoản mới → kết nối GitHub (cài Claude GitHub App cho repo `liohocode/ProjectOS`).
2. Tạo cloud environment cho repo; setup như hiện tại (Node, Postgres, Docker có sẵn trong image mặc định). `.env` không có trong repo — phiên mới tự `cp .env.example .env` (giá trị dev, không phải secret).
3. (Tuỳ chọn) Kết nối connector **Neon** nếu cần agent đọc/ghi DB production.
4. Mở phiên mới, dán prompt ở mục 1.
