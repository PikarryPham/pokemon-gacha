import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "./db";
import { getGameView } from "./game";
import { STATUS_PATH, type GameStatus } from "./game-types";
import { getCurrentUser } from "./session";

// cache(): layout và page cùng gọi trong một request thì chỉ truy vấn DB một lần.
const currentUser = cache(getCurrentUser);
const gameView = cache(async (userId: number) => getGameView(await getDb(), userId));

/** Dùng trong page (server): bắt đăng nhập, và chuyển về đúng trang nếu trạng thái game không khớp. */
export async function loadGame(allowed?: GameStatus[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const view = await gameView(user.id);
  if (allowed && !allowed.includes(view.status)) redirect(STATUS_PATH[view.status]);
  return { user, view };
}
