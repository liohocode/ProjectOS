# Quy trình làm việc cho coding agent

Áp dụng cho mọi agent (và người) nhận việc trong repo này. Mục tiêu: nhiều agent làm song song mà không giẫm chân nhau, và mọi việc đều truy được về feature/task/yêu cầu.

## 1. Chọn task
1. Mở `docs/ROADMAP.md` → mục **"Việc nên nhận tiếp theo"**, hoặc chọn feature ở phase thấp nhất còn dở.
2. Mở file feature, chọn task có trạng thái `Chưa làm` và **mọi task trong cột "Phụ thuộc" đã `Xong`**.
3. Không nhận task đang `Đang làm` của agent khác. Không nhận task đánh dấu **Quyết định** — những task đó cần người dùng chốt (xem "Quyết định đang mở" trong ROADMAP).
4. Task cỡ **L** hoặc mô tả quá rộng → tách thành nhiều task nhỏ (thêm vào bảng feature) trước khi làm.

## 2. Nhận task
- Sửa cột trạng thái của task thành `Đang làm — <tên agent>, <YYYY-MM-DD>` trong file feature; nếu là task đầu tiên của feature, đổi trạng thái feature (bảng đầu file + ROADMAP) thành `Đang làm`.
- Làm việc trên nhánh riêng: `feat/<task-id>-<mô-tả-ngắn>` (vd `feat/F11.2-task-actions`) khi có nhiều agent cùng lúc.

## 3. Làm task
- Đọc trước: phần **Tham chiếu** của feature, `CLAUDE.md`, và với UI là mục tương ứng trong `docs/design/design-reference.md`.
- Chỉ làm đúng phạm vi task. Phát hiện việc cần làm khác → **thêm task mới** vào feature phù hợp (hoặc tạo feature mới từ `docs/features/_TEMPLATE.md`), không làm lấn.
- Đổi schema → cập nhật `docs/architecture/data-model.md` trong cùng commit.
- Ra một quyết định kiến trúc (chọn thư viện, đổi pattern) → thêm ADR vào `docs/architecture/decisions.md`.
- Lệch so với spec UI → ghi vào mục "Quyết định / ghi chú" của feature.

## 4. Definition of Done
Một task chỉ `Xong` khi:
- [ ] Mọi mục "Hoàn thành khi" của task đã đạt
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` sạch
- [ ] `npm test` (unit) xanh — luôn bắt buộc
- [ ] `npm run test:integration` xanh nếu đụng `lib/data`, `lib/actions`, `prisma/` (cần `docker compose up -d`; tự chuẩn bị DB test)
- [ ] `npm run test:e2e` xanh nếu đổi UI/route/luồng thao tác (build production + DB test, cổng 3100)
- [ ] Code mới có test tương xứng: hàm thuần → unit test cạnh file (`*.test.ts`); hàm `lib/data`/server action → `*.integration.test.ts` (test ghi dữ liệu phải tự trả lại trạng thái seed — mẫu: `lib/actions/docs.integration.test.ts`); luồng UI quan trọng → thêm vào `e2e/`
- [ ] Với thay đổi UI: tự chạy `npm run dev`, xem trên trình duyệt ở cả 3 project mẫu, so với spec
- [ ] Tài liệu liên quan đã cập nhật (data-model, ADR, guide nếu có)
- [ ] Không commit secret (`.env` đã gitignore — kiểm tra `git status` trước khi commit)

## 5. Đóng task
1. Đổi trạng thái task thành `Xong — <YYYY-MM-DD>` (commit tự chứa thay đổi trạng thái nên không ghi được hash của chính nó — tìm commit bằng `git log --grep "<task-id>:"`); đánh dấu `[x]` các mục "Hoàn thành khi"; ghi chú quyết định phát sinh vào mục cuối file feature.
2. Cập nhật `docs/ROADMAP.md`: cột "Task xong" của feature, tổng số task xong, trạng thái feature (`Xong` khi mọi task xong).
3. Cập nhật trạng thái yêu cầu liên quan trong `docs/product/requirements.md` (⬜ → 🟡 → ✅) nếu task làm thay đổi mức đáp ứng.
4. Thêm 1 dòng vào "Nhật ký" của ROADMAP khi xong cả feature (không cần cho từng task).

## 6. Commit
- Tiêu đề: `<task-id>: <mô tả ngắn>` — vd `F11.2: server actions cập nhật stage và giao task`.
- Commit nhỏ, một task một (hoặc vài) commit; không gộp nhiều task không liên quan.
- Không push/merge vào `main` nếu người dùng chưa yêu cầu.

## Quy ước mã
| Loại | Định dạng | Ví dụ |
|---|---|---|
| Feature (trong docs) | `F` + 2 số | `F11` |
| Task (trong docs) | `<feature>.<số>` | `F11.2` |
| Yêu cầu | `FR-<khu>-<số>`, `NFR-<số>` | `FR-WK-08`, `NFR-05` |
| Quyết định kiến trúc | `ADR-<3 số>` | `ADR-013` |

Lưu ý: không nhầm mã task trong docs (`F11.2`) với mã task nghiệp vụ trong dữ liệu sản phẩm (`T-401`) hay mã feature nghiệp vụ (`FEAT-118`).
