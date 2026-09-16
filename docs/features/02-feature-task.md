# 02 — Feature & Task

**Trạng thái:** Xong (v1) — màn mặc định của app (`/[project]/work`).

## Mục tiêu
Lead điều phối công việc giữa người và agent: xem feature/task theo dạng list hoặc timeline, mở task drawer để xem chi tiết.

## Tham chiếu
`docs/design-reference.md` → mục "3. Feature & Task", cộng "State Management" (`view`, `doc` không dùng ở đây, `task`, `closed`, `rail`) và "Interactions & Behavior".

## Data đã sẵn có
`lib/data/features.ts` — `getFeaturesByProject(projectId)`, `getTasksByProject(projectId)`. Type: `Feature`, `Task` trong `lib/types.ts`.

## Đã làm
- [x] Toolbar: segmented control "Theo feature" / "Timeline", đếm task, toggle activity rail. (`components/work/WorkScreen.tsx`)
- [x] Banner block khi có task bị block.
- [x] View "Theo feature": `FeatureSection` (`.frow` + caret gập/mở, state `closed`) + `TaskRow` (`.trow`, border trái theo kind/blocked, cột cờ block/running).
- [x] Responsive container query `.trow`/`.frow` — container `list` khai báo ở `.list-area` trong `globals.css`.
- [x] View "Timeline": `TimelineView` + `lib/data/timeline.ts` (start/len tự bổ sung cho cả 3 project, xem ghi chú).
- [x] Activity rail: `lib/data/activity.ts` — suy ra từ task (running/blocked/chờ review) + revision docs đang chờ duyệt, không phải mock rời rạc.
- [x] Task drawer: `TaskDrawer` + `lib/data/taskDrawer.ts` (context docs từ doc group của feature, session log sinh theo template dựa trên trạng thái task).

## Còn thiếu / cần làm tiếp
- [ ] Nút "Chuyển stage" / "Giao cho agent" trong drawer chưa có hành vi (chỉ là UI).
- [ ] Nút "Xem tất cả" ở banner block chưa điều hướng đi đâu.
- [ ] `lib/data/timeline.ts` cho rv-app/crm là dữ liệu tự soạn thêm (bản gốc design chỉ có timeline mẫu cho rv-web) — điều chỉnh lại nếu có yêu cầu cụ thể hơn.

## Ghi chú
- `view`, `closed`, `railOpen`, `openTaskId` là state client trong `WorkScreen` — không đưa lên layout dùng chung vì chỉ màn này cần.
- Activity feed và task drawer log **suy ra từ dữ liệu task/doc thật** thay vì mock song song, để tránh lệch dữ liệu giữa các nơi hiển thị cùng một task.
