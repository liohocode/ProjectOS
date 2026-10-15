# F08 — Test tự động & CI

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong | 1 | F07 | NFR-07 |

## Mục tiêu
Hiện repo **không có test nào và không có CI**. Mọi feature sau (đặc biệt thao tác ghi, MCP server) cần lưới an toàn: unit test cho hàm thuần, integration test cho `lib/data/*` + `lib/actions/*` trên DB thật, e2e smoke cho 5 màn, và CI chạy tất cả trên mỗi push.

## Phạm vi
- **Trong**: Vitest (unit + integration), Playwright (e2e smoke), DB test riêng, npm scripts, GitHub Actions.
- **Ngoài**: deploy (F19), test hiệu năng.

## Tham chiếu
- `docs/architecture/data-model.md` → bảng "Số lượng sau seed" (mốc cho integration test)
- Code: `lib/relativeTime.ts`, `components/work/taskStyle.ts`, `lib/data/*`, `lib/actions/docs.ts`, `prisma/seed.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F08.1 | Vitest + unit test hàm thuần | S | — | Xong — 2026-10-14 |
| F08.2 | DB test riêng (`meridian_test`) + script chuẩn bị | S | — | Xong — 2026-10-14 |
| F08.3 | Integration test `lib/data/*` và `lib/actions/docs.ts` | M | F08.1, F08.2 | Xong — 2026-10-14 |
| F08.4 | Playwright e2e smoke 5 màn | M | F08.2 | Xong — 2026-10-14 |
| F08.5 | npm scripts `typecheck`, `test`, `test:e2e`; cập nhật Definition of Done | S | F08.1 | Xong — 2026-10-14 |
| F08.6 | GitHub Actions CI | M | F08.3, F08.5 | Xong — 2026-10-15 |

### F08.1 — Vitest + unit test hàm thuần
**Làm gì**: cài `vitest` (devDependency), tạo `vitest.config.ts` hỗ trợ alias `@/*` (theo `tsconfig.json`). Viết test cho: `formatRelativeVi` (dùng fake timers: giây/phút/giờ/"Hôm qua"/ngày/tuần), `taskRowStyle` + `stageTagClass` + `initials` (`components/work/taskStyle.ts`), bảng map enum trong `lib/data/mcp.ts` (có thể cần export `SESSION_RESULT_LABEL`/`COMMAND_RESULT_LABEL` — chỉ export, không đổi logic).
**File**: `vitest.config.mts`, `lib/relativeTime.test.ts`, `components/work/taskStyle.test.ts`, `lib/data/mcpLabels.ts` + `lib/data/mcpLabels.test.ts`, `package.json`
**Hoàn thành khi**:
- [x] `npx vitest run` chạy xanh, không cần DB (13 test)
- [x] Unit test không import `lib/prisma.ts` (tách khỏi integration)

### F08.2 — DB test riêng + script chuẩn bị
**Làm gì**: tạo database `meridian_test` trong cùng container Postgres (idempotent: `CREATE DATABASE` nếu chưa có). Script `scripts/test-db-prepare.sh` (hoặc npm script `db:test:prepare`): với `DATABASE_URL` trỏ `meridian_test` → `prisma migrate deploy` → `prisma db seed`. Thêm `DATABASE_URL_TEST` vào `.env.example`.
**Lưu ý**: **không** dùng `prisma migrate reset` trong script chạy bởi agent (Prisma chặn lệnh phá dữ liệu khi phát hiện AI agent — xem `.agents/skills/prisma-cli/references/agent-safety.md`); seed đã tự xoá sạch nên không cần reset.
**File**: `scripts/test-db-prepare.ts`, `package.json` (`npm run db:test:prepare`), `.env.example`
**Hoàn thành khi**:
- [x] Chạy script 2 lần liên tiếp đều thành công, DB dev `meridian` không bị đụng tới

### F08.3 — Integration test tầng dữ liệu
**Làm gì**: Vitest project/config riêng (`vitest.integration.config.ts` hoặc `test.projects`) chạy với `DATABASE_URL=$DATABASE_URL_TEST`. Kiểm tra số liệu khớp seed (`data-model.md`): `getProjects` = 3; `getTeamByProject('rv-web')` đúng thành viên; `getFeaturesByProject('rv-web')` = 4 feature, đếm task đúng, `docs` count đúng; `getTasksByProject` + `blocked`; `getDocGroupsByProject` có nhóm "Kho tri thức chung" theo từng project; `getKnowledgeStripStats('rv-web').pendingRevisions` = 2; `getPortfolioSummaries` cho tổng 3 task block; `getMcpSessions` map đúng enum tiếng Việt. Test `approveRevision` (cần mock `revalidatePath` từ `next/cache` bằng `vi.mock`) → revision hết pending, có `approvedById`; reseed trước mỗi file test ghi dữ liệu.
**File**: `vitest.integration.config.mts`, `test/integration-env.ts`, `test/integration-global-setup.ts`, `lib/data/{core,docs,aggregates}.integration.test.ts`, `lib/actions/docs.integration.test.ts`
**Hoàn thành khi**:
- [x] `npm run test:integration` xanh trên DB test vừa chuẩn bị (24 test)
- [x] Test ghi dữ liệu không làm hỏng test đọc (thứ tự chạy độc lập)

### F08.4 — Playwright e2e smoke
**Làm gì**: cài `@playwright/test` + Chromium. `playwright.config.ts` khởi động `npm run dev` (hoặc `build && start`) với DB test. Kịch bản: mở `/` → về `/rv-web/work`; 5 màn của `rv-web` đều render tiêu đề header đúng (`components/layout/screenMeta.ts`); mở task drawer T-418 thấy cảnh báo block; đổi project qua switcher sang `rv-app` giữ nguyên màn; màn docs `?doc=prd-listing` bấm "Duyệt" → reload vẫn "Đã duyệt"/không còn nút.
**File**: `playwright.config.ts` (webServer chạy `scripts/test-db-prepare.ts` trước khi build/start), `e2e/smoke.spec.ts`, `package.json`, `.gitignore` (`test-results/`, `playwright-report/`)
**Hoàn thành khi**:
- [x] `npm run test:e2e` xanh ở local (9 test)

### F08.5 — npm scripts + Definition of Done
**Làm gì**: thêm `typecheck` (`tsc --noEmit`), `test` (unit), `test:integration`, `test:e2e`. Cập nhật `docs/WORKFLOW.md` (Definition of Done) và `CLAUDE.md` để bắt buộc `npm test` (+ integration nếu đụng `lib/data`/`lib/actions`).
**File**: `package.json`, `docs/WORKFLOW.md`, `CLAUDE.md`
**Hoàn thành khi**:
- [x] Các script chạy được, tài liệu đã cập nhật

### F08.6 — GitHub Actions CI
**Làm gì**: workflow `.github/workflows/ci.yml` chạy trên push/PR vào `main`: Node 24, `npm ci`, service container `postgres:16-alpine`, `prisma generate` → `prisma validate` → `prisma migrate deploy` → `prisma db seed` → `lint` → `typecheck` → `build` → `test` → `test:integration`. Job e2e tách riêng (có thể `continue-on-error` lúc đầu).
**Lưu ý**: CI cần duyệt install script cho `prisma`, `@prisma/engines`, `esbuild`, `unrs-resolver` (npm 11 `allowScripts`) — kiểm tra `package.json` đã lưu các approval chưa; nếu chưa, thêm cấu hình tương ứng.
**File**: `.github/workflows/ci.yml`
**Hoàn thành khi**:
- [ ] Push lên GitHub thấy workflow xanh
- [ ] README có badge CI (tuỳ chọn)

## Quyết định / ghi chú
- Chọn Vitest (nhanh, ESM, hợp TS) và Playwright (chuẩn e2e cho Next). Nếu đổi, ghi ADR mới.
- F08.1: Vitest 5 yêu cầu `@types/node` ≥ 22 → nâng lên `^24` (khớp runtime Node 24). Config đặt đuôi `.mts` (repo không phải `"type": "module"`, tránh cảnh báo Vite). Bảng map enum MCP tách ra `lib/data/mcpLabels.ts` (thuần, không import Prisma) để unit test được; test đối chiếu với enum sinh ra ở `lib/generated/prisma/enums.ts` → thêm giá trị enum mới mà quên nhãn sẽ fail. `fsevents` (chỉ macOS) bị `deny` install script — có binary dựng sẵn, không cần. Script `npm test` = `vitest run` đã thêm sớm.
- F08.2: viết bằng TypeScript + `pg` (không dùng `docker exec`) để chạy được cả local lẫn CI (Postgres là service container). Tên DB test bắt buộc chứa `test` — chặn nhầm sang DB thật. Không có `DATABASE_URL_TEST` thì suy ra từ `DATABASE_URL` với tên `meridian_test`.
- F08.3: global setup chạy `scripts/test-db-prepare.ts` một lần (bỏ qua bằng `SKIP_TEST_DB_PREPARE=1`); `test/integration-env.ts` trỏ `DATABASE_URL` sang `DATABASE_URL_TEST` trước khi file test import `lib/prisma.ts` và mock `next/cache`. Chạy tuần tự (`fileParallelism: false`). Test ghi dữ liệu phải tự trả lại trạng thái seed trong `afterAll` — xem `lib/actions/docs.integration.test.ts` làm mẫu cho các action sau (F11+). Lưu ý: `Feature.docs` giờ tính từ quan hệ nên khác số trong mock gốc (FEAT-118: 4, FEAT-119: 2, FEAT-120: 2, FEAT-124: 0).
- F08.4: e2e chạy **bản build production ở cổng 3100** (`npm run build && next start`) trỏ vào DB test — không đụng dev server cổng 3000 và DB dev. Global setup reseed DB test mỗi lần chạy. Phát hiện lỗi UX: bấm "Duyệt" không có phản hồi (nút chỉ biến mất) → ghi vào F12.4; test hiện kiểm tra nút biến mất + số "Revision chờ duyệt" giảm và giữ sau reload.
- F08.5: `typecheck` = `next typegen && tsc --noEmit` — helper type `PageProps`/`LayoutProps` của Next 16 sinh ở `.next/types`, máy sạch (CI) cần `next typegen` trước `tsc`.
- F08.6: 3 job — `check` (lint, typecheck, unit, build; không cần DB), `integration` và `e2e` (Postgres service container; script tự tạo `meridian_test`). Approval install script đã nằm trong `allowScripts` của `package.json` nên `npm ci` chạy được. Cú pháp YAML đã kiểm tra ở local; cần push để xác nhận chạy thật.
