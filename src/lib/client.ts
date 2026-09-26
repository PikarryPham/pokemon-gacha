// Helper gọi API từ trình duyệt.

export async function postJson<T = unknown>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith("/api/auth/")) {
      // Hết phiên: tải lại toàn trang về /login.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
    throw new Error((data as { error?: string }).error ?? "Có lỗi xảy ra, vui lòng thử lại");
  }
  return data as T;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
