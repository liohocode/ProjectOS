"use client";

import { useState } from "react";

export function ApproveButton() {
  const [approved, setApproved] = useState(false);

  if (approved) {
    return <span className="tag tag-neutral nowrap revision-approve">Đã duyệt</span>;
  }

  return (
    <button type="button" className="btn btn-primary revision-approve" onClick={() => setApproved(true)}>
      Duyệt
    </button>
  );
}
