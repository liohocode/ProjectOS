# F09 — Chuẩn hoá mô hình dữ liệu

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 1 | F07 (khuyến nghị F08.3 trước để có test bảo vệ) | NFR-11, FR-WK-05 |

## Mục tiêu
Xoá các field "chuỗi hiển thị" còn sót từ mock (`"5đ"`, `"22/08"`, `"chạy 14 phút"`, `"Sprint 14 · 12–26/08"`, `"182K"`) và đưa timeline vào DB — trước khi làm các thao tác ghi (F11+) và MCP server (F16), vì những feature đó cần ghi/so sánh giá trị thật.

## Phạm vi
- **Trong**: migration Prisma, cập nhật seed (parse chuỗi cũ trong `prisma/seed-data/` thành giá trị thật), cập nhật `lib/data/*` để **vẫn trả đúng chuỗi hiển thị như cũ** cho UI.
- **Ngoài**: thay đổi giao diện; form nhập liệu (F11/F13).

## Tham chiếu
- `docs/architecture/data-model.md` → "Điểm còn tạm"
- Code: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/data/{projects,features,timeline,mcp,team}.ts`

## Nguyên tắc chung cho mọi task
1. Sửa schema → `npx prisma migrate dev --name <tên>` → `npx prisma generate` → khởi động lại dev server.
2. `lib/types.ts` và UI **giữ nguyên** (chữ ký `lib/data/*` không đổi) trừ khi task ghi rõ.
3. Cập nhật `docs/architecture/data-model.md` (bảng + mục "Điểm còn tạm") trong cùng commit.
4. So sánh trước/sau trên trình duyệt: 5 màn × 3 project hiển thị y hệt.

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F09.1 | Model `Sprint` thay `Project.sprint` chuỗi | M | — | Xong — 2026-10-14 |
| F09.2 | Task: `estimatePoints`, `dueDate`, `runningSince`, enum `TaskStatus` | M | — | Xong — 2026-10-14 |
| F09.3 | Kế hoạch feature trong DB, bỏ mock `lib/data/timeline.ts` | M | F09.1 | Xong — 2026-10-14 |
| F09.4 | `McpSession.tokensUsed`/`endedAt`; enum `MemberStatus` | S | — | Xong — 2026-10-14 |
| F09.5 | Cập nhật test integration + tài liệu sau chuẩn hoá | S | F09.1–F09.4, F08.3 | Chưa làm |

### F09.1 — Model Sprint
**Làm gì**: thêm `Sprint(id cuid, projectId, name "Sprint 14", startDate, endDate)` + `Project.currentSprintId?`. Seed parse `"Sprint 14 · 12–26/08"` và `"Sprint 22 · 18/08–01/09"` (năm 2026). Bỏ cột `Project.sprint`. `lib/data/projects.ts` dựng lại chuỗi hiển thị `"Sprint 14 · 12–26/08"` từ sprint hiện tại → `Project.sprint` trong `lib/types.ts` giữ nguyên.
**File**: `prisma/schema.prisma`, `prisma/migrations/*_sprint_model/migration.sql`, `prisma/seed.ts`, `lib/sprint.ts` (+ test), `lib/data/projects.ts`
**Hoàn thành khi**:
- [x] Header context và card Portfolio hiển thị sprint y như trước
- [x] Hàm format sprint có unit test

### F09.2 — Field kiểu thật cho Task
**Làm gì**: `est String` → `estimatePoints Int?` (`"5đ"`→5, `"—"`→null); `due String` → `dueDate DateTime?` (`"22/08"` → 2026-08-22); `running String?` → `runningSince DateTime?` (`"chạy 14 phút"` → now − 14 phút lúc seed); `status String` → enum `TaskStatus` (`DangLam @map("Đang làm")`, `Cho @map("Chờ")`, `ChoReview @map("Chờ review")`, `DangChay @map("Đang chạy")`, `Xong`). `lib/data/features.ts` format lại: `est` = `"5đ"`/`"—"`, `due` = `"dd/MM"`, `running` = `"chạy N phút"` (tính từ `runningSince`), `status` = chuỗi tiếng Việt. Kiểm tra `lib/data/activity.ts` và `lib/data/taskDrawer.ts` vẫn dùng đúng (chúng đọc `Task` đã format).
**File**: `prisma/schema.prisma`, `prisma/migrations/*_task_typed_fields/migration.sql`, `prisma/seed.ts`, `lib/taskFormat.ts` (+ test), `lib/data/features.ts`
**Hoàn thành khi**:
- [x] Task row, drawer, banner block, activity rail hiển thị như cũ (e2e xanh)
- [x] "chạy N phút" tăng dần theo thời gian thật khi reload

### F09.3 — Timeline trong DB
**Làm gì**: thêm `Feature.plannedStart DateTime?`, `Feature.plannedEnd DateTime?`; cho phép `Feature.ownerId` null (feature đã lên kế hoạch nhưng chưa giao — vd `FEAT-126 Docs index nâng cấp`). Seed: chuyển dữ liệu từ `lib/data/timeline.ts` (tuần T1–T8 tính từ ngày bắt đầu sprint hiện tại) và tạo các feature chưa giao (`FEAT-126`, `FEAT-212`, `FEAT-309`). `getTimelineByProject` đọc từ DB, quy đổi ngày → `start`/`len` theo tuần, `kind` = kind của owner hoặc `"none"`, `label` sinh từ stage/pct. Xoá dữ liệu mock trong `lib/data/timeline.ts` (giữ hàm).
**Lưu ý UI** (đã chốt với người dùng 2026-10-14): feature chưa giao **vẫn hiện ở list view** — header feature với owner "Chưa giao" và một dòng "Chưa có task" (cần CSS nhỏ trong `globals.css`).
**File**: `prisma/schema.prisma`, `prisma/migrations/*_feature_planning/`, `prisma/seed.ts`, `prisma/seed-data/timeline.ts`, `prisma/seed-data/types.ts`, `lib/timeline.ts` (+ test), `lib/data/timeline.ts`, `lib/data/features.ts`, `lib/types.ts`, `components/work/FeatureSection.tsx`, `app/globals.css`
**Hoàn thành khi**:
- [x] Timeline 3 project hiển thị như trước (vị trí bar giữ nguyên — integration test đối chiếu từng bar)
- [x] Không còn dữ liệu mock nào trong `lib/data/` (đã cập nhật `CLAUDE.md`)

### F09.4 — Phiên MCP và trạng thái thành viên
**Làm gì**: `McpSession.tokens String` → `tokensUsed Int` (`"182K"` → 182000), thêm `endedAt DateTime?` và tính `durationMin` từ `startedAt`/`endedAt` (phiên đang chạy: tới hiện tại); `lib/data/mcp.ts` format lại `"182K"`. `Member.status` → enum `MemberStatus` (`DangChay`, `DangLam`, `DangReview`, `Cho`) map tiếng Việt.
**File**: `prisma/schema.prisma`, `prisma/migrations/*_session_tokens_member_status/`, `prisma/seed.ts`, `lib/mcpFormat.ts` + `lib/memberFormat.ts` (+ test), `lib/data/mcp.ts`, `lib/data/team.ts`
**Hoàn thành khi**:
- [x] Bảng phiên chạy và danh sách thành viên hiển thị như cũ

### F09.5 — Cập nhật test + tài liệu
**Làm gì**: chỉnh integration test (F08.3) theo schema mới; cập nhật `docs/architecture/data-model.md` (xoá các dòng đã xử lý khỏi "Điểm còn tạm", cập nhật bảng số lượng nếu thêm feature chưa giao).
**Hoàn thành khi**:
- [ ] `npm run test:integration` xanh, tài liệu khớp schema

## Quyết định / ghi chú
- Giữ `Feature.pct` nhập tay (không tính từ số task Done) — đúng spec gốc.
- 2026-10-14: người dùng xác nhận feature đã lên kế hoạch nhưng chưa giao vẫn hiển thị ở list view (F09.3).
- F09.1: `migrate dev` từ chối chạy không tương tác khi có thay đổi mất dữ liệu (xoá cột). Cách làm (dùng lại cho F09.2–F09.4): `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` sinh SQL → tự tạo thư mục migration và **chèn bước chuyển dữ liệu trước khi xoá cột** → `prisma migrate deploy` → kiểm tra diff rỗng → `prisma generate` → khởi động lại dev server. Migration parse nhãn sprint cũ bằng regex SQL giống `lib/sprint.ts`, không mất dữ liệu ở DB dev. Seed tạo project → sprint → gán `currentSprintId` (3 bước, vì 2 bảng trỏ vào nhau).
- F09.2: `status` đổi kiểu tại chỗ (`USING status::"TaskStatus"`) vì giá trị chuỗi cũ trùng giá trị `@map` của enum. `formatRunning` hiển thị "chạy N giờ M phút" khi ≥ 60 phút (trước đây chỉ có phút). Integration test của "chạy N phút" chấp nhận lệch 1 phút (tính từ thời điểm seed).
- F09.3: nhãn bar timeline giờ sinh từ dữ liệu (`<stage> · <pct>%`, chưa giao → "Chưa bắt đầu") thay cho nhãn viết tay cũ ("Agent · 2 task", "BA đang phân tích"…); tên owner hiển thị đầy đủ ("Trần Mỹ Linh" thay vì "Linh"). Feature chưa giao được tính vào số feature và % trung bình ở Portfolio (rv-web: 5 feature, 39%). Thêm `Feature.ownerKind` để avatar owner đúng loại người/agent — trước đây header feature luôn vẽ avatar người kể cả owner là agent. Snapshot seed (`prisma/seed-data/*`) giờ dùng type cục bộ trong `prisma/seed-data/types.ts` (đúng ADR-007) — đổi `lib/types.ts` không còn làm hỏng seed. Đã seed lại DB dev.
- F09.4: bỏ cột `durationMin` — thời lượng tính từ `startedAt`/`endedAt` nên phiên đang chạy tự tăng. `Member.current` **chưa** suy ra từ task (để F17 làm cùng bảng sự kiện) — ghi trong `data-model.md`. Quy trình migration mất dữ liệu đã đưa vào `CLAUDE.md` (quy tắc 4).
