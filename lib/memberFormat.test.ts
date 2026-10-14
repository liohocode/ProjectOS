import { describe, expect, it } from "vitest";
import { MemberStatus } from "@/lib/generated/prisma/enums";
import { MEMBER_STATUS_LABEL, parseMemberStatus } from "./memberFormat";

describe("trạng thái thành viên", () => {
  it("mọi giá trị enum đều có nhãn và parse ngược được", () => {
    for (const value of Object.values(MemberStatus)) {
      expect(parseMemberStatus(MEMBER_STATUS_LABEL[value])).toBe(value);
    }
  });

  it("nhãn lạ báo lỗi", () => {
    expect(() => parseMemberStatus("Nghỉ phép")).toThrow(/không hợp lệ/);
  });
});
