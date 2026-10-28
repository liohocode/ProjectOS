# Meridian (PMOS) — hướng dẫn cho coding agent

Codebase thật của Meridian — công cụ quản lý dự án cho team mà developer làm việc cùng AI coding agent.

## Bắt đầu từ đâu
1. **`docs/README.md`** — mục lục tài liệu.
2. **`docs/ROADMAP.md`** — tiến độ, việc nên nhận tiếp, quyết định đang chờ người dùng.
3. **`docs/WORKFLOW.md`** — quy trình nhận / làm / đóng task, Definition of Done, quy ước commit. **Bắt buộc làm theo.**
4. File feature của task bạn nhận (`docs/features/FXX-*.md`) — mỗi task có "Làm gì / File / Hoàn thành khi".

Spec UI gốc (nguồn sự thật cho UI/UX): `docs/design/design-reference.md`. Yêu cầu đánh mã: `docs/product/requirements.md`.

## Stack
- **Next.js 16** (App Router) + React 19 + TypeScript. Next 16 có breaking change so với kiến thức cũ (vd `middleware.ts` đổi thành `proxy.ts`, `params` là Promise) — đọc `node_modules/next/dist/docs/` trước khi dùng API lạ (xem `AGENTS.md`).
- UI: CSS thuần design system **Nocturne** trong `app/globals.css` (nguồn duy nhất cho màu/spacing/radius/shadow — không hard-code), không Tailwind. Icon Phosphor (`<i className="ph ph-xxx" />`).
- **Postgres qua Docker + Prisma 7.10.0** (pin cứng). `lib/data/*.ts` đọc/ghi thật qua `lib/prisma.ts` (không còn mock).
- Ghi dữ liệu: Server Actions ở `lib/actions/*.ts`.

Chi tiết: `docs/architecture/overview.md`, `docs/architecture/data-model.md`, `docs/architecture/decisions.md`.

## Chạy dự án
```
nvm use --lts   # hoặc: export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use --lts
docker compose up -d           # Postgres (chỉ DB — Next.js chạy trực tiếp)
cp .env.example .env           # lần đầu
npm install
npx prisma generate            # sinh client vào lib/generated/prisma (chạy lại sau mỗi lần đổi schema)
npx prisma migrate dev         # áp migration; sửa schema thì thêm --name <mô tả>
npx prisma db seed             # nạp lại dữ liệu mẫu (tự xoá sạch rồi seed — an toàn chạy nhiều lần trên DB dev)
npx prisma studio              # GUI xem/sửa dữ liệu
npm run dev                    # http://localhost:3000
docker compose --profile app up --build   # chạy thử image production ở :8080 (Dockerfile, F19.2)

# Kiểm tra trước khi commit (chi tiết: Definition of Done trong docs/WORKFLOW.md)
npm run lint && npm run typecheck && npm run build
npm test                       # unit (Vitest), không cần DB
npm run test:integration       # Vitest trên DB test meridian_test (tự tạo + migrate + seed)
npm run test:e2e               # Playwright, build production cổng 3100 + DB test
```

**Prisma 7** khác nhiều so với 5/6: client sinh vào `lib/generated/prisma` (không commit, không sửa tay), bắt buộc driver adapter `@prisma/adapter-pg`, datasource cấu hình ở `prisma7.config.ts`. Trước khi đụng Prisma đọc `.agents/skills/prisma-*/SKILL.md`. Prisma chặn lệnh phá dữ liệu (`migrate reset`, `db push --force-reset`) khi chạy bởi AI agent — phải hỏi người dùng trước.

## Quy tắc bắt buộc
1. Làm theo `docs/WORKFLOW.md`: nhận task → cập nhật trạng thái trong file feature → làm đúng phạm vi → Definition of Done → cập nhật file feature + `docs/ROADMAP.md`.
2. Page/layout chỉ gọi `lib/data/*`; component client không import `lib/data`/`lib/prisma`. Giữ chữ ký hàm `lib/data/*` (đổi thì sửa mọi nơi gọi). Hàm đọc mới trong `lib/data` bọc `cache()` của React (ADR-019).
3. Fidelity: token từ `app/globals.css`; responsive bằng **container query**, không media query.
4. Sửa `prisma/schema.prisma` → `npx prisma migrate dev --name <mô tả>` → `npx prisma generate` → **khởi động lại `npm run dev`** (dev server cache client cũ, triệu chứng: lỗi "Unknown argument"). Cập nhật `docs/architecture/data-model.md` cùng commit.
   - Thay đổi **làm mất dữ liệu** (xoá/đổi kiểu cột): `migrate dev` từ chối chạy không tương tác, và **không** dùng `--accept-data-loss`. Thay vào đó: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → tự tạo `prisma/migrations/<timestamp>_<tên>/migration.sql`, **chèn bước chuyển dữ liệu trước khi xoá cột cũ** → `npx prisma migrate deploy` → chạy lại `migrate diff` phải ra "empty migration". Mẫu: các migration của F09.1, F09.2, F09.4.
5. Dữ liệu mẫu sửa ở `prisma/seed-data/` rồi `npx prisma db seed`, không chèn tay qua Prisma Studio.
6. Quyết định kiến trúc mới → thêm ADR vào `docs/architecture/decisions.md`.
7. Cần `.env` có `DATABASE_URL` (+ `DATABASE_URL_TEST` cho test) và `docker compose up -d` đang chạy thì app/prisma/test mới hoạt động. Không commit `.env`.
8. Test không bao giờ chạy trên DB dev/production: integration + e2e luôn dùng `DATABASE_URL_TEST` (tên DB bắt buộc chứa `test`).

## Mức tự quyết của agent (người dùng chốt 2026-10-28)
Người dùng muốn agent **tự làm, tự quyết, chỉ báo kết quả** — ít hỏi, ít chờ. Mặc định: làm luôn, ghi lý do vào commit / file feature / PR; chỉ dừng hỏi ở mục "Phải hỏi".

**Tự quyết, không hỏi**
- Chọn task kế tiếp theo `docs/ROADMAP.md` ("Việc nên nhận tiếp theo", thứ tự đường deploy), tách task, thêm task phát hiện được vào file feature.
- Lựa chọn kỹ thuật trong khuôn ADR hiện có (thư viện nhỏ, cách hiện thực, cấu trúc file, test); lệch spec UI nhỏ → ghi vào "Quyết định / ghi chú" của feature.
- Git trên branch của mình: commit, push, mở PR, cập nhật mô tả PR, rebase/cherry-pick lên `main` mới sau khi PR trước đã merge.
- **Merge PR do chính agent mở** khi CI xanh hết, không conflict, không có review yêu cầu sửa — kiểu **rebase merge** (giữ mỗi task một commit trên `main`). Sau merge: dựng lại branch trên `main` mới rồi làm tiếp.
- Sửa CI đỏ, lỗi test, lỗi lint trong phạm vi PR của mình.
- Chạy migration **chỉ thêm** (thêm bảng/cột/index) trên DB dev/test; seed lại DB dev/test.

**Phải hỏi (một lần, gom câu hỏi lại, kèm khuyến nghị)**
- Quyết định kiến trúc mới hoặc đổi ADR đã chốt (nhà cung cấp, thư viện lớn, mô hình dữ liệu, bảo mật/phân quyền), và mục "Quyết định đang mở" trong ROADMAP.
- Thao tác làm mất dữ liệu: migration xoá/đổi kiểu cột, `migrate reset`, bất cứ thao tác nào trên **DB production (Neon)** hay hạ tầng Google Cloud.
- Thứ tốn tiền hoặc ra ngoài: tạo tài nguyên cloud, đổi billing, gửi tin/email, mời người.
- Việc chỉ người dùng làm được (tạo OAuth client, secret, bấm duyệt trên console) — nói rõ bước cần làm rồi **làm tiếp phần khác**, không đứng chờ.

**Cách báo cáo**: cuối mỗi lượt chỉ tóm tắt kết quả (PR, CI, việc người dùng cần làm nếu có) — ngắn gọn, không kể lại từng bước.

## Trạng thái hiện tại (2026-10)
Phase 0 xong: 5 màn + app shell chạy trên Postgres thật (F01–F07). Kế hoạch tiếp theo đã chia thành feature F08–F19 với task chi tiết — xem `docs/ROADMAP.md`.

Đã chốt (2026-10-14): đăng nhập **Google** (ADR-013; thư viện **Better Auth** — ADR-020, `lib/auth/`); production trên **Google Cloud Run + Neon Postgres gói Free** (ADR-016, ADR-015) — code mới không được giữ request mở lâu (không SSE dài, MCP stateless) và không giữ trạng thái quan trọng trong RAM (có thể nhiều instance, scale về 0). Embedding/kho tri thức ngữ nghĩa (F18) đang hoãn.
