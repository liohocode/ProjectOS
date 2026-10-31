// Ma trận quyền (F15.4, ADR-021) — hàm thuần, không đọc DB: dùng được ở server action và (sau này) UI theo quyền (F15.6).
//
// | Hành động                                                        | Ai được làm                          |
// |------------------------------------------------------------------|--------------------------------------|
// | Duyệt / từ chối revision, sửa trực tiếp tài liệu                 | Tech lead, người tạo dự án           |
// | Duyệt / từ chối feature agent đề xuất (F16.6), sửa feature (F21.1) | Tech lead, người tạo dự án          |
// | Tạo feature (F21.1)                                              | Thành viên dự án                     |
// | Tạo dự án, quản lý MCP server, sửa cấu hình agent, sửa hồ sơ / quyền thành viên (toàn tổ chức) | Tech lead |
// | Thêm / gỡ thành viên, lưu trữ dự án                              | Tech lead                            |
// | Tạo / sửa / giao / chuyển stage task, tạo tài liệu               | Thành viên dự án                     |
// | Duyệt / trả lại task ở Review; đưa task của agent sang Done (F22.2) | Tech lead, người tạo dự án         |
// | Tạo sprint, đặt sprint hiện tại (F21.3)                         | Tech lead, người tạo dự án           |
// | Gắn / thu hồi API key của dự án / feature (F29.2, ADR-025)       | Tech lead                            |
// Hành động gắn dự án luôn yêu cầu là thành viên dự án đó (kể cả tech lead) — như quyền xem (F15.3).

export type PermissionAction =
  | "project.create"
  | "mcpServer.manage"
  | "agent.configure"
  | "org.members"
  | "project.archive"
  | "member.manage"
  | "doc.review"
  | "doc.edit"
  | "feature.review"
  | "feature.create"
  | "feature.manage"
  | "doc.create"
  | "task.write"
  | "task.review"
  | "sprint.manage"
  | "credential.manage";

export interface Actor {
  id: string;
  isTechLead: boolean;
  /** Dự án actor thuộc về (ProjectMember) */
  projectIds: readonly string[];
}

export interface ProjectRef {
  id: string;
  createdById: string | null;
}

/** Hành động toàn tổ chức — không gắn dự án nào. */
const ORG_ACTIONS: ReadonlySet<PermissionAction> = new Set(["project.create", "mcpServer.manage", "agent.configure", "org.members"]);

export const isOrgAction = (action: PermissionAction) => ORG_ACTIONS.has(action);

/** `project` bắt buộc với hành động gắn dự án; thiếu (dự án không tồn tại) → không được. */
export function can(actor: Actor, action: PermissionAction, project?: ProjectRef | null): boolean {
  if (isOrgAction(action)) return actor.isTechLead;
  if (!project || !actor.projectIds.includes(project.id)) return false;
  switch (action) {
    case "doc.review":
    case "doc.edit":
    case "feature.review":
    case "feature.manage":
    case "task.review":
    case "sprint.manage":
      return actor.isTechLead || project.createdById === actor.id;
    case "project.archive":
    case "member.manage":
    case "credential.manage":
      return actor.isTechLead;
    default:
      return true;
  }
}

const DENIED: Record<PermissionAction, string> = {
  "project.create": "Chỉ tech lead được tạo dự án",
  "mcpServer.manage": "Chỉ tech lead được quản lý MCP server",
  "agent.configure": "Chỉ tech lead được sửa cấu hình agent",
  "org.members": "Chỉ tech lead được sửa hồ sơ / quyền thành viên",
  "project.archive": "Chỉ tech lead được lưu trữ / khôi phục dự án",
  "member.manage": "Chỉ tech lead được thêm / gỡ thành viên",
  "doc.review": "Chỉ tech lead hoặc người tạo dự án được duyệt / từ chối revision",
  "doc.edit": "Chỉ tech lead hoặc người tạo dự án được sửa trực tiếp tài liệu",
  "feature.review": "Chỉ tech lead hoặc người tạo dự án được duyệt feature đề xuất",
  "feature.create": "Chỉ thành viên dự án được tạo feature",
  "feature.manage": "Chỉ tech lead hoặc người tạo dự án được sửa feature",
  "doc.create": "Chỉ thành viên dự án được tạo tài liệu",
  "task.write": "Chỉ thành viên dự án được thao tác task",
  "task.review": "Chỉ tech lead hoặc người tạo dự án được duyệt / trả lại task",
  "sprint.manage": "Chỉ tech lead hoặc người tạo dự án được tạo / đổi sprint hiện tại",
  "credential.manage": "Chỉ tech lead được gắn / thu hồi API key",
};

export const deniedMessage = (action: PermissionAction): string => DENIED[action];
