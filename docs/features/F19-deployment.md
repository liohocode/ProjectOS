# F19 — Triển khai: Google Cloud Run + Neon Postgres (gói Free)

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu — F19.2 nên làm sớm | 5 | F08.6 (cho CD), F15 (trước khi mở cho người dùng thật) | NFR-10 |

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
| Neon Free | 100 CU-giờ/project/tháng, 1 GB storage, 5 GB transfer; tự ngủ sau 5 phút | Polling liên tục giữ DB thức → polling chỉ khi tab hiển thị |
| Secret Manager | vài secret, vài nghìn lần truy cập/tháng | Thấp |

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F19.1 | Quyết định hạ tầng | S | — | Xong — 2026-10-14 (ADR-016, ADR-015) |
| F19.2 | Dockerfile production + chạy thử container ở local | M | — | Chưa làm |
| F19.3 | Thiết lập Google Cloud + budget alert (hướng dẫn cho người dùng) | S | — | Chưa làm |
| F19.4 | Neon production + kết nối Prisma | S | — | Chưa làm |
| F19.5 | Secrets (Secret Manager) + kiểm tra biến môi trường | S | F19.3 | Chưa làm |
| F19.6 | Deploy thủ công lần đầu lên Cloud Run | S | F19.2, F19.3, F19.4, F19.5 | Chưa làm |
| F19.7 | CD: GitHub Actions build → migrate → deploy | M | F19.6, F08.6 | Chưa làm |
| F19.8 | Sao lưu Neon định kỳ + hướng dẫn khôi phục | S | F19.4 | Chưa làm |
| F19.9 | (Tuỳ chọn) Tên miền riêng qua Cloudflare DNS | S | F19.6 | Chưa làm |

### F19.1 — Quyết định hạ tầng
Đã chốt với người dùng: Cloud Run + Neon Free (ADR-016 thay thế phương án Cloudflare ở ADR-014). GitHub dùng cho code + CI/CD; Cloudflare chỉ tuỳ chọn cho DNS.

### F19.2 — Dockerfile production
**Làm gì**: `next.config.ts` thêm `output: "standalone"` (kiểm tra docs Next 16). Dockerfile multi-stage: `deps` (`npm ci`, duyệt install script cho prisma/@prisma/engines/esbuild/unrs-resolver) → `build` (`npx prisma generate` + `npm run build`) → `runner` (`node:24-slim`, chỉ copy `.next/standalone`, `.next/static`, `public`, `lib/generated/prisma` nếu cần; user không phải root; `PORT` mặc định 8080 do Cloud Run truyền vào; `CMD ["node", "server.js"]`). Không chạy migrate trong container (CI làm, F19.7). `.dockerignore` loại `node_modules`, `.next`, `.env*`, `.git`. Thêm service `app` vào `docker-compose.yml` dưới `profiles: ["app"]` để chạy thử: `docker compose --profile app up --build` (app nối DB Docker).
**File**: `Dockerfile`, `.dockerignore`, `next.config.ts`, `docker-compose.yml`
**Hoàn thành khi**:
- [ ] Container chạy ở `localhost:8080`, 5 màn hiển thị đúng với DB Docker
- [ ] Kích thước image ghi vào mục ghi chú (mục tiêu < 300 MB)

### F19.3 — Google Cloud + budget alert
**Làm gì**: viết `docs/guides/deploy-cloud-run.md` hướng dẫn **người dùng tự làm** trên Google Cloud Console (dùng chung project với OAuth client của F15.2):
1. Tạo/chọn project; gắn billing account.
2. **Budget alert** (vd 1 USD, cảnh báo 50%/90%/100%) — bắt buộc trước mọi thứ khác.
3. Bật API: Cloud Run, Artifact Registry, Secret Manager, IAM Credentials.
4. Tạo Artifact Registry repo Docker ở `asia-southeast1` + cleanup policy giữ ~5 image gần nhất.
5. Kiểm tra region chọn được áp hạn mức free của Cloud Run (nếu không, dùng region được free gần nhất và ghi lại).
6. Tạo service account cho deploy (quyền tối thiểu: Run Admin, Artifact Registry Writer, Service Account User, Secret Manager Secret Accessor cho service account runtime) và **Workload Identity Federation** cho repo GitHub `liohocode/ProjectOS` (không tạo JSON key).
**Hoàn thành khi**:
- [ ] Người dùng làm theo hướng dẫn xong; có `PROJECT_ID`, region, tên repo Artifact Registry, provider WIF để dùng ở F19.7

### F19.4 — Neon production
**Làm gì**: hướng dẫn người dùng tạo project Neon (region Singapore, Postgres 16), lấy **pooled connection string** (cho app) và **direct connection string** (cho `prisma migrate deploy`). `lib/prisma.ts` giữ `@prisma/adapter-pg`, giới hạn pool nhỏ (vd `max: 5`) cho môi trường serverless — đọc skill Prisma về cấu hình adapter. Chạy `npx prisma migrate deploy` lần đầu bằng direct URL. **Không seed dữ liệu mẫu** vào production; tạo thành viên thật (ít nhất tài khoản tech lead có email Google — cần cho F15.2) bằng script `scripts/bootstrap-prod.ts` hoặc qua Prisma Studio trỏ vào Neon.
**Hoàn thành khi**:
- [ ] `prisma migrate status` trên Neon báo đã cập nhật; app ở local trỏ tạm vào Neon chạy được

### F19.5 — Secrets + env
**Làm gì**: `lib/env.ts` validate biến môi trường lúc khởi động (zod): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (khi F15 xong), `MCP_DEV_TOKENS` (chỉ dev). Production: lưu trong **Secret Manager**, mount vào Cloud Run bằng `--set-secrets`. `.env.example` ghi rõ biến nào dùng ở môi trường nào.
**Hoàn thành khi**:
- [ ] Thiếu `DATABASE_URL` → container dừng với thông báo rõ ràng

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

## Ảnh hưởng tới feature khác (đã cập nhật trong từng file)
- **F16 MCP**: Streamable HTTP chế độ stateless, không mở stream SSE dài; rate limit + phiên lưu DB.
- **F17 Realtime**: polling ngắn từ client (chỉ khi tab hiển thị) thay vì giữ kết nối SSE.
- **F15 Auth**: OAuth client tạo trong cùng Google Cloud project; redirect URI production là URL `run.app` (hoặc tên miền F19.9).

## Quyết định / ghi chú
- Nếu sau này cần kết nối dài, job nền nặng, hoặc vượt hạn mức free: chuyển cùng image sang VPS (Docker Compose) — ghi ADR mới khi đó.
