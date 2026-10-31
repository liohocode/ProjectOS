# Roadmap Meridian (PMOS)

Bảng tổng tiến độ. Chi tiết từng task nằm trong file feature. **Cập nhật cột "Task xong" và "Trạng thái" mỗi khi đóng một task** (xem `docs/WORKFLOW.md`).

Cập nhật lần cuối: 2026-10-31 · Tổng: **126/169 task xong** · Giai đoạn 1 (MVP) gần xong 95/104 · Giai đoạn 2: 31/65 (đã chốt F23.1, F25.1).

## Điều chỉnh ưu tiên (Lio, 2026-10-31)
1. **Hoàn thiện Feature & Task trước** (Phase 7): mô tả task, cỡ, phụ thuộc, trang chi tiết feature, markdown, DoD, lịch sử block, agent đề xuất task — đủ để chứa toàn bộ kế hoạch đang nằm trong `.md`.
2. **Đưa kế hoạch + tài liệu kỹ thuật của Meridian lên web** (F28, Phase 7b): import `.md` → DB, màn Roadmap, agent nhận / đóng task qua MCP; DB thành nguồn sự thật (`.md` chỉ còn bản export). Meridian là dự án thật đầu tiên (thay F20.3).
3. **Gắn API key + chạy agent trực tiếp từ web** (F29, Phase 8b) — runtime GitHub Actions + Claude Code, key mã hoá trong DB (chốt 2026-10-31).
4. Sau đó: token / chi phí (F23, gộp số liệu từ F29), mobile (F25.3+), skills hub (F27), data foundation (F26). F24.7 + F27.1 tạm hoãn (Lio).

## Mục tiêu giai đoạn 2 (người dùng chốt 2026-10-30)
Meridian là **data foundation cho các dự án của công ty**: quản lý tiến độ, công việc và coding agent; quy trình đảm bảo **chất lượng** và kiểm soát **effort / AI token**; người thật theo dõi trạng thái và review chi tiết; hỗ trợ coding agent làm việc qua MCP; tài liệu feature / task / kỹ thuật; người quản lý làm việc được trên **mobile**; Meridian **tạo, quản lý và cung cấp skills dùng chung đồng nhất** cho mọi coding agent.

## Đánh giá giai đoạn 1 (review 2026-10-30)
**Đã có**: 5 màn chạy trên Postgres thật, ghi dữ liệu đầy đủ cho task / tài liệu / thành viên / MCP server; đăng nhập Google + ma trận quyền; MCP server thật (8 tool, governance, phiên + nhật ký); sự kiện thật + polling; production trên Cloud Run + Neon, deploy tự động, 3 tầng test + CI.

**Khoảng trống so với mục tiêu mới** (đã kiểm trong code):
| Khoảng trống | Hệ quả | Xử lý |
|---|---|---|
| Lead không tạo / sửa feature, không quản lý sprint; % tiến độ feature là **số tĩnh** từ seed | Không dùng thật được để theo dõi tiến độ | F21 |
| Task không có cổng review của người, không có tiêu chí hoàn thành, không gắn PR, không có lịch sử chuyển trạng thái | Không đảm bảo / đo được chất lượng việc agent làm | F22 |
| `tokensUsed` luôn 0 — không biết agent tốn bao nhiêu token | Không kiểm soát được effort / chi phí AI | F23 |
| Agent phải gọi 4–5 lệnh mới đủ ngữ cảnh; không chia task / tạo tài liệu được; chưa có quy ước làm việc chuẩn cho repo | Agent làm kém hiệu quả, mỗi repo một kiểu | F24 |
| Không có nơi quản lý skills cho agent — mỗi repo / agent tự giữ bản riêng, không đồng nhất, không có phiên bản / duyệt | Agent làm việc không nhất quán giữa dự án | F27 |
| Giao diện chỉ cho desktop | Người quản lý không theo dõi / duyệt trên điện thoại | F25 |
| Không có API / báo cáo cho hệ thống khác | Chưa là "data foundation" | F26 |
| Production vẫn là dữ liệu demo, chưa có backup, tech lead chỉ sửa được qua DB | Chưa an toàn để dùng thật | F20 |
| Nợ kỹ thuật nhỏ: cột `Member.config` thừa, nhật ký MCP không có cột task (drawer quét theo chuỗi), hai mức "append" quyền ghi docs chưa khác nhau | — | F20.5, ghi chú trong F17 / F16 |

## Giai đoạn 1 — MVP (gần xong)
| Feature | Mục tiêu | Trạng thái | Task xong |
|---|---|---|---|
| F01–F07 | UI v1 5 màn + backend Postgres | Xong | 27/27 |
| [F08](features/F08-test-ci.md)–[F10](features/F10-ux-states-a11y.md) | Test + CI, chuẩn hoá data model, UX states | Xong | 16/16 |
| [F11](features/F11-task-mutations.md)–[F14](features/F14-search-filter.md) | Ghi dữ liệu: task, tài liệu, thực thể, tìm kiếm / lọc | Xong | 25/25 |
| [F15](features/F15-auth-permissions.md) | Đăng nhập Google, phân quyền, token agent | Còn F15.2 — **người dùng thử** đăng xuất / email lạ trên production | 5/6 |
| [F16](features/F16-mcp-server.md) | MCP server thật cho agent | Xong | 9/9 |
| [F17](features/F17-realtime-activity.md) | Sự kiện thật + polling ngắn | Xong | 5/5 |
| [F18](features/F18-knowledge-index.md) | pgvector, tìm kiếm ngữ nghĩa | Hoãn — cần chọn nhà cung cấp embedding | 0/6 |
| [F19](features/F19-deployment.md) | Deploy Cloud Run + Neon, CD | Còn F19.9 tên miền (tuỳ chọn); F19.8 chuyển sang F20.1; rollback qua workflow `Rollback` | 8/10 |

## Giai đoạn 2 — Data foundation cho các dự án công ty
### Phase 6 — Dùng thật nội bộ
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F20](features/F20-go-live.md) | Backup, quản trị thành viên / tech lead, onboarding dự án thật (lưu trữ dự án mẫu) | F19 | Đang làm — backup hằng đêm, quản trị thành viên / tech lead | 2/5 |

### Phase 7 — Quản lý công việc & chất lượng
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F21](features/F21-work-management.md) | Feature CRUD, tiến độ tính từ task, sprint, lưu trữ task, bình luận, acceptance criteria; **mở rộng**: mô tả / cỡ / phụ thuộc task, trang chi tiết feature, markdown | F11, F16.6 | Xong | 11/11 |
| [F22](features/F22-process-quality.md) | Lịch sử trạng thái, cổng review của người, Definition of Done, liên kết PR, chỉ số chất lượng | F16.4, F21.6 | Xong | 7/7 |

### Phase 7b — Kế hoạch Meridian trên web (ưu tiên 2)
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F28](features/F28-plan-on-web.md) | Import kế hoạch + tài liệu kỹ thuật `.md` → DB (dự án `meridian`), màn Roadmap, làm việc qua MCP thay vì sửa `.md` | F21.7–F21.11 | Đang làm — đã import production (dự án `meridian`); còn đổi quy trình sang MCP (F28.6, chờ Lio mở mạng + token) | 5/6 |

### Phase 8b — Chạy agent từ web (ưu tiên 3)
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F29](features/F29-run-agents-on-web.md) | Gắn API key cho dự án / feature, nút "Chạy với agent", theo dõi lượt chạy + chi phí trên web | F28, F22.4, F24.5 | Chưa bắt đầu — F29.1 đã chốt (ADR-024, ADR-025) | 1/6 |

### Phase 8 — Agent & effort
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F23](features/F23-ai-effort-tokens.md) | Ghi nhận token AI theo task / agent / dự án, ngân sách, ước lượng vs thực tế | F16, F22.1 | Chưa bắt đầu — nguồn token đã chốt (F23.1) | 1/5 |
| [F24](features/F24-coding-agent-support.md) | `context_get`, agent chia task / đề xuất tài liệu, template tài liệu, quy ước làm việc cho repo | F16, F21.6 | Đang làm — `context_get` (F24.1), quy ước agent + CLAUDE.md mẫu (F24.5) | 2/7 |
| [F27](features/F27-agent-skills.md) | **Skills hub**: tạo / phiên bản / duyệt skill, gán theo tổ chức / dự án / agent, phân phối qua MCP + đồng bộ vào repo (hash), agent đề xuất cải tiến, thống kê | F16, F24.1 | Chưa bắt đầu | 0/8 |

### Phase 9 — Mobile cho người quản lý
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F25](features/F25-mobile-manager.md) | Inbox "Cần tôi xử lý", giao diện responsive, PWA | F22.2 | Đang làm — inbox "Cần tôi xử lý" (F25.2) | 2/6 |

### Phase 10 — Data foundation & tích hợp
| Feature | Mục tiêu | Phụ thuộc | Trạng thái | Task xong |
|---|---|---|---|---|
| [F26](features/F26-data-foundation.md) | API đọc cho hệ thống khác, báo cáo định kỳ + CSV, tích hợp GitHub | F22, F23 | Chưa bắt đầu | 0/4 |

## Thứ tự làm
1. **F28 ngay sau F21** (Lio duyệt 2026-10-31): F28.1 phase + phụ thuộc feature → F28.2 import `.md` → F28.3 tài liệu kỹ thuật → F28.4 màn Roadmap → F28.5 import production (dự án `meridian`, workflow `Import plan`) → F28.6 đổi quy trình sang MCP (cần Lio mở mạng + token). Từ F28.5 kế hoạch xem được trên web; `.md` vẫn là nguồn tới F28.6.
2. Phần còn lại của Feature & Task (làm và theo dõi trên web sau F28.5): F24.2 agent đề xuất task → F24.6 gắn tài liệu ↔ task.
3. **F29** (F29.1 đã chốt — ADR-024, ADR-025): F29.2 key → F29.3 lượt chạy → F29.4 runner GitHub Actions → F29.5 theo dõi → F29.6 giới hạn.
4. Sau đó: F23 (gộp token từ F29), F25.3–F25.6, F27, F26, F20.4–F20.5, F24.3–F24.4.

## Việc nên nhận tiếp theo
| Task | Vì sao |
|---|---|
| [F24.2](features/F24-coding-agent-support.md) Agent đề xuất task (`tasks_create`) | Hoàn thiện feature & task; kế hoạch đã lên web (F28.5 xong) |
| [F24.6](features/F24-coding-agent-support.md) Gắn tài liệu ↔ task | Như trên |

## Quyết định đang mở (cần người dùng chốt)
| Câu hỏi | Chặn | Khuyến nghị |
|---|---|---|
| Nhà cung cấp embedding | F18 | Vẫn hoãn — tìm kiếm từ khoá đủ cho giai đoạn đầu |

## Backlog (chưa xếp lịch)
- Thông báo ra ngoài (Slack / email / push) — người dùng chọn để sau (2026-10-30).
- Nhiều tổ chức (multi-tenant), mời thành viên qua email.
- OAuth cho MCP (thay token tĩnh).
- Tên miền riêng (F19.9).

### Đã chốt
| Quyết định | Ngày | ADR |
|---|---|---|
| Chạy agent từ web bằng **GitHub Actions + Claude Code** trên repo dự án; API key **mã hoá AES-256-GCM trong DB**, khoá chủ Secret Manager; import kế hoạch vào production thành dự án mới `meridian`, `.md` thành bản export | 2026-10-31 | ADR-024, ADR-025 |
| Đăng nhập bằng Google (Auth.js), chỉ email của thành viên đã có | 2026-10-14 | ADR-013 |
| ~~Deploy lên Cloudflare Workers~~ → thay bằng **Google Cloud Run** (GitHub Actions deploy, Cloudflare chỉ làm DNS tuỳ chọn) | 2026-10-14 | ADR-014 → ADR-016 |
| Database production: Neon Postgres gói Free (không dùng D1, không dùng Google Sheets) | 2026-10-14 | ADR-015 |
| Realtime dùng polling ngắn, MCP stateless (vì Cloud Run tính tiền theo thời gian request mở) | 2026-10-14 | ADR-016 |
| Embedding / kho tri thức ngữ nghĩa: để sau | 2026-10-14 | — (F18 hoãn) |
| Feature chưa giao vẫn hiện ở list view | 2026-10-14 | — (ghi trong F09.3) |
| Thư viện đăng nhập: **Better Auth** thay Auth.js (Auth.js chỉ còn vá bảo mật, v5 vẫn beta); consent screen External | 2026-10-28 | ADR-020 |
| Ma trận quyền F15.4 duyệt nguyên bản; tech lead là cờ `Member.isTechLead` | 2026-10-30 | ADR-021 |
| Duyệt kế hoạch giai đoạn 2 + F27 skills hub; token AI: **agent tự báo qua MCP**; mobile: **web responsive + PWA**; duyệt thử rollback (F19.7), xoá `Member.config` sau backup (F20.5); tích hợp GitHub làm sau F22 (Lio tạo GitHub App) | 2026-10-30 | — |
| Mục tiêu giai đoạn 2: data foundation cho dự án công ty; lưu trữ dự án mẫu khi dùng thật; duyệt backup Neon; thông báo ra ngoài để sau | 2026-10-30 | — |
| Giữ Neon Free (không Cloud SQL); một môi trường deploy từ `main`; làm F15.2–F15.3 trước khi chia sẻ URL | 2026-10-28 | ADR-015 (xác nhận lại), F19 |

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
- 2026-10-28 — Rà repo + 2 sửa nhỏ (F12.7 approveRevision theo ADR-017, F19.10 dedupe query: màn work 131 → 33 SQL). Chốt hạ tầng: Cloud Run + Neon Free, F19.2 Dockerfile, F19.3 hướng dẫn Google Cloud. **F15.2–F15.3**: đăng nhập Google bằng Better Auth (ADR-020), chặn route, chỉ thành viên xem dự án. **F12 xong** (F12.3–F12.6): từ chối + diff revision, lịch sử người duyệt / lý do từ chối, tạo tài liệu mới, người sửa trực tiếp. **F19.3 xong**: hạ tầng Google Cloud (project `pdos-513017`) + budget alert. **F13.1–F13.6**: dự án mới, thêm thành viên, giao task / xem log từ panel, `AgentConfig` có cấu trúc + form, MCP server ngoài. **F19.4–F19.6**: Neon production (dữ liệu mẫu), kiểm tra env lúc khởi động, **production chạy** ở `meridian-669737756643.asia-southeast1.run.app`, deploy tự động từ `main`. Bàn giao phiên: `docs/HANDOFF.md`. **F14 xong**: deep link màn work, tìm kiếm không dấu (`unaccent`), nút Lọc theo màn, phân trang bảng MCP. Agent tự merge PR khi CI xanh (quy ước mới trong CLAUDE.md).
- 2026-10-30 — **F13 xong** (F13.7): gỡ thành viên khỏi dự án (chặn còn task/feature chưa Done, chặn tự gỡ), lưu trữ / khôi phục dự án (`Project.archivedAt` — ẩn khỏi switcher, mờ ở portfolio).
- 2026-10-30 — **F15 gần xong** (F15.4 ma trận quyền + `can()`, F15.5 token agent, F15.6 UI theo quyền + đăng xuất) và **F16 xong**: MCP server thật ở `/api/mcp` (Streamable HTTP stateless, ADR-022) với 8 tool (task, docs, đề xuất feature), governance (server/quyền theo cấu hình agent, 60 lệnh/phút/token), phiên + nhật ký thật, số liệu server thật, hướng dẫn `docs/guides/connect-agent.md`.
- 2026-10-30 — **F17 xong**: bảng sự kiện `ActivityEvent` (activity rail thôi suy ra), endpoint sự kiện theo con trỏ + polling ngắn chỉ khi tab hiển thị (ADR-016), log phiên chạy + context docs trong drawer từ dữ liệu thật.
- 2026-10-30 — **Review + lập lại kế hoạch**: giai đoạn 1 (MVP) 94/103; giai đoạn 2 "data foundation" gồm F20–F27 (45 task, F27 skills hub do người dùng bổ sung) — dùng thật, quản lý công việc, chất lượng, token AI, hỗ trợ coding agent, mobile, API.
- 2026-10-31 — **F21 xong**: feature CRUD, % tiến độ từ task, sprint, lưu trữ task, người bình luận, acceptance criteria (+ cổng vào Review F22.3). Cùng ngày: inbox "Cần tôi xử lý" (F25.2), liên kết PR (F22.4), quy ước agent + CLAUDE.md mẫu (F24.5).
- 2026-10-31 — **Điều chỉnh ưu tiên** (Lio): hoàn thiện feature & task (F21.7–F21.11) → đưa kế hoạch + tài liệu kỹ thuật lên web, DB là nguồn sự thật (F28 mới) → gắn API key + chạy agent từ web (F29 mới, chờ quyết định F29.1). F24.7, F27.1 hoãn; F20.3 thay bằng F28.
- 2026-10-31 — **F28.5 xong**: kế hoạch + 11 tài liệu kỹ thuật đã import lên production (dự án `meridian`, giao cho Lio). Xem tiến độ ở màn Roadmap trên web; `.md` vẫn là nguồn tới F28.6.
- 2026-10-31 — **F21 xong 11/11** (mở rộng): markdown, mô tả / cỡ / mã task, phụ thuộc, trang chi tiết feature, lưu trữ feature + thứ tự ưu tiên — đủ chỗ chứa kế hoạch `.md` cho F28.
- 2026-10-31 — **F22 xong 7/7**: lịch sử trạng thái, cổng review, cổng vào Review theo tiêu chí, liên kết PR, chỉ số chất lượng (+ thời gian block, lọc sprint), Definition of Done theo dự án.
