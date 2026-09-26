import { redirect } from "next/navigation";
import { Pokeball } from "@/components/pokeball";
import { getCurrentUser } from "@/lib/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Pokeball size={72} className="animate-wobble" />
        <h1 className="text-3xl font-black tracking-tight">
          Poké <span className="text-poke-red">Gacha</span> Picker
        </h1>
        <p className="max-w-sm text-ink/60">
          Quay ngẫu nhiên quà Pokémon Center &amp; Starbucks Collab, gom thành batch 3,000–5,000¥ rồi chọn batch ưng ý nhất.
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
