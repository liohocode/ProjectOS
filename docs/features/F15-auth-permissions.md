# F15 — Đăng nhập & phân quyền

| Trạng thái | Phase | Phụ thuộc | Yêu cầu |
|---|---|---|---|
| Chưa bắt đầu | 3 | F11.1 | NFR-09, FR-SH-04 |

## Mục tiêu
Thay "người dùng hiện tại = Trung Hiếu" bằng **đăng nhập Google**; mọi thao tác ghi kiểm tra quyền; mỗi agent có token riêng để kết nối MCP server (F16).

## Phạm vi
- **Trong**: Auth.js + Google provider, liên kết tài khoản Google ↔ `Member` (người) qua email, bảo vệ route, ma trận quyền, token cho agent.
- **Ngoài**: đăng nhập bằng phương thức khác, quản lý tổ chức nhiều tenant.

## Tham chiếu
- `docs/architecture/decisions.md` → ADR-011, **ADR-013** (Google OAuth), ADR-016 (production trên Cloud Run — OAuth client tạo trong cùng Google Cloud project; redirect URI production là URL `run.app` hoặc tên miền ở F19.9)
- Next 16: `middleware.ts` **đã đổi tên thành `proxy.ts`** — đọc `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` trước khi làm
- Code: `lib/auth/currentUser.ts` (tạo ở F11.1), `lib/actions/*`

## Tasks
| Task | Tiêu đề | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| F15.1 | Quyết định phương án đăng nhập | S | — | Xong — 2026-10-14 (ADR-013) |
| F15.2 | Auth.js + Google: tài khoản, đăng nhập/đăng xuất, trang login | M | F15.1 | Chưa làm |
| F15.3 | Bảo vệ route bằng `proxy.ts`; `getCurrentUser()` đọc từ session | S | F15.2, F11.1 | Chưa làm |
| F15.4 | Ma trận quyền + `can()`; áp vào mọi server action | M | F15.3 | Chưa làm |
| F15.5 | Token cho agent (tạo / thu hồi) | M | F15.4 | Chưa làm |
| F15.6 | UI theo quyền: ẩn/khoá nút, footer người dùng thật, đăng xuất | S | F15.4 | Chưa làm |

### F15.1 — Quyết định phương án
Đã chốt với người dùng: **đăng nhập bằng Google**. Xem ADR-013.

### F15.2 — Auth.js + Google
**Làm gì**:
1. **Thao tác thủ công của người dùng** (ghi hướng dẫn từng bước vào `docs/guides/google-oauth.md`): tạo OAuth client loại "Web application" trên Google Cloud Console — **trong cùng project với Cloud Run** (F19.3); cấu hình OAuth consent screen (Internal nếu dùng Google Workspace của công ty, External nếu không); Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dev) và `https://<service>.run.app/api/auth/callback/google` (production, F19.6) hoặc tên miền riêng (F19.9); lấy Client ID/Secret.
2. Cài Auth.js (NextAuth v5) — kiểm tra phiên bản hỗ trợ Next 16. Google provider; Prisma adapter (model `Account`, `Session`/`User` theo yêu cầu adapter) hoặc session JWT — ưu tiên JWT để mỗi request không phải đọc DB (giảm thời gian request trên Cloud Run, giữ Neon được ngủ); ghi quyết định.
3. Thêm `Member.email` (unique, chỉ cho `human`); seed email dev cho 3 người mẫu. Callback `signIn`: chỉ cho đăng nhập khi email Google trùng một `Member` human (không tự tạo người dùng mới — người lạ bị từ chối với thông báo rõ ràng).
4. Trang `/login` theo Nocturne với nút "Đăng nhập bằng Google".
5. Biến môi trường: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` vào `.env.example`.
**Hoàn thành khi**:
- [ ] Đăng nhập bằng Google với email có trong `Member` → vào được app; email lạ → bị từ chối
- [ ] Đăng xuất được; không commit secret

### F15.3 — Bảo vệ route
**Làm gì**: `proxy.ts` chuyển hướng chưa đăng nhập → `/login` (trừ `/login`, asset, `/api/mcp` — route MCP xác thực bằng token agent riêng). Viết lại `getCurrentUser()` đọc session (giữ chữ ký từ F11.1). Kiểm tra người dùng thuộc dự án trong URL, không thì 404/403.
**Hoàn thành khi**:
- [ ] Mở `/rv-web/work` khi chưa đăng nhập → bị đẩy về `/login`; đăng nhập xong quay lại đúng trang

### F15.4 — Ma trận quyền
**Làm gì**: `lib/auth/permissions.ts` với `can(user, action, resource)`. Đề xuất ban đầu (xác nhận lại với người dùng):

| Hành động | Ai được làm |
|---|---|
| Duyệt / từ chối revision, sửa trực tiếp tài liệu | Tech lead, người tạo dự án |
| Tạo dự án, thêm/gỡ thành viên, sửa cấu hình agent, quản lý MCP server | Tech lead |
| Tạo / sửa / giao / chuyển stage task, tạo tài liệu | Thành viên của dự án |
| Xem | Thành viên của dự án |

Áp `can()` ở đầu mọi action trong `lib/actions/*` (tìm `TODO(F15.4)`), trả lỗi rõ ràng.
**Hoàn thành khi**:
- [ ] Test integration: người không đủ quyền gọi action bị từ chối

### F15.5 — Token cho agent
**Làm gì**: model `AgentToken(id, memberId, name, tokenHash, createdAt, lastUsedAt, revokedAt)`; chỉ lưu hash (vd SHA-256). Trong panel agent (màn team): "Tạo token" (hiện token **một lần duy nhất**), danh sách token + "Thu hồi". Hàm `verifyAgentToken(raw)` → `Member` agent (F16.1 dùng).
**Hoàn thành khi**:
- [ ] Token thu hồi không còn dùng được; DB không chứa token gốc

### F15.6 — UI theo quyền
**Làm gì**: nút không đủ quyền ẩn hoặc disable kèm tooltip; footer sidebar hiện người đang đăng nhập + menu đăng xuất.
**Hoàn thành khi**:
- [ ] Đăng nhập bằng tài khoản không phải tech lead → không thấy nút "Duyệt"

## Quyết định / ghi chú
