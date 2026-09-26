import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (Postgres nhúng, chỉ dùng khi dev) chứa WASM, để Node require trực tiếp thay vì bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Chỉ áp dụng cho `next dev`: cho phép mở dev server qua IP mạng nội bộ (vd: test trên điện thoại).
  // Không có dòng này, JS bị chặn khi truy cập bằng IP → form không chạy.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
};

export default nextConfig;
