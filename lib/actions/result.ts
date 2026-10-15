// Kết quả trả về của server action. Lỗi nghiệp vụ (input sai, không tìm thấy, vi phạm ràng buộc)
// trả { ok: false } để UI hiện thông báo; chỉ lỗi bất ngờ (mất DB, bug) mới throw → error boundary.
// T: dữ liệu kèm theo khi thành công (vd id vừa tạo).
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
