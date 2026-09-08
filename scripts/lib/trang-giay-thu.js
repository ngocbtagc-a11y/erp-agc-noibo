/* ==========================================================================
   TỜ GIẤY THỬ — DỰNG BẰNG CANVAS, DÙNG CHUNG CHO CÁC BÀN ĐO TRONG TRÌNH DUYỆT
   ---------------------------------------------------------------------------
   Vì sao không lấy ảnh mẫu trên mạng: bàn đo phải chạy được ngoại tuyến và
   cho ra CÙNG một con số ở mọi máy.

   NỘI DUNG CHỮ PHẢI GIỮ NGUYÊN TỪNG KÝ TỰ. `scripts/do-boc-chu.mjs` chấm độ
   chính xác bóc chữ bằng cách so với hằng `BAN_GOC` và 8 trường `TRUONG` chép
   đúng từ đây. Sửa một dấu phẩy ở đây mà quên sửa bên đó là điểm bóc chữ tụt
   mà không ai hiểu vì sao.

   ⚠️ `scripts/ban-quet-tai-lieu.html` hiện còn một bản CHÉP TAY của hàm này
   nằm thẳng trong trang (`dungTrangGiay`). Đó là bản cũ hơn, sinh ra trước
   khi có tệp này. Nhánh nào gộp sau thì dời nốt bản đó sang đây — Hiến pháp
   Rule 5: dùng lại MỘT hàm, đừng nuôi hai bản.
   ========================================================================== */

/** Đúng chữ đang vẽ lên tờ giấy, để nơi nào cần đối chiếu thì đọc từ đây. */
export const CHU_TREN_GIAY = [
  'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  'Độc lập — Tự do — Hạnh phúc',
  'GIẤY CHỨNG NHẬN',
  'CƠ SỞ ĐỦ ĐIỀU KIỆN AN TOÀN THỰC PHẨM',
  'Số: 124/2026/GCN-ATTP',
  'Tên cơ sở: CÔNG TY TNHH ALPHA GREEN COMMERCE',
  'Địa chỉ: Số 12, ngõ 45, phường Yên Hoà, quận Cầu Giấy, Hà Nội',
  'Người đại diện: Bùi Thị Ngọc — Chức vụ: Giám đốc',
  'Loại hình: Kinh doanh thực phẩm nhập khẩu và nông sản khô',
  'Ngày cấp: 15/03/2026        Có giá trị đến: 15/03/2029',
  'Cơ sở nêu trên đủ điều kiện an toàn thực phẩm theo quy định',
  'tại Nghị định số 15/2018/NĐ-CP ngày 02 tháng 02 năm 2018 của',
  'Chính phủ quy định chi tiết thi hành một số điều của Luật An',
  'toàn thực phẩm.',
  'Giấy chứng nhận này có giá trị trong thời hạn 03 (ba) năm kể',
  'từ ngày ký. Cơ sở có trách nhiệm duy trì các điều kiện đã được',
  'thẩm định trong suốt quá trình hoạt động.'
];

/* Vị trí THANH KẺ ĐEN ngang hết bề ngang tờ giấy, tính theo tỉ lệ chiều cao.
   Đây là THƯỚC ĐO ĐỘ NGHIÊNG của bàn đo duỗi phẳng: sau khi duỗi, thanh này
   phải nằm ngang. Không có một vật mốc thẳng thì "ảnh đã ngay ngắn chưa" chỉ
   còn cách chấm bằng mắt. */
export const TI_THANH_MOC = 0.235;

/**
 * Vẽ MỘT tờ giấy phẳng (chưa nghiêng, chưa đặt lên bàn) ra canvas.
 * @param {number} W  bề ngang px
 * @param {number} H  chiều cao px
 * @param {object} [tc]
 * @param {number} [tc.nhieu=0]  biên độ nhiễu hạt (0 = không nhiễu)
 * @param {string} [tc.nenGiay='#f7f4ec']
 */
export function veToGiay(W, H, tc = {}) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = tc.nenGiay || '#f7f4ec';
  x.fillRect(0, 0, W, H);

  /* Mọi cỡ chữ tính theo H để tờ giấy vẽ ở cỡ nào cũng ra cùng bố cục. */
  const cx = (t) => Math.round(H * t);
  x.fillStyle = '#1a1a1a';
  x.textAlign = 'center';
  x.font = `bold ${cx(0.0238)}px "Times New Roman", serif`;
  x.fillText(CHU_TREN_GIAY[0], W / 2, cx(0.0744));
  x.font = `bold ${cx(0.0193)}px "Times New Roman", serif`;
  x.fillText(CHU_TREN_GIAY[1], W / 2, cx(0.1042));
  x.font = `bold ${cx(0.0273)}px "Times New Roman", serif`;
  x.fillText(CHU_TREN_GIAY[2], W / 2, cx(0.1736));
  x.font = `bold ${cx(0.0218)}px "Times New Roman", serif`;
  x.fillText(CHU_TREN_GIAY[3], W / 2, cx(0.2034));

  /* THANH MỐC — vật mốc thẳng để đo độ nghiêng còn lại sau khi duỗi. */
  x.fillStyle = '#1a1a1a';
  x.fillRect(Math.round(W * 0.06), Math.round(H * TI_THANH_MOC),
    Math.round(W * 0.88), Math.max(2, Math.round(H * 0.0035)));

  x.textAlign = 'left';
  x.font = `${cx(0.0159)}px "Times New Roman", serif`;
  const than = CHU_TREN_GIAY.slice(4, 10)
    .concat([''], CHU_TREN_GIAY.slice(10, 14), [''], CHU_TREN_GIAY.slice(14));
  than.forEach((t, i) => x.fillText(t, Math.round(W * 0.086), cx(0.2604) + i * cx(0.0248)));

  /* Bảng kẻ — nét mảnh, đúng thứ giấy tờ thật hay có và JPEG khó nén. */
  x.strokeStyle = '#333'; x.lineWidth = Math.max(1, Math.round(H * 0.001));
  const bTren = Math.round(H * 0.6696), bCao = Math.round(H * 0.0273);
  const bTrai = Math.round(W * 0.086), bRong = Math.round(W * 0.2758);
  for (let i = 0; i <= 5; i++) {
    x.beginPath(); x.moveTo(bTrai, bTren + i * bCao);
    x.lineTo(bTrai + 3 * bRong, bTren + i * bCao); x.stroke();
  }
  for (let i = 0; i <= 3; i++) {
    x.beginPath(); x.moveTo(bTrai + i * bRong, bTren);
    x.lineTo(bTrai + i * bRong, bTren + 5 * bCao); x.stroke();
  }
  x.font = `${cx(0.0129)}px "Times New Roman", serif`;
  x.fillStyle = '#1a1a1a';
  for (let r = 0; r < 5; r++) {
    for (let cc = 0; cc < 3; cc++) {
      x.fillText(['Sản phẩm', 'Hạn dùng', 'Ghi chú'][cc] + ' ' + (r + 1),
        bTrai + cc * bRong + Math.round(W * 0.013), bTren + r * bCao + Math.round(bCao * 0.68));
    }
  }

  /* DẤU ĐỎ tròn — thứ Luật Kế toán đòi ở bản giấy, và là lý do `lamRoChu()`
     KHÔNG được xám hoá ảnh. Bàn đo phải có nó thì mới kiểm được. */
  x.save();
  x.translate(Math.round(W * 0.777), Math.round(H * 0.883));
  x.rotate(-0.18);
  const bk = Math.round(H * 0.0645);
  x.strokeStyle = 'rgba(190,20,30,.85)'; x.lineWidth = Math.max(2, Math.round(H * 0.0035));
  x.beginPath(); x.arc(0, 0, bk, 0, Math.PI * 2); x.stroke();
  x.lineWidth = Math.max(1, Math.round(H * 0.0015));
  x.beginPath(); x.arc(0, 0, bk * 0.865, 0, Math.PI * 2); x.stroke();
  x.fillStyle = 'rgba(190,20,30,.85)';
  x.textAlign = 'center';
  x.font = `bold ${cx(0.0114)}px "Times New Roman", serif`;
  x.fillText('ALPHA GREEN', 0, -Math.round(H * 0.005));
  x.fillText('COMMERCE', 0, Math.round(H * 0.01));
  x.restore();

  if (tc.nhieu) themNhieu(x, W, H, tc.nhieu);
  return c;
}

/** Nhiễu hạt — ảnh chụp trong kho thiếu sáng luôn có, và đây là thứ làm JPEG
 *  phình nhất VÀ làm Sobel thấy biên giả. Thiếu nó là bàn đo dễ dãi giả tạo. */
export function themNhieu(x, W, H, bienDo) {
  const im = x.getImageData(0, 0, W, H);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * bienDo;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(im, 0, 0);
}

/* ==========================================================================
   ĐẶT TỜ GIẤY LÊN MỘT CẢNH — vẽ méo theo phối cảnh
   ---------------------------------------------------------------------------
   ⚠️ CỐ Ý KHÔNG dùng `duoiPhang()`/`maTranPhoiCanh()` của sản phẩm để dựng
   cảnh thử. Lấy chính hàm đang bị đo ra dựng đề bài thì hai lỗi ngược dấu
   triệt tiêu nhau và bàn đo báo ĐẠT trong khi sản phẩm sai.

   Cách độc lập ở đây: cắt tờ giấy thành N DẢI NGANG, mỗi dải vẽ bằng một phép
   biến đổi AFFINE của chính trình duyệt (`setTransform`), hai mép dải bám theo
   hai cạnh bên của tứ giác. N = 600 thì sai số dưới một điểm ảnh — và đó là
   một phép xấp xỉ KHÁC hẳn, viết bằng công cụ khác.
   ========================================================================== */
export function datGiayVaoCanh(nen, giay, goc, soDai = 600) {
  const x = nen.getContext('2d');
  const [TL, TR, BR, BL] = goc;
  const GW = giay.width, GH = giay.height;
  for (let i = 0; i < soDai; i++) {
    const t0 = i / soDai, t1 = (i + 1) / soDai;
    /* Hai mép trái/phải của dải, nội suy tuyến tính trên cạnh của tứ giác. */
    const t0x = TL[0] + (BL[0] - TL[0]) * t0, t0y = TL[1] + (BL[1] - TL[1]) * t0;
    const p0x = TR[0] + (BR[0] - TR[0]) * t0, p0y = TR[1] + (BR[1] - TR[1]) * t0;
    const t1x = TL[0] + (BL[0] - TL[0]) * t1, t1y = TL[1] + (BL[1] - TL[1]) * t1;
    x.save();
    x.beginPath();
    x.moveTo(t0x, t0y); x.lineTo(p0x, p0y);
    x.lineTo(TR[0] + (BR[0] - TR[0]) * t1, TR[1] + (BR[1] - TR[1]) * t1);
    x.lineTo(t1x, t1y);
    x.closePath();
    x.clip();
    /* Affine: (0,0)→mép trái dải · (GW,0)→mép phải dải · (0,GH)→mép trái dải kế */
    const a = (p0x - t0x) / GW, b = (p0y - t0y) / GW;
    const c = (t1x - t0x) / (GH / soDai), d = (t1y - t0y) / (GH / soDai);
    x.setTransform(a, b, c, d, t0x, t0y);
    x.drawImage(giay, 0, -GH * t0, GW, GH);
    x.restore();
  }
  return nen;
}

/** Nền "mặt bàn gỗ" — vân nâu + nhiễu, đủ tương phản với giấy. */
export function nenBanGo(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#5a3d22'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(30,18,8,.35)';
  x.lineWidth = Math.max(2, Math.round(W / 300));
  for (let i = 0; i < 40; i++) {
    const y = (i / 40) * H + Math.random() * 20;
    x.beginPath(); x.moveTo(0, y);
    x.bezierCurveTo(W * 0.3, y + 30, W * 0.6, y - 30, W, y + 10);
    x.stroke();
  }
  themNhieu(x, W, H, 18);
  return c;
}

/** Nền "bàn trắng / nền giấy trắng" — ca khó nhất, gần như không có biên. */
export function nenTrang(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, W, H);
  themNhieu(x, W, H, 16);
  return c;
}
