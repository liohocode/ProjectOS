# Meridian (PMOS) — hướng dẫn cho coding agent

Đây là codebase thật của Meridian — công cụ quản lý dự án cho team mà developer làm việc cùng AI coding agent. Nguồn spec đầy đủ (5 màn hình, design tokens, state shape, dữ liệu mẫu): **`docs/design-reference.md`**. Đọc file đó trước khi implement bất kỳ màn nào.

## Stack
- Next.js (App Router) + TypeScript, không Tailwind — UI dùng class của design system **Nocturne**, token/class định nghĩa trong `app/globals.css` (nguồn duy nhất cho màu/spacing/radius/shadow — không hard-code giá trị mới).
- Data layer hiện tại: mock in-memory ở `lib/data/*.ts`, mỗi hàm trả `Promise<...>` để sau này đổi sang API/DB thật mà không phải sửa nơi gọi.
- Icon: Phosphor Icons (`<i className="ph ph-xxx" />`), nạp qua `<link>` trong `app/layout.tsx`.

## Chạy dự án
```
nvm use --lts   # hoặc: export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use --lts
npm install
npm run dev     # http://localhost:3000
npm run build   # kiểm tra type/lint trước khi commit
```

## Cấu trúc
```
app/
  layout.tsx, globals.css, page.tsx          — root, redirect "/" → "/rv-web/work"
  [project]/layout.tsx                        — sidebar + header dùng chung cho 5 màn
  [project]/{work,docs,team,mcp,portfolio}/page.tsx
components/layout/                            — Sidebar, Header, ProjectSwitcher, NavItem, ScreenPlaceholder
lib/types.ts                                  — type cho toàn bộ entity (Project, Feature, Task, Doc, Member, McpServer...)
lib/data/*.ts                                 — mock data, port trực tiếp từ design canvas gốc
docs/design-reference.md                      — spec đầy đủ (nguồn sự thật cho UI/UX)
docs/features/0X-*.md                         — 1 file / màn: mục tiêu, trạng thái, checklist
PROGRESS.md                                   — bảng trạng thái tổng của cả 6 màn
```

## Quy tắc khi thêm/sửa việc
1. Trước khi bắt đầu một màn, đọc file tương ứng trong `docs/features/` + phần liên quan trong `docs/design-reference.md`.
2. Cập nhật **Trạng thái** ở đầu file `docs/features/0X-*.md` khi nhận việc (`Chưa bắt đầu` → `Đang làm`) và khi xong (`Đang làm` → `Xong`), kèm ghi chú quyết định quan trọng nếu có lệch so với spec.
3. Cập nhật dòng tương ứng trong `PROGRESS.md` (không cần mô tả chi tiết ở đây, chỉ trạng thái + link).
4. Mỗi màn là 1 file feature riêng — làm việc song song trên các màn khác nhau sẽ không đụng file. Nếu nhiều agent cùng đụng một file trong `app/`/`components/`/`lib/`, phối hợp qua `PROGRESS.md` hoặc chia nhỏ theo component.
5. Bám sát fidelity: màu/spacing/radius/shadow lấy từ `app/globals.css`, không hard-code. Layout responsive dùng **container query** (đã có sẵn breakpoint cho `.trow/.frow/.mrow` trong `globals.css`), không dùng media query.
6. Dữ liệu mock hiện có trong `lib/data/*` port trực tiếp từ design canvas gốc (`docs/design-reference.md` mô tả lại cấu trúc) — tái dùng, đừng bịa dữ liệu mới trừ khi cần mở rộng để test UI.
7. Trước khi coi một việc là xong: `npm run build` phải sạch (type + lint), và tự chạy `npm run dev` xem lại trên trình duyệt so với spec.

## Thứ tự triển khai còn lại
Xem `PROGRESS.md`. Thứ tự khuyến nghị theo spec: Feature & Task (+ task drawer) → Docs (+ luồng duyệt revision) → Dev & AI agents → MCP (+ realtime) → Portfolio.
