export function ScreenPlaceholder({ title, specFile }: { title: string; specFile: string }) {
  return (
    <div className="screen-placeholder">
      <h5>{title} — chưa triển khai</h5>
      <p className="text-muted">
        Xem <code>{specFile}</code> để biết phạm vi và checklist việc cần làm.
      </p>
    </div>
  );
}
