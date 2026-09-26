const yen = new Intl.NumberFormat("ja-JP");

export function formatYen(value: number): string {
  return `¥${yen.format(value)}`;
}
