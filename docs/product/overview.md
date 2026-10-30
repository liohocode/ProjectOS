# Meridian — tổng quan dự án

## Meridian là gì
Công cụ quản lý dự án phần mềm cho đội ngũ mà **developer thật làm việc cùng AI coding agent**. Người và agent nằm chung một danh sách thành viên, cùng nhận task, cùng ghi tài liệu — nhưng agent bị ràng buộc bởi các luật governance (mọi thay đổi tài liệu của agent phải qua người duyệt, giới hạn số task đồng thời, giới hạn quyền theo role).

Tên sản phẩm: **Meridian**. Tên dự án/repo: **Project Management OS (PMOS)** — `liohocode/ProjectOS`.

## Người dùng
| Vai trò | Cần gì từ Meridian |
|---|---|
| Tech lead / lead dự án | Nhìn toàn bộ dự án, điều phối việc giữa người và agent, duyệt revision tài liệu do agent ghi, cấu hình quyền agent |
| Developer (người) | Nhận task, xem context, cập nhật trạng thái |
| AI coding agent | Kết nối qua **MCP**, đọc task/tài liệu, claim task, cập nhật trạng thái, đề xuất thay đổi tài liệu (chờ duyệt) |

## Khái niệm cốt lõi
- **Đa dự án**: một tổ chức có nhiều dự án (vd: Rever Web v3, Rever Mobile App, Agent CRM nội bộ); một pool người + agent dùng chung được phân bổ vào từng dự án.
- **Project → Feature → Task**: mỗi dự án có các feature (mã `FEAT-xxx`), mỗi feature có các task (mã `T-xxx`). Task đi qua các stage `BA → TA → Dev → Review → Done`.
- **Pipeline agent** xuyên suốt sản phẩm:
  1. **BA agent** (Bảo) — nhận yêu cầu, phân tích, chia feature và acceptance criteria.
  2. **TA agent** (Vega) — phân tích kỹ thuật, chia task, tự code hoặc chuyển cho dev agent.
  3. **Dev agent** (Atlas) — pull context, code, viết test, mở PR chờ người review.
  4. **Index agent** (Scout) — index tài liệu thành kho tri thức để mọi agent tìm qua `docs.search`.
- **Docs gắn feature + kho tri thức chung**: tài liệu thuộc một feature, hoặc thuộc "kho tri thức chung" của dự án. Tài liệu được index (chunk + embedding) để agent đọc.
- **Governance tài liệu**: agent chỉ được `docs.append` → tạo **revision chờ duyệt**; chỉ người mới đưa revision vào bản chính. Đây là luồng cốt lõi của sản phẩm.
- **MCP**: Meridian tự cung cấp MCP server (`meridian-core`, `meridian-docs`) cho agent kết nối; ngoài ra quản lý các MCP server bên ngoài (vd `redis-tools`). Mọi phiên chạy và mọi lệnh của agent được ghi nhật ký.

## Các màn hình (UI)
| Màn | Route | Mục đích |
|---|---|---|
| Portfolio | `/[project]/portfolio` | Lead nhìn toàn bộ dự án, nhảy vào một dự án |
| Docs dự án | `/[project]/docs` | Đọc/duyệt tài liệu, xem trạng thái index, duyệt revision của agent |
| Feature & Task (mặc định) | `/[project]/work` | Điều phối việc: list theo feature, timeline, activity feed, task drawer |
| Dev & AI agents | `/[project]/team` | Ai đang làm gì, cấu hình agent |
| MCP | `/[project]/mcp` | Quản trị MCP server, soi phiên chạy và nhật ký lệnh của agent |

Chi tiết UI (layout, token, kích thước, hành vi): `docs/design/design-reference.md`.

## Phạm vi hiện tại vs. đích
- **Giai đoạn 1 — MVP (gần xong)**: 5 màn trên Postgres thật, ghi dữ liệu đầy đủ, đăng nhập Google + phân quyền, **MCP server thật** cho agent (task, tài liệu, đề xuất feature, governance, nhật ký), sự kiện thật + polling, production trên Cloud Run + Neon.
- **Giai đoạn 2 — đích (chốt 2026-10-30)**: Meridian là **data foundation cho các dự án của công ty** — quản lý tiến độ / công việc / coding agent, quy trình đảm bảo chất lượng và kiểm soát effort / AI token, người theo dõi + review chi tiết, hỗ trợ coding agent qua MCP, tài liệu feature / task / kỹ thuật, người quản lý dùng được trên mobile. Kế hoạch: `docs/ROADMAP.md` (F20–F26).

Yêu cầu đầy đủ đánh số + trạng thái đáp ứng: `docs/product/requirements.md`.
