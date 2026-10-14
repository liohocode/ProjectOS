# Handoff: Meridian — Hệ thống quản lý dự án đa dự án với AI coding agents

> **Ghi chú (2026-10):** đây là bản spec UI gốc từ gói handoff thiết kế, giữ nguyên nội dung làm nguồn sự thật cho UI/UX. Các file prototype nhắc tới bên dưới (`Meridian v2.dc.html`, `support.js`, `_ds/`) đã bị xoá khỏi repo khi chuyển sang codebase thật — token Nocturne đã port vào `app/globals.css`, dữ liệu mẫu đã port vào `prisma/seed-data/`. Yêu cầu đã được tổng hợp và đánh số ở `docs/product/requirements.md`.

## Overview
Meridian là một công cụ quản lý dự án phần mềm cho đội ngũ mà **developer thật làm việc cùng AI coding agents**. Nó gồm một màn portfolio và bốn module:

1. **Docs dự án** — tài liệu gắn trực tiếp vào từng feature, cộng một "kho tri thức" có index/embedding cho agent đọc.
2. **Feature – Task – Timeline** — danh sách task group theo feature (view chính) và một view timeline.
3. **Dev & AI agents** — người và agent trong cùng một danh sách, phân biệt bằng badge/viền; mỗi agent có role, skills, model, quyền.
4. **MCP** — các MCP server mà agent kết nối vào, phiên chạy của agent, và nhật ký lệnh realtime.

Pipeline agent xuyên suốt sản phẩm: **BA agent** (phân tích yêu cầu, chia feature) → **TA agent** (phân tích kỹ thuật, chia task, tự code hoặc chuyển cho dev agent) → **Dev agent** (pull context, code, test, mở PR) → **Index agent** (index docs vào kho tri thức).

Hệ thống hỗ trợ **nhiều dự án**: project switcher ở sidebar, màn "Tất cả dự án", và một pool người + agent dùng chung được phân bổ vào các dự án.

## About the Design Files
Các file trong gói này là **design reference viết bằng HTML** — prototype thể hiện bố cục, hành vi và ngôn ngữ hình ảnh mong muốn, **không phải production code để copy thẳng**.

Nhiệm vụ là **dựng lại các màn hình này trong codebase đích** bằng framework và pattern sẵn có ở đó (React, Vue, Svelte, v.v.). Nếu chưa có codebase, chọn framework phù hợp rồi implement theo tài liệu này. Dữ liệu trong prototype là dữ liệu giả đặt inline trong file — thay bằng API thật.

`Meridian v2.dc.html` là bản hiện hành. `Meridian.dc.html` là bản v1 (kanban board) giữ lại để đối chiếu; không cần implement.

## Fidelity
**High-fidelity.** Màu, typography, spacing, radius, shadow đều lấy từ design system Nocturne (xem Design Tokens). Layout, trạng thái hover/selected, và luồng tương tác đã chốt. Dựng lại pixel-perfect bằng component library của codebase, ánh xạ token Nocturne sang token của bạn.

Ngôn ngữ UI: **tiếng Việt, giữ thuật ngữ kỹ thuật tiếng Anh** (task, feature, sprint, agent, MCP, review, backlog).

---

## Screens / Views

Khung chung cho mọi màn: sidebar trái cố định **228px** (nền `#1a1c2b`, `overflow-y:auto`, viền phải bằng `box-shadow: inset -1px 0 0 var(--color-divider)`) + vùng main `flex:1`. Toàn bộ app cao `100vh`, `overflow:hidden`; chỉ các vùng nội dung cuộn.

### Sidebar
- **Brand**: ô 22×22, radius 6px, border 1px `--color-accent`, icon Phosphor `ph-compass` màu accent; chữ "Meridian" `--font-heading` 16px weight 500.
- **Project switcher**: label uppercase 10px letter-spacing .1em màu `--color-neutral-600` ("Dự án đang mở"); button nền `--color-surface`, `--shadow-sm`, padding 8.4px, gồm badge 20×20 radius 4px (nền `--color-accent-800`, chữ `--color-accent-200`, mã 2 ký tự), tên dự án, icon `ph-caret-up-down`. Click mở dropdown `position:absolute` (z-index 20, radius 8px, `--shadow-lg`) liệt kê các dự án + dòng cuối "Xem tất cả dự án →". Mục đang chọn có nền `color-mix(in srgb, var(--color-accent) 14%, transparent)` và chữ `--color-accent-200`.
- **Nav modules**: Tất cả dự án / Docs dự án / Feature & Task / Dev & AI agents / MCP. Mỗi item: icon 15px + label 13px + badge đếm bên phải. Item active thêm `box-shadow: inset 2px 0 0 var(--color-accent)` và nền accent 14%. Badge cảnh báo (task bị block, revision chờ duyệt) đổi sang nền `color-mix(in srgb, #d9c184 22%, transparent)`, chữ `#d9c184`; badge thường màu `--color-neutral-500`.
- **Pipeline agent**: 4 dòng BA / TA / Dev / Index, mỗi dòng dot 7px + mã stage 10.5px màu `--color-accent-300` + tên agent 12px.
- **Footer** (`margin-top:auto`): chấm xanh `#7fcf9e` + "MCP: 2/3 server online"; avatar 24px + "Trung Hiếu · Tech lead".

### Header (mọi màn)
Padding 16.8px 22.4px 11.2px, viền dưới inset shadow. Trái: kicker uppercase 10px màu accent ("Portfolio" / "Module 1"…), `<h4>` tiêu đề màn, dòng context 11.5px màu `--color-neutral-500` ("Rever Web v3 · Sprint 14 · 12–26/08"). Phải: ô `.input` 200px (placeholder "Tìm feature, task, docs…"), nút `.btn-secondary` "Lọc" (`ph-funnel`), nút `.btn-primary` action chính theo màn ("Dự án mới" / "Tài liệu mới" / "Task mới" / "Thêm thành viên" / "Kết nối server"). Cả ba cao tối thiểu 32px.

---

### 1. Portfolio — "Tất cả dự án đang phát triển"
**Mục đích**: lead nhìn toàn bộ dự án và nhảy vào một dự án.

Dòng tóm tắt 12px: "3 dự án · 7 người và agent dùng chung · N task đang bị block". Bên dưới: `display:grid; grid-template-columns: repeat(auto-fill, minmax(292px, 1fr)); gap: 11.2px`.

**Project card** (padding 16.8px, radius 8px, nền `--color-surface`, `--shadow-sm`; dự án đang mở thêm `inset 2px 0 0 var(--color-accent)`; cursor pointer):
- Hàng đầu: badge mã 26×26 radius 6px + tên `--font-heading` 16px + tag trạng thái ("Đang chạy" = `.tag-accent`, khác = `.tag-outline`).
- Mô tả 12.5px màu `--color-neutral-400`, `text-wrap: pretty`.
- Progress: track cao 4px radius 2px nền `--color-neutral-900`, fill `--color-accent` theo % trung bình các feature; số % 11px tabular-nums.
- 4 ô thống kê (Feature / Task / Agent / Người): label uppercase 10px `--color-neutral-600`, giá trị 14px.
- Hàng avatar 20px (tối đa 6) + nếu có task block: "N task bị block" 11px màu `#d9c184` với icon `ph-warning`, đẩy phải.
- Dòng sprint 11px màu `--color-neutral-600`.

Click card → mở dự án đó và chuyển sang màn Feature & Task.

Dữ liệu mẫu: Rever Web v3 (RV, 4 feature), Rever Mobile App (MA, 3 feature), Agent CRM nội bộ (CR, 2 feature).

---

### 2. Docs dự án — "Docs gắn feature và kho tri thức"
**Mục đích**: đọc/duyệt tài liệu, thấy tài liệu nào agent đã ghi và trạng thái index.

**Strip kho tri thức** (trên cùng, nền `#1c1e2c`, padding 11.2px 22.4px, viền dưới inset): icon `ph-brain` + nhãn "KHO TRI THỨC" màu accent, rồi các ô thống kê (label uppercase 10px + giá trị 13px): Tài liệu (n/n đã index), Chunk, Revision chờ duyệt, Agent đã ghi, Index cuối, Embedding (text-embedding-3-large). Nút "Index lại" (`ph-arrows-clockwise`) đẩy phải.
*Responsive*: container query trên strip — dưới 1040px ẩn "Embedding", dưới 800px ẩn thêm "Agent đã ghi" và "Index cuối". Mọi ô `white-space: nowrap`.

**Cây tài liệu** (trái, 264px, cuộn, viền phải inset): group theo feature (`ph-cube` + "FEAT-118 Listing rework") và một group "Kho tri thức chung" (`ph-brain`), mỗi group hiện số tài liệu. Mỗi doc là một hàng nút: icon `ph-file-text`, tiêu đề truncate, và **icon `ph-sparkle` màu accent nếu tài liệu do agent ghi**. Doc đang chọn: nền accent 14%, chữ `--color-accent-200`.

**Thân tài liệu** (phải, cuộn, padding 22.4px 33.6px, `max-width: 660px`):
- Hàng meta: tag version (`.tag-neutral`), tag trạng thái (`.tag-outline`), và "Sửa lần cuối 2 giờ trước · Atlas (AI agent)" 11px.
- `<h3>` tiêu đề, đoạn tóm tắt 14px `.text-muted`.
- Ba ô thông tin (flex, mỗi ô min 180px, radius 8px, nền surface, shadow-sm): **Gắn với feature** (giá trị màu `--color-accent-300`), **Trạng thái index** ("Đã index · 18 phút trước · 42 chunk"), **Agent đã đọc**.
- Các section: `<h5>` + đoạn 14px line-height 1.65 màu `#cfd3e5`.
- **Khối "Revision chờ duyệt và lịch sử"** (nền `#1c1e2c`, radius 8px, padding 11.2px): mỗi dòng gồm tag người/agent (min-width 62px), mô tả, thời điểm, và **nút "Duyệt" `.btn-primary` cao 26px chỉ hiện với revision đang chờ**. Đây là luồng governance cốt lõi: agent chỉ được `docs.append` thành revision mới, người duyệt mới vào bản chính.

---

### 3. Feature & Task — "Feature · Task · Timeline"  ← màn mặc định
**Mục đích**: lead điều phối công việc giữa người và agent.

**Thanh công cụ**: segmented control `.seg` hai lựa chọn — "Theo feature" (`ph-list-dashes`, mặc định) và "Timeline" (`ph-chart-bar-horizontal`); nhãn sprint 12px; nút toggle activity rail bên phải ("Ẩn activity" / "Activity feed", icon `ph-activity`).

**Banner block** (nếu có task bị block): padding 8.4px 11.2px, radius 8px, nền `color-mix(in srgb, #d9c184 12%, transparent)`, viền `inset 0 0 0 1px color-mix(in srgb, #d9c184 45%, transparent)`, icon `ph-warning` `#d9c184`, text "N task đang bị block — T-418 (chờ ADR-11), T-402 (thiếu spec role)", nút ghost "Xem tất cả".

**View "Theo feature"** (view chính): mỗi feature là một `<section>` radius 8px nền surface, `overflow:hidden`, margin-bottom 16.8px.

*Feature header* (`.frow`, nền `#1c1e2c`, padding 11.2px):
`grid-template-columns: 26px 60px minmax(0,1fr) auto auto 132px 22px` — nút caret (`ph-caret-down`/`ph-caret-right`, gập/mở), mã FEAT-xxx, tên (`--font-heading` 15px), tag stage, "N docs" (`ph-file-text`), progress bar + %, avatar owner.

*Task row* (`.trow`, padding 8.4px 11.2px, viền dưới `inset 0 -1px 0 color-mix(in srgb, var(--color-text) 7%, transparent)`, hover `color-mix(in srgb, var(--color-text) 4%, transparent)`, cursor pointer):
`grid-template-columns: 46px 54px minmax(0,1fr) auto 128px 72px 34px` — mã task (tabular-nums), tag stage (BA/TA/Dev/Review/Done), tiêu đề (truncate), cột cờ, assignee (avatar 18px + tên), trạng thái, ước lượng.
- **Task của agent**: `inset 2px 0 0 var(--color-accent)` ở mép trái.
- **Task bị block**: `inset 2px 0 0 #d9c184` (đè lên accent) và cột cờ hiện `ph-warning` + lý do ngắn, màu `#d9c184`.
- **Task đang chạy**: cột cờ hiện `ph-circle-notch` + "chạy 14 phút", màu accent.

*Responsive (container query trên vùng list)*: <880px ẩn cột trạng thái và ước lượng; <680px ẩn thêm tag stage và tên assignee (giữ avatar). Cùng breakpoint, feature header lần lượt bỏ "N docs" rồi tag stage + progress.

**View "Timeline"**: CSS grid `200px repeat(8, minmax(52px,1fr))`, hàng đầu là nhãn tuần T1–T8. Mỗi feature chiếm một `grid-row`; cột nhãn có dot + tên + owner, thanh bar đặt bằng `grid-column: start / span len`, cao 26px radius 6px:
- Người thực hiện: nền `--color-accent-600`, chữ `--color-accent-100`.
- AI agent: nền accent 12% + `inset 0 0 0 1px var(--color-accent)`, chữ `--color-accent-200`.
- Chưa bắt đầu: nền `--color-neutral-800`.
Có legend ba mục ở dưới. Mỗi ô bar có `inset 1px 0 0 var(--color-divider)` làm lưới tuần.

**Activity rail** (phải, 300px, cuộn): tiêu đề "AGENT ĐANG LÀM GÌ" + nút đóng. Mỗi item: avatar 20px, mô tả 12px, dòng dưới gồm tên tool (monospace 10.5px màu `--color-accent-300`) + thời gian. Nền item: đang chạy = accent 12%, bị chặn = `color-mix(in srgb, #d9c184 10%, transparent)`, còn lại trong suốt. Rail tự ẩn khi vùng làm việc hẹp hơn 1120px.

**Task drawer** (mở khi click task row): overlay `position:fixed; inset:0` nền `color-mix(in srgb, #292b31 55%, transparent)`, panel phải rộng 420px, nền surface, `--shadow-lg`, padding 22.4px, cuộn. Nội dung:
- Hàng đầu: mã task, tag stage, tag người/agent, nút đóng `ph-x`.
- `<h4>` tiêu đề.
- Nếu block: hộp cảnh báo màu amber với lý do đầy đủ.
- Khối meta (nền `#1c1e2c`): Feature, Người/agent, Stage, Ước lượng, Hạn.
- **"Context agent đã pull"**: danh sách tài liệu agent đọc qua `docs.read`.
- **"Log phiên chạy"**: timeline dot + mô tả + thời gian ("Vega (TA agent) chia task và giao cho Atlas" → "Atlas claim task qua tasks.claim" → "Pull 3 tài liệu context" → "Đẩy 4 commit" → "Chờ review của Hiếu").
- Footer: "Chuyển stage" (secondary) + "Giao cho agent" (primary).

---

### 4. Dev & AI agents
**Mục đích**: lead xem ai (người hay agent) đang làm gì, cấu hình agent.

**4 card pipeline** (flex, mỗi card min 172px, padding 11.2px, radius 8px, surface): stage uppercase 10px màu accent + icon, tên agent 14px, mô tả 11.5px. Nội dung: BA agent (Bảo) — "Nhận yêu cầu, phân tích, chia thành feature và acceptance criteria"; TA agent (Vega) — "Phân tích kỹ thuật, chia task, tự code hoặc chuyển cho dev agent"; Dev agent (Atlas) — "Pull context và task, code, viết test, mở PR chờ người review"; Index agent (Scout) — "Index docs thành kho tri thức để mọi agent đọc qua docs.search".

**Bộ lọc** `.seg`: Dự án này / Người / AI agent / Toàn tổ chức. Dòng chú thích 12px bên cạnh.

**Danh sách thành viên** (`.mrow`, gap 5.6px giữa các hàng): `grid-template-columns: 22px minmax(0,1.1fr) 104px minmax(0,1.1fr) minmax(0,1.4fr) 92px` — avatar, tên + handle (10.5px `--color-neutral-600`), tag role, skills (`.tag-neutral`), việc đang làm, trạng thái (dot + chữ). Hàng radius 8px nền surface; hàng đang chọn thêm `inset 2px 0 0 var(--color-accent)`.
*Responsive*: <1000px ẩn cột skills; <780px ẩn thêm cột "đang làm".

**Phân biệt người vs agent** (xuyên suốt sản phẩm):
- Avatar người: nền `--color-neutral-800`, chữ `--color-neutral-100`, tròn.
- Avatar agent: nền trong suốt + `inset 0 0 0 1px var(--color-accent)`, chữ `--color-accent-200`.
- Tag role người = `.tag-neutral`, agent = `.tag-accent`.

**Panel chi tiết** (phải, 308px, cuộn; tự ẩn khi vùng hẹp hơn 1120px):
- Header: avatar 36px + tên (`--font-heading` 15px) + "handle · role".
- **"Cấu hình agent"** (chỉ với agent): Model, MCP server, Task đồng thời / Được phép giao task / Tool đặc thù / Embedding (tuỳ role), Quyền ghi docs, Token tuần này.
- **Skills**: mỗi dòng tên + mức (Cao / Trung bình / Cơ bản / Không dùng) + thanh 4px; fill `--color-accent` nếu >70%, còn lại `--color-accent-700`.
- **Hoạt động gần đây**: icon + mô tả + thời gian.
- Footer: "Xem log" (secondary) + "Giao task" (primary).

Dữ liệu mẫu: Bảo (BA, opus), Vega (TA, opus), Atlas (Dev, sonnet), Scout (Index, haiku), Nguyễn Nam (Backend lead), Trần Mỹ Linh (Frontend), Trung Hiếu (Tech lead).

---

### 5. MCP — "Kết nối MCP cho agent"
**Mục đích**: quản trị các MCP server và soi những gì agent thực sự làm.

**Server cards** (`.card.elev-sm`, grid `repeat(auto-fill, minmax(292px,1fr))`): dot trạng thái (online `#7fcf9e`, giới hạn `#d9c184`), tên (`.card-title`), tag trạng thái; URL monospace 11px `word-break: break-all`; danh sách tool dạng `.tag-outline` monospace; `.card-meta`: "4 client · 1284 lệnh / 24h · lệnh cuối 12 giây trước".
Server mẫu: `meridian-core` (tasks.list, tasks.claim, tasks.update_status, features.propose), `meridian-docs` (docs.read, docs.search, docs.append, docs.index), `redis-tools` (cache.inspect, cache.flush — trạng thái Giới hạn).

**Bảng "Phiên chạy của agent"** (`.table`): Phiên (id monospace) · Agent · Dự án (màu `--color-accent-300`) · Task · Thời lượng · Tool calls · Token · Kết quả (tag: Xong = neutral, Đang chạy = accent, còn lại = outline). Bảng cắt ngang nhiều dự án.

**Bảng "Nhật ký lệnh"** (realtime): Thời điểm (tabular-nums) · Agent · Tool (monospace, `--color-accent-300`) · Đối tượng · Kết quả (OK / Chờ review / Bị chặn).

---

## Interactions & Behavior
- **Chuyển màn**: nav sidebar; state `screen` ∈ portfolio | docs | work | team | mcp. Mặc định `work`.
- **Đổi dự án**: click switcher mở dropdown → chọn dự án ⇒ reset `doc` về tài liệu đầu tiên của dự án, đóng task drawer, mở lại mọi feature group. Click card ở Portfolio ⇒ đổi dự án và nhảy sang màn work.
- **Gập/mở feature**: state `closed: { [featureId]: true }`.
- **Mở task**: click task row ⇒ drawer; đóng bằng nút X hoặc click overlay (`stopPropagation` trên panel).
- **Toggle activity rail**: state `rail`.
- **Lọc thành viên**: state `filter` ∈ all | human | agent | org. `all` = thành viên của dự án đang mở; `org` = toàn bộ pool.
- **Chọn thành viên**: click hàng ⇒ panel phải.
- **Chuyển view task**: segmented list | timeline.
- **Hover**: hàng task và hàng thành viên sáng lên `color-mix(in srgb, var(--color-text) 4%, transparent)`. Các nút dùng state sẵn có của Nocturne.
- **Focus**: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` (Nocturne lo sẵn).
- **Responsive**: dùng **container queries**, không phải media queries — vùng làm việc, vùng list, vùng team, strip kho tri thức đều là container riêng. Các cột phụ rụng dần theo thứ tự ưu tiên đã ghi ở từng màn; tiêu đề task và tên thành viên không bao giờ bị ẩn.
- **Chưa có trong prototype**: loading state, error state, validation form, phân trang, kéo thả. Cần thiết kế thêm khi implement.

## State Management
```
project: 'rv-web' | 'rv-app' | 'crm'   // dự án đang mở
screen:  'portfolio' | 'docs' | 'work' | 'team' | 'mcp'
view:    'list' | 'timeline'            // trong màn work
doc:     string | null                  // id tài liệu đang xem
member:  string                         // id thành viên đang chọn
task:    string | null                  // id task đang mở trong drawer
filter:  'all' | 'human' | 'agent' | 'org'
rail:    boolean                        // activity rail
closed:  Record<featureId, true>        // feature đang gập
switcher: boolean                       // dropdown project switcher
```

**Data fetching thật cần có**: danh sách project; feature + task theo project; cây docs theo project; nội dung + lịch sử revision của một doc; thành viên (người + agent) và phân bổ theo project; cấu hình + skills của agent; MCP server + tool; phiên chạy agent; nhật ký lệnh (nên là stream/websocket cho realtime feed và log).

**Quan hệ dữ liệu**: Project 1—n Feature 1—n Task; Feature 1—n Doc; Doc 1—n Revision (mỗi revision có author là người hoặc agent, và trạng thái chờ duyệt); Member n—n Project; Agent 1—n Session; Session 1—n ToolCall; Task 0—n Session.

## Design Tokens
Toàn bộ lấy từ design system **Nocturne** (`_ds/nocturne-*/styles.css`, đính kèm trong gói này). Dùng biến CSS, không hard-code.

**Màu (biến)**: `--color-bg` #161826 · `--color-text` #e9e9ed · `--color-accent` #9184d9 · `--color-surface` · `--color-divider` · ramp `--color-neutral-100…900` và `--color-accent-100…900`.

**Màu bổ sung dùng trong thiết kế này** (không có trong Nocturne — nếu codebase có token trạng thái, dùng token đó):
- `#1a1c2b` — nền sidebar
- `#1c1e2c` — nền strip/header phụ/khối nhấn
- `#cfd3e5` — chữ nội dung trong panel và log
- `#d9c184` — cảnh báo / block / chờ duyệt
- `#7fcf9e` — online / xong
- `#292b31` @55% — nền overlay drawer

**Spacing** (thang 0.7× của Nocturne, px dùng thực tế): 2.8 · 4 · 5.6 · 6 · 8.4 · 11.2 · 16.8 · 22.4 · 33.6.

**Typography**: `--font-heading` và `--font-body` đều là Inter. Cỡ dùng: 10 (label uppercase, letter-spacing .1em) · 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 15 · 16. Heading không vượt weight 500. Số liệu dùng `font-variant-numeric: tabular-nums`; tên tool/URL/id phiên dùng `ui-monospace, monospace`.

**Radius**: 2px (thanh progress) · 4px · 6px · 8px (`--radius` mặc định).

**Shadow**: `--shadow-sm` / `--shadow-md` / `--shadow-lg`. Đường viền trong layout dùng `box-shadow: inset` thay cho `border` để không ảnh hưởng box model.

**Class Nocturne đã dùng**: `.btn` (+ `-primary` `-secondary` `-ghost` `-icon` `-block`), `.tag` (+ `-accent` `-neutral` `-outline`), `.input`, `.seg` + `.seg-opt`, `.card` + `.card-title` `.card-meta` + `.elev-sm`, `.table`, `.text-muted`.

## Assets
- **Icons**: Phosphor Icons (regular), nạp qua `https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css`. Các icon dùng: compass, caret-up-down, caret-down, caret-right, squares-four, files, list-dashes, users-three, plugs-connected, plugs, brain, cube, file-text, funnel, plus, x, warning, circle-notch, activity, arrows-clockwise, arrow-right, arrow-up-right, chart-bar-horizontal, magnifying-glass, tree-structure, code, share-network, git-commit, git-pull-request, chat-circle, check-circle, seal-check, user-gear, clock-counter-clockwise.
- **Không có ảnh** trong thiết kế này.
- **Không dùng tài sản thương hiệu** nào ngoài design system Nocturne.

## Files
- `Meridian v2.dc.html` — **bản hiện hành**, toàn bộ 5 màn. Template (markup) nằm trong `<x-dc>`; dữ liệu và logic nằm trong class `Component` ở `<script data-dc-script>` cuối file. Các method dữ liệu: `projects()`, `allFeatures()`, `allDocTrees()`, `docBody(id)`, `team()`, và bảng phân bổ `alloc`.
- `Meridian.dc.html` — v1 (kanban), chỉ để tham khảo.
- `support.js` — runtime của môi trường prototype. **Không port sang production.**
- `_ds/nocturne/styles.css` — token + class của design system. Đây là nguồn duy nhất cho màu/type/spacing.
- `_ds/nocturne/readme.md` — hướng dẫn design system (quy tắc dùng accent, ảnh, trạng thái).

## Gợi ý thứ tự implement
1. Khung app + sidebar + project switcher + routing 5 màn.
2. Màn Feature & Task (list theo feature) + task drawer — đây là màn dùng nhiều nhất.
3. Màn Docs + luồng duyệt revision của agent.
4. Màn Dev & AI agents.
5. Màn MCP + realtime (websocket cho activity feed và nhật ký lệnh).
6. Màn Portfolio.
