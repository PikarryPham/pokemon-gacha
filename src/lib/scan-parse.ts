// Tách thông tin item (tên, giá, category, link) từ chữ mà OCR (Tesseract) đọc được trên ảnh chụp trang sản phẩm.
// Chỉ là phỏng đoán: kết quả luôn được đưa vào bảng xem lại để người dùng sửa trước khi thêm.
import { CATEGORIES, type Category } from "./rules";

export interface ScanGuess {
  name: string;
  priceJpy: number | null;
  category: Category;
  url: string;
}

const CJK = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー・";
// Tesseract (jpn) hay chèn dấu cách giữa các chữ Nhật: "ピカ チュ ウ" → "ピカチュウ".
const CJK_GAP = new RegExp(`(?<=[${CJK}])\\s+(?=[${CJK}])`, "gu");

export function normalizeOcrLine(line: string): string {
  return line.normalize("NFKC").replace(CJK_GAP, "").replace(/\s+/g, " ").trim();
}

// ¥ hay bị đọc thành "\" (hoặc "Y"), dấu phẩy phân cách hàng nghìn thành dấu chấm.
const AMOUNT = "(\\d{1,3}(?:[.,]\\d{3})+|\\d+)";
const PRICE_PATTERNS = [
  new RegExp(`(?:[¥\\\\]|\\bY(?=\\s?\\d))\\s*${AMOUNT}`, "u"),
  new RegExp(`${AMOUNT}\\s*円`, "u"),
];

function parseAmount(raw: string): number {
  return Number(raw.replace(/[.,]/g, ""));
}

function findPrice(lines: string[]): { price: number; line: number } | null {
  let first: { price: number; line: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    for (const re of PRICE_PATTERNS) {
      const m = lines[i].match(re);
      if (!m) continue;
      const hit = { price: parseAmount(m[1]), line: i };
      if (/税込|tax/i.test(lines[i])) return hit; // giá "đã gồm thuế" là giá cần lấy
      first ??= hit;
    }
  }
  return first;
}

const URL_RE = /(?:https?:\/\/)?((?:[a-z0-9-]+\.)+(?:co\.jp|cojp|com|jp|net)(?:\/[^\s"'<>]*)?)/i;

function findUrl(lines: string[]): { url: string; line: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(URL_RE);
    if (!m) continue;
    const host = m[1].replace(/\.cojp\b/i, ".co.jp").replace(/[.,)>]+$/, "");
    return { url: `https://${host}`, line: i };
  }
  return null;
}

function guessCategory(text: string): Category {
  // "スターバックス" hay bị đọc nhầm バ → パ.
  if (/starbucks|スタ[ー-]?[バパ]ックス|スタバ/i.test(text)) return CATEGORIES[1];
  return CATEGORIES[0];
}

// Chữ giao diện trang web thường gặp, không phải tên sản phẩm.
const BOILERPLATE =
  /ポケモンセンターオンライン|pokemon ?center ?online|starbucks coffee|商品番号|カートに入れる|税込|送料|ログイン|会員|検索|お気に入り|在庫|数量|jan ?コード|share|menu|home/i;

function isNameCandidate(line: string): boolean {
  if (line.length < 3) return false;
  if (BOILERPLATE.test(line)) return false;
  if (URL_RE.test(line)) return false;
  if (PRICE_PATTERNS.some((re) => re.test(line))) return false;
  // Cần có ít nhất 3 chữ cái/chữ Nhật, không chỉ số và ký hiệu.
  return (line.match(new RegExp(`[a-z${CJK}]`, "giu")) ?? []).length >= 3;
}

function cleanName(line: string): string {
  return line.replace(/^[^\p{L}\p{N}(]+|[^\p{L}\p{N})]+$/gu, "").slice(0, 100);
}

/** Đoán thông tin một item từ toàn bộ chữ OCR của một ảnh (giả định mỗi ảnh là một sản phẩm). */
export function parseScannedText(text: string): ScanGuess {
  const lines = text.split(/\r?\n/).map(normalizeOcrLine).filter(Boolean);
  const price = findPrice(lines);
  const url = findUrl(lines);

  // Tên sản phẩm thường nằm ngay trên dòng giá; không có giá thì lấy dòng ứng viên dài nhất.
  let name = "";
  if (price) {
    for (let i = price.line - 1; i >= 0 && !name; i--) if (isNameCandidate(lines[i])) name = lines[i];
  }
  if (!name) {
    name = lines.filter(isNameCandidate).sort((a, b) => b.length - a.length)[0] ?? "";
  }

  return {
    name: cleanName(name),
    priceJpy: price?.price ?? null,
    category: guessCategory(lines.join("\n") + (url?.url ?? "")),
    url: url?.url ?? "",
  };
}
