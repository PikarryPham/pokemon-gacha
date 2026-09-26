// Icon chung (emoji + màu nền) thay cho hình Pokémon chính thức, tránh vấn đề bản quyền khi public.
// Số icon phải là bội số của số màu để công thức ghép cặp trong assignIcons không bị trùng.
const ICONS = [
  "⚡", "🔥", "💧", "🍃", "🌙", "⭐", "🎀", "🍓", "🧸", "🎁", "🍩", "🌸",
  "❄️", "🪨", "👻", "🐉", "🍀", "🎈", "🧁", "🌈", "🍭", "🔮", "🐾", "☕",
  "🍙", "🍑", "🌻", "🦋", "🐚", "🍄", "🎵", "💎", "🪁", "🍒", "🌊", "🎂",
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

/**
 * Gán icon ngẫu nhiên. 36 item đầu có emoji khác nhau; từ item 37 trở đi emoji lặp lại
 * nhưng đổi màu nền, nên mỗi cặp (emoji, màu) vẫn là duy nhất (tối đa 36 × 12 = 432 item).
 */
export function assignIcons(count: number, random: () => number = Math.random) {
  const icons = shuffle(ICONS, random);
  const colors = shuffle(COLORS, random);
  return Array.from({ length: count }, (_, i) => ({
    icon: icons[i % icons.length],
    color: colors[(i + Math.floor(i / icons.length)) % colors.length],
  }));
}
