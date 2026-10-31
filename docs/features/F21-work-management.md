# F21 — Quản lý công việc đầy đủ cho lead

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong | 7 | F11, F16.6 | FR-PM-01…11 |

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
| F21.4 | Lưu trữ task (ẩn khỏi list, giữ lịch sử) | S | — | Xong — 2026-10-31 |
| F21.5 | Người bình luận trên task (drawer), dùng chung `TaskComment` | S | F16.4 | Xong — 2026-10-31 |
| F21.6 | Acceptance criteria dạng checklist trên task (người + agent tick) | M | — | Xong — 2026-10-31 |
| F21.11 | Hiển thị markdown (GFM: bảng, danh sách, code) dùng chung — mô tả task / feature, tài liệu | S | — | Xong — 2026-10-31 |
| F21.7 | Mô tả task (markdown "Làm gì"), cỡ S / M / L, mã hiển thị (vd `F21.3`), nhãn "Cần quyết định" — UI + MCP `context_get` | M | F21.11 | Xong — 2026-10-31 |
| F21.8 | Phụ thuộc giữa task: drawer thêm / bỏ, hiện task đang chặn; `tasks_claim` bị chặn khi phụ thuộc chưa Done | M | — | Xong — 2026-10-31 |
| F21.9 | Trang chi tiết feature: mục tiêu, phạm vi, ghi chú quyết định (markdown), task, tài liệu, tiến độ | M | F21.11 | Xong — 2026-10-31 |
| F21.10 | Lưu trữ feature; sắp xếp thứ tự ưu tiên feature / task | S | — | Xong — 2026-10-31 |

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
- [x] Lưu trữ / khôi phục task có xác nhận (integration `lib/actions/archiveTask.integration.test.ts`, e2e `archive-task.spec.ts`)

### F21.5 — Người bình luận
**Làm gì**: ô bình luận cuối mục "Bình luận" của drawer → `addTaskComment` (thành viên dự án). Ghi sự kiện rail.
**Hoàn thành khi**:
- [x] Người và agent bình luận xen kẽ, đúng thứ tự (e2e `human-comments.spec.ts`, integration `lib/actions/tasks.integration.test.ts`)

### F21.6 — Acceptance criteria
**Làm gì**: model `TaskCriterion(id, taskId, text, doneAt?, doneById?)`; drawer hiện checklist, thêm/sửa/tick; MCP `tasks_list` trả số tiêu chí đã đạt, F24.1 trả đầy đủ.
**Hoàn thành khi**:
- [x] Lead thêm tiêu chí, agent tick qua MCP (F24) / người tick trên UI (integration `lib/actions/criteria.integration.test.ts`, MCP `app/api/mcp/client.integration.test.ts`, e2e `task-criteria.spec.ts`)

## Quyết định / ghi chú
- **F21.10 (2026-10-31)**: migration chỉ thêm `Feature.archivedAt?`, `Feature.position?`, `Task.position?`. Lưu trữ feature (`feature.manage`, xác nhận ở trang chi tiết) ẩn feature + task của nó khỏi list, đếm, timeline, inbox, chỉ số chất lượng, MCP (`tasks_claim` báo "đã được lưu trữ"); trang chi tiết vẫn mở bằng link, có banner + "Khôi phục"; chặn khi còn task đang chạy. Tài liệu của feature lưu trữ vẫn ở màn Docs. Thứ tự: `position` nhỏ trước, chưa đặt xếp cuối theo id (`PRIORITY_ORDER`); nút ▲▼ ở header feature (màn work, `feature.manage`) và cạnh task ở trang chi tiết (`task.write`) — đổi chỗ với hàng xóm rồi ghi lại position 1..n (`lib/reorder.ts`). Sửa kèm seed: nhật ký MCP mẫu dời cả nhóm khi mốc muộn nhất ở tương lai (trước đây lùi từng dòng một ngày → đảo thứ tự tuỳ giờ chạy seed, test log phiên chạy F17.4 hỏng khoảng 14:21–14:32).
- **F21.9 (2026-10-31)**: migration chỉ thêm `Feature.goal?` / `scope?` / `notes?` (markdown — ứng với "Mục tiêu", "Phạm vi", "Quyết định / ghi chú" của file feature `.md`, dùng cho import F28.2). Route `/[project]/work/features/[featureId]` (tên feature ở màn work là link): tiến độ, người phụ trách, kế hoạch, task (link mở drawer), tài liệu gắn feature. "Sửa nội dung" — quyền `feature.manage` (`updateFeatureContent`, rỗng = xoá). Seed: FEAT-118 có nội dung mẫu.
- **F21.8 (2026-10-31)**: migration chỉ thêm bảng `task_dependencies` (khoá chính `taskId + dependsOnId`, cascade khi xoá task). Cùng dự án, không vòng (`lib/taskDeps.ts`, kiểm tra trong transaction có advisory lock theo dự án). Quyền `task.write`. Drawer mục "Phụ thuộc": task cần xong trước (bỏ được) + task đang chờ task này, link mở task đó; hàng task hiện "chờ T-…" khi còn phụ thuộc chưa Done. MCP: `tasks_claim` trả "đang chờ … xong trước", `tasks_list` trả `waitingOn`. Chỉ chặn **bắt đầu** (claim) — người vẫn chuyển stage tay được. Task đã lưu trữ không tính là đang chờ.
- **F21.7 (2026-10-31)**: migration chỉ thêm `Task.description?` (markdown, ≤ 10.000 ký tự), `size?` (enum `TaskSize` S/M/L), `code?` (mã trong kế hoạch, vd `F21.3` — id vẫn `T-n`, dùng cho import F28.2), `needsDecision` (mặc định false). Sửa ở form "Sửa" của drawer (chuỗi rỗng = xoá), tạo task có mô tả + cỡ. Drawer: mã / cỡ / nhãn "Cần quyết định" ở đầu, mục "Mô tả" (markdown); hàng task hiện mã + nhãn. MCP: `tasks_list` trả `code`, `size`, `needsDecision`; `context_get` trả thêm `description`. Seed: T-396 có mô tả (bảng), T-418 cần quyết định. **Sửa test integration chập chờn tận gốc**: các file integration chạy tuần tự, nhưng nhiều file để lại `ActivityEvent` → feed rv-web (30 mục mới nhất) mất sự kiện seed khi `aggregates.integration.test.ts` chạy sau. `test/integration-env.ts` giờ xoá mọi sự kiện do file test tạo ra (afterAll chung) — chẩn đoán "chạy song song" ở F21.6 là sai.
- **F21.11 (2026-10-31)**: `components/ui/Markdown.tsx` (ADR-023: `react-markdown` + `remark-gfm`, không HTML thô). Đoạn tài liệu ở màn Docs hiển thị markdown; `markdownToSections` giữ xuống dòng / thụt lề / khối code (trước đây nối dòng bằng dấu cách làm vỡ bảng, danh sách). Mô tả task / feature dùng component này ở F21.7 / F21.9.

### F21.7 — Mô tả, cỡ, mã, cần quyết định
**Hoàn thành khi**:
- [x] Người sửa mô tả / cỡ / mã / "Cần quyết định" ở drawer, mô tả hiển thị markdown; agent đọc qua `context_get` (integration `lib/actions/tasks.integration.test.ts`, MCP `app/api/mcp/client.integration.test.ts`, e2e `task-description.spec.ts`)

### F21.8 — Phụ thuộc giữa task
**Hoàn thành khi**:
- [x] Thêm / bỏ phụ thuộc ở drawer (chặn tự phụ thuộc, vòng, khác dự án); agent không claim được task còn chờ (integration `lib/actions/taskDependencies.integration.test.ts`, e2e `task-dependencies.spec.ts`)

### F21.9 — Trang chi tiết feature
**Hoàn thành khi**:
- [x] Mở từ màn work, xem mục tiêu / phạm vi / ghi chú (markdown), task, tài liệu; tech lead sửa nội dung (integration `lib/actions/features.integration.test.ts`, e2e `feature-detail.spec.ts`)

### F21.10 — Lưu trữ feature, thứ tự ưu tiên
**Hoàn thành khi**:
- [x] Lưu trữ / khôi phục feature (ẩn feature + task khỏi list / timeline / MCP); đưa feature / task lên xuống (integration `lib/actions/featureArchive.integration.test.ts`, e2e `feature-archive.spec.ts`)

### F21.11 — Markdown
**Hoàn thành khi**:
- [x] Tài liệu có bảng / danh sách / code hiển thị đúng; HTML thô không chạy (unit `components/ui/Markdown.test.ts`, `lib/markdownSections.test.ts`, e2e `markdown-doc.spec.ts`)
- **Mở rộng 2026-10-31** (Lio: hoàn thiện feature & task trước, rồi đưa kế hoạch `.md` lên web — F28): thêm F21.7–F21.11 — những gì file feature `.md` đang có mà DB chưa có (mô tả task, cỡ, phụ thuộc, mô tả / ghi chú feature, markdown).
- **F21.4 (2026-10-31)**: migration chỉ thêm `Task.archivedAt?`. Quyền `task.write` (lưu trữ là ẩn, không xoá). Nút "Lưu trữ" ở drawer → khung xác nhận; task lưu trữ bị loại khỏi list, badge / đếm, timeline (% feature), inbox, MCP `tasks_list` / `context_get`; `tasks_claim` / `tasks_update_status` trả "đã được lưu trữ". Deep link `?task=` vẫn mở drawer (page tải `getArchivedTask`), có banner + "Khôi phục". Không lưu trữ được task đang chạy. Chưa có danh sách task đã lưu trữ (mở bằng link / tìm kiếm — thêm khi cần).
- **F21.6 (2026-10-31)**: migration chỉ thêm bảng `task_criteria` (`position` để giữ thứ tự, `doneAt` / `doneById` ghi ai tick). Tối đa 20 tiêu chí / task, 300 ký tự. Người (`task.write`) thêm / sửa / xoá / tick ở mục "Tiêu chí hoàn thành" của drawer (tick hiện ngay bằng `useOptimistic`); tick ghi sự kiện rail. MCP: tool mới `criteria_check(taskId, criterionId, done)` — chỉ task đang giao cho agent; `tasks_list` trả `criteria { done, total }`, `context_get` trả danh sách đầy đủ có id. Chưa chặn chuyển Review khi còn tiêu chí chưa đạt — đó là F22.3. Seed: T-396 có 3 tiêu chí (2 đạt). Sửa kèm: test F21.5 bình luận lên T-405 làm mất mục "đang chạy" của T-405 trong feed rv-web khi chạy song song với `aggregates.integration.test.ts` → chuyển sang task rv-app.
- **F21.5 (2026-10-31)**: action `addTaskComment` (quyền `task.write`) dùng lại `commentOnTask` của MCP (cùng kiểm tra: không trống, tối đa 4000 ký tự, task thuộc dự án của người viết). Ô bình luận cuối mục "Bình luận" của drawer (Ctrl/⌘+Enter để gửi); mục luôn hiện với người có quyền kể cả khi chưa có bình luận. Ghi sự kiện rail "Bình luận T-…". Chưa có sửa / xoá bình luận.
- **F21.3 (2026-10-31)**: migration chỉ thêm `Task.sprintId?` (FK `SET NULL`, index). Quyền mới `sprint.manage` (tech lead / người tạo dự án) để tạo sprint + đặt hiện tại; xếp task vào sprint là `task.write`. Nút "Sprint" ở toolbar màn work mở dialog `?sprints=1` (ADR-018): danh sách sprint (mới trước), "Đặt làm hiện tại", form sprint mới (mặc định đặt hiện tại; tối đa 60 ngày). Drawer có ô chọn sprint. Bộ lọc "Lọc" thêm Sprint: hiện tại / chưa xếp / từng sprint (`?sprint=current|none|<id>`, mặc định không lọc → không ẩn task nào). Task mới tạo trên web vào sprint hiện tại. Seed: mọi task mẫu thuộc sprint hiện tại của dự án; **production không backfill** — task có sẵn là "chưa xếp" tới khi lead xếp. Chưa có sửa / xoá sprint (thêm khi cần).
- **F21.1 (2026-10-31)**: ma trận quyền thêm `feature.create` (thành viên dự án) và `feature.manage` (tech lead / người tạo dự án — sửa). Nút "Feature mới" ở toolbar màn work (`?newFeature=1`, ADR-018) cho mọi thành viên; nút bút trên header feature cho người có quyền sửa. `createFeature` / `updateFeature` ở `lib/domain/features.ts` dùng chung dãy mã `FEAT-n` với feature agent đề xuất; kiểm tra người phụ trách thuộc dự án, kế hoạch đủ 2 ngày và đúng thứ tự. Ghi sự kiện rail. Chưa có xoá / lưu trữ feature (thêm task nếu cần).
- **F21.2 (2026-10-31)**: `lib/featureProgress.ts` — trọng số story point, task chưa ước lượng tính 1 điểm, feature không có task = 0%. Dùng ở list theo feature, timeline (nhãn "Dev · n%") và trung bình portfolio. Cột `Feature.pct` giữ nguyên nhưng không đọc (đánh dấu CŨ trong schema). **Hệ quả với dữ liệu mẫu**: % hiển thị đổi (vd FEAT-118 62% → 29%) vì giờ phản ánh task thật. Sửa kèm: seed nhật ký MCP mẫu không còn tạo mốc thời gian ở tương lai khi chạy seed sau nửa đêm.
