import { SummaryBoard } from "@/components/summary-board";
import { loadGame } from "@/lib/page-guard";

export const metadata = { title: "Chọn batch · Poké Gacha Picker" };

export default async function SummaryPage() {
  const { view } = await loadGame(["choosing"]);
  return <SummaryBoard view={view} />;
}
