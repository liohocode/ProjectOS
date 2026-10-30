# F17 — Realtime & nhật ký hoạt động thật

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Đang làm | 4 | F11, F16.2 | FR-WK-06, FR-WK-07, FR-MC-03 |

## Mục tiêu
Activity rail ("Agent đang làm gì") và log phiên chạy trong task drawer hiện là dữ liệu **suy ra** (ADR-008); nhật ký lệnh ở màn MCP là tĩnh. Feature này thay bằng bảng sự kiện thật và đẩy cập nhật lên trình duyệt ngay khi có thay đổi (spec: "nên là stream/websocket cho realtime feed và log").

## Phạm vi
- **Trong**: model sự kiện, ghi sự kiện từ server action + MCP tool, endpoint sự kiện + polling ngắn, cập nhật activity rail / nhật ký lệnh / badge, log phiên chạy thật trong drawer.
- **Ngoài**: thông báo đẩy ra ngoài (email/Slack).

## Tham chiếu
- `docs/architecture/overview.md` → "Các module suy ra (tạm thời)"
- Code: `lib/data/activity.ts`, `lib/data/taskDrawer.ts`, `components/work/ActivityRail.tsx`, `app/[project]/mcp/page.tsx`, `lib/actions/_activity.ts` (F11.7)

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F17.1 | Model `ActivityEvent` + ghi từ server action và MCP tool | M | F11.7, F16.2 | Xong — 2026-10-30 |
| F17.2 | Endpoint lấy sự kiện mới theo con trỏ (cho polling ngắn) | S | F17.1 | Chưa làm |
| F17.3 | Client polling: activity rail, nhật ký lệnh, badge | M | F17.2 | Chưa làm |
| F17.4 | Log phiên chạy trong drawer lấy từ dữ liệu thật | S | F16.2, F17.1 | Chưa làm |
| F17.5 | "chạy N phút" tự tăng phía client | S | F09.2 | Xong — 2026-10-30 |

### F17.1 — Bảng sự kiện
**Làm gì**: model `ActivityEvent(id, projectId, actorId, type enum, taskId?, docId?, featureId?, text, tool?, tone enum {run, ok, review, block}, at)`. Đổi helper `recordActivity` (F11.7) thành ghi `ActivityEvent` (vẫn có thể ghi kèm `MemberActivity` hoặc thay hẳn — chọn và ghi chú). MCP tool (F16.2) cũng ghi. `getActivityFeed(projectId)` đọc bảng này (giữ chữ ký), xoá logic suy ra.
**Hoàn thành khi**:
- [x] Activity rail hiện sự kiện thật theo thời gian, mới nhất trên cùng (`lib/data/activity.integration.test.ts`)

### F17.2 — Endpoint sự kiện theo con trỏ
**Làm gì**: `app/api/projects/[project]/events/route.ts` (GET) nhận `?after=<cursor>` (id/thời điểm sự kiện cuối client đã có), trả JSON các `ActivityEvent`/`McpLogEntry` mới hơn (giới hạn số lượng) + cursor mới — request ngắn, trả về ngay. **Không** dùng SSE giữ kết nối hay Postgres `LISTEN/NOTIFY`: production trên Cloud Run tính tiền suốt thời gian request mở và Neon pooled không hỗ trợ LISTEN (ADR-016). Kiểm tra quyền xem dự án (F15.3 nếu đã có).
**Hoàn thành khi**:
- [ ] Gọi endpoint với cursor cũ trả đúng các sự kiện mới, request kết thúc < 300ms trên DB đã thức

### F17.3 — Client
**Làm gì**: hook `useProjectEvents(projectId)` gọi F17.2 mỗi ~10–15 giây **chỉ khi tab đang hiển thị** (`document.visibilityState`), dừng khi ẩn tab (để Cloud Run/Neon được về 0, tiết kiệm hạn mức free); gọi ngay một lần khi tab hiện lại. Activity rail chèn sự kiện mới lên đầu; bảng nhật ký lệnh màn MCP chèn dòng mới; với sự kiện làm đổi số liệu (task block, revision mới) gọi `router.refresh()` để badge nav / banner cập nhật (throttle).
**Hoàn thành khi**:
- [ ] Mở 2 tab: thao tác ở tab A → tab B cập nhật trong vài giây (≤ chu kỳ polling) không cần reload

### F17.4 — Log phiên chạy thật
**Làm gì**: `getTaskDrawerInfo` lấy log từ `ActivityEvent` + `McpLogEntry` của task (theo `taskId`/`target`), context docs từ các lệnh `docs.read` trong phiên của task. Xoá `buildSessionLog` (mẫu sinh sẵn).
**Hoàn thành khi**:
- [ ] Drawer của task vừa được agent claim qua MCP hiển thị đúng các bước đã diễn ra

### F17.5 — Thời gian chạy live
**Làm gì**: task row / drawer / activity rail nhận `runningSince` (thêm field vào type nếu cần) và hiển thị "chạy N phút" tự cập nhật mỗi 30s phía client.
**Hoàn thành khi**:
- [x] Để trang mở vài phút thấy số phút tăng (e2e `running-time.spec.ts`, đồng hồ giả của Playwright)

## Quyết định / ghi chú
- **F17.1 (2026-10-30)**: migration `activity_events` chỉ thêm bảng + enum `ActivityType` (`task`/`doc`/`feature`/`mcp`) / `ActivityTone`; `taskId`/`docId`/`featureId` là chuỗi không FK (giữ lịch sử khi đối tượng bị xoá). **Chuyển dữ liệu** trong migration: dựng sự kiện ban đầu từ trạng thái hiện có (task đang chạy / bị block / chờ review, revision chờ duyệt) — đúng những gì rail từng suy ra — để rail production không trống; seed chạy cùng các câu SQL đó (`prisma/seed-data/activity.ts`). `recordActivity` **ghi cả hai**: `MemberActivity` (panel "Hoạt động gần đây" — giữ nguyên) + `ActivityEvent` khi truyền `event` (thao tác thuộc dự án: task, tài liệu, duyệt feature). Thao tác cấp tổ chức (thành viên, token, MCP server, dự án) không lên rail. MCP: `recordToolCall` nhận `event` — chỉ lệnh làm thay đổi (claim, cập nhật, bình luận, đề xuất tài liệu/feature), lệnh đọc không lên rail. Rail: 30 sự kiện mới nhất; dòng meta hiện tool MCP hoặc "web"; sự kiện claim của task vẫn đang chạy giữ "chạy N phút" tự tăng (F17.5). `getActivityFeed` giữ chữ ký, bỏ logic suy ra.
- **F17.5 (2026-10-30)**: `Task.runningSince` / `ActivityItem.runningSince` / bước log drawer `runningSince` (ISO) + client component `components/ui/RunningTime.tsx`: render đầu dùng nhãn server đã tính (khớp hydration), sau đó tự tính lại bằng `formatRunning` mỗi 30 giây — không gọi server, không tốn request Cloud Run. **Lệch nhỏ**: bước log drawer đổi từ "Đang chạy — chạy 14 phút" / "vừa xong" thành "Đang chạy" / "chạy 14 phút" (dòng thời gian là phần tự tăng).
- Production trên Cloud Run (ADR-016): chọn **polling ngắn từ client** thay cho SSE/WebSocket giữ kết nối — kết nối dài bị tính tiền suốt thời gian mở và giữ instance + Neon luôn thức, đốt hạn mức free. Độ trễ 10–15 giây chấp nhận được cho activity feed. Nếu sau này chuyển sang VPS (xem F19), có thể nâng cấp lên SSE + `LISTEN/NOTIFY` — ghi ADR khi đó.
