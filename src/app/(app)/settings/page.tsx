import { SettingsForms } from "@/components/settings-forms";
import { loadGame } from "@/lib/page-guard";

export const metadata = { title: "Cài đặt · Poké Gacha Picker" };

export default async function SettingsPage() {
  const { user } = await loadGame();
  return (
    <SettingsForms
      username={user.username}
      email={user.email}
      createdAt={user.createdAt.toISOString()}
    />
  );
}
