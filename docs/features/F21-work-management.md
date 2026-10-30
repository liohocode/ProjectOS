# F21 — Quản lý công việc đầy đủ cho lead

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 7 | F11, F16.6 | FR-PM-01…06 |

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
| F21.1 | Tạo / sửa feature: tên, owner, stage, kế hoạch (ngày bắt đầu/kết thúc) | M | — | Chưa làm |
| F21.2 | % tiến độ feature tính từ task (bỏ đọc cột `pct` tĩnh) | S | — | Chưa làm |
| F21.3 | Sprint: tạo, đặt sprint hiện tại, gán task vào sprint, lọc theo sprint | M | — | Chưa làm |
| F21.4 | Lưu trữ task (ẩn khỏi list, giữ lịch sử) | S | — | Chưa làm |
| F21.5 | Người bình luận trên task (drawer), dùng chung `TaskComment` | S | F16.4 | Chưa làm |
| F21.6 | Acceptance criteria dạng checklist trên task (người + agent tick) | M | — | Chưa làm |

### F21.1 — Feature CRUD
**Làm gì**: nút "Feature mới" (màn work, `?newFeature=1`) + "Sửa" trên header feature. Mã `FEAT-n` dùng chung với F16.6. Action `createFeature` / `updateFeature` (quyền: thành viên dự án tạo; sửa owner/kế hoạch: tech lead / người tạo dự án — thêm `feature.manage` vào ma trận).
**Hoàn thành khi**:
- [ ] Tạo feature mới hiện ở list + timeline; sửa kế hoạch → timeline đổi (e2e)

### F21.2 — Tiến độ tính từ task
**Làm gì**: `pct` = tỉ lệ task Done (có trọng số story point nếu có ước lượng). Đọc tính toán trong `lib/data/features.ts`; cột `Feature.pct` giữ nguyên (không xoá) nhưng không còn đọc.
**Hoàn thành khi**:
- [ ] Chuyển task sang Done → % feature + portfolio cập nhật (integration)

### F21.3 — Sprint
**Làm gì**: migration chỉ thêm `Task.sprintId?`. Màn work: chọn sprint (hiện tại / tất cả / chưa xếp), dialog tạo sprint + đặt làm hiện tại, gán task vào sprint ở drawer.
**Hoàn thành khi**:
- [ ] Tạo sprint mới, đặt hiện tại → header + timeline dùng sprint mới; lọc task theo sprint (e2e)

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
