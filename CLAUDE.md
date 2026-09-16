# Meridian (PMOS) — hướng dẫn cho coding agent

Đây là codebase thật của Meridian — công cụ quản lý dự án cho team mà developer làm việc cùng AI coding agent. Nguồn spec đầy đủ (5 màn hình, design tokens, state shape, dữ liệu mẫu): **`docs/design-reference.md`**. Đọc file đó trước khi implement bất kỳ màn nào.

## Stack
- Next.js (App Router) + TypeScript, không Tailwind — UI dùng class của design system **Nocturne**, token/class định nghĩa trong `app/globals.css` (nguồn duy nhất cho màu/spacing/radius/shadow — không hard-code giá trị mới).
- **Backend: Postgres qua Docker + Prisma 7** (`lib/data/*.ts` hiện đọc/ghi thật qua `lib/prisma.ts`, không còn mock — trừ `lib/data/timeline.ts`, xem ghi chú bên dưới). Mỗi hàm vẫn trả `Promise<...>` như trước, chữ ký không đổi.
- Icon: Phosphor Icons (`<i className="ph ph-xxx" />`), nạp qua `<link>` trong `app/layout.tsx`.

## Chạy dự án
```
nvm use --lts   # hoặc: export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use --lts
docker compose up -d           # Postgres (chỉ DB — Next.js vẫn chạy trực tiếp, không dockerize)
npm install
npx prisma generate            # sinh lại client vào lib/generated/prisma sau khi đổi schema
npx prisma migrate dev         # tạo/áp migration mới nếu sửa prisma/schema.prisma
npx prisma db seed             # nạp lại dữ liệu mẫu (script tự xoá sạch rồi seed lại — an toàn chạy nhiều lần trên DB dev)
npx prisma studio              # GUI xem/sửa dữ liệu trực tiếp trong trình duyệt
npm run dev     # http://localhost:3000
npm run build   # kiểm tra type/lint trước khi commit
```
**Lưu ý Prisma 7**: khác nhiều so với Prisma 5/6 — client sinh ra vào `lib/generated/prisma` (không phải `node_modules`), bắt buộc dùng driver adapter (`@prisma/adapter-pg`, xem `lib/prisma.ts`), cấu hình datasource nằm ở `prisma7.config.ts` (không phải trong `schema.prisma`). Trước khi sửa gì liên quan Prisma, đọc `.agents/skills/prisma-*/SKILL.md` (do chính Prisma cài vào repo lúc `prisma init`) thay vì dựa vào kiến thức Prisma cũ.

## Cấu trúc
```
app/
  layout.tsx, globals.css, page.tsx          — root, redirect "/" → "/rv-web/work"
  [project]/layout.tsx                        — sidebar + header dùng chung cho 5 màn
  [project]/{work,docs,team,mcp,portfolio}/page.tsx
components/layout/                            — Sidebar, Header, ProjectSwitcher, NavItem
lib/types.ts                                  — type cho toàn bộ entity (Project, Feature, Task, Doc, Member, McpServer...)
lib/prisma.ts                                  — Prisma Client singleton (driver adapter pg)
lib/relativeTime.ts                            — format Date → "x phút trước" (dùng ở docs/team/mcp)
lib/data/*.ts                                 — data access thật qua Prisma (xem ngoại lệ timeline.ts)
lib/generated/prisma/                          — client Prisma tự sinh, KHÔNG commit, KHÔNG sửa tay (chạy `prisma generate` lại nếu thiếu)
prisma/schema.prisma                           — schema DB (nguồn sự thật cho cấu trúc dữ liệu)
prisma/seed.ts                                 — script seed, nguồn dữ liệu ở prisma/seed-data/*.ts (bản mock gốc, tách khỏi lib/data để seed không phụ thuộc vòng vào DB nó đang tạo)
docker-compose.yml                             — Postgres cho dev, `docker compose up -d`
docs/design-reference.md                      — spec đầy đủ (nguồn sự thật cho UI/UX)
docs/features/0X-*.md                         — 1 file / màn: mục tiêu, trạng thái, checklist
PROGRESS.md                                   — bảng trạng thái tổng của cả 6 màn
```

**Ngoại lệ chưa có trong DB**: `lib/data/timeline.ts` (dữ liệu cho view Timeline ở màn Feature & Task) vẫn là mock tĩnh — không có model Prisma tương ứng vì bản thân dữ liệu mẫu gốc cũng chỉ soạn tay cho demo, chưa phải nghiệp vụ thật (xem `docs/features/02-feature-task.md`).

## Quy tắc khi thêm/sửa việc
1. Trước khi bắt đầu một màn, đọc file tương ứng trong `docs/features/` + phần liên quan trong `docs/design-reference.md`.
2. Cập nhật **Trạng thái** ở đầu file `docs/features/0X-*.md` khi nhận việc (`Chưa bắt đầu` → `Đang làm`) và khi xong (`Đang làm` → `Xong`), kèm ghi chú quyết định quan trọng nếu có lệch so với spec.
3. Cập nhật dòng tương ứng trong `PROGRESS.md` (không cần mô tả chi tiết ở đây, chỉ trạng thái + link).
4. Mỗi màn là 1 file feature riêng — làm việc song song trên các màn khác nhau sẽ không đụng file. Nếu nhiều agent cùng đụng một file trong `app/`/`components/`/`lib/`, phối hợp qua `PROGRESS.md` hoặc chia nhỏ theo component.
5. Bám sát fidelity: màu/spacing/radius/shadow lấy từ `app/globals.css`, không hard-code. Layout responsive dùng **container query** (đã có sẵn breakpoint cho `.trow/.frow/.mrow` trong `globals.css`), không dùng media query.
6. Dữ liệu trong Postgres đến từ `prisma/seed.ts` (nguồn: `prisma/seed-data/*.ts`, chính là mock gốc port từ design canvas) — nếu cần thêm dữ liệu mẫu, sửa ở `prisma/seed-data/` rồi `npx prisma db seed`, đừng chèn thẳng qua Prisma Studio nếu muốn người khác seed lại được giống hệt.
7. Sửa `prisma/schema.prisma` → bắt buộc `npx prisma migrate dev --name <mô tả>` rồi `npx prisma generate` trước khi code dùng được field mới (client sinh tĩnh, không tự cập nhật). Nếu dev server đang chạy mà đổi schema xong không thấy hiệu lực / báo lỗi "Unknown argument", khả năng cao do dev server cache client cũ — khởi động lại `npm run dev`.
8. Trước khi coi một việc là xong: `npm run build` phải sạch (type + lint), và tự chạy `npm run dev` xem lại trên trình duyệt so với spec.
9. Cần `.env` với `DATABASE_URL` (copy từ `.env.example`) và `docker compose up -d` đang chạy thì `npm run dev`/`prisma` mới hoạt động.

## Trạng thái hiện tại
Cả 6 màn đã có UI + tương tác chính trên mock data (xem `PROGRESS.md`). Việc còn lại chủ yếu là: nối API/DB thật thay `lib/data/*`, hoàn thiện vài nút chưa có hành vi (xem mục "Còn thiếu / cần làm tiếp" trong từng `docs/features/0X-*.md`), và thêm realtime cho màn MCP.
