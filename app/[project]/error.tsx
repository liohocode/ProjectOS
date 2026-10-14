"use client";

import { ErrorState } from "@/components/ui/ErrorState";

// Lỗi trong một màn (page) — sidebar/header ở layout vẫn hiện để người dùng chuyển màn khác.
export default function ProjectScreenError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState {...props} />;
}
