// F12.1 — nội dung đề xuất cho các revision đang chờ trong dữ liệu mẫu: bản hiện tại của tài liệu
// + đúng thay đổi mà dòng mô tả revision nói tới (F12.2 duyệt sẽ áp nội dung này vào bản chính).

// Type cục bộ như seed-data/docs.ts (snapshot, không phụ thuộc @/lib/types).
interface SeedDocSection {
  heading: string;
  paras: string[];
}

type Propose = (current: SeedDocSection[]) => SeedDocSection[];

export const PROPOSED_SECTIONS: Record<string, Propose> = {
  // "Revision mới: cập nhật mục Tiêu chí hoàn thành từ benchmark"
  "prd-listing": (current) =>
    current.map((s) =>
      s.heading === "Tiêu chí hoàn thành"
        ? {
            ...s,
            paras: [
              ...s.paras,
              "Benchmark ngày 22/08 trên 1,2 triệu tin: p95 bộ lọc hiện ở 610ms. Để đạt 400ms cần index listing_attributes theo (city, price) và cache trang kết quả đầu tiên 60 giây.",
            ],
          }
        : s,
    ),
  // "Revision mới: thêm features.propose cho BA agent"
  "mcp-spec": (current) => [
    ...current.slice(0, 2),
    {
      heading: "Nhóm feature",
      paras: [
        "features.propose — chỉ BA agent: đề xuất feature con kèm mô tả và tiêu chí hoàn thành. Luôn tạo bản nháp chờ tech lead duyệt, agent không tự tạo feature.",
      ],
    },
    ...current.slice(2),
  ],
};
