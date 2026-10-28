import type { DocRevision } from "@/lib/types";

const KIND_TEXT = { added: "Mục mới", removed: "Mục bị xoá", changed: "Mục sửa", same: "" } as const;

// Diff nội dung đề xuất so với bản hiện tại (F12.3): chỉ hiện mục có thay đổi; đoạn thêm/xoá tô màu.
export function RevisionDiff({ id, diff, summaryChange }: { id: string; diff?: DocRevision["diff"]; summaryChange?: DocRevision["summaryChange"] }) {
  const changed = (diff ?? []).filter((s) => s.kind !== "same");
  return (
    <div className="revision-diff" id={id}>
      {summaryChange && (
        <div className="diff-section">
          <div className="diff-heading">
            Tóm tắt <span className="diff-kind">Sửa</span>
          </div>
          <p className="diff-para is-removed">{summaryChange.from}</p>
          <p className="diff-para is-added">{summaryChange.to}</p>
        </div>
      )}
      {changed.map((s) => (
        <div className="diff-section" key={`${s.kind}-${s.heading}`}>
          <div className="diff-heading">
            {s.heading} <span className="diff-kind">{KIND_TEXT[s.kind]}</span>
          </div>
          {s.paras.map((p, i) =>
            p.kind === "same" ? (
              <p className="diff-para" key={i}>
                {p.text}
              </p>
            ) : (
              <p className={`diff-para is-${p.kind}`} key={i}>
                <span className="diff-mark" aria-label={p.kind === "added" ? "Thêm" : "Xoá"}>
                  {p.kind === "added" ? "+" : "−"}
                </span>
                {p.kind === "added" ? <ins>{p.text}</ins> : <del>{p.text}</del>}
              </p>
            ),
          )}
        </div>
      ))}
      {!summaryChange && changed.length === 0 && <p className="text-muted diff-empty">Nội dung đề xuất giống bản hiện tại.</p>}
    </div>
  );
}
