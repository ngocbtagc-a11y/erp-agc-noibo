/* ==========================================================================
   CẮT KHUNG VĂN BẢN — LÕI TÍNH TOÁN THUẦN, KHÔNG DÍNH DOM CỦA MÀN QUÉT
   CTL-0026 · lượt "chụp rộng nhưng chỉnh được khung văn bản"
   ---------------------------------------------------------------------------
   Sếp Ngọc 03/09/2026: *"có cách nào code cho nó khôn khôn nó nhận diện được
   văn bản như cái CamScan không nhỉ, hoặc chụp rộng nhưng tao chỉnh được
   khung văn bản ý"*.

   BA VIỆC, XẾP THEO ĐỘ CHẮC CHẮN — CHẮC TRƯỚC:

   ① DUỖI PHẲNG THEO 4 GÓC NGƯỜI DÙNG KÉO  (`duoiPhang`)
      Luôn chạy được, không phụ thuộc máy đoán đúng hay sai. Đây là phần
      BẮT BUỘC: máy đoán sai thì người ta kéo tay, vẫn ra ảnh ngay ngắn.
      Toán: ma trận phối cảnh 3×3, giải hệ 8 ẩn bằng khử Gauss. Không thư viện.

   ② MÁY TỰ ĐOÁN 4 GÓC  (`doanBonGoc`) — CHỈ LÀ GỢI Ý
      Xám hoá → làm mượt → Sobel dò biên → dồn phiếu tìm 4 đường mép giấy →
      giao nhau ra 4 góc. KHÔNG chắc chắn thì trả về đúng 4 góc mép ảnh và
      `tuTin: false` — IM LẶNG, không báo lỗi, không chặn. Đoán sai chỉ tốn
      của người ta vài giây kéo lại; báo lỗi thì tốn cả niềm tin.

   ③ LÀM RÕ CHỮ  (`lamRoChu`) — tuỳ chọn, mặc định TẮT
      Chia nền (ảnh tích phân) để xoá bóng đổ + kéo giãn tương phản.
      ⚠️ GIỮ MÀU, không xám hoá: dấu đỏ là thứ Luật Kế toán đòi ở bản giấy,
      xám hoá là tự tay xoá nó khỏi bản chụp.

   ---------------------------------------------------------------------------
   CHI PHÍ 0: canvas + Uint8ClampedArray có sẵn trong mọi trình duyệt. Không
   một byte thư viện nào, không một lượt gọi mạng nào.

   TÁCH RIÊNG KHỎI `quet-tai-lieu.js` LÀ CỐ Ý: toàn bộ file này là HÀM THUẦN
   (vào ảnh → ra ảnh/toạ độ), nên bàn đo gọi thẳng được mà không phải dựng cả
   màn quét, và màn quét chỉ phải thêm vài chục dòng.
   ========================================================================== */

/* Toạ độ 4 góc luôn đi theo thứ tự TRÊN-TRÁI · TRÊN-PHẢI · DƯỚI-PHẢI ·
   DƯỚI-TRÁI, và luôn CHUẨN HOÁ 0..1 theo bề ngang/cao ảnh. Chuẩn hoá để một
   bộ góc kéo trên ảnh xem trước 343px dùng lại được y nguyên trên ảnh gốc
   12MP — không có nó là phải nhớ ảnh nào đo ở tỉ lệ nào. */
export const GOC_TRON_KHUNG = [[0, 0], [1, 0], [1, 1], [0, 1]];

const gio = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Bề rộng/cao thật của một `<img>` hoặc `<canvas>`. */
function coAnh(a) {
  return [a.naturalWidth || a.width, a.naturalHeight || a.height];
}

/** Nạp một data URL / URL thành `<img>` đã tải xong. */
export function taiAnh(nguon) {
  return new Promise((ok, hong) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => hong(new Error('Không đọc được ảnh'));
    im.src = nguon;
  });
}

function veRaCanvas(anh, W, H) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W));
  c.height = Math.max(1, Math.round(H));
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.drawImage(anh, 0, 0, c.width, c.height);
  return c;
}

/* ==========================================================================
   1. MA TRẬN PHỐI CẢNH  —  giải hệ 8 ẩn bằng khử Gauss
   ---------------------------------------------------------------------------
   Ta cần ánh xạ ĐÍCH (ảnh chữ nhật ngay ngắn) → NGUỒN (tứ giác méo trong ảnh
   chụp). Đi theo chiều đó chứ KHÔNG phải chiều ngược lại, vì lúc vẽ ta duyệt
   từng điểm ảnh của ĐÍCH rồi hỏi "điểm này lấy màu ở đâu trong NGUỒN" — duyệt
   theo chiều nguồn thì ảnh ra đầy lỗ thủng.

       u = (a·x + b·y + c) / (g·x + h·y + 1)
       v = (d·x + e·y + f) / (g·x + h·y + 1)

   Mỗi cặp điểm cho 2 phương trình, 4 cặp là 8 phương trình cho 8 ẩn.
   ========================================================================== */
export function maTranPhoiCanh(dich, nguon) {
  const M = [];
  for (let i = 0; i < 4; i++) {
    const x = dich[i][0], y = dich[i][1];
    const u = nguon[i][0], v = nguon[i][1];
    M.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u]);
    M.push([0, 0, 0, x, y, 1, -x * v, -y * v, v]);
  }
  /* Khử Gauss có CHỌN TRỤ LỚN NHẤT. Không chọn trụ thì một tứ giác có cạnh
     song song trục là chia cho số gần 0 — ra NaN, và NaN thì cả ảnh đen. */
  for (let i = 0; i < 8; i++) {
    let tru = i;
    for (let r = i + 1; r < 8; r++) if (Math.abs(M[r][i]) > Math.abs(M[tru][i])) tru = r;
    if (Math.abs(M[tru][i]) < 1e-12) return null;      // suy biến → nơi gọi tự xử
    if (tru !== i) { const t = M[i]; M[i] = M[tru]; M[tru] = t; }
    const p = M[i][i];
    for (let c = i; c <= 8; c++) M[i][c] /= p;
    for (let r = 0; r < 8; r++) {
      if (r === i) continue;
      const k = M[r][i];
      if (!k) continue;
      for (let c = i; c <= 8; c++) M[r][c] -= k * M[i][c];
    }
  }
  return M.map(h => h[8]);            // [a,b,c,d,e,f,g,h]
}

/* ==========================================================================
   2. DUỖI PHẲNG
   ========================================================================== */

const khoangCach = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Tứ giác này có LỒI và đi đúng chiều kim đồng hồ không. Tứ giác lõm (người
 *  kéo một góc vắt qua góc khác) làm ma trận phối cảnh gập ảnh lại — phải
 *  chặn trước, đừng để ra một tấm ảnh xoắn rồi mới biết. */
export function tuGiacLoi(g) {
  let am = 0, duong = 0;
  for (let i = 0; i < 4; i++) {
    const a = g[i], b = g[(i + 1) % 4], c = g[(i + 2) % 4];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (z > 1e-9) duong++; else if (z < -1e-9) am++;
  }
  return am === 0 || duong === 0;
}

/** Diện tích tứ giác (công thức dây giày), luôn dương. */
export function dienTich(g) {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const a = g[i], b = g[(i + 1) % 4];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

/** 4 góc có gần y hệt mép ảnh không → không có gì để cắt.
 *  `saiSo` tính theo phần của cạnh (0.01 = 1%). */
export function laTronKhung(gocChuan, saiSo = 0.012) {
  return GOC_TRON_KHUNG.every((g, i) =>
    Math.abs(g[0] - gocChuan[i][0]) <= saiSo && Math.abs(g[1] - gocChuan[i][1]) <= saiSo);
}

/**
 * Duỗi tứ giác `gocChuan` (0..1) trong `anh` thành một canvas chữ nhật.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} anh
 * @param {Array<[number,number]>} gocChuan  4 góc TL·TR·BR·BL, chuẩn hoá 0..1
 * @param {object} [tc]
 * @param {number} [tc.canhToiDa=1700]  cạnh dài nhất của ảnh RA (px)
 * @param {number} [tc.tranNguon=3200]  cạnh dài nhất của bản NGUỒN đem ra lấy
 *        mẫu. Chặn bộ nhớ: một ảnh 12MP mà tứ giác chỉ chiếm 30% khung thì
 *        muốn ra 1700px phải lấy mẫu ở bản nguồn 5600px = 125 MB điểm ảnh.
 *        Trần này đổi lấy một chút nét để KHÔNG treo máy điện thoại.
 * @returns {{canvas: HTMLCanvasElement, ms: number, rong: number, cao: number}}
 */
export function duoiPhang(anh, gocChuan, tc = {}) {
  const t0 = gio();
  const canhToiDa = tc.canhToiDa || 1700;
  const tranNguon = tc.tranNguon || 3200;
  const [W0, H0] = coAnh(anh);

  const gocPx = gocChuan.map(g => [g[0] * W0, g[1] * H0]);

  /* Cỡ ảnh RA: lấy cạnh DÀI hơn của mỗi cặp cạnh đối. Lấy cạnh ngắn là tự
     nén chữ ở nửa xa của tờ giấy — đúng nửa đã bị phối cảnh làm nhỏ sẵn. */
  const rongTho = Math.max(khoangCach(gocPx[0], gocPx[1]), khoangCach(gocPx[3], gocPx[2]));
  const caoTho = Math.max(khoangCach(gocPx[0], gocPx[3]), khoangCach(gocPx[1], gocPx[2]));
  if (!(rongTho > 8 && caoTho > 8)) throw new Error('Khung cắt quá nhỏ');

  const k = Math.min(1, canhToiDa / Math.max(rongTho, caoTho));
  const DW = Math.max(8, Math.round(rongTho * k));
  const DH = Math.max(8, Math.round(caoTho * k));

  /* Thu nhỏ NGUỒN theo đúng tỉ lệ k trước khi lấy mẫu: trình duyệt thu nhỏ
     bằng mã máy nhanh hơn hẳn vòng lặp JS, và bớt được đúng chừng ấy lần đọc
     bộ nhớ. Kèm trần cứng để ảnh 12MP không thổi bộ nhớ. */
  let kn = Math.min(1, k);
  if (Math.max(W0, H0) * kn > tranNguon) kn = tranNguon / Math.max(W0, H0);
  const SW = Math.max(8, Math.round(W0 * kn));
  const SH = Math.max(8, Math.round(H0 * kn));
  const cNguon = veRaCanvas(anh, SW, SH);
  const sd = cNguon.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, SW, SH).data;

  const nguon = gocPx.map(p => [p[0] * kn, p[1] * kn]);
  const M = maTranPhoiCanh([[0, 0], [DW - 1, 0], [DW - 1, DH - 1], [0, DH - 1]], nguon);
  if (!M) throw new Error('Bốn góc này không dựng được khung (ba góc thẳng hàng?)');
  const [a, b, c, d, e, f, g, h] = M;

  const cRa = document.createElement('canvas');
  cRa.width = DW; cRa.height = DH;
  const xRa = cRa.getContext('2d');
  const im = xRa.createImageData(DW, DH);
  const od = im.data;

  /* Lấy mẫu SONG TUYẾN. Nearest-neighbour rẻ hơn nhưng làm chữ 10pt răng cưa
     — mà chữ nhỏ đọc được chính là toàn bộ lý do của lượt này. */
  let p = 0;
  for (let y = 0; y < DH; y++) {
    const by = b * y + c, ey = e * y + f, hy = h * y + 1;
    for (let x = 0; x < DW; x++, p += 4) {
      const w = g * x + hy;
      const u = (a * x + by) / w, v = (d * x + ey) / w;
      if (!(u >= 0 && v >= 0 && u <= SW - 1 && v <= SH - 1)) {
        /* Ngoài ảnh gốc → tô KEM chứ không tô đen: mảng đen ở mép làm người
           ta tưởng ảnh hỏng, mà JPEG nén mảng sáng cũng nhẹ hơn. */
        od[p] = 250; od[p + 1] = 248; od[p + 2] = 242; od[p + 3] = 255;
        continue;
      }
      const x0 = u | 0, y0 = v | 0;
      const x1 = x0 + 1 < SW ? x0 + 1 : x0;
      const y1 = y0 + 1 < SH ? y0 + 1 : y0;
      const fx = u - x0, fy = v - y0;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy, w11 = fx * fy;
      const i00 = (y0 * SW + x0) << 2, i10 = (y0 * SW + x1) << 2;
      const i01 = (y1 * SW + x0) << 2, i11 = (y1 * SW + x1) << 2;
      od[p] = sd[i00] * w00 + sd[i10] * w10 + sd[i01] * w01 + sd[i11] * w11;
      od[p + 1] = sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11;
      od[p + 2] = sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11;
      od[p + 3] = 255;
    }
  }
  xRa.putImageData(im, 0, 0);
  return { canvas: cRa, ms: Math.round(gio() - t0), rong: DW, cao: DH };
}

/* ==========================================================================
   3. MÁY TỰ ĐOÁN 4 GÓC — chỉ là GỢI Ý
   ---------------------------------------------------------------------------
   Không dò đường viền (contour) rồi rút gọn đa giác: cách đó cần một vùng
   liên thông khép kín, mà mép tờ giấy đời thực hay bị đứt (tay che, bóng đổ,
   giấy trắng trên bàn trắng). Ở đây tìm ĐƯỜNG THẲNG thay vì tìm vùng — mép
   giấy đứt một đoạn thì đường thẳng vẫn dựng được từ đoạn còn lại.

   Bốn bước: xám hoá → làm mượt → Sobel → dồn phiếu tìm 4 đường mép.
   ========================================================================== */

/** Làm mượt bằng hộp 3×3, chạy `lan` lượt. Bớt nhiễu hạt của ảnh chụp thiếu
 *  sáng — không bớt thì Sobel coi mỗi hạt nhiễu là một mẩu biên. */
function lamMuot(x, W, H, lan = 2) {
  let a = x;
  for (let l = 0; l < lan; l++) {
    const b = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const y0 = y > 0 ? y - 1 : 0, y1 = y < H - 1 ? y + 1 : H - 1;
      for (let x2 = 0; x2 < W; x2++) {
        const xa = x2 > 0 ? x2 - 1 : 0, xb = x2 < W - 1 ? x2 + 1 : W - 1;
        b[y * W + x2] = (
          a[y0 * W + xa] + a[y0 * W + x2] + a[y0 * W + xb] +
          a[y * W + xa] + a[y * W + x2] + a[y * W + xb] +
          a[y1 * W + xa] + a[y1 * W + x2] + a[y1 * W + xb]) / 9;
      }
    }
    a = b;
  }
  return a;
}

const DO_NGHIENG = 24 * Math.PI / 180;   // dò tới ±24° — chụp nghiêng hơn thế thì kéo tay
const SO_NGHIENG = 25;                   // 25 nấc ≈ mỗi nấc 2°

/* HAI CÂU CHO NGƯỜI ĐỌC, không phải cho máy.
   Nguyên tắc (REV-0056 lỗi #2): máy đoán sai là chuyện bình thường và chấp
   nhận được; màn hình NÓI DỐI về độ chắc chắn của mình mới là lỗi. Nên:
     · chắc      → im lặng, không câu nào
     · không chắc → nói thẳng là không chắc, và bảo phải làm gì
     · thấy nhiều hơn một tờ → nói đúng bệnh, kèm lời khuyên DÙNG ĐƯỢC
   Không câu nào có phần trăm: người quét kho không quyết định được gì bằng
   con số "mép yếu nhất 65%". */
export const KHUYEN_KHONG_CHAC =
  'Máy không nhận ra rõ mép tờ giấy nên đặt tạm 4 chấm ở mép ảnh. ' +
  'Sếp kéo 4 chấm vào đúng 4 góc tờ giấy giúp.';
/* ⚠️ ĐÃ BỎ: lời nhắc "trong ảnh hình như có nhiều hơn một tờ giấy".
   ---------------------------------------------------------------------------
   Bỏ vì ĐO ĐƯỢC là nó không đáng tin, không phải vì ngại làm. Cách nhận diện
   là "có mép giấy dọc nằm sâu trong lòng tứ giác vừa dựng". Đo trên 17 cảnh
   (`do-cat-khung` mục ③, hai rổ), tỉ lệ mép giữa phủ chiều cao tứ giác:

     RỔ "MỘT tờ" (tuyệt đối không được báo)   RỔ "NHIỀU tờ" (nên báo)
       gấp đôi, nếp hằn giữa      100%          hai tờ rời            100%
       có bảng kẻ dọc lớn          43%          hai tờ khác cỡ        100%
       nhỏ giữa khung (chụp rộng)  25%          sách mở               100%
       lệch hẳn sang trái          20%          hai tờ chồng mép       12%
       … 8 cảnh còn lại ≤ 19%                   hai tờ xếp dọc         10%

   HAI RỔ CHỒNG LÊN NHAU HOÀN TOÀN. Một tờ giấy GẤP ĐÔI cho đúng 100% — y hệt
   hai tờ rời. Không có ngưỡng nào tách được, vì với máy dò biên thì NẾP GẤP,
   ĐƯỜNG KẺ BẢNG và MÉP TỜ THỨ HAI là cùng một thứ: một vệt thẳng đứng.

   Mà hợp đồng lao động gấp đôi để nhét phong bì là chuyện hằng ngày ở kho.
   Bảo Sếp "chụp lại từng tờ một" một tấm ảnh vốn đã đúng là bắt làm việc
   thừa, và câu sai đó còn ĐÈ mất câu đúng ("kéo 4 chấm").

   → Giữ đúng hai câu: máy chắc thì IM LẶNG, không chắc thì bảo kéo 4 chấm.
     Ảnh có hai tờ thì Sếp vẫn kéo được về một tờ — đường lùi còn nguyên, chỉ
     mất một lời nhắc mà lời nhắc đó sai nhiều hơn đúng.
   Ai muốn làm lại: phải tách được NẾP GẤP khỏi MÉP GIẤY trước đã. Bộ 17 cảnh
   trong bàn đo giữ nguyên để đo lại ngay. */

/** Tìm MỘT đường mép mạnh nhất trong nửa `nua` của ảnh.
 *  Đường "dọc" tham số hoá `x = s·y + b`; đường "ngang" là `y = s·x + b`.
 *
 *  ⚠️ DỒN PHIẾU BẰNG CÁCH ĐẾM ĐIỂM, KHÔNG CỘNG ĐỘ MẠNH GRADIENT.
 *  Bản đầu cộng độ mạnh, và con số ra vô nghĩa: một mép giấy tương phản cao
 *  cho "468% cạnh", tức là chấm độ tự tin bằng một cái thước không có vạch.
 *  Đếm điểm thì `diem / độ dài cạnh` ĐỌC ĐƯỢC: "mép này có biên thật trên bao
 *  nhiêu phần chiều dài". Đó mới là thứ quyết định nên tin hay không tin.
 *  Sobel cho biên dày ~2 điểm nên tỉ số này hay vượt 1 — chuẩn hoá ở nơi gọi.
 *
 *  Trả `{s, b, diem}` với `diem` = số điểm biên đỡ đường đó. */
function timMep(diemBien, doDai, nganh, cuaLo, cuaHi) {
  /* `diemBien` = [toaDoChinh, toaDoPhu, doManh] × N, đã lọc theo hướng gradient.
     `nganh` = bề rộng theo trục chính (W cho đường dọc, H cho đường ngang).
     `doDai` = bề dài theo trục phụ (H cho đường dọc, W cho đường ngang).
     `cuaLo`..`cuaHi` = CỬA SỔ tìm trên trục chính, đo tại chính giữa cạnh.

     ⚠️ CỬA SỔ DO NƠI GỌI TRUYỀN VÀO, không còn là ba hằng số tính theo bề
     ngang ẢNH. Lý do ở REV-0056 vòng 2: "giữa ẢNH" là sai CÁCH NHÌN — một tờ
     giấy nằm lệch thì mép của CHÍNH NÓ rơi vào giữa ảnh, và máy kết luận có
     tờ thứ hai. Cửa sổ đúng phải tính theo TỨ GIÁC vừa dựng, mà tứ giác chỉ
     biết được SAU khi đã tìm xong bốn mép — nên phải tham số hoá. */
  const dich = Math.ceil(Math.tan(DO_NGHIENG) * doDai) + 2;
  const soO = nganh + 2 * dich + 2;
  const buoc = (2 * DO_NGHIENG) / (SO_NGHIENG - 1);
  let tot = null;
  for (let i = 0; i < SO_NGHIENG; i++) {
    const s = Math.tan(-DO_NGHIENG + i * buoc);
    const acc = new Float32Array(soO);
    for (let k = 0; k < diemBien.length; k += 3) {
      const o = Math.round(diemBien[k] - s * diemBien[k + 1]) + dich;
      if (o >= 0 && o < soO) acc[o] += 1;
    }
    /* Gộp 3 ô cạnh nhau trước khi chấm: mép giấy đời thực không thẳng tuyệt
       đối nên phiếu tãi ra 2–3 ô, chấm từng ô một là chê nhầm mép thật. */
    for (let o = 1; o < soO - 1; o++) {
      const d = acc[o - 1] + acc[o] + acc[o + 1];
      if (!d) continue;
      const b = o - dich;
      const giua = b + s * (doDai / 2);          // toạ độ chính tại chính giữa
      if (!(giua >= cuaLo && giua <= cuaHi)) continue;
      if (!tot || d > tot.diem) tot = { s, b, diem: d, giua };
    }
  }
  return tot;
}

/**
 * Đoán 4 góc tờ giấy trong ảnh.
 * @returns {{goc: Array<[number,number]>, tuTin: boolean, ms: number, viSao: string}}
 *          `goc` LUÔN dùng được: không tự tin thì trả về 4 góc mép ảnh.
 */
export function doanBonGoc(anh, tc = {}) {
  const t0 = gio();
  const canhDo = tc.canhDo || 360;
  const [W0, H0] = coAnh(anh);
  /* `viSao` là ghi chú KỸ THUẬT — cho bàn đo và nhật ký, KHÔNG cho màn hình.
     `loiKhuyen` là câu cho NGƯỜI: rỗng khi máy chắc (im lặng, đừng bắt đọc),
     có chữ khi máy không chắc hoặc thấy nhiều hơn một tờ giấy.
     REV-0056 lỗi #2: bản trước in thẳng `viSao` lên màn — hoá ra là câu KHOE
     ("4 mép rõ, 65% chiều dài") đúng lúc máy đang đoán sai 36%. Con số đó
     người dùng không dùng được vào việc gì, mà lại tạo lòng tin sai. */
  const thoi = (viSao, tuTin, goc, them) => ({
    goc: goc || GOC_TRON_KHUNG.map(g => g.slice()),
    tuTin: !!tuTin, ms: Math.round(gio() - t0), viSao,
    loiKhuyen: tuTin ? '' : KHUYEN_KHONG_CHAC,
    ...(them || {})
  });
  if (!(W0 > 40 && H0 > 40)) return thoi('ảnh quá nhỏ để dò', false);

  const k = Math.min(1, canhDo / Math.max(W0, H0));
  const W = Math.max(24, Math.round(W0 * k));
  const H = Math.max(24, Math.round(H0 * k));
  const c = veRaCanvas(anh, W, H);
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;

  const n = W * H;
  const xam0 = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    xam0[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  }
  const xam = lamMuot(xam0, W, H, 2);

  /* Sobel. Bỏ ĐÚNG MỘT hàng/cột sát mép — chỉ đủ để cửa sổ 3×3 không đọc ra
     ngoài mảng.
     ⚠️ ĐỪNG BỎ NHIỀU HƠN. Bản đầu bỏ 2 và bàn đo bắt được ngay: ảnh CHỤP SÁT
     (tờ giấy kín khung) có mép giấy nằm ĐÚNG ở điểm ảnh thứ nhất, bỏ 2 là xoá
     sạch mép thật rồi máy đi bắt nhầm đường kẻ bảng bên trong tờ giấy — đoán
     lệch 18% mà vẫn tự tin. Ảnh vẽ ra canvas đúng bằng cỡ ảnh nên KHÔNG có
     "biên giả ở mép khung" để phải tránh. */
  const doc = [], ngang = [];        // [chính, phụ, mạnh] × N, phẳng cho nhanh
  let tongManh = 0, demManh = 0;
  const gxs = new Float32Array(n), gys = new Float32Array(n);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx =
        -xam[i - W - 1] + xam[i - W + 1]
        - 2 * xam[i - 1] + 2 * xam[i + 1]
        - xam[i + W - 1] + xam[i + W + 1];
      const gy =
        -xam[i - W - 1] - 2 * xam[i - W] - xam[i - W + 1]
        + xam[i + W - 1] + 2 * xam[i + W] + xam[i + W + 1];
      gxs[i] = gx; gys[i] = gy;
      const m = Math.abs(gx) + Math.abs(gy);
      tongManh += m; demManh++;
    }
  }
  /* Ngưỡng THÍCH NGHI: lấy bội của độ mạnh trung bình, không lấy số cứng.
     Số cứng thì ảnh chụp thiếu sáng (biên yếu) ra rỗng, còn ảnh nắng gắt ra
     đầy rác. Sàn 12 để ảnh gần như phẳng lì (giấy trắng nền trắng) không đẩy
     ngưỡng xuống 0 rồi coi nhiễu là biên. */
  const nguong = Math.max(12, 2.6 * (tongManh / Math.max(demManh, 1)));
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = gxs[i], gy = gys[i];
      const m = Math.abs(gx) + Math.abs(gy);
      if (m < nguong) continue;
      /* Gradient nằm ngang ⇒ đường biên DỌC, và ngược lại. Chỉ nhận điểm có
         hướng rõ ràng (gấp 1,7 lần) — góc 45° không thuộc mép nào, cho vào
         cả hai nồi là làm nhiễu cả hai. */
      if (Math.abs(gx) > 1.7 * Math.abs(gy)) { doc.push(x, y, m); }
      else if (Math.abs(gy) > 1.7 * Math.abs(gx)) { ngang.push(y, x, m); }
    }
  }
  if (doc.length < 9 || ngang.length < 9) return thoi('không đủ biên để dựng mép', false);

  const trai = timMep(doc, H, W, -2, W * 0.45);
  const phai = timMep(doc, H, W, W * 0.55, W + 2);
  const tren = timMep(ngang, W, H, -2, H * 0.45);
  const duoi = timMep(ngang, W, H, H * 0.55, H + 2);
  if (!trai || !phai || !tren || !duoi) return thoi('thiếu mép ở một phía', false);

  /* ĐỘ TỰ TIN = PHẦN CẠNH CÓ BIÊN THẬT ĐỠ, một con số đọc được.
     `diem` là số điểm biên; Sobel cho biên dày ~2 điểm nên chia cho 2×độ dài
     cạnh ra tỉ lệ phủ. Dưới 0,30 nghĩa là chưa tới 1/3 mép có biên thật — đó
     là đoán mò, và đoán mò thì phải NHẬN LÀ ĐOÁN MÒ, chứ không phải khoe một
     con số 468% như bản đầu. */
  const phuSong = (mep, dai) => Math.min(1, mep.diem / (2 * dai));
  const dsDiem = [phuSong(trai, H), phuSong(phai, H), phuSong(tren, W), phuSong(duoi, W)];
  const yeuNhat = Math.min(...dsDiem);

  /* Giao 4 đường ra 4 góc. Dọc: x = s·y + b. Ngang: y = s·x + b. */
  function giao(dc, ng) {
    const mau = 1 - dc.s * ng.s;
    if (Math.abs(mau) < 1e-9) return null;
    const x = (dc.s * ng.b + dc.b) / mau;
    return [x, ng.s * x + ng.b];
  }
  const g = [giao(trai, tren), giao(phai, tren), giao(phai, duoi), giao(trai, duoi)];
  if (g.some(p => !p || !isFinite(p[0]) || !isFinite(p[1]))) return thoi('bốn mép không giao được', false);

  /* Bốn phép thử tỉnh táo. Trượt cái nào cũng về mép ảnh, im lặng. */
  const ngoai = g.some(p => p[0] < -W * 0.06 || p[0] > W * 1.06 || p[1] < -H * 0.06 || p[1] > H * 1.06);
  if (ngoai) return thoi('góc rơi ra ngoài ảnh', false);
  if (!tuGiacLoi(g)) return thoi('tứ giác bị lõm', false);
  const tiDienTich = dienTich(g) / (W * H);
  if (tiDienTich < 0.18) return thoi('khung đoán ra quá nhỏ (' + Math.round(tiDienTich * 100) + '% khung ảnh)', false);

  const gocChuan = g.map(p => [
    Math.min(1, Math.max(0, p[0] / W)),
    Math.min(1, Math.max(0, p[1] / H))
  ]);
  const tuTin = yeuNhat >= 0.30;

  /* ĐÚNG HAI CÂU, không hơn: chắc thì im lặng, không chắc thì bảo kéo 4 chấm.
     Câu thứ ba ("hình như có nhiều hơn một tờ") đã bị bỏ — lý do và số đo ghi
     ở đầu tệp, chỗ khai `KHUYEN_KHONG_CHAC`. */
  return thoi(
    (tuTin ? '4 mép rõ' : 'mép mờ, đặt tạm') +
      ` (mép yếu nhất ${(yeuNhat * 100).toFixed(0)}% chiều dài)`,
    tuTin, gocChuan);
}

/* ==========================================================================
   4. LÀM RÕ CHỮ  —  tuỳ chọn, mặc định TẮT
   ---------------------------------------------------------------------------
   Hai bước, đúng thứ tự:
     ① CHIA NỀN. Ước lượng nền bằng làm mượt hộp bán kính lớn (ảnh tích phân,
        O(1) mỗi điểm) rồi lấy `điểm / nền`. Đây là thứ xoá BÓNG ĐỔ và ánh
        sáng lệch — chụp trong kho thì nửa tờ giấy tối hơn nửa kia, và đó mới
        là thứ làm AI đọc sai, chứ không phải "chưa đủ tương phản".
     ② KÉO GIÃN. Đẩy nền về trắng, đẩy chữ về đen, phần giữa giãn ra.

   ⚠️ GIỮ MÀU: nhân cùng một hệ số cho cả R·G·B. Xám hoá nhẹ hơn vài chục KB
   nhưng xoá mất DẤU ĐỎ — thứ Luật Kế toán đòi ở bản giấy và là thứ đầu tiên
   người ta soi khi mở bản chụp ra đối chiếu.
   ========================================================================== */

/** Làm mượt hộp bán kính `r` bằng ảnh tích phân — O(1) mỗi điểm, không phụ
 *  thuộc `r`. Không có nó thì bán kính 60px trên ảnh 4 triệu điểm là bất khả. */
function muotHopLon(x, W, H, r) {
  const S = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let hang = 0;
    for (let x2 = 0; x2 < W; x2++) {
      hang += x[y * W + x2];
      S[(y + 1) * (W + 1) + x2 + 1] = S[y * (W + 1) + x2 + 1] + hang;
    }
  }
  const ra = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(H - 1, y + r);
    for (let x2 = 0; x2 < W; x2++) {
      const x0 = Math.max(0, x2 - r), x1 = Math.min(W - 1, x2 + r);
      const tong = S[(y1 + 1) * (W + 1) + x1 + 1] - S[y0 * (W + 1) + x1 + 1]
        - S[(y1 + 1) * (W + 1) + x0] + S[y0 * (W + 1) + x0];
      ra[y * W + x2] = tong / ((y1 - y0 + 1) * (x1 - x0 + 1));
    }
  }
  return ra;
}

/**
 * Làm rõ chữ TẠI CHỖ trên canvas truyền vào (và trả lại chính nó).
 * @param {HTMLCanvasElement} c
 * @param {object} [tc]  `{ san: 0.45, tran: 0.93 }` — hai mốc kéo giãn, tính
 *        theo tỉ lệ so với nền. Dưới `san` thành đen, trên `tran` thành trắng.
 */
export function lamRoChu(c, tc = {}) {
  const t0 = gio();
  const W = c.width, H = c.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  const im = x.getImageData(0, 0, W, H);
  const d = im.data;
  const n = W * H;

  const sang = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    sang[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  }
  /* Bán kính nền phải LỚN HƠN nét chữ nhiều lần, nếu không nó bám theo chính
     chữ và xoá luôn chữ. 1/26 cạnh dài ≈ 65px trên ảnh 1700px — rộng hơn một
     dòng chữ, hẹp hơn một vùng bóng đổ. */
  const r = Math.max(6, Math.round(Math.max(W, H) / 26));
  const nen = muotHopLon(sang, W, H, r);

  const san = tc.san != null ? tc.san : 0.45;
  const tran = tc.tran != null ? tc.tran : 0.93;
  const heSo = 1 / (tran - san);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const nn = nen[i] > 1 ? nen[i] : 1;
    /* Một hệ số cho cả ba kênh → giữ nguyên sắc, chỉ đổi độ sáng. */
    let t = (sang[i] / nn - san) * heSo;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const k = sang[i] > 1 ? (t * 255) / sang[i] : 0;
    const R = d[p] * k, G = d[p + 1] * k, B = d[p + 2] * k;
    d[p] = R > 255 ? 255 : R;
    d[p + 1] = G > 255 ? 255 : G;
    d[p + 2] = B > 255 ? 255 : B;
  }
  x.putImageData(im, 0, 0);
  c.msLamRo = Math.round(gio() - t0);
  return c;
}

/* ==========================================================================
   5. Canvas → File, để đi NGUYÊN đường nén cũ
   ---------------------------------------------------------------------------
   KHÔNG gọi `toDataURL` rồi tự chốt chất lượng ở đây. Ảnh cắt xong phải quay
   về đúng `nenAnhChung()` với đúng `ANH_TRANG` mà mọi trang khác đang đi —
   thêm một chỗ chốt chất lượng thứ hai là thêm một chỗ để hai con số lệch
   nhau mà không ai biết (Hiến pháp Rule 5).
   Chất lượng 0,92 ở bước trung gian này là để lượt nén thật phía sau còn
   nguyên liệu mà làm việc, không phải để lưu.
   ========================================================================== */
export function canvasThanhTep(c, ten = 'cat.jpg') {
  return new Promise((ok, hong) => {
    c.toBlob(b => b ? ok(new File([b], ten, { type: 'image/jpeg' }))
      : hong(new Error('Không xuất được ảnh đã cắt')), 'image/jpeg', 0.92);
  });
}
