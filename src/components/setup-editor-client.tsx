"use client";

import dynamic from "next/dynamic";

// Editor đọc nháp từ localStorage ngay khi khởi tạo nên chỉ render trên trình duyệt (tránh lệch hydration).
export const SetupEditorClient = dynamic(() => import("./setup-editor").then((m) => m.SetupEditor), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-ink/50">Đang tải…</p>,
});
