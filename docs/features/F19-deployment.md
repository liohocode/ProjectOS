# F19 — Triển khai: Google Cloud Run + Neon Postgres (gói Free)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 5 | F08.6 (cho CD), F15 (trước khi mở cho người dùng thật) | NFR-10 |

## Mục tiêu
Đưa Meridian lên môi trường thật, **miễn phí trong hạn mức**: app chạy trên Google Cloud Run (container), database Neon Postgres gói Free, deploy tự động từ GitHub khi merge vào `main`, có cảnh báo chi phí và sao lưu.

## Kiến trúc triển khai
```
GitHub (code) ── push main ──▶ GitHub Actions
                                 ├─ CI (F08.6): lint, typecheck, test, build
                                 ├─ docker build ──▶ Artifact Registry (asia-southeast1)
                                 ├─ prisma migrate deploy ──▶ Neon (production branch)
                                 └─ gcloud run deploy ──▶ Cloud Run service "meridian"
                                                            │  min-instances 0, max-instances 1–2
Người dùng ── HTTPS ──▶ https://meridian-xxxx.run.app ─────┤  secrets: Secret Manager
Agent (MCP) ── HTTPS + Bearer token ──▶ /api/mcp ───────────┘
                                                            ▼
                                     Neon Postgres (Singapore, pooled connection)
(Tuỳ chọn) tên miền riêng: Cloudflare DNS → Cloud Run
```

## Phạm vi
- **Trong**: Dockerfile production, thiết lập Google Cloud (thủ công có hướng dẫn), Neon production, secrets, CD qua GitHub Actions, budget alert, backup, tên miền (tuỳ chọn).
- **Ngoài**: autoscale lớn, multi-region, môi trường staging riêng (dùng preview của PR thay thế — tuỳ chọn ở F19.6).

## Tham chiếu
- `docs/architecture/decisions.md` → **ADR-016** (Cloud Run, các ràng buộc), ADR-015 (Neon), ADR-013 (Google OAuth — cùng Google Cloud project)
- Next 16 docs: `output: "standalone"` (`node_modules/next/dist/docs/` — tìm "standalone")
- Skill Prisma: `.agents/skills/prisma-database-setup/` (driver adapter, connection string), `.agents/skills/prisma-cli/references/migrate-deploy.md`
- Code: `next.config.ts`, `lib/prisma.ts`, `prisma7.config.ts`, `package.json`, `docker-compose.yml`, `.env.example`

## Hạn mức free cần theo dõi (tra lại số liệu hiện hành khi làm)
| Dịch vụ | Hạn mức free | Rủi ro vượt |
|---|---|---|
| Cloud Run (billing theo request) | 2M request, 180K vCPU-giây, 360K GiB-giây / tháng, chung cho cả billing account | Request giữ kết nối lâu (SSE, MCP stream) đốt vCPU-giây → **cấm kết nối dài** (ADR-016) |
| Artifact Registry | ~0.5 GB lưu trữ | Ảnh cũ tích tụ → bật cleanup policy |
| Neon Free | 100 CU-giờ/project/tháng, 0.5 GB storage/project (nguồn 2026-10; trước ghi 1 GB — đối chiếu trang giá ở F19.4), 5 GB transfer; tự ngủ sau 5 phút | Polling liên tục giữ DB thức → polling chỉ khi tab hiển thị |
| Secret Manager | vài secret, vài nghìn lần truy cập/tháng | Thấp |

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F19.1 | Quyết định hạ tầng | S | — | Xong — 2026-10-14 (ADR-016, ADR-015) |
| F19.2 | Dockerfile production + chạy thử container ở local | M | — | Xong — 2026-10-28 |
| F19.3 | Thiết lập Google Cloud + budget alert (hướng dẫn cho người dùng) | S | — | Xong — 2026-10-29 |
| F19.4 | Neon production + kết nối Prisma | S | — | Xong — 2026-10-30 (chờ người dùng cất `DATABASE_URL` vào Secret Manager) |
| F19.5 | Secrets (Secret Manager) + kiểm tra biến môi trường | S | F19.3 | Xong — 2026-10-30 |
| F19.6 | Deploy thủ công lần đầu lên Cloud Run | S | F19.2, F19.3, F19.4, F19.5 | Đang làm — build + push image chạy được; chờ quyền đọc `DATABASE_URL_DIRECT` cho `meridian-deploy` |
| F19.7 | CD: GitHub Actions build → migrate → deploy | M | F19.6, F08.6 | Đang làm — `.github/workflows/deploy.yml` (chạy khi CI xanh trên `main` hoặc chạy tay) |
| F19.8 | Sao lưu Neon định kỳ + hướng dẫn khôi phục | S | F19.4 | Chưa làm |
| F19.9 | (Tuỳ chọn) Tên miền riêng qua Cloudflare DNS | S | F19.6 | Chưa làm |
| F19.10 | Giảm số query mỗi request (`cache()` + hàm đếm cho badge) | S | — | Xong — 2026-10-28 (ADR-019) |

### F19.1 — Quyết định hạ tầng
Đã chốt với người dùng: Cloud Run + Neon Free (ADR-016 thay thế phương án Cloudflare ở ADR-014). GitHub dùng cho code + CI/CD; Cloudflare chỉ tuỳ chọn cho DNS.

### F19.2 — Dockerfile production
**Làm gì**: `next.config.ts` thêm `output: "standalone"` (kiểm tra docs Next 16). Dockerfile multi-stage: `deps` (`npm ci`, duyệt install script cho prisma/@prisma/engines/esbuild/unrs-resolver) → `build` (`npx prisma generate` + `npm run build`) → `runner` (`node:24-slim`, chỉ copy `.next/standalone`, `.next/static`, `public`, `lib/generated/prisma` nếu cần; user không phải root; `PORT` mặc định 8080 do Cloud Run truyền vào; `CMD ["node", "server.js"]`). Không chạy migrate trong container (CI làm, F19.7). `.dockerignore` loại `node_modules`, `.next`, `.env*`, `.git`. Thêm service `app` vào `docker-compose.yml` dưới `profiles: ["app"]` để chạy thử: `docker compose --profile app up --build` (app nối DB Docker).
**File**: `Dockerfile`, `.dockerignore`, `next.config.ts`, `docker-compose.yml`
**Hoàn thành khi**:
- [x] Container chạy ở `localhost:8080`, 5 màn hiển thị đúng với DB Docker
- [x] Kích thước image ghi vào mục ghi chú (mục tiêu < 300 MB — không đạt, xem ghi chú: 393 MB, nén ~90 MB)

### F19.3 — Google Cloud + budget alert
**Làm gì**: viết `docs/guides/deploy-cloud-run.md` hướng dẫn **người dùng tự làm** trên Google Cloud Console (dùng chung project với OAuth client của F15.2):
1. Tạo/chọn project; gắn billing account.
2. **Budget alert** (vd 1 USD, cảnh báo 50%/90%/100%) — bắt buộc trước mọi thứ khác.
3. Bật API: Cloud Run, Artifact Registry, Secret Manager, IAM Credentials.
4. Tạo Artifact Registry repo Docker ở `asia-southeast1` + cleanup policy giữ ~5 image gần nhất.
5. Kiểm tra region chọn được áp hạn mức free của Cloud Run (nếu không, dùng region được free gần nhất và ghi lại).
6. Tạo service account cho deploy (quyền tối thiểu: Run Admin, Artifact Registry Writer, Service Account User, Secret Manager Secret Accessor cho service account runtime) và **Workload Identity Federation** cho repo GitHub `liohocode/ProjectOS` (không tạo JSON key).
Hướng dẫn: `docs/guides/deploy-cloud-run.md` → phần 1 (lệnh chạy trong Cloud Shell).
**Hoàn thành khi**:
- [x] Có `PROJECT_ID`, region, tên repo Artifact Registry, provider WIF để dùng ở F19.7 — xem "Giá trị đã thiết lập" trong `docs/guides/deploy-cloud-run.md`
- [x] Budget alert 5 USD (bỏ chọn credit) — người dùng đặt 2026-10-29

### F19.4 — Neon production
**Làm gì**: hướng dẫn người dùng tạo project Neon (region Singapore, Postgres 16), lấy **pooled connection string** (cho app) và **direct connection string** (cho `prisma migrate deploy`). `lib/prisma.ts` giữ `@prisma/adapter-pg`, giới hạn pool nhỏ (vd `max: 5`) cho môi trường serverless — đọc skill Prisma về cấu hình adapter. Chạy `npx prisma migrate deploy` lần đầu bằng direct URL. **Không seed dữ liệu mẫu** vào production; tạo thành viên thật (ít nhất tài khoản tech lead có email Google — cần cho F15.2) bằng script `scripts/bootstrap-prod.ts` hoặc qua Prisma Studio trỏ vào Neon.
**Hoàn thành khi**:
- [x] Neon có đủ 12 migration (checksum khớp `prisma/migrations`) + dữ liệu mẫu khớp từng bảng với DB dựng local. Không chạy được app local trỏ vào Neon (container agent bị chặn cổng 5432 / host `*.neon.tech`) — kiểm tra thật ở F19.6

### F19.5 — Secrets + env
**Làm gì**: `lib/env.ts` validate biến môi trường lúc khởi động (zod): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (tên theo ADR-020), `MCP_DEV_TOKENS` (chỉ dev). Production: lưu trong **Secret Manager**, mount vào Cloud Run bằng `--set-secrets`. `.env.example` ghi rõ biến nào dùng ở môi trường nào.
**Hoàn thành khi**:
- [x] Thiếu `DATABASE_URL` → container dừng với thông báo rõ ràng (đã thử: server standalone in `[env] Thiếu/sai biến môi trường: DATABASE_URL: chưa đặt`, exit 1)

### F19.6 — Deploy thủ công lần đầu
**Làm gì**: build + push image lên Artifact Registry, `gcloud run deploy meridian` với: `--region asia-southeast1`, `--min-instances 0`, `--max-instances 1` (tăng sau nếu cần), `--cpu 1 --memory 512Mi`, `--concurrency 80`, `--timeout 60`, billing theo request (mặc định), `--allow-unauthenticated` (app tự kiểm soát đăng nhập ở F15), secrets từ F19.5. Ghi toàn bộ lệnh vào `docs/guides/deploy-cloud-run.md`. Trước khi F15 xong: chỉ deploy để kiểm tra, không chia sẻ URL ra ngoài (chưa có đăng nhập).
**Hoàn thành khi**:
- [ ] URL `*.run.app` mở được 5 màn với dữ liệu từ Neon
- [ ] Ghi số đo cold start (lần đầu sau khi ngủ) và thời gian phản hồi bình thường vào mục ghi chú

### F19.7 — CD bằng GitHub Actions
**Làm gì**: workflow `.github/workflows/deploy.yml` chạy khi CI (F08.6) xanh trên `main`: xác thực Google qua WIF (`google-github-actions/auth`) → build + push image (tag = commit SHA) → `prisma migrate deploy` (direct URL lấy từ GitHub Secret) → `gcloud run deploy` image mới. Thêm `concurrency` để không deploy chồng nhau. Hướng dẫn rollback: `gcloud run services update-traffic --to-revisions <rev>=100`.
**Hoàn thành khi**:
- [ ] Merge vào `main` → vài phút sau bản mới chạy; rollback thử thành công

### F19.8 — Sao lưu
**Làm gì**: Neon Free chỉ giữ lịch sử khôi phục ngắn → workflow GitHub Actions theo lịch (vd 2h sáng hằng ngày) chạy `pg_dump` (direct URL) → upload artifact GitHub (giữ 7–14 ngày) hoặc Cloud Storage. Hướng dẫn khôi phục `docs/guides/backup-restore.md`.
**Hoàn thành khi**:
- [ ] Khôi phục thử một bản backup vào DB trống thành công

### F19.9 — (Tuỳ chọn) Tên miền riêng
**Làm gì**: nếu muốn dùng tên miền riêng: quản lý DNS trên Cloudflare (free), map vào Cloud Run (domain mapping nếu region hỗ trợ; nếu không, cân nhắc Firebase Hosting rewrite tới Cloud Run — vẫn free). Cập nhật redirect URI của Google OAuth (F15.2).
**Hoàn thành khi**:
- [ ] Truy cập qua tên miền riêng có HTTPS; đăng nhập Google hoạt động

### F19.10 — Giảm số query mỗi request
**Làm gì** (phát hiện khi rà repo 2026-10-28): không hàm `lib/data` nào được dedupe trong một request — layout, page và các hàm data gọi lại nhau tải cùng dữ liệu nhiều lần; nặng nhất là màn work: `getTaskDrawerInfo` chạy cho **từng task**, mỗi lần tải lại cả cây feature/task + nhóm docs. Layout tải toàn bộ task và hồ sơ thành viên chỉ để đếm badge. Với Neon Free (giới hạn CU-giờ, ngủ sau 5 phút) và Cloud Run cold start, mỗi query thừa là độ trễ + quota. Sửa: bọc mọi hàm đọc export của `lib/data/*` và `lib/auth/currentUser.ts` bằng `React.cache()` (ADR-019, chữ ký giữ nguyên); thêm `getTaskCountsByProject`, `getMemberCountByProject` cho badge sidebar.
**Kết quả đo** (số câu SQL Postgres nhận cho một request `rv-web`, bản build production, `log_statement=all`):

| Màn | Trước | Sau |
|---|---|---|
| work | 131 | 33 |
| portfolio | 48 | 40 |
| docs | 39 | 29 |
| team | 31 | 22 |
| mcp | 29 | 20 |

**Hoàn thành khi**:
- [x] Badge sidebar không đổi (integration test: hàm đếm khớp danh sách đầy đủ ở cả 3 dự án; e2e smoke xanh)
- [x] Số query màn work không còn tăng theo số task

## Ảnh hưởng tới feature khác (đã cập nhật trong từng file)
- **F16 MCP**: Streamable HTTP chế độ stateless, không mở stream SSE dài; rate limit + phiên lưu DB.
- **F17 Realtime**: polling ngắn từ client (chỉ khi tab hiển thị) thay vì giữ kết nối SSE.
- **F15 Auth**: OAuth client tạo trong cùng Google Cloud project; redirect URI production là URL `run.app` (hoặc tên miền F19.9).

## Quyết định / ghi chú
- **F19.5–F19.7 (2026-10-30)**: `lib/env.ts` (zod) gọi từ `instrumentation.ts` lúc server khởi động: luôn cần `DATABASE_URL` (postgresql://); production cần thêm `BETTER_AUTH_SECRET` (≥32 ký tự) + `BETTER_AUTH_URL`; `GOOGLE_CLIENT_ID`/`SECRET` phải đủ cặp (thiếu cả hai chỉ cảnh báo — nút Google bị khoá). Production lỗi → `process.exit(1)`; dev chỉ cảnh báo. Dockerfile: lệnh build đặt `BETTER_AUTH_SECRET` giả (Better Auth từ chối build với secret mặc định — bản cũ sẽ build lỗi sau F15.2); image chạy thật không mang giá trị này. **Deploy đi qua GitHub Actions** (`.github/workflows/deploy.yml`) thay vì chạy tay từ container agent: mạng container chặn `*.pkg.dev` / `*.neon.tech`, còn agent không được tự cấp quyền IAM / chạy Cloud Build bằng service account Owner. Workflow: WIF → `docker build/push` (tag 12 ký tự SHA) → `prisma migrate deploy` với `DATABASE_URL_DIRECT` đọc từ Secret Manager (GitHub secret cùng tên ghi đè được; bỏ `channel_binding` khỏi URL) → `gcloud run deploy` (`--max-instances 1`, `--min-instances 0`, 512Mi, secret từ Secret Manager qua `--set-secrets`, `BETTER_AUTH_URL` = URL cố định `https://meridian-669737756643.asia-southeast1.run.app`) → smoke `/login` 200. `concurrency: deploy-production` không huỷ giữa chừng. Lần chạy đầu (2026-10-30): WIF xác thực được, build image lỗi vì `.dockerignore` loại `e2e/` mà `playwright.config.ts` (import `./e2e/env`) vẫn bị typecheck → loại luôn `playwright.config.ts` khỏi build context. Lần 2: build + push image thành công, dừng ở migrate vì chưa có direct URL → workflow đọc từ Secret Manager thay vì GitHub secret (agent không tạo được GitHub secret; secret chỉ nằm một chỗ). Redirect URI `run.app` đã đăng ký trong OAuth client (kiểm tra 2026-10-30: Google chuyển sang trang đăng nhập, URI lạ thì báo lỗi).
- **F19.4 (2026-10-30)**: Neon project `meridian` (id `nameless-leaf-94347709`, `aws-ap-southeast-1`, Postgres 16), database `meridian`, role `meridian_owner`, branch `main`. **Người dùng chọn nạp dữ liệu mẫu** (khác kế hoạch "không seed") để vừa code vừa xem thực tế; `hieu` (Trung Hiếu, tech lead) mang email `liohocompany@gmail.com` để đăng nhập. Mạng của container agent chặn Postgres (5432) và HTTPS tới `*.neon.tech` → cách làm: dựng DB `meridian_prodstage` ở local (`migrate deploy` + `db seed` với `DEV_LOGIN_EMAIL`), `pg_dump --inserts`, chạy lên Neon qua Neon MCP (`run_sql_transaction`), rồi so md5 từng bảng + checksum `_prisma_migrations` giữa hai bên — khớp hết. Từ F19.7, migration production chạy bằng `prisma migrate deploy` trong GitHub Actions (có mạng tới Neon) với **direct URL** (host không có `-pooler`); app dùng **pooled URL**. `lib/prisma.ts`: pool `max` 5 (đổi bằng `DATABASE_POOL_MAX`).
- **F19.3 (2026-10-29)**: project `pdos-513017` (organization `liohocompany-org`). Người dùng làm trên điện thoại nên agent chạy bước 1.4–1.6 + tạo secret `BETTER_AUTH_SECRET` bằng service account tạm `meridian-agent` (Owner trên project). Organization mặc định chặn tạo key (`iam.disableServiceAccountKeyCreation`, `iam.managed.disableServiceAccountKeyCreation`) → người dùng tắt **riêng cho project này**. **Sau khi F19.7 chạy (deploy qua WIF, không cần key): xoá key/SA `meridian-agent` và bỏ override 2 org policy trên.** Budget alert để người dùng làm (service account không có quyền billing — cố ý).
- **F19.2 (2026-10-28)**: base `node:24-slim` (glibc, cùng họ với runner CI Ubuntu). Image 393 MB (`docker images`), nén ~90 MB (dung lượng thật khi push). Phần app chỉ ~47 MB — còn lại là base Node. Thử `node:24-alpine`: 306 MB / nén ~73 MB, vẫn không đạt < 300 MB và đổi sang musl → giữ slim. Kiểm tra: 5 màn 200 với DB local, `/_next/static` phục vụ được, chạy user `node`, image không chứa `.env`.
- `npm run build` có `postbuild` copy `.next/static` vào `.next/standalone`; `npm start` = `node .next/standalone/server.js` (Next 16 cảnh báo `next start` không hỗ trợ `output: "standalone"`). E2E chạy đúng server này (cổng qua `PORT`) → test cùng cách container production chạy. Next tự copy `.env` vào `.next/standalone` khi build ở máy — vô hại (`.next` gitignore); Docker không có vì `.dockerignore` loại `.env*`.
- **2026-10-28 — người dùng chốt**: giữ Neon Free (so với Cloud SQL — xem ADR-015 "Xác nhận lại"); một môi trường duy nhất deploy từ `main`; **làm F15.2 → F15.3 trước khi chia sẻ URL**. Thứ tự: F19.2 + F19.3 → F15.2 → F15.3 → F19.4 → F19.5 → F19.6 → F19.7. Người dùng có credit Free Trial 300 USD (hết hạn sau ~90 ngày; sau đó Cloud Run vẫn trong hạn mức free).
- Nếu sau này cần kết nối dài, job nền nặng, hoặc vượt hạn mức free: chuyển cùng image sang VPS (Docker Compose) — ghi ADR mới khi đó.
