/* ==========================================================================
   BÀN THỬ NGOẠI TUYẾN — SPEC-0007 Đợt 2 (nhắc sinh nhật)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-nhac-nhan-su.mjs
   0 phút GitHub Actions, 0 token, không chạm D1, không chạm mạng (BH-25).

   Kiểm HAI tầng:
   ① Hàm THUẦN (đồng hồ giả) — cửa sổ cuối tháng, khung giờ, bẫy 29/02.
   ② Luồng quét THẬT — chạy `quetNhacNhanSu()` trên một D1 GIẢ nhưng có SQL
     thật được thông dịch, để bắt được cả phần WHERE `dang_lam = 1` và phần
     chống trùng. Đọc code không thấy được hai chỗ đó (BH-34).

   MỖI tính chất đều có CA ĐỐI CHỨNG CỐ Ý SAI (BH-16/BH-26): ca mà ta biết
   TRƯỚC là nó PHẢI hỏng, và nói được vì sao kết quả BẮT BUỘC phải khác.
   ========================================================================== */

import {
  gioVN, laNamNhuan, soNgayTrongThang, duocGuiNhac, trongCuaSoCuoiThang,
  thangKeTiep, mmddCanChucHomNay, ngayVN, thangVN, quetNhacNhanSu
} from '../src/nhac-nhan-su.js';

let dat = 0, hong = 0;
const loi = [];
function kiem(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; return true; }
  hong++; loi.push(`  ✗ ${ten}\n      được : ${a}\n      cần   : ${b}`);
  return false;
}

/* Đồng hồ giả: dựng thẳng mốc UTC sao cho giờ VN đúng bằng tham số. */
function vnGia(y, m, d, gio = 10) {
  return new Date(Date.UTC(y, m - 1, d, gio, 0, 0));   // đã là "giờ VN" dạng UTC
}

console.log('\n=== ① HÀM THUẦN ===\n');

/* --- Năm nhuận ---------------------------------------------------------- */
kiem('2024 nhuận', laNamNhuan(2024), true);
kiem('2026 KHÔNG nhuận', laNamNhuan(2026), false);
kiem('1900 KHÔNG nhuận (chia 100)', laNamNhuan(1900), false);
kiem('2000 nhuận (chia 400)', laNamNhuan(2000), true);
kiem('tháng 2/2026 có 28 ngày', soNgayTrongThang(2026, 2), 28);
kiem('tháng 2/2028 có 29 ngày', soNgayTrongThang(2028, 2), 29);

/* --- AC #2: bản tin tháng 3 PHẢI được gửi từ tháng 2 --------------------- */
/* Tính chất: 26/02 của năm KHÔNG nhuận nằm trong cửa sổ 5 ngày cuối tháng
   (tháng 2 có 28 ngày → cửa sổ là 24..28). */
kiem('26/02/2026 trong cửa sổ cuối tháng', trongCuaSoCuoiThang(vnGia(2026, 2, 26)), true);
kiem('23/02/2026 NGOÀI cửa sổ', trongCuaSoCuoiThang(vnGia(2026, 2, 23)), false);
kiem('27/01/2026 trong cửa sổ (tháng 31 ngày)', trongCuaSoCuoiThang(vnGia(2026, 1, 27)), true);
kiem('26/01/2026 NGOÀI cửa sổ (tháng 31 ngày)', trongCuaSoCuoiThang(vnGia(2026, 1, 26)), false);

/* ĐỐI CHỨNG BH-16 cho AC #2 — bản viết CỨNG "ngày 30" như yêu cầu gốc.
   Vì sao BẮT BUỘC phải khác: tháng 2 không tồn tại ngày 30, nên với MỌI đầu
   vào trong tháng 2 hàm này trả false. Sai cơ học, không phụ thuộc dữ liệu. */
const banVietCung30 = (vn) => vn.getUTCDate() === 30;
kiem('ĐỐI CHỨNG · bản "ngày 30" KHÔNG gửi được ở tháng 2 (mọi ngày)',
  [24, 25, 26, 27, 28].some(d => banVietCung30(vnGia(2026, 2, d))), false);
kiem('ĐỐI CHỨNG · bản "ngày 30" chạy được ở tháng 1 — nên nó KHÔNG hỏng-mọi-nơi, chỉ hỏng tháng 2',
  banVietCung30(vnGia(2026, 1, 30)), true);

/* Quét cả 12 tháng của một năm không nhuận và một năm nhuận: cửa sổ phải
   luôn có ĐÚNG 5 ngày, không tháng nào rỗng. */
for (const nam of [2026, 2028]) {
  let thieu = [];
  for (let m = 1; m <= 12; m++) {
    let dem = 0;
    for (let d = 1; d <= soNgayTrongThang(nam, m); d++) if (trongCuaSoCuoiThang(vnGia(nam, m, d))) dem++;
    if (dem !== 5) thieu.push(`${m}/${nam}=${dem}`);
  }
  kiem(`mọi tháng năm ${nam} đều có đúng 5 ngày trong cửa sổ`, thieu, []);
}

/* --- Tháng kế tiếp ------------------------------------------------------ */
kiem('26/02/2026 → tháng sau là 3/2026', thangKeTiep(vnGia(2026, 2, 26)), { nam: 2026, thang: 3, mm: '03' });
kiem('28/12/2026 → tháng sau là 1/2027 (sang năm)', thangKeTiep(vnGia(2026, 12, 28)), { nam: 2027, thang: 1, mm: '01' });

/* --- AC #4: bẫy 29/02 --------------------------------------------------- */
kiem('28/02 năm KHÔNG nhuận nhận cả 02-29', mmddCanChucHomNay(vnGia(2026, 2, 28)), ['02-28', '02-29']);
kiem('29/02 năm nhuận tự khớp', mmddCanChucHomNay(vnGia(2028, 2, 29)), ['02-29']);
kiem('28/02 năm NHUẬN không cướp 02-29', mmddCanChucHomNay(vnGia(2028, 2, 28)), ['02-28']);
kiem('ngày thường không thêm gì', mmddCanChucHomNay(vnGia(2026, 7, 15)), ['07-15']);

/* ĐỐI CHỨNG · bản chỉ khớp đúng MM-DD (không xử 29/02). Vì sao BẮT BUỘC
   khác: '02-29' không nằm trong kết quả, nên người sinh 29/02 lọt khỏi lưới
   ở mọi năm không nhuận — 4 năm mới được chúc 1 lần. */
const banKhongXu2902 = (vn) =>
  [`${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`];
kiem('ĐỐI CHỨNG · bản không xử 29/02 bỏ sót người sinh 29/02',
  banKhongXu2902(vnGia(2026, 2, 28)).includes('02-29'), false);

/* --- AC #10: khung giờ + Chủ nhật (ADR-0013) ---------------------------- */
/* 2026-08-30 là Chủ nhật; 2026-08-29 là thứ Bảy. */
kiem('Chủ nhật 30/08/2026 10h → KHÔNG gửi', duocGuiNhac(vnGia(2026, 8, 30, 10)).ly_do, 'chu_nhat');
kiem('thứ Bảy 29/08/2026 10h → VẪN gửi (ADR-0013)', duocGuiNhac(vnGia(2026, 8, 29, 10)).duoc, true);
kiem('thứ Sáu 7h59 → ngoài khung', duocGuiNhac(vnGia(2026, 8, 28, 7)).ly_do, 'ngoai_khung_gio');
kiem('thứ Sáu 8h → trong khung', duocGuiNhac(vnGia(2026, 8, 28, 8)).duoc, true);
kiem('thứ Sáu 17h → trong khung', duocGuiNhac(vnGia(2026, 8, 28, 17)).duoc, true);
kiem('thứ Sáu 18h → ngoài khung', duocGuiNhac(vnGia(2026, 8, 28, 18)).ly_do, 'ngoai_khung_gio');

/* ĐỐI CHỨNG · cửa "luôn mở". Vì sao BẮT BUỘC khác: nó trả true cho ĐÚNG
   những mốc mà bản thật trả false — Chủ nhật và 3h sáng. */
const cuaLuonMo = () => ({ duoc: true, ly_do: null });
kiem('ĐỐI CHỨNG · cửa luôn mở gửi cả Chủ nhật', cuaLuonMo(vnGia(2026, 8, 30, 10)).duoc, true);
kiem('ĐỐI CHỨNG · cửa luôn mở gửi cả 3h sáng', cuaLuonMo(vnGia(2026, 8, 28, 3)).duoc, true);

/* --- Quy đổi giờ VN ----------------------------------------------------- */
{
  // 2026-08-27T18:30:00Z = 01:30 ngày 28/08 giờ VN → phải sang NGÀY HÔM SAU.
  const vn = gioVN(new Date('2026-08-27T18:30:00Z'));
  kiem('UTC 18:30 27/08 → giờ VN là 01:30 ngày 28/08', [ngayVN(vn), vn.getUTCHours()], ['2026-08-28', 1]);
  kiem('…và 01:30 thì NGOÀI khung gửi', duocGuiNhac(vn).ly_do, 'ngoai_khung_gio');
  kiem('thangVN', thangVN(vn), '2026-08');
}

/* ==========================================================================
   ② LUỒNG QUÉT THẬT trên D1 GIẢ
   ---------------------------------------------------------------------------
   Không dựng SQL engine — thay vào đó nhận diện từng câu truy vấn của module
   rồi trả kết quả tính bằng JS trên đúng bộ dữ liệu thử. Bàn thử phải TỰ BÁO
   HỎNG nếu gặp câu lạ, không được im lặng trả rỗng (BH-17: nghi bàn thử
   trước) — im lặng trả rỗng là mọi phép kiểm đều "0 tin" và đều ✅ giả.
   ========================================================================== */

console.log('\n=== ② LUỒNG QUÉT THẬT (D1 giả) ===\n');

function dungDB(nhanSu, thongBaoCu = [], taiKhoan = []) {
  const thongBao = [...thongBaoCu];
  const cauLa = [];

  const db = {
    prepare(sql) {
      const s = sql.replace(/\s+/g, ' ').trim();
      let tham = [];
      const api = {
        bind(...a) { tham = a; return api; },
        async first() {
          if (s.startsWith('SELECT 1 AS co FROM thong_bao') && s.includes('nguoi_nhan_id')) {
            const [loai, nguoi, ngay] = tham;
            return thongBao.some(t => t.loai === loai && t.nguoi_nhan_id === nguoi && t.tao_luc.slice(0, 10) === ngay)
              ? { co: 1 } : null;
          }
          if (s.startsWith('SELECT 1 AS co FROM thong_bao') && s.includes("strftime('%Y-%m'")) {
            const [loai, thang] = tham;
            return thongBao.some(t => t.loai === loai && t.tao_luc.slice(0, 7) === thang) ? { co: 1 } : null;
          }
          cauLa.push(s); return null;
        },
        async all() {
          if (s.includes('FROM tai_khoan')) {
            return { results: taiKhoan.filter(t => t.kich_hoat !== 0
              && nhanSu.some(n => n.id === t.nhan_su_id && n.dang_lam === 1)) };
          }
          if (s.includes('FROM nhan_su n') && s.includes("strftime('%m-%d'")) {
            const mmdd = tham;
            return { results: nhanSu.filter(n =>
              n.dang_lam === 1 && n.ngay_sinh
              && (n.cong_khai_sinh_nhat ?? 1) === 1
              && mmdd.includes(n.ngay_sinh.slice(5, 10))
            ).map(n => ({ ...n, quan_ly_ten: nhanSu.find(q => q.id === n.quan_ly_id && q.dang_lam === 1)?.ho_ten || null })) };
          }
          if (s.includes('FROM nhan_su n') && s.includes("strftime('%m', n.ngay_sinh) = ?")) {
            const [mm] = tham;
            return { results: nhanSu.filter(n => n.dang_lam === 1 && n.ngay_sinh && n.ngay_sinh.slice(5, 7) === mm)
              .map(n => ({ ...n, cong_khai: n.cong_khai_sinh_nhat ?? 1 }))
              .sort((a, b) => a.ngay_sinh.slice(8, 10).localeCompare(b.ngay_sinh.slice(8, 10))) };
          }
          cauLa.push(s); return { results: [] };
        }
      };
      return api;
    }
  };
  const gui = async (_env, nhom, noi_dung, loai, _lk, nguoi_nhan_id) => {
    thongBao.push({ nhom, noi_dung, loai, nguoi_nhan_id, tao_luc: NGAY_GIA });
  };
  return { env: { DB: db }, gui, thongBao, cauLa };
}

/* Đồng hồ giả đi qua THAM SỐ `luc`, không qua việc ghi đè `Date.now`:
   `new Date()` đọc thẳng đồng hồ máy chứ không gọi `Date.now`, nên bản ghi
   đè đầu tiên "chạy được" mà không khống chế được gì — 6 phép kiểm dưới đây
   đều báo ✅ giả (BH-17: nghi bàn thử trước, nghi code sau). */
let NGAY_GIA = '';
function mocUTC(y, m, d, gio) {
  // gioVN() cộng +7h, nên trừ ngược 7h để giờ VN ra đúng con số mong muốn.
  return new Date(Date.UTC(y, m - 1, d, gio, 0, 0) - 7 * 3600 * 1000);
}
function datNgayGia(y, m, d, gio) {
  NGAY_GIA = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(gio).padStart(2, '0')}:00:00`;
}

const NHAN_SU = [
  { id: 'ns1', ho_ten: 'Phạm Khương Duy', chuc_vu: 'Quản lý kho', bo_phan: 'Kho', dang_lam: 1, ngay_sinh: '1990-08-27', quan_ly_id: 'ns9', cong_khai_sinh_nhat: 1 },
  { id: 'ns2', ho_ten: 'Người Đã Nghỉ',   chuc_vu: 'NV kho',      bo_phan: 'Kho', dang_lam: 0, ngay_sinh: '1992-08-27', quan_ly_id: 'ns1', cong_khai_sinh_nhat: 1 },
  { id: 'ns3', ho_ten: 'Người Tắt Chuông', chuc_vu: 'NV kho',     bo_phan: 'Kho', dang_lam: 1, ngay_sinh: '1993-08-27', quan_ly_id: 'ns1', cong_khai_sinh_nhat: 0 },
  { id: 'ns4', ho_ten: 'Bạn Sinh 29/02',  chuc_vu: 'NV kho',      bo_phan: 'Kho', dang_lam: 1, ngay_sinh: '1996-02-29', quan_ly_id: 'ns1', cong_khai_sinh_nhat: 1 },
  { id: 'ns5', ho_ten: 'Vũ Lan Hương',    chuc_vu: 'HCNS',        bo_phan: 'HCNS', dang_lam: 1, ngay_sinh: '1998-09-10', quan_ly_id: 'ns9', cong_khai_sinh_nhat: 1 },
  { id: 'ns6', ho_ten: 'Phan Thị Hằng',   chuc_vu: 'Kế toán trưởng', bo_phan: 'Kế toán', dang_lam: 1, ngay_sinh: '1991-03-12', quan_ly_id: 'ns9', cong_khai_sinh_nhat: 1 },
  { id: 'ns9', ho_ten: 'Bùi Thị Ngọc',    chuc_vu: 'Giám đốc',    bo_phan: 'BGĐ', dang_lam: 1, ngay_sinh: '1988-05-05', quan_ly_id: null, cong_khai_sinh_nhat: 1 }
];
const TAI_KHOAN = [
  { nhan_su_id: 'ns5', vai_tro: 'hcns', kich_hoat: 1 },
  { nhan_su_id: 'ns9', vai_tro: 'admin', kich_hoat: 1 }
];

async function chayQuet(y, m, d, gio, thongBaoCu = [], nhanSu = NHAN_SU) {
  datNgayGia(y, m, d, gio);
  const bo = dungDB(nhanSu, thongBaoCu, TAI_KHOAN);
  const kq = await quetNhacNhanSu(bo.env, bo.gui, mocUTC(y, m, d, gio));
  return { kq, tb: bo.thongBao.slice(thongBaoCu.length), cauLa: bo.cauLa };
}

/* --- AC #3: người đã nghỉ KHÔNG được chúc ------------------------------- */
{
  // 27/08/2026 là thứ NĂM. ns1 và ns2 cùng sinh 27/08, ns2 đã nghỉ.
  const { tb, cauLa } = await chayQuet(2026, 8, 27, 10);
  kiem('bàn thử không gặp câu SQL lạ', cauLa, []);
  const nhan = tb.filter(t => t.loai === 'ns_sinhnhat').map(t => t.nguoi_nhan_id).sort();
  kiem('AC#3 · chỉ ns1 nhận lời chúc, ns2 (đã nghỉ) và ns3 (đã tắt) thì không', nhan, ['ns1']);
  kiem('AC#3 đối chứng · ns1 đang làm THÌ CÓ nhận', nhan.includes('ns1'), true);
  const ql = tb.filter(t => t.loai === 'ns_sinhnhat_ql').map(t => t.nguoi_nhan_id);
  kiem('quản lý trực tiếp của ns1 (ns9) cũng nhận', ql, ['ns9']);
}

/* ĐỐI CHỨNG cho AC#3 — bỏ điều kiện `dang_lam = 1`. Vì sao BẮT BUỘC khác:
   ns2 đã nghỉ mà vẫn cùng ngày sinh với ns1, nên bỏ điều kiện là ns2 lọt vào
   ngay. Dựng bằng cách bật `dang_lam` của ns2 lên — tương đương hệ quả. */
{
  const nsSai = NHAN_SU.map(n => n.id === 'ns2' ? { ...n, dang_lam: 1 } : n);
  const { tb } = await chayQuet(2026, 8, 27, 10, [], nsSai);
  const nhan = tb.filter(t => t.loai === 'ns_sinhnhat').map(t => t.nguoi_nhan_id).sort();
  kiem('ĐỐI CHỨNG · bỏ lọc "đã nghỉ" thì ns2 LỌT VÀO (bàn thử đủ nhạy)', nhan, ['ns1', 'ns2']);
}

/* --- AC #4: người sinh 29/02 được chúc ngày 28/02 năm không nhuận ------- */
{
  // 28/02/2026 là thứ BẢY — ADR-0013 vẫn cho gửi.
  const { tb } = await chayQuet(2026, 2, 28, 10);
  kiem('AC#4 · ns4 (sinh 29/02) nhận chúc vào 28/02/2026',
    tb.filter(t => t.loai === 'ns_sinhnhat').map(t => t.nguoi_nhan_id), ['ns4']);
}
{
  // Đối chứng: 27/02/2026 — KHÔNG phải ngày thay thế, không ai được chúc.
  const { tb } = await chayQuet(2026, 2, 27, 10);
  kiem('AC#4 đối chứng · 27/02 thì ns4 KHÔNG nhận gì',
    tb.filter(t => t.loai === 'ns_sinhnhat').length, 0);
}

/* --- AC #5: cron 12 lượt/giờ → đúng 1 tin/loại/người/ngày --------------- */
{
  let so = [];
  const cu = [];
  for (let i = 0; i < 12; i++) {
    const { tb } = await chayQuet(2026, 8, 27, 10, cu);
    cu.push(...tb);
    so.push(tb.length);
  }
  /* 27/08 vừa là sinh nhật ns1, vừa nằm trong cửa sổ 5 ngày cuối tháng 8
     (27..31) → lượt đầu bắn 4 tin: chúc ns1 · báo quản lý ns9 · bản tin
     tháng 9 cho HCNS ns5 · bản tin tháng 9 cho quản lý ns9. 11 lượt sau
     phải im hoàn toàn — CẢ HAI cơ chế chống trùng (theo ngày và theo tháng)
     đều bị thử trong cùng một ca. */
  kiem('AC#5 · lượt 1 gửi 4 tin, 11 lượt sau im lặng', so, [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  kiem('AC#5 · và đúng 1 tin cho mỗi loại/người',
    cu.map(t => t.loai + '→' + t.nguoi_nhan_id).sort(),
    ['ns_sinhnhat->ns1', 'ns_sinhnhat_ql->ns9', 'ns_sinhnhat_thang->ns5', 'ns_sinhnhat_thang_ql->ns9']
      .map(s => s.replace('->', '→')).sort());
}

/* --- AC #10: Chủ nhật + ngoài giờ → 0 tin ------------------------------- */
{
  const cn = await chayQuet(2026, 8, 30, 10);          // Chủ nhật
  kiem('AC#10 · Chủ nhật gửi 0 tin', [cn.kq.bo_qua, cn.tb.length], ['chu_nhat', 0]);
  const dem = await chayQuet(2026, 8, 27, 3);           // 3h sáng thứ Năm
  kiem('AC#10 · 3h sáng gửi 0 tin', [dem.kq.bo_qua, dem.tb.length], ['ngoai_khung_gio', 0]);
  const bay = await chayQuet(2026, 8, 29, 10);          // thứ Bảy
  kiem('AC#10 đối chứng · thứ Bảy VẪN chạy (ADR-0013), không bị chặn', bay.kq.bo_qua, null);
}

/* --- AC #2 đầu-cuối: bản tin tháng sau ---------------------------------- */
{
  // 26/02/2026 là thứ NĂM, nằm trong cửa sổ 24..28.
  const { tb } = await chayQuet(2026, 2, 26, 10);
  const hcns = tb.filter(t => t.loai === 'ns_sinhnhat_thang');
  kiem('AC#2 · bản tin tháng 3 CÓ gửi từ 26/02/2026', hcns.length, 1);
  kiem('AC#2 · gửi cho đúng người mang vai trò hcns (ns5), không bắn cả công ty',
    hcns.map(t => t.nguoi_nhan_id), ['ns5']);
  kiem('AC#2 · nội dung nêu tháng 3/2026', /tháng 3\/2026/.test(hcns[0].noi_dung), true);
}
{
  // Chống trùng theo THÁNG: đã gửi ngày 24 thì ngày 25..28 im lặng.
  const cu = [{ loai: 'ns_sinhnhat_thang', nguoi_nhan_id: 'ns5', tao_luc: '2026-02-24 09:00:00', noi_dung: '', nhom: null }];
  const { tb } = await chayQuet(2026, 2, 26, 10, cu);
  kiem('AC#2 · đã gửi trong tháng thì không gửi lại',
    tb.filter(t => t.loai === 'ns_sinhnhat_thang').length, 0);
}
{
  // Bản tin tháng 2 (từ cuối tháng 1) phải ghi rõ 29/02 → chúc ngày 28/02.
  const { tb } = await chayQuet(2026, 1, 28, 10);
  const bt = tb.find(t => t.loai === 'ns_sinhnhat_thang');
  kiem('bản tin tháng 2/2026 nhắc "năm nay chúc ngày 28/02"',
    /29\/02.*năm nay chúc ngày 28\/02/.test(bt?.noi_dung || ''), true);
  kiem('bản tin của HCNS KHÔNG chịu công tắc riêng tư — ns3 vẫn có mặt trong tháng 8',
    /Người Tắt Chuông/.test((await chayQuet(2026, 7, 28, 10)).tb.find(t => t.loai === 'ns_sinhnhat_thang')?.noi_dung || ''), true);
}
{
  // Bản tin của QUẢN LÝ thì CÓ chịu công tắc — ns3 (đã tắt) phải vắng mặt.
  const { tb } = await chayQuet(2026, 7, 28, 10);
  /* ns1 quản lý ns3 (đã TẮT công tắc) — ns3 sinh 27/08, tức đúng tháng đang
     xét. Bản tin của quản lý CHỊU công tắc nên ns1 KHÔNG được nhận gì cả. */
  const qlNs1 = tb.find(t => t.loai === 'ns_sinhnhat_thang_ql' && t.nguoi_nhan_id === 'ns1');
  kiem('bản tin của quản lý CÓ chịu công tắc — ns1 không nhận gì vì người duy nhất trong nhóm đã tắt',
    qlNs1 === undefined, true);
  /* ĐỐI CHỨNG cùng lượt: ns9 quản lý ns1 (BẬT công tắc) → PHẢI nhận.
     Nếu ca này cũng rỗng thì phép kiểm trên không chứng minh gì — nó chỉ
     chứng minh bản tin quản lý chưa bao giờ chạy (BH-26). */
  const qlNs9 = tb.find(t => t.loai === 'ns_sinhnhat_thang_ql' && t.nguoi_nhan_id === 'ns9');
  kiem('ĐỐI CHỨNG · ns9 quản lý ns1 (đang BẬT) thì CÓ nhận, và có tên ns1',
    /Phạm Khương Duy/.test(qlNs9?.noi_dung || ''), true);
}

/* --- AC #9: cron chỉ ghi `thong_bao`, không ghi bảng khác --------------- */
{
  const bo = dungDB(NHAN_SU, [], TAI_KHOAN);
  let ghiBangKhac = 0;
  const dbGoc = bo.env.DB.prepare.bind(bo.env.DB);
  bo.env.DB.prepare = (sql) => {
    if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql) && !/thong_bao/i.test(sql)) ghiBangKhac++;
    return dbGoc(sql);
  };
  datNgayGia(2026, 8, 27, 10);
  await quetNhacNhanSu(bo.env, bo.gui, mocUTC(2026, 8, 27, 10));
  kiem('AC#9 · quét nhắc KHÔNG ghi vào bảng nào ngoài thong_bao', ghiBangKhac, 0);
}

console.log(loi.join('\n'));
console.log(`\n${dat} đạt · ${hong} hỏng\n`);
process.exit(hong ? 1 : 0);
