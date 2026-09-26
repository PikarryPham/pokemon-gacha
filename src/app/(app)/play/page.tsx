import { PlayBoard } from "@/components/play-board";
import { loadGame } from "@/lib/page-guard";

export const metadata = { title: "Quay · Poké Gacha Picker" };

export default async function PlayPage() {
  const { view } = await loadGame(["playing"]);
  return <PlayBoard initialView={view} />;
}
