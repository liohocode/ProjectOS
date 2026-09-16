# 02 — Feature & Task

**Trạng thái:** Chưa bắt đầu — màn mặc định của app (`/[project]/work`), ưu tiên implement trước.

## Mục tiêu
Lead điều phối công việc giữa người và agent: xem feature/task theo dạng list hoặc timeline, mở task drawer để xem chi tiết.

## Tham chiếu
`docs/design-reference.md` → mục "3. Feature & Task", cộng "State Management" (`view`, `doc` không dùng ở đây, `task`, `closed`, `rail`) và "Interactions & Behavior".

## Data đã sẵn có
`lib/data/features.ts` — `getFeaturesByProject(projectId)`, `getTasksByProject(projectId)`. Type: `Feature`, `Task` trong `lib/types.ts`.

## Checklist
- [ ] Toolbar: segmented control "Theo feature" / "Timeline", nhãn sprint, toggle activity rail.
- [ ] Banner block khi có task bị block (đếm qua `tasks.filter(t => t.blocked)`).
- [ ] View "Theo feature": `<section>` theo feature, `.frow` header (caret gập/mở — state `closed` giữ ở client), `.trow` mỗi task với border trái theo kind (agent/blocked), cột cờ hiện block/running.
- [ ] Responsive container query cho `.trow`/`.frow` — CSS đã có sẵn trong `app/globals.css` (breakpoint 880px/680px), chỉ cần đặt đúng class `list`/`c-status`/`c-est`/... lên container/element tương ứng.
- [ ] View "Timeline": CSS grid theo tuần T1–T8 — cần thêm data (start/len theo feature) chưa có sẵn trong mock, phải bổ sung vào `lib/data/features.ts` hoặc file mới `lib/data/timeline.ts`.
- [ ] Activity rail (phải, 300px) — cần data "agent đang làm gì", **chưa có trong `lib/data`**, phải bổ sung mock mới dựa theo ví dụ trong design-reference (mục "Activity rail").
- [ ] Task drawer: overlay + panel phải 420px, nội dung theo spec (meta, context agent đã pull, log phiên chạy, footer 2 nút) — phần "context agent đã pull" và "log phiên chạy" cũng chưa có mock data, cần bổ sung.

## Ghi chú
- `closed` (feature gập/mở) và `task` (id đang mở drawer) là state riêng của màn này — dùng `useState` trong client component, không cần đưa lên layout dùng chung.
- Khi implement xong, cập nhật `PROGRESS.md` và đổi Trạng thái ở đây.
