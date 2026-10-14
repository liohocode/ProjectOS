# F02 — Màn Feature & Task

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Xong (v1) | 0 | F01 | FR-WK-01…08 |

## Mục tiêu
Màn mặc định (`/[project]/work`): lead điều phối công việc giữa người và agent — list theo feature, timeline, activity feed, task drawer.

## Tham chiếu
- `docs/design/design-reference.md` → "3. Feature & Task"
- Code: `app/[project]/work/page.tsx`, `components/work/*`, `lib/data/{features,timeline,activity,taskDrawer}.ts`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F02.1 | Toolbar (segmented list/timeline, đếm task, toggle rail) + banner block | S | — | Xong — 40df993 |
| F02.2 | View theo feature: `FeatureSection` + `TaskRow`, gập/mở, viền theo kind/block, container query | M | — | Xong — 40df993 |
| F02.3 | View Timeline (`TimelineView`, dữ liệu `lib/data/timeline.ts`) | S | — | Xong — 40df993 |
| F02.4 | Activity rail (`lib/data/activity.ts` suy ra từ task/revision) | S | — | Xong — 40df993 |
| F02.5 | Task drawer: meta, block, context docs, log phiên chạy (`lib/data/taskDrawer.ts`) | M | — | Xong — 40df993 |
| F02.6 | Drawer: "Chuyển stage" (BA→TA→Dev→Review→Done), "Giao cho agent" — **chỉ state client**; banner "Xem tất cả" mở task block đầu tiên | S | F02.5 | Xong — c93f6b4 |

## Đã chuyển sang feature khác
- Chuyển stage / giao agent **ghi xuống DB** → **F11.3**.
- "Task mới", đặt/gỡ block → **F11.4**, **F11.5**.
- Dữ liệu timeline còn mock → **F09.3**.
- Activity rail và log phiên chạy là dữ liệu suy ra → **F17**.
- Deep link `?task=` mở drawer, `?view=timeline` → **F14.1**.

## Quyết định / ghi chú
- State `view`, `closed`, `railOpen`, `openTaskId` nằm trong `WorkScreen` (client). `features` được copy vào state để chỉnh tạm — sẽ bỏ khi F11.3 ghi DB thật.
- Timeline cho `rv-app`/`crm` là dữ liệu tự soạn thêm (design gốc chỉ có `rv-web`).
