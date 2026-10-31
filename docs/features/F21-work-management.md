# F21 — Quản lý công việc đầy đủ cho lead

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 7 | F11, F16.6 | FR-PM-01…06 |

## Mục tiêu
Lead tự quản lý trọn vòng đời feature / sprint / task trên Meridian (hiện chỉ agent đề xuất được feature, sprint chỉ tạo lúc tạo dự án, % tiến độ feature là số tĩnh trong seed).

## Phạm vi
- **Trong**: tạo/sửa feature, tiến độ tính từ task, sprint, lưu trữ task, bình luận của người, acceptance criteria.
- **Ngoài**: cổng review / quy trình (F22), token (F23).

## Tham chiếu
- Code: `lib/actions/tasks.ts`, `lib/domain/features.ts`, `components/work/*`, `lib/data/features.ts`, `lib/data/timeline.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F21.1 | Tạo / sửa feature: tên, owner, stage, kế hoạch (ngày bắt đầu/kết thúc) | M | — | Xong — 2026-10-31 |
| F21.2 | % tiến độ feature tính từ task (bỏ đọc cột `pct` tĩnh) | S | — | Xong — 2026-10-31 |
| F21.3 | Sprint: tạo, đặt sprint hiện tại, gán task vào sprint, lọc theo sprint | M | — | Xong — 2026-10-31 |
| F21.4 | Lưu trữ task (ẩn khỏi list, giữ lịch sử) | S | — | Chưa làm |
| F21.5 | Người bình luận trên task (drawer), dùng chung `TaskComment` | S | F16.4 | Chưa làm |
| F21.6 | Acceptance criteria dạng checklist trên task (người + agent tick) | M | — | Chưa làm |

### F21.1 — Feature CRUD
**Làm gì**: nút "Feature mới" (màn work, `?newFeature=1`) + "Sửa" trên header feature. Mã `FEAT-n` dùng chung với F16.6. Action `createFeature` / `updateFeature` (quyền: thành viên dự án tạo; sửa owner/kế hoạch: tech lead / người tạo dự án — thêm `feature.manage` vào ma trận).
**Hoàn thành khi**:
- [x] Tạo feature mới hiện ở list + timeline; sửa kế hoạch → timeline đổi (integration `lib/actions/features.integration.test.ts`, e2e `feature-crud.spec.ts`)

### F21.2 — Tiến độ tính từ task
**Làm gì**: `pct` = tỉ lệ task Done (có trọng số story point nếu có ước lượng). Đọc tính toán trong `lib/data/features.ts`; cột `Feature.pct` giữ nguyên (không xoá) nhưng không còn đọc.
**Hoàn thành khi**:
- [x] Chuyển task sang Done → % feature + portfolio cập nhật (integration `aggregates.integration.test.ts`)

### F21.3 — Sprint
**Làm gì**: migration chỉ thêm `Task.sprintId?`. Màn work: chọn sprint (hiện tại / tất cả / chưa xếp), dialog tạo sprint + đặt làm hiện tại, gán task vào sprint ở drawer.
**Hoàn thành khi**:
- [x] Tạo sprint mới, đặt hiện tại → header + timeline dùng sprint mới; lọc task theo sprint (e2e `sprints.spec.ts`, integration `lib/actions/sprints.integration.test.ts`)

### F21.4 — Lưu trữ task
**Làm gì**: `Task.archivedAt?`; drawer "Lưu trữ" (xác nhận); task lưu trữ không hiện ở list / MCP `tasks_list`, vẫn mở được qua deep link.
**Hoàn thành khi**:
- [ ] Lưu trữ / khôi phục task có xác nhận (integration + e2e)

### F21.5 — Người bình luận
**Làm gì**: ô bình luận cuối mục "Bình luận" của drawer → `addTaskComment` (thành viên dự án). Ghi sự kiện rail.
**Hoàn thành khi**:
- [ ] Người và agent bình luận xen kẽ, đúng thứ tự (e2e)

### F21.6 — Acceptance criteria
**Làm gì**: model `TaskCriterion(id, taskId, text, doneAt?, doneById?)`; drawer hiện checklist, thêm/sửa/tick; MCP `tasks_list` trả số tiêu chí đã đạt, F24.1 trả đầy đủ.
**Hoàn thành khi**:
- [ ] Lead thêm tiêu chí, agent tick qua MCP (F24) / người tick trên UI

## Quyết định / ghi chú
- **F21.3 (2026-10-31)**: migration chỉ thêm `Task.sprintId?` (FK `SET NULL`, index). Quyền mới `sprint.manage` (tech lead / người tạo dự án) để tạo sprint + đặt hiện tại; xếp task vào sprint là `task.write`. Nút "Sprint" ở toolbar màn work mở dialog `?sprints=1` (ADR-018): danh sách sprint (mới trước), "Đặt làm hiện tại", form sprint mới (mặc định đặt hiện tại; tối đa 60 ngày). Drawer có ô chọn sprint. Bộ lọc "Lọc" thêm Sprint: hiện tại / chưa xếp / từng sprint (`?sprint=current|none|<id>`, mặc định không lọc → không ẩn task nào). Task mới tạo trên web vào sprint hiện tại. Seed: mọi task mẫu thuộc sprint hiện tại của dự án; **production không backfill** — task có sẵn là "chưa xếp" tới khi lead xếp. Chưa có sửa / xoá sprint (thêm khi cần).
- **F21.1 (2026-10-31)**: ma trận quyền thêm `feature.create` (thành viên dự án) và `feature.manage` (tech lead / người tạo dự án — sửa). Nút "Feature mới" ở toolbar màn work (`?newFeature=1`, ADR-018) cho mọi thành viên; nút bút trên header feature cho người có quyền sửa. `createFeature` / `updateFeature` ở `lib/domain/features.ts` dùng chung dãy mã `FEAT-n` với feature agent đề xuất; kiểm tra người phụ trách thuộc dự án, kế hoạch đủ 2 ngày và đúng thứ tự. Ghi sự kiện rail. Chưa có xoá / lưu trữ feature (thêm task nếu cần).
- **F21.2 (2026-10-31)**: `lib/featureProgress.ts` — trọng số story point, task chưa ước lượng tính 1 điểm, feature không có task = 0%. Dùng ở list theo feature, timeline (nhãn "Dev · n%") và trung bình portfolio. Cột `Feature.pct` giữ nguyên nhưng không đọc (đánh dấu CŨ trong schema). **Hệ quả với dữ liệu mẫu**: % hiển thị đổi (vd FEAT-118 62% → 29%) vì giờ phản ánh task thật. Sửa kèm: seed nhật ký MCP mẫu không còn tạo mốc thời gian ở tương lai khi chạy seed sau nửa đêm.
