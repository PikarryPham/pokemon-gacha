import { SetupEditorClient } from "@/components/setup-editor-client";
import { loadGame } from "@/lib/page-guard";

export const metadata = { title: "Nhập item · Poké Gacha Picker" };

export default async function SetupPage() {
  const { user } = await loadGame(["setup"]);
  return <SetupEditorClient userId={user.id} />;
}
