/* ==========================================================================
   ĐẾM MẢNG CAM TRÊN MỘT ẢNH CHỤP — luật ③ "một khung nhìn, một điểm nhấn"
   ---------------------------------------------------------------------------
   Chạy:  node scripts/dem-mang-cam.mjs <ảnh.png> [ảnh2.png …]

   VÌ SAO CÓ FILE NÀY — REV-0029 §8⑤ giao đúng một phép đo: *"đếm lại điểm
   cam trên Tổng quan sau khi làm: từ 3 mảng → còn ĐÚNG 1"*. Mà "3 mảng" là
   con số đếm BẰNG MẮT trên ảnh. Đếm bằng mắt không phải phép đo: nó không
   lặp lại được, không ai kiểm chéo được, và nó chính là loại số mà BH-17
   dạy phải nghi ngờ.

   Nên đếm bằng PIXEL, không đếm bằng bảng CSS: bảng CSS nói "có mấy luật tô
   cam", còn câu Sếp hỏi là "mở màn hình ra, mắt bị mấy chỗ giành". Hai câu
   khác nhau — một luật cam nằm trong màn khác thì không tính, một luật cam
   lặp trên 20 dòng dữ liệu thì phải tính là 20.

   CÁCH ĐẾM:
     ① lọc pixel "cam rực" = góc sắc 14–52° VÀ sắc độ ≥ 60 VÀ đủ sáng —
        tức đúng dải `--cam`/`--warn` đậm, không dính beige nền (sắc độ 33)
        cũng không dính chữ nâu `--ink` (quá tối);
     ② gom pixel dính nhau thành MẢNG (loang 4 hướng);
     ③ chia làm hai loại, KHÔNG gộp:
          MẢNG = diện tích ≥ NGUONG_MANG px VÀ cạnh ngắn ≥ CANH_NGAN px
          SỢI  = đủ to nhưng CẠNH NGẮN mỏng (viền, gạch chân, nhãn 3px)
        Vì sao phải tách theo CẠNH NGẮN chứ không chỉ theo diện tích: một
        sợi 3px chạy ngang 1124px có tới 3.372 pixel — hơn ngưỡng diện tích
        — mà mắt đọc nó là ĐƯỜNG KẺ, không phải mảng màu giành chú ý. Gộp
        chung thì phép đếm sẽ báo "3 mảng" cho đúng cái bản đã hết 2 mảng.
        Đúng luật ④: *"sợi 3px là NHÃN, không phải điểm nhấn"*.
   Ngưỡng ghi thẳng ra đây để ai cũng cãi lại được, không giấu trong đầu.
   ========================================================================== */

import sharp from 'sharp';

const NGUONG_SAC_DO = 60;    // sắc độ (max−min) — beige nền chỉ 33, lọt lưới
const NGUONG_SANG   = 90;    // kênh sáng nhất — loại chữ nâu --ink (#2c2117)
const GOC_MIN = 14, GOC_MAX = 52;   // đúng khoảng "NÂU–CAM" của do-ba-mau.mjs
const NGUONG_MANG = 1200;    // px — nhỏ hơn thì mắt đọc ra "chi tiết", không phải "mảng"
const CANH_NGAN   = 10;      // px — cạnh ngắn dưới mức này là SỢI/đường kẻ, không phải mảng

function gocSac(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return [null, 0, mx];
  let h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return [h, d, mx];
}

for (const duong of process.argv.slice(2)) {
  const { data, info } = await sharp(duong).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const cam = new Uint8Array(W * H);
  let tongPx = 0;
  for (let i = 0, p = 0; i < W * H; i++, p += C) {
    const [h, d, mx] = gocSac(data[p], data[p + 1], data[p + 2]);
    if (h !== null && d >= NGUONG_SAC_DO && mx >= NGUONG_SANG && h >= GOC_MIN && h <= GOC_MAX) { cam[i] = 1; tongPx++; }
  }
  /* Loang 4 hướng bằng ngăn xếp — KHÔNG đệ quy: ảnh 1440×900 có mảng vài
     chục nghìn pixel, đệ quy là tràn ngăn xếp ngay. */
  const xem = new Uint8Array(W * H);
  const manh = [];
  const ngan = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!cam[s] || xem[s]) continue;
    let dinh = 0, n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    ngan[dinh++] = s; xem[s] = 1;
    while (dinh) {
      const i = ngan[--dinh]; n++;
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0     && cam[i - 1] && !xem[i - 1]) { xem[i - 1] = 1; ngan[dinh++] = i - 1; }
      if (x < W - 1 && cam[i + 1] && !xem[i + 1]) { xem[i + 1] = 1; ngan[dinh++] = i + 1; }
      if (y > 0     && cam[i - W] && !xem[i - W]) { xem[i - W] = 1; ngan[dinh++] = i - W; }
      if (y < H - 1 && cam[i + W] && !xem[i + W]) { xem[i + W] = 1; ngan[dinh++] = i + W; }
    }
    manh.push({ n, x0, y0, x1, y1 });
  }
  for (const m of manh) { m.w = m.x1 - m.x0 + 1; m.h = m.y1 - m.y0 + 1; m.ngan = Math.min(m.w, m.h); }
  const du   = manh.filter(m => m.n >= NGUONG_MANG);
  const mang = du.filter(m => m.ngan >= CANH_NGAN).sort((a, b) => b.n - a.n);
  const soi  = du.filter(m => m.ngan <  CANH_NGAN).sort((a, b) => b.n - a.n);
  console.log(`\n${duong}  (${W}×${H})`);
  console.log(`  pixel cam rực: ${tongPx} = ${(tongPx / (W * H) * 100).toFixed(2)}% màn · ${manh.length} vùng dính liền`);
  console.log(`  ►► MẢNG CAM (≥${NGUONG_MANG}px, cạnh ngắn ≥${CANH_NGAN}px): ${mang.length}`);
  for (const m of mang) console.log(`       ${String(m.n).padStart(7)} px  khung (${m.x0},${m.y0})–(${m.x1},${m.y1})  ${m.w}×${m.h}`);
  console.log(`     sợi/nhãn (cạnh ngắn <${CANH_NGAN}px): ${soi.length}`);
  for (const m of soi) console.log(`       ${String(m.n).padStart(7)} px  ${m.w}×${m.h} tại y=${m.y0}`);
}
