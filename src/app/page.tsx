import { redirect } from "next/navigation";
import { STATUS_PATH } from "@/lib/game-types";
import { loadGame } from "@/lib/page-guard";

// Trang gốc chỉ điều hướng: chưa đăng nhập → /login, còn lại → đúng bước đang dở.
export default async function Home() {
  const { view } = await loadGame();
  redirect(STATUS_PATH[view.status]);
}
