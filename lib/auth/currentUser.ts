import { cache } from "react";
import { getMemberById } from "@/lib/data/team";
import type { Member } from "@/lib/types";

// Điểm duy nhất xác định "ai đang thao tác" (ADR-011). Chưa có auth thật nên tạm
// coi là Trung Hiếu (tech lead). F15 thay thân hàm bằng session Google — nơi gọi giữ nguyên.
const PLACEHOLDER_USER_ID = "hieu";

export const getCurrentUserId = cache(async (): Promise<string> => {
  return PLACEHOLDER_USER_ID;
});

export const getCurrentUser = cache(async (): Promise<Member> => {
  const member = await getMemberById(await getCurrentUserId());
  if (!member) throw new Error(`Không tìm thấy người dùng hiện tại (${await getCurrentUserId()}) trong DB`);
  return member;
});
