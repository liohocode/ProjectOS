# Quyết định kiến trúc (ADR log)

Mỗi quyết định: bối cảnh → quyết định → hệ quả. Thêm quyết định mới ở cuối, đánh số tăng dần, không sửa nội dung quyết định cũ — nếu đổi ý, thêm ADR mới ghi "Thay thế ADR-xxx".

---

### ADR-001 — Next.js App Router, Server Component tải dữ liệu, Client Component giữ state màn
**Bối cảnh**: cần dựng lại 5 màn từ prototype HTML, có nhiều tương tác cục bộ (gập/mở, drawer, dropdown).
**Quyết định**: Next.js 16 App Router + TypeScript. Page/layout là Server Component gọi `lib/data/*`; mỗi màn có một client component "Screen" (vd `WorkScreen`, `TeamScreen`) giữ state riêng của màn.
**Hệ quả**: state không đưa lên layout dùng chung trừ khi nhiều màn cần. Next 16 khác kiến thức cũ — đọc docs bundled trước khi dùng API lạ.

### ADR-002 — Không Tailwind; CSS thuần theo Nocturne, responsive bằng container query
**Bối cảnh**: design system Nocturne là CSS thuần với class riêng (`.btn`, `.tag`, `.seg`, `.card`...) và spec yêu cầu container query.
**Quyết định**: port nguyên token + class vào `app/globals.css`; không dùng Tailwind/CSS-in-JS.
**Hệ quả**: style mới thêm vào `globals.css` theo section từng màn, dùng biến `--color-*`, `--space-*`; không hard-code giá trị.

### ADR-003 — Routing `/[project]/[screen]`; tài liệu đang xem qua `?doc=`
**Quyết định**: dự án và màn nằm trong URL; ProjectSwitcher đổi project giữ nguyên màn và bỏ query string (nhờ vậy tự reset về tài liệu đầu tiên). Tài liệu đang xem là query param để bookmark/back được.
**Hệ quả**: deep link cho task drawer, view timeline… nên theo cùng cách (F14.1).

### ADR-004 — Tầng `lib/data/*` async với chữ ký ổn định
**Quyết định**: mọi truy cập dữ liệu qua hàm async trong `lib/data/*`, trả type UI ở `lib/types.ts`. Ban đầu chạy trên mock, sau đó thay ruột sang Prisma mà không sửa page/component.
**Hệ quả**: đã chứng minh hiệu quả khi chuyển mock → Postgres (F07). Giữ nguyên nguyên tắc này cho mọi thay đổi sau.

### ADR-005 — Postgres qua Docker + Prisma (bỏ phương án Google Sheets)
**Bối cảnh**: từng cân nhắc dùng Google Sheets làm DB cho dễ theo dõi; bị loại vì không hợp ghi tần suất cao (nhật ký lệnh agent), không transaction, rate limit, cần service account.
**Quyết định**: Postgres 16 trong Docker cho dev; Prisma làm ORM; `npx prisma studio` thay vai trò "dễ xem dữ liệu".
**Hệ quả**: chỉ DB chạy trong Docker, Next.js chạy trực tiếp. Dockerfile production để F19.

### ADR-006 — Khoá chính là id chuỗi đọc được
**Quyết định**: thực thể nghiệp vụ dùng id chuỗi có nghĩa (`rv-web`, `FEAT-118`, `T-401`, `prd-listing`) làm `@id`; bảng phụ dùng `cuid()`.
**Hệ quả**: URL/UI không cần map id. Khi tạo mới (F11/F12/F13) phải tự sinh id theo quy ước (vd `T-` + số tiếp theo, slug từ tiêu đề) và xử lý trùng trong transaction.

### ADR-007 — Seed từ snapshot `prisma/seed-data/`, tách khỏi `lib/data/`
**Bối cảnh**: sau khi `lib/data/*` chuyển sang Prisma, seed không thể đọc dữ liệu từ chính các hàm đó (phụ thuộc vòng).
**Quyết định**: chụp lại mock gốc vào `prisma/seed-data/*.ts` (type cục bộ, không import `lib/types`); `seed.ts` idempotent (xoá sạch rồi seed).
**Hệ quả**: dữ liệu mẫu sửa ở `prisma/seed-data/`.

### ADR-008 — Activity feed và log task drawer tạm thời được suy ra
**Quyết định**: thay vì mock song song, activity rail suy ra từ task/revision thật; log phiên chạy sinh theo mẫu từ trạng thái task.
**Hệ quả**: luôn nhất quán với dữ liệu khác nhưng không phải lịch sử thật. Thay bằng bảng sự kiện + phiên MCP thật ở F17.

### ADR-009 — Enum có giá trị tiếng Việt: identifier ASCII + `@map`
**Quyết định**: Prisma enum không cho dấu/space trong tên → dùng `DangChay @map("Đang chạy")`; map sang chuỗi hiển thị ở biên `lib/data/*`.

### ADR-010 — Thao tác ghi qua Server Actions
**Quyết định**: ghi dữ liệu bằng Server Actions trong `lib/actions/<domain>.ts` + `revalidatePath`; client gọi qua `useTransition` (hoặc `useOptimistic`).
**Hệ quả**: chưa cần REST API cho UI. API route chỉ dành cho MCP server (F16) và stream realtime (F17).

### ADR-011 — Người dùng hiện tại hardcode cho tới khi có auth
**Quyết định**: tạm coi người dùng hiện tại là `hieu` (Trung Hiếu, tech lead).
**Hệ quả**: F11.1 gom về một hàm `getCurrentUserId()`; F15 thay bằng session thật.

### ADR-012 — Pin Prisma 7.10.0
**Bối cảnh**: dist-tag `latest` của `prisma` trỏ tới `8.0.0-rc.*` trong khi `@prisma/client` latest là 7.10.0 → lệch major.
**Quyết định**: pin cả hai về `7.10.0`. Cảnh báo `npm audit` (deepmerge-ts, mysql2) nằm trong dependency dev của CLI, không ảnh hưởng runtime; không chạy `npm audit fix --force` (sẽ hạ về Prisma 6).
**Hệ quả**: nâng cấp Prisma 8 là một task riêng có kế hoạch, không làm tiện tay.

### ADR-013 — Đăng nhập bằng Google (2026-10-14)
**Bối cảnh**: người dùng chốt phương án đăng nhập cho F15.
**Quyết định**: Google OAuth, dùng Auth.js (NextAuth v5) với Google provider + Prisma adapter. Chỉ cho phép đăng nhập khi email Google khớp với một `Member` kind `human` đã có trong hệ thống (theo lời mời, không tự đăng ký).
**Hệ quả**: `Member` cần thêm `email`; người dùng phải tự tạo OAuth client trên Google Cloud Console (thao tác thủ công, có hướng dẫn trong F15.2). Agent không đăng nhập Google — dùng token riêng (F15.5).

### ADR-014 — Deploy lên Cloudflare, ưu tiên gói miễn phí (2026-10-14) — **đã bị thay thế bởi ADR-016**
**Bối cảnh**: người dùng chọn Cloudflare, yêu cầu "chủ yếu là free" (thay cho Vercel đã cân nhắc trước đó).
**Quyết định**: chạy Next.js trên **Cloudflare Workers** qua adapter OpenNext (`@opennextjs/cloudflare`); gói Workers Free.
**Hệ quả** — ràng buộc phải tính tới từ bây giờ:
- Gói Free giới hạn **CPU ~10ms/request** và **kích thước bundle ~3 MB (nén)**. Render SSR + Prisma có thể vượt → F19.2 là spike đo thực tế trước; nếu vượt, phương án dự phòng là Workers Paid (~5 USD/tháng). Kiểm tra lại số liệu giới hạn hiện hành trên trang Cloudflare khi làm.
- Không có tiến trình chạy lâu / bộ nhớ dùng chung giữa các request: rate limit MCP (F16.7) không làm trong bộ nhớ được; realtime (F17.2) không dùng được Postgres `LISTEN/NOTIFY` → dùng SSE + polling theo con trỏ, hoặc Durable Objects.
- Không cần Dockerfile production; Docker chỉ dùng cho Postgres ở dev.

### ADR-015 — Database production: Neon Postgres gói Free (2026-10-14)
**Bối cảnh**: cần database miễn phí chạy được với Cloudflare Workers. Cân nhắc Cloudflare D1 (SQLite) nhưng Prisma trên SQLite không hỗ trợ enum và mảng (`String[]`) — schema hiện dùng nhiều — nên phải viết lại tầng dữ liệu.
**Quyết định**: **Neon Postgres** gói Free cho production (cùng Postgres với dev → giữ nguyên schema, migration, Prisma). Kết nối từ Workers qua driver adapter phù hợp môi trường Workers (`@prisma/adapter-neon` hoặc `@prisma/adapter-pg` qua Cloudflare Hyperdrive — chốt ở spike F19.2/F19.3). Neon hỗ trợ `pgvector` nên F18 không bị chặn.
**Hệ quả**: dev vẫn dùng Postgres trong Docker; `prisma migrate deploy` chạy từ CI trước khi deploy (Workers không có bước khởi động). Gói Free có giới hạn dung lượng/compute — theo dõi khi dữ liệu lớn dần. Không dùng Google Sheets làm DB (giữ ADR-005).

### ADR-016 — Deploy lên Google Cloud Run (thay thế ADR-014) (2026-10-14)
**Bối cảnh**: so sánh lại các phương án với nhu cầu thật của app (SSR Next.js, endpoint MCP public, realtime, job nền sau này, Postgres) và tiêu chí "chủ yếu free, sẵn sàng đổi kiến trúc":
- Cloudflare Workers Free: giới hạn bundle đã nới (64 MiB từ 9/2026) nhưng **10ms CPU/request** vẫn còn — rủi ro cao cho SSR + Prisma; phải chạy qua OpenNext; không có bộ nhớ dùng chung.
- Vercel Hobby: điều khoản chỉ cho **dùng phi thương mại** → tool nội bộ công ty phải lên Pro (20 USD/người/tháng). Loại.
- VPS (Hetzner ~5–7 EUR/tháng sau 2 lần tăng giá 2026): hợp kỹ thuật nhất nhưng không free, phải tự quản trị.
- **Cloud Run**: free trong hạn mức (2M request, 180K vCPU-giây, 360K GiB-giây/tháng), chạy container Node chuẩn, không giới hạn CPU/request, cùng Google Cloud project với OAuth (ADR-013).

**Quyết định**: app chạy trên **Google Cloud Run** (container từ Dockerfile, Next.js `output: "standalone"`), image lưu ở Artifact Registry, deploy bằng GitHub Actions (Workload Identity Federation, không dùng JSON key). Database giữ **Neon Free** (ADR-015) nhưng kết nối như Node bình thường bằng `@prisma/adapter-pg` qua connection string pooled của Neon — không cần adapter riêng cho Workers. Region gần Việt Nam (Singapore) cho cả Cloud Run và Neon, miễn là region đó nằm trong hạn mức free. Cloudflare chỉ dùng tuỳ chọn cho DNS/HTTPS của tên miền riêng. **Thay thế ADR-014**.

**Hệ quả**:
- **Cloud Run (billing theo request) tính tiền suốt thời gian một request còn mở** → không giữ kết nối dài: realtime (F17) dùng **polling ngắn** từ client thay cho SSE giữ kết nối; MCP endpoint (F16) chạy Streamable HTTP **stateless**, không mở stream SSE dài.
- Cấu hình: `min-instances=0` (để còn free), `max-instances` nhỏ (1–2) để chặn chi phí bất ngờ; có thể nhiều instance và scale về 0 → không giữ trạng thái quan trọng trong RAM (rate limit, phiên MCP lưu DB).
- Cold start: cả Cloud Run và Neon đều "ngủ" khi không ai dùng → request đầu tiên sau thời gian nghỉ chậm vài giây — chấp nhận được cho tool nội bộ.
- Phải gắn thẻ thanh toán cho Google Cloud → đặt **budget alert** ngay từ đầu.
- Container chuẩn → nếu sau này cần (SSE dài, job nền nặng, hết hạn mức free) có thể chuyển sang VPS với cùng image, gần như không sửa code.

### ADR-017 — Quy ước server action: zod + ActionResult (2026-10-15)
**Bối cảnh**: F11 bắt đầu có nhiều action ghi dữ liệu do người dùng gửi lên; cần validate ở biên và báo lỗi nghiệp vụ cho UI mà không rơi vào error boundary.
**Quyết định**:
- Validate input bằng **zod** (`z.object(...).safeParse`) ở đầu mỗi action; thông báo lỗi tiếng Việt viết trong schema.
- Action trả `ActionResult` (`lib/actions/result.ts`): `{ ok: true } | { ok: false, error }` cho lỗi nghiệp vụ (input sai, không tìm thấy, vi phạm ràng buộc như giao task cho người ngoài dự án). Chỉ lỗi bất ngờ (mất DB, bug) mới throw.
- Thay đổi task revalidate cả cây: `revalidatePath("/[project]", "layout")` — vì task ảnh hưởng badge nav ở layout, màn work/team và portfolio (liệt kê mọi dự án).
- Đầu mỗi action có `// TODO(F15.4): kiểm tra quyền` cho tới khi có phân quyền.
**Hệ quả**: client gọi action trong `useTransition`, đọc `result.ok` để hiện lỗi tại chỗ (drawer/dialog).

### ADR-018 — Dialog hành động chính điều khiển bằng URL (2026-10-15)
**Bối cảnh**: nút hành động chính ("Task mới", "Tài liệu mới", "Thêm thành viên"…) nằm ở `Header` trong layout, không nhận props từ page; dialog lại cần dữ liệu lựa chọn (feature, thành viên…) tải ở server.
**Quyết định**:
- Nút ở header là link đặt query `?new=1` (giữ các query khác) — hook `useUrlDialog()` trong `components/ui/urlDialog.ts`.
- `page.tsx` của màn đọc `searchParams.new === "1"` và render dialog với dữ liệu đã tải sẵn; đóng dialog (Huỷ, Esc, click nền, tạo xong) = `router.replace` bỏ `new` khỏi URL.
- Khung dùng chung: `components/ui/Dialog.tsx` (Esc/click nền, focus trap, trả focus) + `components/ui/Field.tsx` (nhãn + `.input`).
- Màn chưa có dialog để `primaryDialog: false` trong `components/layout/screenMeta.ts`; bật lên khi page của màn đã render dialog.
**Hệ quả**: dialog mở được bằng link/bookmark, nút Back đóng dialog; F12 ("Tài liệu mới") và F13 ("Thêm thành viên") chỉ cần thêm component dialog + đọc `searchParams` ở page.

### ADR-019 — Dedupe đọc dữ liệu trong một request bằng `React.cache()` (2026-10-28)
**Bối cảnh**: layout `/[project]`, page và các hàm data gọi lại nhau (vd `getActivityFeed` → `getTasksByProject` → `getFeaturesByProject`) nên một request tải cùng dữ liệu nhiều lần; màn work tốn 131 câu SQL. Production chạy Neon Free + Cloud Run (ADR-015, ADR-016) — query thừa vừa chậm vừa ăn quota.
**Quyết định**:
- Mọi hàm đọc export trong `lib/data/*.ts` và `lib/auth/currentUser.ts` viết dạng `export const getX = cache(async (...) => { ... })` (`cache` từ `react`). Chữ ký giữ nguyên (ADR-004) nên nơi gọi không đổi.
- Phạm vi cache là **một request render** của Server Component — không phải cache giữa các request, không giữ trạng thái trong RAM (hợp ràng buộc ADR-016). Server action ghi xong gọi `revalidatePath` → request render mới → đọc lại từ DB.
- Tham số là kiểu nguyên thuỷ (id chuỗi) để cache khớp theo giá trị; không truyền object/mảng vào hàm `lib/data`.
- Chỗ chỉ cần con số (badge sidebar) dùng hàm đếm riêng (`prisma.*.count`) thay vì tải danh sách rồi `.length`.
**Hệ quả**: màn work 131 → 33 câu SQL, các màn khác giảm 8–10 câu. Ngoài React render (Vitest integration, script) `cache` không dedupe — hàm vẫn chạy đúng, chỉ không gộp. Giá trị trả về dùng chung giữa các nơi gọi trong request → không mutate kết quả của hàm `lib/data`.
