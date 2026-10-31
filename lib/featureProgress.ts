// % tiến độ feature tính từ task thật (F21.2) — thay cột `Feature.pct` tĩnh của dữ liệu mẫu.
// Trọng số = story point; task chưa ước lượng tính 1 điểm (để feature toàn task chưa ước lượng vẫn có tiến độ).

export interface ProgressTask {
  stage: string;
  estimatePoints: number | null;
}

export function featureProgress(tasks: ProgressTask[]): number {
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    const weight = t.estimatePoints && t.estimatePoints > 0 ? t.estimatePoints : 1;
    total += weight;
    if (t.stage === "Done") done += weight;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
