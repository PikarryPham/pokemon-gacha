# Poké Gacha Picker

Web game quay ngẫu nhiên quà Pokémon Center / Pokémon Starbucks Collab. Người chơi nhập 1–100 item, quay thành 3 batch (mỗi batch từ 3,000¥ đến dưới 5,000¥) rồi chọn 1 batch.

> 👤 **Người chơi / người không rành kỹ thuật:** đọc [HUONG-DAN-SU-DUNG.md](HUONG-DAN-SU-DUNG.md) (hướng dẫn từng bước, có hình). README này dành cho người phát triển và triển khai web.

**Stack:** Next.js 16 (App Router) · Tailwind CSS 4 · Drizzle ORM · Postgres (Neon) · PGlite khi dev · Tesseract.js (quét ảnh trên trình duyệt) · Vitest.

## Luật chơi (đã cài đặt)

| Luật | Chi tiết |
|---|---|
| Tài khoản | Username bắt buộc, email tùy chọn. Mặc định hiện form đăng nhập, có link sang đăng ký; đăng ký xong chuyển về đăng nhập với username điền sẵn. Đăng nhập bằng username hoặc email. Không có quên mật khẩu. Form dùng Server Actions nên vẫn chạy khi JS chưa tải. |
| Danh sách item | 1–100 item. Giá 1–4,999¥ (item ≥ 5,000¥ không bao giờ quay trúng được). Số lượng 1–99. Link phải là http(s). Danh sách lưu nháp trên trình duyệt; bấm **Bắt đầu quay** mới ghi DB và khóa lại. |
| Chống trùng | Hai item trùng khi cùng **tên + link + category** (tên/link bỏ khoảng trắng thừa, không phân biệt hoa thường; xem `itemKey()`). Chặn ở form thêm/sửa, ở import (trùng trong file hoặc trùng danh sách hiện có) và ở server (`itemListSchema`). |
| Quét ảnh | Chọn 1–10 ảnh/lần (≤ 10MB/ảnh). OCR bằng **Tesseract.js ngay trên trình duyệt** (jpn + eng): miễn phí, không cần key, ảnh không lên server. `parseScannedText()` đoán tên/giá/link/category (gộp chữ Nhật bị tách, sửa `\1.650` → 1650, `.cojp` → `.co.jp`); kết quả vào bảng xem lại, qua cùng luật kiểm tra + chống trùng như form rồi mới thêm. Mỗi ảnh = 1 món. |
| Import | `.csv`/`.txt`, dòng đầu `name,price,category,url,quantity`. Sai 1 dòng (kể cả dòng trùng) là từ chối cả file. File mẫu tải được trong app hoặc ở [docs/huong-dan/mau-danh-sach.csv](docs/huong-dan/mau-danh-sach.csv). |
| Số lượng | = số lần tối đa item được trúng **trong một batch**, **reset mỗi batch**. Item hết số lượng thì không quay được nữa trong batch đó. |
| Quay | Server chọn kết quả bằng `crypto.randomInt`. Pool = item **còn số lượng** và **vừa ngân sách** (tổng + giá < 5,000¥). Mỗi đơn vị số lượng còn lại là một **phiếu**: xác suất trúng item = số lượng còn lại / tổng số phiếu (`ticketCount` / `itemAtTicket` trong `rules.ts`). Màn quay hiển thị "Còn x/y" và % trúng. |
| Chốt batch | ≥ 3,000¥: được **chốt** (ở giỏ hoặc ngay trên popup kết quả), hoặc quay tiếp nếu còn item quay được. < 3,000¥: chỉ **dừng sớm** được khi xác nhận. Cần quay ít nhất 1 lần. |
| Kết thúc | Sau 3 batch thì chọn 1 batch. Tài khoản khóa tính năng quay, chỉ còn xem Lịch sử, Cài đặt, Đăng xuất. |
| Chơi tiếp | Mỗi lần quay lưu DB ngay, nên thoát ra hoặc F5 đều vào lại đúng chỗ và không đổi được kết quả. |

## Chạy local

```bash
npm install
npm run dev        # tự migrate DB rồi chạy http://localhost:3000
npm test           # unit + integration test (PGlite in-memory)
```

Không cần cài Postgres: khi không có `DATABASE_URL`, app dùng PGlite lưu ở `./.data/pglite` (đổi bằng biến `PGLITE_DIR`). Xóa thư mục này để reset dữ liệu. PGlite chỉ cho **một process** mở cùng lúc: đừng chạy `npm run build`/`db:migrate` khi `npm run dev` đang chạy trên cùng thư mục dữ liệu.

Muốn thử trên điện thoại cùng mạng wifi: mở `http://<IP-máy-tính>:3000` (dev server đã cho phép IP mạng nội bộ `10.*`, `192.168.*`, `172.*` trong `next.config.ts`).

File test nhanh: [docs/test-data/test-10-items.csv](docs/test-data/test-10-items.csv) (10 item hợp lệ, đủ 2 category, có tên chứa dấu phẩy và tên tiếng Nhật), upload ở màn nhập item.

Ảnh trong hướng dẫn sử dụng nằm ở `docs/huong-dan/`. Khi đổi giao diện, nhớ chụp lại cho khớp.

## Deploy public (Vercel + Neon, miễn phí)

Sau khi deploy, nhớ thay `https://<tên-web>.vercel.app` trong [HUONG-DAN-SU-DUNG.md](HUONG-DAN-SU-DUNG.md) bằng link thật trước khi gửi cho người chơi.


1. **Tạo database:** đăng ký [neon.tech](https://neon.tech), tạo project (region gần người chơi, ví dụ Singapore/Tokyo), copy connection string **pooled**.
2. **Đẩy code lên GitHub** (repo private hoặc public đều được).
3. **Vercel:** [vercel.com](https://vercel.com), chọn *Add New → Project*, import repo. Thêm Environment Variables:
   - `DATABASE_URL`: connection string của Neon
   - `SESSION_SECRET`: chuỗi ngẫu nhiên dài, tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
4. Bấm **Deploy**. Lệnh `npm run build` tự chạy migration lên Neon trước khi build. Xong sẽ có link `https://<tên-project>.vercel.app` để chia sẻ.

Mỗi lần push lên nhánh chính, Vercel tự deploy lại. Khi đổi schema thì sửa `src/lib/db/schema.ts`, chạy `npm run db:generate` và commit thư mục `drizzle/`.

## Cấu trúc

```
src/lib/rules.ts        luật chơi & hằng số (3000/5000/3 batch/100 item), số lượng theo batch, bốc phiếu
src/lib/game.ts         logic server: start / spin / closeBatch / chooseBatch (transaction + khóa dòng)
src/lib/csv.ts          đọc & kiểm tra file import
src/lib/scan-parse.ts   tách tên/giá/link/category từ chữ OCR
src/lib/item-form.ts    kiểm tra form item (dùng chung form tay + bảng quét ảnh)
src/components/use-scanner.ts, scan-review.tsx   quét ảnh (Tesseract.js) + bảng xem lại
src/lib/schemas.ts      zod schema dùng chung client/server, chống trùng item
src/lib/session.ts      cookie phiên (JWT HS256, httpOnly)
src/app/api/**          API routes (game, account, logout)
src/app/(auth)/**       đăng nhập / đăng ký (Server Actions trong actions.ts)
src/app/(app)/**        setup · play · summary · history · settings
tests/                  vitest
HUONG-DAN-SU-DUNG.md    hướng dẫn cho người chơi (ảnh ở docs/huong-dan/)
```

## Giới hạn đã biết

- Quét ảnh: Tesseract.js tải worker, core WASM và dữ liệu chữ (~vài MB) từ `cdn.jsdelivr.net` ở lần quét đầu, trình duyệt cache cho lần sau. Độ chính xác phụ thuộc chất lượng ảnh; ảnh nhiều sản phẩm chỉ nhận 1 món. Console có thể in `Warning: Parameter not found: ...` từ dữ liệu tiếng Nhật: vô hại.

- Chưa giới hạn số lần đăng nhập sai (bcrypt làm chậm brute-force, nhưng chưa rate-limit).
- Không có trang admin. Muốn reset một tài khoản thì xóa dòng trong bảng `games` (cascade xóa items/batches/spins).
- Icon là emoji ngẫu nhiên (không dùng hình Pokémon chính thức để tránh vấn đề bản quyền).
