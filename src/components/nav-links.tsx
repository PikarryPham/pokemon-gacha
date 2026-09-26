"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "🎮 Chơi", match: ["/setup", "/play", "/summary"] },
  { href: "/history", label: "📜 Lịch sử", match: ["/history"] },
  { href: "/settings", label: "⚙️ Cài đặt", match: ["/settings"] },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="order-last flex w-full gap-1 text-sm font-bold sm:order-none sm:w-auto">
      {LINKS.map((l) => {
        const active = l.match.includes(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-xl px-3 py-1.5 transition ${active ? "bg-poke-red/10 text-poke-red" : "text-ink/60 hover:bg-ink/5"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
