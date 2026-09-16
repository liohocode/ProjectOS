# 01 — App shell

**Trạng thái:** Xong

## Mục tiêu
Khung dùng chung cho mọi màn: sidebar trái cố định, header, routing giữa 5 màn, đổi project qua switcher.

## Tham chiếu
`docs/design-reference.md` → mục "Khung chung cho mọi màn", "Sidebar", "Header (mọi màn)", và "Interactions & Behavior" (phần "Chuyển màn", "Đổi dự án").

## Đã làm
- [x] Routing `/[project]/{work|docs|team|mcp|portfolio}`, `/` redirect sang `/rv-web/work`, project không tồn tại → 404.
- [x] `Sidebar`: brand, project switcher (dropdown thật + đổi route), 5 nav item với badge đếm thật (từ `lib/data`) và alert màu amber khi có block/pending, pipeline agent 4 dòng (BA/TA/Dev/Index), footer MCP online + user hiện tại.
- [x] `Header`: kicker/title/context theo màn (map tĩnh trong `components/layout/screenMeta.ts`), search input, nút Lọc + nút hành động chính theo màn.
- [x] Style bám token Nocturne trong `app/globals.css` (sidebar 228px, kích thước/màu theo spec).

## Còn thiếu / cần làm tiếp
- [ ] Dropdown filter thật ở header (nút "Lọc" chưa có hành vi trên mọi màn).
- [x] Task drawer, rail, docs tree/body giờ đã có thật ở `02-feature-task.md`/`03-docs.md` — `.rail`/`.team-aside` container query đã kiểm tra hoạt động đúng.
- [x] `ProjectSwitcher` chuyển `router.push(/[id]/[screen])` không mang theo query string, nên khi đổi project ở màn Docs, tự động rơi về tài liệu đầu tiên của project mới (`getFirstDocId`) đúng như spec — không cần state riêng để xử lý việc này.

## Ghi chú
- Active nav/active screen được xác định qua `usePathname()` trong `Sidebar`/`Header` (client component) — không dùng context riêng.
- Badge nav hiển thị đúng số lượng (docs/tasks/team/mcp) và chỉ đổi màu sang amber khi có alert (block task hoặc revision chờ duyệt), không thay số bằng số alert — đúng theo spec "badge cảnh báo".
