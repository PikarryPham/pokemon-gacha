import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "@/components/nav-links";
import { Pokeball } from "@/components/pokeball";
import { MAX_BATCHES } from "@/lib/rules";
import { loadGame } from "@/lib/page-guard";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, view } = await loadGame();
  const finished = view.status === "finished";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-black">
            <Pokeball size={28} />
            <span className="hidden sm:inline">
              Poké <span className="text-poke-red">Gacha</span>
            </span>
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${finished ? "bg-ink/10 text-ink/60" : "bg-poke-yellow text-ink"}`}
            title="Mỗi tài khoản có 3 batch"
          >
            {finished ? "🏁 Đã kết thúc" : `🎟 Còn ${view.remainingBatches}/${MAX_BATCHES} batch`}
          </span>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden font-bold text-ink/70 sm:inline">👤 {user.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
