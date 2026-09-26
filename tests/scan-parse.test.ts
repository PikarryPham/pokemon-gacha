import { describe, expect, it } from "vitest";
import { normalizeOcrLine, parseScannedText } from "@/lib/scan-parse";

// Chữ Tesseract.js (jpn+eng) thực tế đọc được từ ảnh chụp 2 trang sản phẩm giả lập.
const POKEMON_CENTER_OCR = `加 https://www.pokemoncenter-online.com/4521329412345.html
ポケ モン セン ター オン ライ ン
 。
ぬい ぐる み ピカ チュ ウ Pokemon fit
\\1.650 >
商品 番号 : 4521329412345`;

const STARBUCKS_OCR = `箇 menu.starbucks.cojp/4524785512345

STARBUCKS COFFEE

Pokemon ステ ン レ スポ ボトル ピカ チュ ウ 473ml
\\4.300

ポケ モン スタ ー パ ックス コラ ボ`;

describe("parseScannedText", () => {
  it("gộp chữ Nhật bị tách bởi dấu cách", () => {
    expect(normalizeOcrLine("ぬい ぐる み ピカ チュ ウ Pokemon fit")).toBe("ぬいぐるみピカチュウ Pokemon fit");
  });

  it("trang Pokémon Center: tên, giá (\\ thay ¥, . thay ,), link, category", () => {
    expect(parseScannedText(POKEMON_CENTER_OCR)).toEqual({
      name: "ぬいぐるみピカチュウ Pokemon fit",
      priceJpy: 1650,
      category: "Pokemon Center",
      url: "https://www.pokemoncenter-online.com/4521329412345.html",
    });
  });

  it("trang Starbucks: sửa .cojp → .co.jp, nhận ra Starbucks dù đọc nhầm バ → パ", () => {
    expect(parseScannedText(STARBUCKS_OCR)).toEqual({
      name: "Pokemon ステンレスポボトルピカチュウ 473ml",
      priceJpy: 4300,
      category: "Pokemon Starbucks Collab",
      url: "https://menu.starbucks.co.jp/4524785512345",
    });
  });

  it("ưu tiên giá có ghi 税込, hiểu cả dạng ... 円 và ￥ full-width", () => {
    expect(parseScannedText("Mug\n参考価格 ¥2,000\nGengar Mug\n1,540円(税込)").priceJpy).toBe(1540);
    expect(parseScannedText("Eevee Keychain\n￥８８０").priceJpy).toBe(880);
  });

  it("không đọc được gì thì trả về rỗng để người dùng tự điền", () => {
    expect(parseScannedText("")).toEqual({ name: "", priceJpy: null, category: "Pokemon Center", url: "" });
  });
});
