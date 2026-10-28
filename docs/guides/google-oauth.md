# Đăng nhập Google: tạo OAuth client (F15.2)

**Ai làm**: người dùng, trên https://console.cloud.google.com — **cùng project với Cloud Run** (tạo ở `deploy-cloud-run.md` bước 1.1). Mất khoảng 10 phút.

**Kết quả**: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` để đặt vào `.env` (dev) và Secret Manager (production, F19.5). Client secret **là secret**: không dán vào chat, không commit.

Meridian chỉ cho đăng nhập khi email Google trùng email của một thành viên (người) trong Meridian — Google chỉ xác nhận "bạn là ai", Meridian quyết định "bạn có được vào không" (ADR-013, ADR-020).

> Google đổi tên menu khá thường xuyên. Giao diện hiện tại nằm ở **Google Auth Platform** (menu trái: Branding / Audience / Data Access / Clients); giao diện cũ là **APIs & Services → OAuth consent screen / Credentials**. Nội dung cần điền giống nhau.

## 1. Màn hình xin quyền (consent screen)
**Google Auth Platform → Branding** (hoặc *OAuth consent screen*) → **Get started**:
1. **App name**: `Meridian`. **User support email**: email của bạn.
2. **Audience**: chọn **External** — đăng nhập bằng Gmail cá nhân hoặc email nhiều tên miền khác nhau. (*Internal* chỉ dùng được khi mọi người cùng một Google Workspace.)
3. **Contact information**: email của bạn → **Create**.

**Data Access** (scopes): chỉ cần 3 scope cơ bản `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` — Better Auth tự xin đúng các scope này, thường không phải thêm tay. Không thêm scope nhạy cảm nào khác (sẽ bị Google bắt xác minh app).

### Testing hay Production?
**Audience → Publishing status**:
- **Testing** (mặc định): chỉ các email trong **Test users** đăng nhập được (tối đa 100). Thêm email của từng thành viên vào **Audience → Test users → Add users**. Hợp giai đoạn đầu.
- **In production** (*Publish app*): ai có tài khoản Google cũng tới được màn hình đồng ý — vẫn an toàn vì Meridian tự từ chối email không phải thành viên. Với 3 scope cơ bản ở trên, thường không cần Google xác minh app; nếu Google yêu cầu, ở lại Testing.

Khuyến nghị: để **Testing**, thêm email thành viên vào Test users; chuyển Production khi team đông hơn mà không muốn thêm tay ở cả hai nơi.

## 2. Tạo OAuth client
**Google Auth Platform → Clients → Create client** (hoặc *Credentials → Create credentials → OAuth client ID*):
1. **Application type**: **Web application**. **Name**: `Meridian web`.
2. **Authorized JavaScript origins**:
   - `http://localhost:3000`
3. **Authorized redirect URIs** — phải khớp tuyệt đối (giao thức, cổng, không có `/` cuối):
   - `http://localhost:3000/api/auth/callback/google`
4. **Create** → copy **Client ID** và **Client secret** (secret chỉ hiện đầy đủ lúc này — lưu vào trình quản lý mật khẩu).

Khi deploy (F19.6) quay lại client này thêm origin `https://<service>-<hash>.<region>.run.app` và redirect URI `https://<service>-<hash>.<region>.run.app/api/auth/callback/google` (hoặc tên miền riêng ở F19.9). Thay đổi có thể mất vài phút mới có hiệu lực.

## 3. Cấu hình ở máy dev
Trong `.env` (không commit — `.env` đã gitignore):
```bash
BETTER_AUTH_SECRET="..."            # openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
DEV_LOGIN_EMAIL="ban@gmail.com"     # email Google bạn dùng để đăng nhập thử
```
Rồi:
```bash
npx prisma migrate deploy   # bảng auth_* + cột members.email
npx prisma db seed          # gán DEV_LOGIN_EMAIL cho Trung Hiếu (tech lead mẫu)
npm run dev                 # mở http://localhost:3000/login
```
Nếu consent screen đang ở **Testing**, nhớ thêm `DEV_LOGIN_EMAIL` vào **Test users**.

## 4. Thử
| Thử | Kết quả đúng |
|---|---|
| Đăng nhập bằng `DEV_LOGIN_EMAIL` | Quay về app; mở lại `/login` thấy "Bạn đang đăng nhập · Trung Hiếu" |
| Đăng xuất ở `/login` | Về trạng thái chưa đăng nhập |
| Đăng nhập bằng email Google khác (không có trong Meridian) | Quay về `/login` với "Email này chưa được mời vào Meridian…" |

Từ F15.3: chưa đăng nhập mở bất kỳ trang nào → về `/login`, đăng nhập xong quay lại đúng trang; app dùng người đang đăng nhập (không còn cố định Trung Hiếu) và chỉ hiện dự án họ thuộc về.

## Lỗi thường gặp
| Triệu chứng | Nguyên nhân |
|---|---|
| Google báo `redirect_uri_mismatch` | Redirect URI ở bước 2 khác URL thật (sai cổng, `https` vs `http`, thừa `/`) — hoặc `BETTER_AUTH_URL` khác URL đang mở |
| Google báo app chưa được xác minh / `access_denied` | Consent screen ở Testing mà email chưa có trong Test users |
| Về `/login` báo "chưa được mời" dù đúng email | Email trong `members.email` khác email Google (seed lại sau khi đặt `DEV_LOGIN_EMAIL`), hoặc thành viên là agent |
| Nút "Đăng nhập bằng Google" bị khoá | Thiếu `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` trong `.env`, hoặc chưa khởi động lại `npm run dev` |
