// Trạng thái thành viên: Prisma enum (identifier ASCII, @map giữ giá trị DB tiếng Việt) ↔ chuỗi hiển thị.
import type { MemberStatus } from "@/lib/generated/prisma/enums";

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  DangChay: "Đang chạy",
  DangLam: "Đang làm",
  DangReview: "Đang review",
  Cho: "Chờ",
};

export function parseMemberStatus(label: string): MemberStatus {
  const entry = Object.entries(MEMBER_STATUS_LABEL).find(([, l]) => l === label);
  if (!entry) throw new Error(`Trạng thái thành viên không hợp lệ: "${label}"`);
  return entry[0] as MemberStatus;
}
