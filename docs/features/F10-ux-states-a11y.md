# F10 — Trạng thái UX (loading / error / empty / 404) & bàn phím

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 1 | F07 | NFR-04, NFR-05 |

## Mục tiêu
Spec gốc ghi rõ "chưa có loading state, error state" — giờ dữ liệu đi qua DB thật nên cần: khung chờ khi tải, thông báo lỗi có thể thử lại (đặc biệt khi Postgres chưa chạy), màn rỗng có hướng dẫn, 404 đẹp cho project sai, và thao tác được bằng bàn phím.

## Phạm vi
- **Trong**: `loading.tsx`, `error.tsx`, `not-found.tsx` theo convention App Router; empty state từng màn; a11y bàn phím cho hàng click được và drawer/dropdown.
- **Ngoài**: form validation (nằm trong từng feature form F11–F13).

## Tham chiếu
- Next 16 docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/` (`loading`, `error`, `not-found`)
- Code: `app/[project]/*`, `components/work/TaskRow.tsx`, `components/work/FeatureSection.tsx`, `components/team/MemberRow.tsx`, `components/work/TaskDrawer.tsx`, `components/layout/ProjectSwitcher.tsx`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F10.1 | `loading.tsx` + skeleton cho 5 màn | S | — | Chưa làm |
| F10.2 | `error.tsx` cho `[project]`, nhận diện lỗi mất kết nối DB | S | — | Chưa làm |
| F10.3 | `not-found.tsx` cho project không tồn tại | S | — | Chưa làm |
| F10.4 | Empty state cho từng màn | S | — | Chưa làm |
| F10.5 | Bàn phím: hàng click được, drawer, dropdown | M | — | Chưa làm |

### F10.1 — Loading skeleton
**Làm gì**: `app/[project]/<screen>/loading.tsx` cho 5 màn (sidebar/header nằm ở layout nên vẫn hiện). Skeleton dùng class mới `.skeleton` trong `globals.css` (nền `--color-surface`, hiệu ứng nhạt dần, tôn trọng `prefers-reduced-motion`). Hình dạng gần với nội dung thật (vd màn work: 3 khối feature section).
**File**: `app/[project]/*/loading.tsx`, `app/globals.css`
**Hoàn thành khi**:
- [ ] Throttle mạng/thêm delay giả ở `lib/data` thấy skeleton; không dịch layout khi dữ liệu về

### F10.2 — Error boundary
**Làm gì**: `app/[project]/error.tsx` (client component, nhận `error`, `reset`): thông báo tiếng Việt + nút "Thử lại". Nếu lỗi là Prisma không kết nối được DB (`PrismaClientInitializationError` / mã `P1001`) → hiển thị hướng dẫn "Chưa kết nối được database — chạy `docker compose up -d`". Lưu ý: ở production Next ẩn message lỗi server, nhận diện qua `error.digest` hoặc ném lỗi có message an toàn từ `lib/data`.
**File**: `app/[project]/error.tsx`, có thể `lib/prisma.ts` hoặc helper `lib/errors.ts`
**Hoàn thành khi**:
- [ ] `docker compose stop db` rồi mở app → thấy thông báo + hướng dẫn, không phải màn lỗi trắng; bật lại DB bấm "Thử lại" là chạy

### F10.3 — 404 project
**Làm gì**: `app/[project]/not-found.tsx` (hoặc `app/not-found.tsx`) theo phong cách Nocturne: "Không tìm thấy dự án" + link về `/rv-web/portfolio` (hoặc dự án đầu tiên lấy từ DB).
**Hoàn thành khi**:
- [ ] `/khong-ton-tai/work` trả 404 với giao diện mới

### F10.4 — Empty state
**Làm gì**: component `EmptyState` (icon Phosphor + tiêu đề + mô tả + nút hành động tuỳ chọn). Áp cho: work (project chưa có feature), docs (chưa có tài liệu — thay `screen-placeholder` hiện tại ở `app/[project]/docs/page.tsx`), team (filter không ra ai), mcp (chưa có phiên/log), activity rail (đã có câu "Chưa có hoạt động nào" — chuyển sang component chung).
**File**: `components/ui/EmptyState.tsx` (thư mục mới cho component dùng chung), các screen liên quan, `app/globals.css`
**Hoàn thành khi**:
- [ ] Tạo tạm 1 project rỗng trong DB test → cả 5 màn đều có empty state hợp lý

### F10.5 — Bàn phím
**Làm gì**: `TaskRow`, `MemberRow`, header `FeatureSection` đang là `div` có `onClick` → thêm `role="button"`, `tabIndex={0}`, xử lý Enter/Space (hoặc đổi sang `<button>` nếu không vỡ grid). `TaskDrawer`: Esc để đóng, focus vào panel khi mở và trả focus về hàng khi đóng. `ProjectSwitcher` dropdown và picker "Giao cho agent": Esc đóng, click ra ngoài đóng.
**Hoàn thành khi**:
- [ ] Dùng Tab/Enter/Esc thao tác được toàn bộ màn work và team không cần chuột
- [ ] `:focus-visible` hiện viền accent (đã có sẵn trong `globals.css`)

## Quyết định / ghi chú
- Component dùng chung nhiều màn đặt ở `components/ui/` (tạo mới ở task này).
