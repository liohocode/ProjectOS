import { describe, expect, it } from "vitest";
import { getQualityByProject } from "./quality";

// F22.5 — seed: rv-web T-390 (Trần Mỹ Linh, Dev→Done 4 ngày, không trả lại), T-388 (Vega, Dev→Done 5 ngày, trả lại 1 lần);
// crm T-624 (Atlas, 2 ngày). Task khác chưa có lịch sử. Test khác chạy song song có thể đẩy thêm task rv-web qua Review
// → chỉ khẳng định chính xác phần đến từ seed (cycle time, hàng Vega), số đếm toàn dự án thì là cận dưới.
const DAY = 86_400_000;

describe("chỉ số chất lượng (F22.5)", () => {
  it("rv-web: trung vị cycle time, tỉ lệ trả lại; theo người / agent", async () => {
    const q = await getQualityByProject("rv-web");
    expect(q.project.measured).toBe(2);
    expect(q.project.reviewed).toBeGreaterThanOrEqual(2);
    expect(q.project.returnedTasks).toBeGreaterThanOrEqual(1);
    expect(Math.round(q.project.medianCycleMs! / DAY * 10) / 10).toBe(4.5);
    const vega = q.byMember.find((r) => r.name === "Vega")!;
    expect(vega).toMatchObject({ kind: "agent", summary: { returnRate: 1, totalReturns: 1 } });
    expect(Math.round(vega.summary.medianCycleMs! / DAY)).toBe(5);
    expect(Math.round(q.byMember.find((r) => r.name === "Trần Mỹ Linh")!.summary.medianCycleMs! / DAY)).toBe(4);
    // Người / agent không có số liệu nào (chưa qua Review, chưa đo được, chưa từng bị block) không có hàng.
    expect(q.byMember.every((r) => r.summary.reviewed > 0 || r.summary.measured > 0 || r.summary.blockedTasks > 0)).toBe(true);
  });

  it("crm: một task, không trả lại", async () => {
    const q = await getQualityByProject("crm");
    expect(q.project).toMatchObject({ measured: 1, returnRate: 0 });
    expect(Math.round(q.project.medianCycleMs! / DAY)).toBe(2);
  });
});
