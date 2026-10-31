import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Hiển thị markdown dùng chung (F21.11, ADR-023): mô tả task / feature, tài liệu. GFM (bảng, danh sách việc, gạch,
// link tự động). Không render HTML thô (mặc định của react-markdown) → nội dung agent / người nhập không chèn được script.

const components: Components = {
  // Link ngoài mở tab mới; link nội bộ (/…, #…) giữ nguyên.
  a: ({ href, children }) =>
    href && /^https?:\/\//.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    ),
  // Bảng rộng cuộn ngang trong khung, không đẩy layout.
  table: ({ children }) => (
    <div className="md-table">
      <table>{children}</table>
    </div>
  ),
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`md${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
