# Roadmap Meridian (PMOS)

Bảng tổng tiến độ. Chi tiết từng task nằm trong file feature. **Cập nhật cột "Task xong" và "Trạng thái" mỗi khi đóng một task** (xem `docs/WORKFLOW.md`).

Cập nhật lần cuối: 2026-10-28 · Tổng: **54/104 task xong** (Phase 0 hoàn tất; đã chốt hạ tầng + đăng nhập).

## Phase 0 — UI v1 + backend (xong)
| Feature | Mục tiêu | Trạng thái | Task xong |
|---|---|---|---|
| [F01](features/F01-app-shell.md) | App shell: sidebar, header, routing, project switcher | Xong | 4/4 |
| [F02](features/F02-feature-task.md) | Màn Feature & Task | Xong (v1) | 6/6 |
| [F03](features/F03-docs.md) | Màn Docs dự án | Xong (v1) | 4/4 |
| [F04](features/F04-team.md) | Màn Dev & AI agents | Xong (v1) | 3/3 |
| [F05](features/F05-mcp-screen.md) | Màn MCP (quản trị) | Xong (v1) | 3/3 |
| [F06](features/F06-portfolio.md) | Màn Portfolio | Xong (v1) | 2/2 |
| [F07](features/F07-backend-postgres.md) | Backend Postgres + Prisma | Xong | 5/5 |

## Phase 1 — Nền tảng (làm trước để các phase sau an toàn)
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F08](features/F08-test-ci.md) | Test tự động (unit, integration, e2e) + CI | F07 | Xong | 6/6 |
| [F09](features/F09-data-model-hardening.md) | Chuẩn hoá data model: bỏ field chuỗi hiển thị, Sprint, timeline vào DB | F07 | Xong | 5/5 |
| [F10](features/F10-ux-states-a11y.md) | Loading / error / empty / 404, thao tác bàn phím | F07 | Xong | 5/5 |

## Phase 2 — Ghi dữ liệu
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F11](features/F11-task-mutations.md) | Thao tác task ghi DB; khuôn mẫu dialog hành động chính | F07 (+F09.2) | Xong | 7/7 |
| [F12](features/F12-doc-authoring.md) | Revision có nội dung, duyệt áp vào bản chính, từ chối, diff, tạo/sửa tài liệu | F11.4 | Đang làm | 1/7 |
| [F13](features/F13-entity-management.md) | Dự án mới, thêm thành viên, cấu hình agent, MCP server ngoài | F11 | Chưa bắt đầu | 0/7 |
| [F14](features/F14-search-filter.md) | Tìm kiếm, lọc, deep link, phân trang | F07 | Chưa bắt đầu | 0/4 |

## Phase 3 — Danh tính
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F15](features/F15-auth-permissions.md) | Đăng nhập **Google**, phân quyền, token cho agent | F11.1 | Chưa bắt đầu | 1/6 |

## Phase 4 — Nền tảng agent (lõi sản phẩm)
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F16](features/F16-mcp-server.md) | MCP server thật cho agent: tool task/docs, governance, ghi phiên + nhật ký | F09, F12.1, F13.5, F15.5 | Chưa bắt đầu | 0/9 |
| [F17](features/F17-realtime-activity.md) | Bảng sự kiện thật + SSE realtime | F11, F16.2 | Chưa bắt đầu | 0/5 |
| [F18](features/F18-knowledge-index.md) | pgvector, index tài liệu, tìm kiếm ngữ nghĩa | F12, F16.5 | Hoãn (người dùng chọn để sau) | 0/6 |

## Phase 5 — Vận hành
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F19](features/F19-deployment.md) | Deploy **Google Cloud Run + Neon Postgres** (gói Free), CD từ GitHub, budget alert, backup | F08.6, F15 | Chưa bắt đầu — F19.2 nên làm sớm | 2/10 |

## Việc nên nhận tiếp theo
Các task không phụ thuộc gì và mở khoá nhiều việc khác — nhiều agent có thể nhận song song vì đụng file khác nhau:
| Task | Vì sao |
|---|---|
| [F12.1](features/F12-doc-authoring.md) Revision có nội dung | Mở khoá phần còn lại của F12; dùng lại dialog URL (ADR-018) |
| [F14.1](features/F14-search-filter.md) Deep link màn work | Độc lập, mở khoá F14.2 |
| [F19.2](features/F19-deployment.md) Dockerfile production | Độc lập; xác nhận sớm app build được thành container (Next 16 standalone + Prisma 7) — nền cho cả F19 |
| [F19.3](features/F19-deployment.md) Thiết lập Google Cloud + budget alert | **Người dùng tự làm** theo hướng dẫn; dùng chung project cho OAuth (F15.2) |

Phase 1 (F08, F09, F10) và F11 đã xong. Thứ tự khuyến nghị sau đó: F12 → F13/F14 → F15 → F16 → F17 → F19 (phần còn lại). F18 đang hoãn.

## Quyết định đang mở (cần người dùng chốt)
| Câu hỏi | Chặn | Ghi chú |
|---|---|---|
| Ma trận quyền đề xuất ở F15.4 có đúng không? | F15.4 | Người dùng sẽ xem và xác nhận sau |
| Nhà cung cấp embedding | F18 | Đang hoãn theo lựa chọn của người dùng |

### Đã chốt
| Quyết định | Ngày | ADR |
|---|---|---|
| Đăng nhập bằng Google (Auth.js), chỉ email của thành viên đã có | 2026-10-14 | ADR-013 |
| ~~Deploy lên Cloudflare Workers~~ → thay bằng **Google Cloud Run** (GitHub Actions deploy, Cloudflare chỉ làm DNS tuỳ chọn) | 2026-10-14 | ADR-014 → ADR-016 |
| Database production: Neon Postgres gói Free (không dùng D1, không dùng Google Sheets) | 2026-10-14 | ADR-015 |
| Realtime dùng polling ngắn, MCP stateless (vì Cloud Run tính tiền theo thời gian request mở) | 2026-10-14 | ADR-016 |
| Embedding / kho tri thức ngữ nghĩa: để sau | 2026-10-14 | — (F18 hoãn) |
| Feature chưa giao vẫn hiện ở list view | 2026-10-14 | — (ghi trong F09.3) |

## Nhật ký
- 2026-09-16 — Scaffold Next.js + App shell (F01).
- 2026-09-16 — Implement 5 màn trên mock data (F02–F06).
- 2026-09-16 — Polish task drawer (chuyển stage / giao agent ở client) + banner "Xem tất cả".
- 2026-09-16 — Backend thật: Postgres qua Docker + Prisma 7, seed lại dữ liệu mẫu, `lib/data/*` (trừ timeline) chuyển sang DB; duyệt revision ghi DB (F07).
- 2026-10-14 — Tổ chức lại `docs/`: tổng hợp yêu cầu (`product/requirements.md`), kiến trúc + ADR, chia roadmap thành 19 feature / 98 task (F08–F19 mới lập kế hoạch).
- 2026-10-14 — Chốt: đăng nhập Google, deploy Cloudflare Workers + Neon Postgres (gói Free), hoãn embedding. Cập nhật F15, F16, F17, F18, F19 theo ràng buộc Cloudflare (ADR-013…015).
- 2026-10-14 — Đổi hạ tầng: **Google Cloud Run + Neon** thay Cloudflare Workers (ADR-016). F19 lập lại thành 9 task; F16 chuyển MCP stateless, F17 chuyển sang polling ngắn.
- 2026-10-14 — **F09 xong**: Sprint thành model, field task/phiên MCP/trạng thái thành viên kiểu thật, timeline đọc từ DB, feature chưa giao hiện ở list view. F08 xong phần code (unit 38, integration 30, e2e 10 test) — còn chờ push để CI chạy lần đầu.
- 2026-10-14 — **F10 xong**: skeleton loading 5 màn, error boundary nhận diện mất kết nối DB, trang 404, empty state, thao tác bàn phím (drawer có focus trap). Phase 1 chỉ còn F08.6 chờ push để CI chạy.
- 2026-10-15 — F08.6 đóng: CI GitHub Actions xanh (sửa build không cần DB, chuẩn bị DB test trước khi Playwright start server). **F11 xong**: `lib/auth/currentUser.ts`, server action task (zod + `ActionResult`, ADR-017), drawer ghi DB (chuyển stage, giao, block, sửa nhanh), dialog điều khiển bằng URL + "Task mới" (ADR-018), ghi hoạt động người thao tác.
