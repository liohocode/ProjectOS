"use client";

import { ErrorState } from "@/components/ui/ErrorState";

// Bắt lỗi của app/[project]/layout.tsx (tải dữ liệu sidebar — vd DB không chạy), mà
// app/[project]/error.tsx không bắt được vì error boundary chỉ bọc phần con của cùng segment.
export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="error-page">
      <ErrorState {...props} />
    </main>
  );
}
