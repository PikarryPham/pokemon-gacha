"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";
import { Button } from "./ui";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      className={`px-3 py-1.5 text-sm ${className}`}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await postJson("/api/auth/logout").catch(() => {});
        // Tải lại toàn trang để xóa cache router phía client sau khi đăng xuất.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login");
      }}
    >
      Đăng xuất
    </Button>
  );
}
