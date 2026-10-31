# F22 — Quy trình & cổng chất lượng

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 7 | F16.4, F21.6 | FR-QA-01…05 |

## Mục tiêu
Đảm bảo chất lượng khi agent làm việc: task không tự "xong" mà đi qua **cổng review của người**, có tiêu chí hoàn thành, gắn với PR thật, và có số liệu để biết quy trình đang tốt hay xấu.

## Phạm vi
- **Trong**: duyệt / trả lại task ở Review, Definition of Done theo dự án, liên kết PR / branch, lịch sử chuyển trạng thái, chỉ số chất lượng.
- **Ngoài**: đọc trạng thái PR / CI tự động từ GitHub (F26.3), token (F23).

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F22.1 | Lịch sử chuyển stage / trạng thái task (`TaskTransition`) — ghi từ UI + MCP | S | — | Xong — 2026-10-31 |
| F22.2 | Cổng review: task ở Review → người duyệt (Done) hoặc trả lại (về Dev + lý do) | M | F22.1 | Xong — 2026-10-31 |
| F22.3 | Definition of Done theo dự án: checklist áp khi chuyển sang Review / Done | M | F21.6 | Chưa làm |
| F22.4 | Liên kết PR / branch / commit trên task (agent báo qua MCP, người nhập tay) | S | — | Xong — 2026-10-31 |
| F22.5 | Chỉ số chất lượng: cycle time, số lần trả lại, thời gian bị block — theo dự án / agent / người | M | F22.1, F22.2 | Chưa làm |

### F22.1 — Lịch sử chuyển trạng thái
**Làm gì**: model `TaskTransition(taskId, actorId, from/to stage, from/to status, at, via: web|mcp)`; ghi ở mọi chỗ đổi stage/status (server action, `claimTask`, `updateTaskByAgent`). Nền cho F22.2, F22.5.
**Hoàn thành khi**:
- [x] Mọi đường đổi stage đều có dòng transition (integration `lib/domain/taskTransitions.integration.test.ts`)

### F22.2 — Cổng review
**Làm gì**: khu "Chờ review" (màn work + inbox F25.3): task stage Review hiển thị nút Duyệt (→ Done) / Trả lại (lý do bắt buộc → stage Dev, bình luận tự động). Quyền `task.review` (tech lead / người tạo dự án / người được chỉ định review). MCP: agent thấy lý do trả lại qua `tasks_list` / F24.1.
**Hoàn thành khi**:
- [x] Agent đẩy Review → lead trả lại kèm lý do → agent thấy lý do và làm lại → lead duyệt Done (integration `lib/domain/taskReview.integration.test.ts`, e2e `review-gate.spec.ts`)

### F22.3 — Definition of Done
**Làm gì**: cấu hình dự án: danh sách tiêu chí mặc định (vd "Có test", "PR đã review", "Cập nhật tài liệu"); chuyển sang Review cần mọi acceptance criteria (F21.6) đạt; Done cần DoD đạt (người tick khi duyệt).
**Hoàn thành khi**:
- [ ] Chuyển Review khi còn tiêu chí chưa đạt → bị chặn kèm lý do (UI + MCP)

### F22.4 — Liên kết PR
**Làm gì**: `Task.links` (PR URL, branch, commit) — MCP `tasks_update_status` nhận `prUrl?`, `branch?`; drawer hiện link.
**Hoàn thành khi**:
- [x] Agent báo PR qua MCP → drawer hiện link PR (integration `lib/domain/tasks.integration.test.ts`, e2e `task-links.spec.ts`)

### F22.5 — Chỉ số chất lượng
**Làm gì**: trang "Chất lượng" (hoặc mục trong Portfolio): cycle time trung vị (Dev → Done), tỉ lệ trả lại, tổng thời gian bị block — lọc theo dự án / sprint / agent / người. Tính từ `TaskTransition`.
**Hoàn thành khi**:
- [ ] Số liệu khớp dữ liệu transition mẫu (integration)

## Quyết định / ghi chú
- **F22.4 (2026-10-31)**: ba cột thường `Task.prUrl` / `branch` / `commitSha` (migration chỉ thêm) thay vì JSON `links` — truy vấn / lọc dễ, một task một PR là đủ cho giai đoạn này (nhiều PR thì thêm bảng sau). Kiểm tra chung ở `lib/taskLinks.ts` (PR chỉ http(s), branch theo luật ref git rút gọn, commit hex 7–40 → chữ thường). MCP `tasks_update_status` nhận `prUrl?`, `branch?`, `commit?`; chỉ báo liên kết thì không ghi `TaskTransition` và không nhả task. Người nhập ở form "Sửa" trong drawer; drawer hiện PR dạng `owner/repo#số`. `tasks_list` / `context_get` trả `links`. Đọc trạng thái PR / CI tự động là F26.3.
- **F22.2 (2026-10-31)**: quyền `task.review` (tech lead / người tạo dự án — chưa có "người được chỉ định review", thêm khi cần). `lib/domain/taskReview.ts`: Duyệt → Done + "Xong"; Trả lại → Dev + "Đang làm", lý do lưu ở `TaskTransition.note` (migration chỉ thêm cột) **và** bình luận "Trả lại sau review: …" để hiện trong drawer. Cả hai xoá `runningSince`. Chặn thêm: task giao cho **agent** chỉ sang Done qua người có `task.review` (kể cả nút "Chuyển stage"); task của người thì thành viên vẫn tự Done được. MCP `tasks_list` trả `lastReturn { reason, at }`. UI: danh sách "Chờ review" trên list màn work (mở drawer), khung "Review" trong drawer cho người có quyền. Inbox gom mọi việc chờ duyệt là F25.2.
- **F22.1 (2026-10-31)**: migration chỉ thêm `task_transitions` + enum `TransitionVia` (`web` / `mcp`). `lib/domain/taskTransitions.ts`: `transitionTask(db, taskId, actorId, via, change, extra)` — mọi đường đổi stage / trạng thái dùng chung (server action `updateTaskStage` / `updateTaskStatus`, MCP `claimTask` / `updateTaskByAgent`), chạy được trong transaction; chỉ ghi khi giá trị thật sự đổi, chỉ ghi phần đổi (stage hoặc status). Tạo task ghi dòng đầu (`from*` null). **Không** dựng lịch sử cho task có sẵn (production, dữ liệu mẫu) — số liệu F22.5 tính từ lúc có bảng; task cũ thiếu dòng tạo được coi là bắt đầu tại lần chuyển đầu tiên.
