# F14 — Tìm kiếm, lọc, deep link, phân trang

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 2 | F07 | FR-SH-05, NFR-06 |

## Mục tiêu
Ô "Tìm feature, task, docs…" và nút "Lọc" ở header hiện chỉ là giao diện. Feature này cho chúng hoạt động, đưa trạng thái quan trọng của màn vào URL (chia sẻ link được), và phân trang các bảng có thể dài vô hạn (nhật ký lệnh).

## Phạm vi
- **Trong**: deep link màn work, tìm kiếm trong dự án, bộ lọc theo màn, phân trang bảng MCP.
- **Ngoài**: tìm kiếm ngữ nghĩa (F18.5 — có thể nâng cấp F14.2 sau).

## Tham chiếu
- ADR-003 (state quan trọng nằm trong URL)
- Next 16 docs: `useSearchParams`, `searchParams` prop (`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`)
- Code: `components/layout/Header.tsx`, `components/work/WorkScreen.tsx`, `app/[project]/mcp/page.tsx`, `lib/data/*`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F14.1 | Deep link màn work: `?task=`, `?view=` | S | — | Xong — 2026-10-28 |
| F14.2 | Tìm kiếm trong dự án từ ô header | M | F14.1 | Chưa làm |
| F14.3 | Bộ lọc "Lọc" theo từng màn | M | — | Chưa làm |
| F14.4 | Phân trang phiên chạy + nhật ký lệnh | S | — | Chưa làm |

### F14.1 — Deep link màn work
**Làm gì**: `/<project>/work?task=T-401` mở sẵn drawer; `?view=timeline` mở view timeline. Đồng bộ state ↔ URL bằng `router.replace` (không thêm lịch sử cho mỗi lần đổi). Banner "Xem tất cả", task row, activity rail đều dùng URL này.
**Hoàn thành khi**:
- [x] Copy URL khi drawer đang mở, mở tab mới → đúng task; nút Back đóng drawer hợp lý (e2e `deeplink.spec.ts`)

### F14.2 — Tìm kiếm
**Làm gì**: ô tìm kiếm header: gõ (debounce ~250ms) → gọi server action `searchProject(projectId, q)` tìm trong task (id, tiêu đề), feature (id, tên), doc (tiêu đề, tóm tắt) — Prisma `contains` + `mode: 'insensitive'`. Tiếng Việt có dấu: cân nhắc extension Postgres `unaccent` để "tieu chi" khớp "Tiêu chí" (ghi quyết định). Dropdown kết quả nhóm theo loại; chọn → task: `/work?task=`, doc: `/docs?doc=`, feature: `/work` + cuộn tới feature. Phím: ↑↓ Enter Esc; `/` để focus ô tìm kiếm.
**Hoàn thành khi**:
- [ ] Gõ "T-418", "migration", "PRD" ra đúng kết quả; điều hướng đúng

### F14.3 — Bộ lọc theo màn
**Làm gì**: nút "Lọc" mở panel nhỏ, tiêu chí theo màn (lưu trong URL search params):
- work: stage, người / agent, chỉ task block, chỉ task đang chạy, người thực hiện
- docs: chỉ tài liệu agent ghi, chỉ tài liệu có revision chờ
- team: (đã có segmented — không cần)
- mcp: agent, dự án, kết quả (`?agent=` dùng cho F13.4)
Áp lọc ở server: thêm tham số tuỳ chọn cho hàm `lib/data/*` liên quan (giữ tương thích chữ ký cũ). Nút "Lọc" hiện số tiêu chí đang bật.
**Hoàn thành khi**:
- [ ] Mỗi tiêu chí lọc đúng, xoá lọc trở về như cũ, link có lọc mở lại đúng

### F14.4 — Phân trang bảng MCP
**Làm gì**: `getMcpSessions` / `getMcpLog` nhận `{ cursor, limit = 50 }`, trả `{ items, nextCursor }`; màn MCP có nút "Xem thêm". (Đổi chữ ký → cập nhật mọi nơi gọi.)
**Hoàn thành khi**:
- [ ] Seed thêm >50 log trong DB test → phân trang đúng thứ tự thời gian

## Quyết định / ghi chú
- **F14.1 (2026-10-28)**: hook `components/work/workUrl.ts` (`useWorkUrl`). **Mở task = `router.push`** (lệch mô tả "replace": để nút Back đóng drawer như tiêu chí yêu cầu); đóng drawer / đổi view = `router.replace` (không thêm lịch sử). `?task=` không tồn tại → không mở drawer. Activity rail: mục gắn task (đang chạy / bị block / chờ review) thành link `?task=` (`ActivityItem.taskId`); mục revision chờ duyệt giữ dạng tĩnh. Reload khi drawer đang mở → drawer mở lại (e2e sửa nhanh task cập nhật theo).
