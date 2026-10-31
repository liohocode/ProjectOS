# F22 — Quy trình & cổng chất lượng

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong | 7 | F16.4, F21.6 | FR-QA-01…05 |

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
| F22.3 | Cổng vào Review: mọi acceptance criteria (F21.6) phải đạt — chặn ở UI + MCP | S | F21.6 | Xong — 2026-10-31 |
| F22.6 | Definition of Done theo dự án: checklist mặc định (vd "Có test", "PR đã review", "Cập nhật tài liệu") người tick khi duyệt Done | M | F22.3 | Xong — 2026-10-31 |
| F22.4 | Liên kết PR / branch / commit trên task (agent báo qua MCP, người nhập tay) | S | — | Xong — 2026-10-31 |
| F22.5 | Chỉ số chất lượng: cycle time, số lần trả lại — theo dự án / agent / người | M | F22.1, F22.2 | Xong — 2026-10-31 |
| F22.7 | Lịch sử block (đặt / gỡ) + thời gian bị block trong chỉ số chất lượng; lọc chỉ số theo sprint | S | F22.5 | Xong — 2026-10-31 |

### F22.1 — Lịch sử chuyển trạng thái
**Làm gì**: model `TaskTransition(taskId, actorId, from/to stage, from/to status, at, via: web|mcp)`; ghi ở mọi chỗ đổi stage/status (server action, `claimTask`, `updateTaskByAgent`). Nền cho F22.2, F22.5.
**Hoàn thành khi**:
- [x] Mọi đường đổi stage đều có dòng transition (integration `lib/domain/taskTransitions.integration.test.ts`)

### F22.2 — Cổng review
**Làm gì**: khu "Chờ review" (màn work + inbox F25.3): task stage Review hiển thị nút Duyệt (→ Done) / Trả lại (lý do bắt buộc → stage Dev, bình luận tự động). Quyền `task.review` (tech lead / người tạo dự án / người được chỉ định review). MCP: agent thấy lý do trả lại qua `tasks_list` / F24.1.
**Hoàn thành khi**:
- [x] Agent đẩy Review → lead trả lại kèm lý do → agent thấy lý do và làm lại → lead duyệt Done (integration `lib/domain/taskReview.integration.test.ts`, e2e `review-gate.spec.ts`)

### F22.3 — Cổng vào Review
**Làm gì**: chuyển sang Review cần mọi acceptance criteria (F21.6) đạt — server action `updateTaskStage` và MCP `tasks_update_status`.
**Hoàn thành khi**:
- [x] Chuyển Review khi còn tiêu chí chưa đạt → bị chặn kèm lý do (UI + MCP) (integration `lib/domain/reviewGate.integration.test.ts`, e2e `review-criteria-gate.spec.ts`)

### F22.6 — Definition of Done theo dự án
**Làm gì**: cấu hình dự án: danh sách tiêu chí mặc định (vd "Có test", "PR đã review", "Cập nhật tài liệu"); Done cần DoD đạt (người tick khi duyệt ở khung Review).
**Hoàn thành khi**:
- [x] Duyệt Done khi còn mục DoD chưa tick → bị chặn; DoD sửa được theo dự án (integration `lib/domain/doneDefinition.integration.test.ts`, e2e `review-dod.spec.ts`)

### F22.4 — Liên kết PR
**Làm gì**: `Task.links` (PR URL, branch, commit) — MCP `tasks_update_status` nhận `prUrl?`, `branch?`; drawer hiện link.
**Hoàn thành khi**:
- [x] Agent báo PR qua MCP → drawer hiện link PR (integration `lib/domain/tasks.integration.test.ts`, e2e `task-links.spec.ts`)

### F22.5 — Chỉ số chất lượng
**Làm gì**: trang "Chất lượng" (hoặc mục trong Portfolio): cycle time trung vị (Dev → Done), tỉ lệ trả lại, tổng thời gian bị block — lọc theo dự án / sprint / agent / người. Tính từ `TaskTransition`.
**Hoàn thành khi**:
- [x] Số liệu khớp dữ liệu transition mẫu (integration `lib/data/quality.integration.test.ts`, e2e `quality.spec.ts`)

## Quyết định / ghi chú
- **F22.6 (2026-10-31)**: migration chỉ thêm cột `Project.doneDefinition String[]` (rỗng = không yêu cầu — không cần bảng riêng vì chỉ là danh sách chữ, ≤ 12 mục). Khung Review (drawer + inbox) hiện checklist DoD; "Duyệt → Done" khoá tới khi tick đủ; server (`reviewTask`) kiểm lại, ghi DoD đã xác nhận vào ghi chú của transition (`DoD: …`). Sửa DoD ở màn Roadmap (`feature.manage`, mỗi dòng một mục, `lib/doneDefinition.ts`). Agent thấy DoD qua `context_get`. Sửa kèm: `lastReturn` (MCP) chỉ lấy transition Review → Dev (trước đây ghi chú DoD khi duyệt có thể bị hiểu nhầm là lý do trả lại). Seed: crm có 3 mục DoD; rv-web để trống. **F22 xong 7/7.**
- **F22.7 (2026-10-31)**: migration chỉ thêm bảng `task_blocks` (`reason`, `blockedAt`, `unblockedAt?`). `applyBlock` (`lib/domain/taskBlocks.ts`, cùng transaction với `Task.blocked`): chưa block → mở dòng; đang block → đổi lý do trên dòng mở; gỡ → đóng dòng. Import kế hoạch (F28.2) mở / đóng theo lô. Chỉ số chất lượng thêm "Thời gian bị block" (tổng, block chưa gỡ tính tới hiện tại) + số task từng bị block, cột "Bị block" theo người / agent; lọc theo sprint (`?qsprint=` ở Portfolio, mặc định mọi sprint). Seed: task đang block có dòng mở từ 1 ngày trước. Task block trước khi có bảng không có lịch sử.
- **F22.5 (2026-10-31)**: mục "Chất lượng — <dự án>" ở **Portfolio** cho dự án đang mở (không thêm màn mới): cycle time trung vị (lần đầu vào Dev → lần cuối vào Done, chỉ task đang Done), tỉ lệ task bị trả lại / task đã qua Review, tổng số lần trả lại (Review → Dev có lý do), bảng theo người / agent đang được giao. Hàm thuần `lib/qualityMetrics.ts`, đọc `lib/data/quality.ts` (task feature đang chạy, chưa lưu trữ). **Thời gian bị block chưa tính được** — `blocked` là cột trạng thái, không có lịch sử đặt / gỡ → tách F22.7 (kèm lọc theo sprint). Seed thêm lịch sử mẫu cho T-390, T-388 (1 lần trả lại), T-624.
- **F22.3 (2026-10-31)**: tách F22.3 cũ thành cổng vào Review (làm ngay — chỉ dùng acceptance criteria F21.6, không cần cấu hình mới) và F22.6 (DoD theo dự án — cần model cấu hình dự án). Chặn khi stage **đổi sang** Review (task đã ở Review không bị chặn lại); task không có tiêu chí → không chặn. Lý do liệt kê tối đa 3 tiêu chí chưa đạt (`lib/reviewGate.ts`); kiểm tra ở `reviewGateBlocker` (`lib/domain/taskCriteria.ts`), gọi từ `updateTaskStage` (web) và `updateTaskByAgent` (MCP). Đổi riêng status sang "Chờ review" không bị chặn (không đổi stage).
- **F22.4 (2026-10-31)**: ba cột thường `Task.prUrl` / `branch` / `commitSha` (migration chỉ thêm) thay vì JSON `links` — truy vấn / lọc dễ, một task một PR là đủ cho giai đoạn này (nhiều PR thì thêm bảng sau). Kiểm tra chung ở `lib/taskLinks.ts` (PR chỉ http(s), branch theo luật ref git rút gọn, commit hex 7–40 → chữ thường). MCP `tasks_update_status` nhận `prUrl?`, `branch?`, `commit?`; chỉ báo liên kết thì không ghi `TaskTransition` và không nhả task. Người nhập ở form "Sửa" trong drawer; drawer hiện PR dạng `owner/repo#số`. `tasks_list` / `context_get` trả `links`. Đọc trạng thái PR / CI tự động là F26.3.
- **F22.2 (2026-10-31)**: quyền `task.review` (tech lead / người tạo dự án — chưa có "người được chỉ định review", thêm khi cần). `lib/domain/taskReview.ts`: Duyệt → Done + "Xong"; Trả lại → Dev + "Đang làm", lý do lưu ở `TaskTransition.note` (migration chỉ thêm cột) **và** bình luận "Trả lại sau review: …" để hiện trong drawer. Cả hai xoá `runningSince`. Chặn thêm: task giao cho **agent** chỉ sang Done qua người có `task.review` (kể cả nút "Chuyển stage"); task của người thì thành viên vẫn tự Done được. MCP `tasks_list` trả `lastReturn { reason, at }`. UI: danh sách "Chờ review" trên list màn work (mở drawer), khung "Review" trong drawer cho người có quyền. Inbox gom mọi việc chờ duyệt là F25.2.
- **F22.1 (2026-10-31)**: migration chỉ thêm `task_transitions` + enum `TransitionVia` (`web` / `mcp`). `lib/domain/taskTransitions.ts`: `transitionTask(db, taskId, actorId, via, change, extra)` — mọi đường đổi stage / trạng thái dùng chung (server action `updateTaskStage` / `updateTaskStatus`, MCP `claimTask` / `updateTaskByAgent`), chạy được trong transaction; chỉ ghi khi giá trị thật sự đổi, chỉ ghi phần đổi (stage hoặc status). Tạo task ghi dòng đầu (`from*` null). **Không** dựng lịch sử cho task có sẵn (production, dữ liệu mẫu) — số liệu F22.5 tính từ lúc có bảng; task cũ thiếu dòng tạo được coi là bắt đầu tại lần chuyển đầu tiên.
