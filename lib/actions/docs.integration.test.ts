import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { approveRevision } from "./docs";
import { getPendingRevisionCount } from "@/lib/data/docs";

describe("approveRevision", () => {
  let revisionId: string;

  beforeAll(async () => {
    const rev = await prisma.docRevision.findFirstOrThrow({ where: { pending: true, docId: "prd-listing" } });
    revisionId = rev.id;
  });

  // Trả lại trạng thái seed để test đọc ở file khác không phụ thuộc thứ tự chạy.
  afterAll(async () => {
    await prisma.docRevision.update({
      where: { id: revisionId },
      data: { pending: true, approvedById: null, approvedAt: null },
    });
  });

  it("đánh dấu revision đã duyệt bởi người dùng hiện tại và revalidate màn docs", async () => {
    await approveRevision(revisionId, "rv-web");

    const rev = await prisma.docRevision.findUniqueOrThrow({ where: { id: revisionId } });
    expect(rev.pending).toBe(false);
    expect(rev.approvedById).toBe("hieu");
    expect(rev.approvedAt).toBeInstanceOf(Date);
    expect(await getPendingRevisionCount("rv-web")).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/rv-web/docs");
  });
});
