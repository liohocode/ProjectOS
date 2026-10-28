# Tài liệu Meridian (PMOS)

## Đọc gì trước
| Bạn muốn… | Đọc |
|---|---|
| Hiểu dự án là gì, cho ai | [product/overview.md](product/overview.md) |
| Biết hệ thống phải làm được gì, cái gì đã có | [product/requirements.md](product/requirements.md) |
| Nhận một việc để làm | [ROADMAP.md](ROADMAP.md) → file feature → [WORKFLOW.md](WORKFLOW.md) |
| Hiểu cấu trúc code, luồng dữ liệu | [architecture/overview.md](architecture/overview.md) |
| Sửa database | [architecture/data-model.md](architecture/data-model.md) |
| Biết vì sao code được làm như vậy | [architecture/decisions.md](architecture/decisions.md) |
| Làm UI đúng thiết kế | [design/design-reference.md](design/design-reference.md) |

Quy ước code và lệnh chạy dự án: [`../CLAUDE.md`](../CLAUDE.md).

## Cấu trúc
```
docs/
  README.md                 mục lục (file này)
  ROADMAP.md                bảng tổng: phase → feature → tiến độ; việc nên nhận tiếp; quyết định đang mở
  WORKFLOW.md               quy trình nhận / làm / đóng task, Definition of Done, quy ước commit
  product/
    overview.md             mô tả dự án, người dùng, khái niệm cốt lõi
    requirements.md         yêu cầu chức năng + phi chức năng, đánh mã, trạng thái đáp ứng
  design/
    design-reference.md     spec UI gốc (handoff thiết kế) — nguồn sự thật cho UI/UX
  architecture/
    overview.md             stack, thư mục, luồng dữ liệu, quy ước tầng dữ liệu
    data-model.md           model, quan hệ, quy ước, nợ kỹ thuật dữ liệu, số liệu seed
    decisions.md            nhật ký quyết định kiến trúc (ADR)
  features/
    _TEMPLATE.md            mẫu cho feature mới
    F01 … F07               đã xong (UI v1 + backend)
    F08 … F19               kế hoạch: mỗi file = 1 feature + danh sách task chi tiết
  guides/
    deploy-cloud-run.md     triển khai Cloud Run + Neon (F19), từng bước cho người dùng và agent
                            (sẽ có thêm: kết nối agent F16.9, backup F19.8…)
```

## Quy tắc giữ tài liệu sống
- Tài liệu nằm cạnh code và được sửa **trong cùng commit** với thay đổi code tương ứng.
- Nguồn sự thật: schema → `prisma/schema.prisma`; UI → `docs/design/design-reference.md`; tiến độ → file feature (ROADMAP chỉ tổng hợp).
- Không xoá task đã xong; không sửa ADR cũ (thêm ADR mới thay thế).
