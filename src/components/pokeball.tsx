/** Pokéball vẽ bằng CSS. `open` tách đôi 2 nửa để lộ món quà bên trong. */
export function Pokeball({ size = 64, open = false, className = "" }: { size?: number; open?: boolean; className?: string }) {
  const band = Math.max(3, size * 0.07);
  const button = size * 0.3;
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden>
      <div
        className="absolute inset-x-0 top-0 overflow-hidden rounded-t-full bg-poke-red transition-[transform,opacity] duration-500 ease-out"
        style={{
          height: size / 2,
          border: `${band}px solid #1f2937`,
          borderBottomWidth: band / 2,
          transform: open ? `translateY(-${size * 0.6}px) rotate(-18deg)` : undefined,
          opacity: open ? 0 : 1,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-b-full bg-white transition-[transform,opacity] duration-500 ease-out"
        style={{
          height: size / 2,
          border: `${band}px solid #1f2937`,
          borderTopWidth: band / 2,
          transform: open ? `translateY(${size * 0.6}px) rotate(12deg)` : undefined,
          opacity: open ? 0 : 1,
        }}
      />
      {!open && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ width: button, height: button, border: `${band}px solid #1f2937` }}
        />
      )}
    </div>
  );
}
