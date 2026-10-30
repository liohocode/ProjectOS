# Kiến trúc

## Stack
| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), React 19, TypeScript strict | Next 16 có breaking change so với kiến thức cũ — đọc `node_modules/next/dist/docs/` trước khi dùng API lạ (xem `AGENTS.md`). `params`/`searchParams` là Promise; dùng helper type global `PageProps<'/route'>`, `LayoutProps<'/route'>`. |
| UI | CSS thuần + design system **Nocturne** (`app/globals.css`), Phosphor Icons qua `<link>` | Không Tailwind. Responsive bằng container query. |
| DB | **Postgres 16** chạy qua Docker (`docker-compose.yml`) | Chỉ DB chạy trong Docker; Next.js chạy trực tiếp bằng `npm run dev`. |
| ORM | **Prisma 7.10.0** (pin cứng), driver adapter `@prisma/adapter-pg` | Client sinh vào `lib/generated/prisma` (không commit). Config datasource ở `prisma7.config.ts`. Đọc `.agents/skills/prisma-*/SKILL.md` trước khi đụng Prisma. |
| Ghi dữ liệu | Server Actions (`lib/actions/*.ts`) + `revalidatePath` | Mới có `approveRevision`. |
| Runtime (dev) | Node 24 LTS qua nvm | |
| Đăng nhập (kế hoạch F15) | Auth.js + **Google OAuth**, chỉ email của `Member` đã có | ADR-013 |
| Production (kế hoạch F19) | **Google Cloud Run** (container) + **Neon Postgres** gói Free, CD qua GitHub Actions | ADR-016, ADR-015. Tính tiền theo thời gian request mở, scale về 0, có thể nhiều instance → không giữ kết nối dài (F16 stateless, F17 polling), không giữ trạng thái quan trọng trong RAM. |

## Cấu trúc thư mục
```
app/
  layout.tsx, globals.css, page.tsx        root layout, token Nocturne, redirect "/" → "/rv-web/work"
  [project]/layout.tsx                     Server Component: tải dữ liệu sidebar/header, notFound() nếu project sai
  [project]/{work,docs,team,mcp,portfolio}/page.tsx   mỗi màn = 1 page (Server Component)
components/
  layout/      Sidebar, Header, ProjectSwitcher, NavItem, screenMeta (map tiêu đề/nút theo màn)
  work/        WorkScreen (client, giữ state màn), FeatureSection, TaskRow, TimelineView, ActivityRail, TaskDrawer, taskStyle
  docs/        KnowledgeStrip, DocTree, DocBodyView, ApproveButton (client, gọi server action)
  team/        TeamScreen (client), PipelineCards, MemberRow, MemberPanel
  mcp/         ServerCard
  portfolio/   ProjectCard
lib/
  types.ts           type dùng cho UI (Project, Feature, Task, DocBody, Member, McpServer...) — KHÔNG phải type Prisma
  prisma.ts          Prisma Client singleton (globalThis cache cho dev hot-reload)
  relativeTime.ts    Date → "x phút trước"
  data/*.ts          tầng truy cập dữ liệu: query Prisma → map sang type ở lib/types.ts
  actions/*.ts       Server Actions ("use server") cho thao tác ghi
  generated/prisma/  client Prisma tự sinh (gitignore)
prisma/
  schema.prisma, migrations/, seed.ts, seed-data/*.ts (snapshot mock gốc làm nguồn seed)
docs/                tài liệu dự án (xem docs/README.md)
```

## Luồng dữ liệu
```
Request /rv-web/work
  └─ app/[project]/layout.tsx (Server)  ── lib/data/{projects,team,features,docs,mcp} ── Prisma ── Postgres
       └─ Sidebar / Header (Client, nhận props đã resolve; dùng usePathname để biết màn active)
  └─ app/[project]/work/page.tsx (Server) ── lib/data/{features,timeline,activity,taskDrawer,team}
       └─ WorkScreen (Client) — state cục bộ: view, closed, railOpen, openTaskId, features (bản sao để sửa tạm)

Ghi dữ liệu (hiện chỉ có duyệt revision):
  ApproveButton (Client) ─ useTransition ─▶ lib/actions/docs.ts approveRevision() ─ Prisma update ─ revalidatePath
```

### Quy ước tầng dữ liệu
- **Page/layout chỉ gọi `lib/data/*`**, không gọi Prisma trực tiếp. Component client không bao giờ import `lib/data` hay `lib/prisma`.
- Hàm trong `lib/data/*` luôn `async`, trả về type trong `lib/types.ts` (đã map, đã format chuỗi hiển thị như "2 giờ trước"). Chữ ký hàm là hợp đồng với UI — đổi chữ ký phải sửa mọi nơi gọi.
- Chuyển đổi enum Prisma ↔ chuỗi tiếng Việt hiển thị nằm ở biên `lib/data/*` và `prisma/seed.ts` (xem `data-model.md`).
- Thao tác ghi đặt ở `lib/actions/<domain>.ts`, file-level `"use server"`, gọi `revalidatePath` cho route bị ảnh hưởng.
- Người dùng hiện tại lấy qua `lib/auth/currentUser.ts` (`getCurrentUserId()` / `getCurrentUser()`) — tạm trả `hieu` (ADR-011); F15 thay thân hàm bằng session Google, nơi gọi giữ nguyên. Không hardcode id người dùng ở chỗ khác.

### Các module "suy ra" (tạm thời)
| File | Hiện tại | Đích |
|---|---|---|
| `lib/data/taskDrawer.ts` | Log phiên chạy sinh theo mẫu từ trạng thái task | Lấy từ `McpSession`/`McpLogEntry` thật — F17 |
| `lib/data/portfolio.ts` | Tổng hợp từ projects + features + team | Giữ nguyên (đúng thiết kế) |

## Môi trường dev
```
nvm use --lts
docker compose up -d          # Postgres
cp .env.example .env          # DATABASE_URL
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed            # idempotent: xoá sạch rồi seed lại
npm run dev                   # http://localhost:3000 → /rv-web/work
```
Lỗi hay gặp: đổi schema xong dev server báo `Unknown argument` → client Prisma trong dev server bị cache cũ, khởi động lại `npm run dev`.

Các quyết định kiến trúc và lý do: `docs/architecture/decisions.md`. Mô hình dữ liệu: `docs/architecture/data-model.md`.
