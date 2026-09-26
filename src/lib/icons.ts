// Icon chung (emoji + màu nền) thay cho hình Pokémon chính thức, tránh vấn đề bản quyền khi public.
const ICONS = [
  "⚡", "🔥", "💧", "🍃", "🌙", "⭐", "🎀", "🍓", "🧸", "🎁", "🍩", "🌸",
  "❄️", "🪨", "👻", "🐉", "🍀", "🎈", "🧁", "🌈", "🍭", "🔮", "🐾", "☕",
];
const COLORS = [
  "#FDE68A", "#FECACA", "#BFDBFE", "#BBF7D0", "#DDD6FE", "#FBCFE8",
  "#FED7AA", "#A5F3FC", "#E9D5FF", "#FEF08A", "#C7D2FE", "#99F6E4",
];

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Gán icon ngẫu nhiên, không trùng nhau (tối đa 24 item). */
export function assignIcons(count: number, random: () => number = Math.random) {
  const icons = shuffle(ICONS, random);
  const colors = shuffle(COLORS, random);
  return Array.from({ length: count }, (_, i) => ({
    icon: icons[i % icons.length],
    color: colors[i % colors.length],
  }));
}
