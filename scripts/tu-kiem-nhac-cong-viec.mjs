/* ==========================================================================
   BÀN THỬ NGOẠI TUYẾN — SPEC-0004 (Trạm Mục Tiêu chủ động nhắc việc)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-nhac-cong-viec.mjs
   0 phút GitHub Actions, 0 token, không chạm D1, không chạm mạng (BH-25).

   Kiểm HAI tầng:
   ① Hàm THUẦN (đồng hồ giả) — lịch nhắc 1-3-7, leo cấp, cửa giờ, gộp tin.
   ② Luồng quét THẬT trên D1 GIẢ — bắt được cả phần WHERE và phần chống trùng
     mà đọc code không thấy (BH-34).

   MỖI tính chất đều có CA ĐỐI CHỨNG CỐ Ý SAI (BH-16/BH-26): ca mà ta biết
   TRƯỚC là nó PHẢI hỏng, và nói được vì sao kết quả BẮT BUỘC phải khác. Bàn
   thử TỰ BÁO HỎNG khi gặp câu SQL lạ — im lặng trả rỗng thì mọi phép kiểm đều
   ra "0 tin" và đều ✅ giả (BH-17).
   ========================================================================== */

import {
  soNgayGiua, congNgay, canNhacQuaHan, canLeoCap, canNhacDongMoi,
  canNhacDongChoDuyet, chonDuyetCap1, soanBanTin, quetNhacCongViec,
  TRAN_TIN_MOI_LUOT
} from '../src/nhac-cong-viec.js';

let dat = 0, hong = 0;
const loi = [];
function kiem(ten, thuc, mong) {
  const a = JSON.stringify(thuc), b = JSON.stringify(mong);
  if (a === b) { dat++; return true; }
  hong++; loi.push(`  ✗ ${ten}\n      được : ${a}\n      cần   : ${b}`);
  return false;
}

console.log('\n=== ① HÀM THUẦN ===\n');

/* --- Đếm ngày --------------------------------------------------------- */
kiem('29/08 → 31/08 là 2 ngày', soNgayGiua('2026-08-29', '2026-08-31'), 2);
kiem('vắt tháng: 31/08 → 02/09 là 2 ngày', soNgayGiua('2026-08-31', '2026-09-02'), 2);
kiem('vắt năm: 31/12/2026 → 01/01/2027 là 1 ngày', soNgayGiua('2026-12-31', '2027-01-01'), 1);
kiem('hạn chót rỗng → null, KHÔNG văng lỗi', soNgayGiua('', '2026-08-31'), null);
kiem('hạn chót rác → null', soNgayGiua('hôm nọ', '2026-08-31'), null);
kiem('congNgay lùi 7', congNgay('2026-09-01', -7), '2026-08-25');

/* --- CHỐNG LÀM PHIỀN #3: nhắc thưa dần rồi DỪNG HẲN -------------------- */
{
  const co = [];
  for (let n = 1; n <= 12; n++) if (canNhacQuaHan(n)) co.push(n);
  kiem('quá hạn CHỈ nhắc ngày 1, 3, 7 rồi thôi', co, [1, 3, 7]);
  kiem('ngày 2 KHÔNG nhắc', canNhacQuaHan(2), false);
  kiem('ngày 4 KHÔNG nhắc', canNhacQuaHan(4), false);
  kiem('ngày 8 trở đi người làm HẾT bị nhắc', [8, 9, 20].some(canNhacQuaHan), false);
}
/* ĐỐI CHỨNG · bản "nhắc mỗi ngày cho tới khi xong". Vì sao BẮT BUỘC khác: nó
   trả true cho ĐÚNG những ngày bản thật trả false (2,4,5,6…), và không bao giờ
   dừng. Cùng một người trễ 30 ngày: bản thật 3 tin, bản này 30 tin — nhân 10
   lần lượng tin, đúng ngưỡng khiến người ta tắt chuông. */
{
  const nhacMoiNgay = (n) => n >= 1;
  let that = 0, sai = 0;
  for (let n = 1; n <= 30; n++) { if (canNhacQuaHan(n)) that++; if (nhacMoiNgay(n)) sai++; }
  kiem('ĐỐI CHỨNG · trễ 30 ngày: bản thật 3 tin, bản "nhắc mỗi ngày" 30 tin', [that, sai], [3, 30]);
}

/* --- Leo cấp: từ ngày 8, rồi mỗi 7 ngày -------------------------------- */
{
  const co = [];
  for (let n = 1; n <= 30; n++) if (canLeoCap(n)) co.push(n);
  kiem('leo cấp ở ngày 8, 15, 22, 29 — KHÔNG phải mỗi ngày', co, [8, 15, 22, 29]);
  kiem('ngày 7 CHƯA leo cấp (mới là "quá hạn", chưa "> 7 ngày")', canLeoCap(7), false);
}

/* --- Đọng ở "Mới" (3 rồi mỗi 7) và "Chờ duyệt" (2 rồi mỗi 3) ----------- */
{
  const moi = [], cd = [];
  for (let n = 0; n <= 14; n++) { if (canNhacDongMoi(n)) moi.push(n); if (canNhacDongChoDuyet(n)) cd.push(n); }
  kiem('đọng "Mới": ngày 3, 10 — dưới 3 ngày là bình thường', moi, [3, 10]);
  /* "Chờ duyệt" 2 ngày là NGƯỠNG NGẮN NHẤT trong cả bảng, CỐ Ý: nhân viên đã
     làm xong và đang bị treo vô cớ. Người duyệt phải bị nhắc gắt nhất. */
  kiem('đọng "Chờ duyệt": ngày 2, 5, 8, 11, 14 — gắt nhất bảng', cd, [2, 5, 8, 11, 14]);
  kiem('ĐỐI CHỨNG · nếu để ngưỡng "Chờ duyệt" bằng ngưỡng "Mới" (3 ngày) thì ngày 2 lọt lưới',
    [canNhacDongChoDuyet(2), canNhacDongMoi(2)], [true, false]);
}

/* --- CHỐNG LÀM PHIỀN #1 + #2: GỘP, và IM LẶNG khi không có gì ---------- */
{
  const namViec = {
    qua_han: [
      { tieu_de: 'Kiểm kê hàng khô Q3', tre: 3 }, { tieu_de: 'Gửi báo giá NCC', tre: 1 },
      { tieu_de: 'Rà hạn sử dụng hạt điều', tre: 3 }, { tieu_de: 'Đối soát TikTok T8', tre: 7 },
      { tieu_de: 'Chốt tồn kho tuần', tre: 1 }
    ]
  };
  const tin = soanBanTin(namViec);
  kiem('5 việc trễ → ĐÚNG MỘT tin', typeof tin, 'string');
  kiem('…và tin đó liệt kê đủ cả 5 việc',
    namViec.qua_han.every(v => tin.includes(v.tieu_de)), true);
  kiem('…chỉ có MỘT dòng tiêu đề "Việc của bạn hôm nay"',
    (tin.match(/Việc của bạn hôm nay/g) || []).length, 1);

  /* CHỐNG LÀM PHIỀN #2 — im lặng tuyệt đối. Tin "hôm nay bạn không có việc
     trễ" chính là loại tin làm người ta tắt chuông. */
  kiem('không có gì bất thường → KHÔNG soạn tin nào (null)',
    soanBanTin({ qua_han: [], den_han_hom_nay: [], chua_bat_dau: [], cho_toi_duyet: [] }), null);
  kiem('…và tuyệt đối không có chữ "không có việc" nào được sinh ra',
    /không có việc|🎉/.test(tin), false);
}
/* ĐỐI CHỨNG · bản "mỗi việc một tin". Vì sao BẮT BUỘC khác: cùng bộ 5 việc,
   nó ra 5 tin. Theo lịch 1-3-7 thì một người hay trễ nhận ≈45 tin/tháng thay
   vì ≈15 — chênh BA LẦN, đúng ngưỡng bị tắt chuông. */
{
  const moiViecMotTin = (g) => g.qua_han.map(v => `Việc "${v.tieu_de}" đã quá hạn`);
  kiem('ĐỐI CHỨNG · bản "mỗi việc một tin" ra 5 tin cho cùng 5 việc',
    moiViecMotTin({ qua_han: new Array(5).fill(0).map((_, i) => ({ tieu_de: 'V' + i })) }).length, 5);
}

/* --- Quản lý cấp 1 (chữ ký SPEC-0002) ---------------------------------- */
{
  const banDo = new Map([
    ['nv', { id: 'nv', bo_phan: 'Kho', quan_ly_id: 'duy', dang_lam: 1 }],
    ['duy', { id: 'duy', bo_phan: 'Kho', quan_ly_id: 'ngoc', dang_lam: 1 }],
    ['nghi', { id: 'nghi', bo_phan: 'Kho', quan_ly_id: null, dang_lam: 0 }],
    ['mo_coi', { id: 'mo_coi', bo_phan: 'Kho', quan_ly_id: 'nghi', dang_lam: 1 }],
    ['la', { id: 'la', bo_phan: 'Phòng Lạ', quan_ly_id: null, dang_lam: 1 }],
    ['tu_ql', { id: 'tu_ql', bo_phan: 'Kho', quan_ly_id: 'tu_ql', dang_lam: 1 }],
    ['ngoc', { id: 'ngoc', bo_phan: 'BGĐ', quan_ly_id: null, dang_lam: 1 }]
  ]);
  const tp = new Map([['Kho', 'duy']]);
  kiem('quan_ly_id có thì lấy quan_ly_id', chonDuyetCap1(banDo.get('nv'), banDo, tp), { id: 'duy', nguon: 'QUAN_LY_ID' });
  kiem('quản lý đã NGHỈ → rơi xuống trưởng phòng', chonDuyetCap1(banDo.get('mo_coi'), banDo, tp), { id: 'duy', nguon: 'TRUONG_PHONG_ID' });
  kiem('không quản lý, phòng không trưởng phòng → KHONG_CO_QUAN_LY (rồi lên Sếp, KHÔNG nuốt im lặng)',
    chonDuyetCap1(banDo.get('la'), banDo, tp), { id: null, nguon: 'KHONG_CO_QUAN_LY' });
  kiem('tự quản lý mình → KHÔNG tự nhắc mình về việc mình',
    chonDuyetCap1(banDo.get('tu_ql'), banDo, tp).id, 'duy');
  kiem('anh Duy (QL kho) leo lên Sếp Ngọc — đúng kênh Kho → Duy → Ngọc',
    chonDuyetCap1(banDo.get('duy'), banDo, tp).id, 'ngoc');
}

/* ==========================================================================
   ② LUỒNG QUÉT THẬT trên D1 GIẢ
   ========================================================================== */

console.log('\n=== ② LUỒNG QUÉT THẬT (D1 giả) ===\n');

function dungDB({ viec = [], nhanSu = [], taiKhoan = [], phongBan = [], thongBaoCu = [] }) {
  const thongBao = [...thongBaoCu];
  const cauLa = [];
  const ghiBangKhac = [];
  let NGAY_GIA = '';

  const db = {
    prepare(sql) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (/^(INSERT|UPDATE|DELETE)/i.test(s) && !/thong_bao/i.test(s)) ghiBangKhac.push(s);
      let tham = [];
      const api = {
        bind(...a) { tham = a; return api; },
        async first() { cauLa.push(s); return null; },
        async all() {
          if (s.includes('FROM cong_viec c') && s.includes("trang_thai IN ('moi','dang_lam','cho_duyet')")) {
            return { results: viec.filter(v => ['moi', 'dang_lam', 'cho_duyet'].includes(v.trang_thai)) };
          }
          if (s.startsWith('SELECT id, ho_ten, bo_phan, quan_ly_id, dang_lam FROM nhan_su')) {
            return { results: nhanSu };
          }
          if (s.includes('FROM phong_ban')) return { results: phongBan };
          if (s.includes('FROM tai_khoan WHERE nhac_viec_tat = 1')) {
            return { results: taiKhoan.filter(t => t.nhac_viec_tat === 1) };
          }
          if (s.includes('FROM tai_khoan t JOIN nhan_su n')) {
            return { results: taiKhoan.filter(t => t.kich_hoat !== 0
              && ['admin', 'admin_backup'].includes(t.vai_tro)
              && nhanSu.some(n => n.id === t.nhan_su_id && n.dang_lam === 1)) };
          }
          if (s.includes('FROM thong_bao') && s.includes("loai IN ('cv_ban_tin'")) {
            const [ngay] = tham;
            return { results: thongBao.filter(t => t.tao_luc.slice(0, 10) === ngay
              && ['cv_ban_tin', 'cv_leo_cap', 'cv_ban_tin_tuan'].includes(t.loai)) };
          }
          // Bản tin tuần ① — việc hoàn thành ĐÚNG HẠN, chấm bằng `nop_luc`.
          if (s.includes("trang_thai = 'hoan_thanh'") && s.includes('nop_luc IS NOT NULL')) {
            const [tuNgay] = tham;
            return { results: viec.filter(v => v.trang_thai === 'hoan_thanh' && v.nop_luc
              && String(v.cap_nhat_luc || '').slice(0, 10) >= tuNgay
              && String(v.nop_luc).slice(0, 10) <= v.han_chot) };
          }
          // Bản tin tuần ② — việc đang đọng.
          if (s.includes("trang_thai IN ('moi','dang_lam','cho_duyet')") && s.includes('han_chot <')) {
            const [homNay] = tham;
            return { results: viec.filter(v => ['moi', 'dang_lam', 'cho_duyet'].includes(v.trang_thai)
              && ((v.han_chot && v.han_chot < homNay) || v.trang_thai === 'cho_duyet')) };
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
  const telegram = [];
  const guiTelegram = async (_env, text) => { telegram.push(text); return true; };
  return { db, gui, guiTelegram, thongBao, telegram, cauLa, ghiBangKhac, datNgay: (v) => { NGAY_GIA = v; } };
}

/* Đồng hồ giả đi qua THAM SỐ `luc`, KHÔNG qua việc ghi đè `Date.now`:
   `new Date()` đọc thẳng đồng hồ máy chứ không gọi `Date.now` (BH-17). */
function mocUTC(y, m, d, gio) {
  return new Date(Date.UTC(y, m - 1, d, gio, 0, 0) - 7 * 3600 * 1000);
}

const NHAN_SU = [
  { id: 'huyen', ho_ten: 'Nguyễn Thị Huyền', bo_phan: 'Vận hành', quan_ly_id: 'ngoc', dang_lam: 1 },
  { id: 'nvkho', ho_ten: 'NV Kho A', bo_phan: 'Kho', quan_ly_id: 'duy', dang_lam: 1 },
  { id: 'duy', ho_ten: 'Phạm Khương Duy', bo_phan: 'Kho', quan_ly_id: 'ngoc', dang_lam: 1 },
  { id: 'hang', ho_ten: 'Phan Thị Hằng', bo_phan: 'Kế toán', quan_ly_id: 'ngoc', dang_lam: 1 },
  { id: 'nghi', ho_ten: 'Người Đã Nghỉ', bo_phan: 'Kho', quan_ly_id: 'duy', dang_lam: 0 },
  { id: 'ngoc', ho_ten: 'Bùi Thị Ngọc', bo_phan: 'BGĐ', quan_ly_id: null, dang_lam: 1 }
];
const TAI_KHOAN = [
  { nhan_su_id: 'ngoc', vai_tro: 'admin', kich_hoat: 1, nhac_viec_tat: 0 },
  { nhan_su_id: 'duy', vai_tro: 'quan_ly', kich_hoat: 1, nhac_viec_tat: 0 },
  { nhan_su_id: 'huyen', vai_tro: 'nhan_vien', kich_hoat: 1, nhac_viec_tat: 0 }
];

let idViec = 0;
function viec(o) {
  return { id: ++idViec, tieu_de: o.tieu_de || 'Việc ' + idViec, trang_thai: 'dang_lam',
    han_chot: null, tao_luc: '2026-08-01 09:00:00', nop_luc: null, cap_nhat_luc: null,
    nguoi_giao_id: 'ngoc', nguoi_giao_ten: 'Bùi Thị Ngọc',
    nguoi_nhan_id: 'huyen', nguoi_nhan_ten: 'Nguyễn Thị Huyền', ...o };
}

async function chay(y, m, d, gio, boDl, env = {}) {
  const bo = dungDB(boDl);
  bo.datNgay(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(gio).padStart(2, '0')}:00:00`);
  const soCu = bo.thongBao.length;
  const e = { DB: bo.db, NHAC_VIEC_BAT_DAU_TU: '2026-08-01', ...env };
  const kq = await quetNhacCongViec(e, bo.gui, bo.guiTelegram, mocUTC(y, m, d, gio));
  return { kq, tb: bo.thongBao.slice(soCu), bo };
}

/* --- AC #2: 5 việc trễ của MỘT người → ĐÚNG 1 tin ----------------------- */
{
  // 31/08/2026 là thứ HAI. Cả 5 việc đều trễ đúng 1 ngày (mốc nhắc hợp lệ).
  const ds = [1, 2, 3, 4, 5].map(i => viec({ tieu_de: 'Việc trễ ' + i, han_chot: '2026-08-30' }));
  const { tb, bo } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('bàn thử không gặp câu SQL lạ', bo.cauLa, []);
  const cuaHuyen = tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'huyen');
  kiem('AC#2 · 5 việc trễ → ĐÚNG 1 tin cho người nhận', cuaHuyen.length, 1);
  kiem('AC#2 · và tin đó liệt kê đủ cả 5 việc',
    ds.every(v => cuaHuyen[0].noi_dung.includes(v.tieu_de)), true);
  kiem('AC#2 đối chứng · nếu bắn mỗi việc một tin thì phải là 5 — bàn thử đủ nhạy để phân biệt',
    [cuaHuyen.length, ds.length], [1, 5]);
  // Người GIAO (Sếp Ngọc) cũng được nhắc — cũng gộp thành đúng 1 tin.
  kiem('AC#2 · người giao nhận đúng 1 tin, không phải 5',
    tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'ngoc').length, 1);
}

/* --- AC #1: cron chạy 12 lượt/giờ → vẫn ĐÚNG 1 tin --------------------- */
{
  const ds = [viec({ han_chot: '2026-08-30' })];
  const cu = [];
  const so = [];
  for (let i = 0; i < 12; i++) {
    const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN, thongBaoCu: cu });
    cu.push(...tb); so.push(tb.length);
  }
  kiem('AC#1 · lượt 1 gửi 2 tin (người nhận + người giao), 11 lượt sau IM LẶNG',
    so, [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
}

/* --- AC #3 + #4: ngày 2 và 4 KHÔNG nhắc; ngày 1, 3, 7 có -------------- */
{
  const bang = [];
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const han = congNgay('2026-08-31', -n);
    const { tb } = await chay(2026, 8, 31, 10, { viec: [viec({ han_chot: han })], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
    bang.push(tb.some(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'huyen') ? n : 0);
  }
  kiem('AC#4 · trễ 1,3,7 thì CÓ tin — trễ 2,4,5,6,8 thì KHÔNG', bang, [1, 0, 3, 0, 0, 0, 7, 0]);
  kiem('AC#3 · người không có việc bất thường nhận 0 tin (đếm bằng COUNT, không bằng mắt)',
    (await chay(2026, 8, 31, 10, { viec: [viec({ han_chot: '2026-12-31' })], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN })).tb.length, 0);
}

/* --- AC #6: Chủ nhật / ngoài giờ · ĐỐI CHỨNG thứ Bảy VẪN gửi ----------- */
{
  const ds = [viec({ han_chot: '2026-08-29' })];   // trễ 1 ngày tính từ 30/08
  const cn = await chay(2026, 8, 30, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#6 · Chủ nhật 30/08 → 0 tin', [cn.kq.bo_qua, cn.tb.length], ['chu_nhat', 0]);
  const toi = await chay(2026, 8, 31, 19, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#6 · 19h → 0 tin', [toi.kq.bo_qua, toi.tb.length], ['ngoai_khung_gio', 0]);
  /* ĐỐI CHỨNG BẮT BUỘC (BH-26): thứ Bảy PHẢI gửi. Không có ca này thì phép
     kiểm Chủ nhật ở trên không chứng minh gì — nó chỉ chứng minh hàm chưa bao
     giờ gửi được tin nào. ADR-0013: thứ Bảy kho vận VẪN làm. */
  const bay = await chay(2026, 8, 29, 10, { viec: [viec({ han_chot: '2026-08-28' })], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#6 ĐỐI CHỨNG · thứ Bảy 29/08 CÓ gửi (ADR-0013)',
    [bay.kq.bo_qua, bay.tb.filter(t => t.nguoi_nhan_id === 'huyen').length], [null, 1]);
}

/* --- AC #5: việc "Chờ duyệt" nhắc NGƯỜI GIAO, KHÔNG nhắc nhân viên ----- */
{
  const ds = [viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-29 16:00:00', han_chot: '2026-08-29' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#5 · người GIAO (Sếp Ngọc) nhận tin "chờ BẠN duyệt"',
    tb.filter(t => t.nguoi_nhan_id === 'ngoc' && /chờ BẠN duyệt/.test(t.noi_dung)).length, 1);
  /* Nhân viên đã làm xong phần của mình và KHÔNG có nút nào để bấm — nhắc họ
     về việc ngoài tầm tay vừa vô ích vừa gây ức chế. */
  kiem('AC#5 · nhân viên KHÔNG nhận tin nào về việc đó',
    tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 0);
}

/* --- Việc ĐÃ NỘP mà quá hạn: KHÔNG được đổ lỗi lên người nộp ----------
   Lỗi này KHÔNG bắt được bằng đọc code — chỉ lộ ra khi đăng nhập bằng đúng
   vai trò yếu nhất rồi nhìn màn hình thật (BH-39): nhân viên đã nộp bài từ
   4 ngày trước vẫn thấy dòng đỏ "trễ 2 ngày" của chính mình. */
{
  const ds = [viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-27 16:00:00', han_chot: '2026-08-30' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('việc ĐÃ NỘP mà quá hạn → người nộp nhận 0 tin (họ không có nút nào để bấm)',
    tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 0);
  kiem('…và tin của người GIAO nói "chờ BẠN duyệt", KHÔNG nói người nhận trễ',
    tb.filter(t => t.nguoi_nhan_id === 'ngoc').every(t => /chờ BẠN duyệt/.test(t.noi_dung) && !/bạn giao đang quá hạn/.test(t.noi_dung)), true);
  // Việc đã nộp cũng không leo cấp lên quản lý dù trễ 20 ngày — người nhận
  // không còn gì để làm, réo quản lý về họ là réo nhầm hướng.
  const cu = [viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-20 16:00:00', han_chot: '2026-08-23' })];
  kiem('việc đã nộp, quá hạn 8 ngày → 0 tin leo cấp về người nộp',
    (await chay(2026, 8, 31, 10, { viec: cu, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }))
      .tb.filter(t => t.loai === 'cv_leo_cap').length, 0);
  /* ĐỐI CHỨNG · cùng hạn chót đó nhưng CHƯA nộp (`dang_lam`) → người nhận PHẢI
     nhận tin. Không có ca này thì ba phép kiểm trên chỉ chứng minh hàm chưa
     bao giờ gửi được gì cho ai. */
  kiem('ĐỐI CHỨNG · cùng hạn chót nhưng CHƯA nộp thì người nhận CÓ nhận tin',
    (await chay(2026, 8, 31, 10, { viec: [viec({ trang_thai: 'dang_lam', han_chot: '2026-08-30' })], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }))
      .tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 1);
}

/* --- AC #17: người TỰ TẮT nhắc — nhưng quản lý VẪN nhận leo cấp -------- */
{
  const tkTat = TAI_KHOAN.map(t => t.nhan_su_id === 'huyen' ? { ...t, nhac_viec_tat: 1 } : t);
  /* HAI việc, cố ý: một việc trễ 1 ngày (đáng ra sinh tin cá nhân) và một việc
     trễ 8 ngày (đáng ra sinh leo cấp). Chỉ một việc thì phép kiểm không phân
     biệt được "bị tắt" với "vốn dĩ chẳng có tin nào" (BH-26). */
  const ds = [viec({ han_chot: '2026-08-30' }), viec({ han_chot: '2026-08-23' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: tkTat });
  kiem('AC#17 · người đã tắt nhận 0 tin cá nhân',
    tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'huyen').length, 0);
  /* TẮT NHẮC KHÔNG TẮT TRÁCH NHIỆM — đây là nửa quan trọng của chốt #7. */
  kiem('AC#17 · nhưng quản lý (Sếp Ngọc) VẪN nhận leo cấp về việc đó',
    tb.filter(t => t.loai === 'cv_leo_cap' && t.nguoi_nhan_id === 'ngoc').length, 1);
  /* ĐỐI CHỨNG BẮT BUỘC: cùng bộ dữ liệu đó, người CHƯA tắt PHẢI nhận 1 tin.
     Không có ca này thì phép kiểm trên chỉ chứng minh hàm chưa từng gửi gì. */
  kiem('AC#17 ĐỐI CHỨNG · cùng dữ liệu, người CHƯA tắt nhận đúng 1 tin cá nhân',
    (await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }))
      .tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'huyen').length, 1);
}

/* --- AC #16: nhân sự kho quá hạn 8 ngày → LEO LÊN ANH DUY, không lên Sếp */
{
  const ds = [viec({ nguoi_nhan_id: 'nvkho', nguoi_nhan_ten: 'NV Kho A', nguoi_giao_id: 'duy', nguoi_giao_ten: 'Phạm Khương Duy', han_chot: '2026-08-23' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const leo = tb.filter(t => t.loai === 'cv_leo_cap');
  kiem('AC#16 · leo cấp đúng anh Duy — kênh Kho → Duy → Sếp', leo.map(t => t.nguoi_nhan_id), ['duy']);
  kiem('AC#16 · Sếp KHÔNG nhận tin leo cấp riêng về việc này (chỉ thấy ở bản tin tuần)',
    leo.some(t => t.nguoi_nhan_id === 'ngoc'), false);
}

/* --- AC #15: người nhận ĐÃ NGHỈ → nhắc NGƯỜI GIAO "cần giao lại" ------- */
{
  const ds = [viec({ nguoi_nhan_id: 'nghi', nguoi_nhan_ten: 'Người Đã Nghỉ', han_chot: '2026-08-30' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#15 · người đã nghỉ nhận 0 tin', tb.filter(t => t.nguoi_nhan_id === 'nghi').length, 0);
  kiem('AC#15 · người giao nhận tin "cần giao lại"',
    tb.filter(t => t.nguoi_nhan_id === 'ngoc' && /ĐÃ NGHỈ/.test(t.noi_dung)).length, 1);
}

/* --- AC #18: NGÀY ĐẦU BẬT với dữ liệu cũ → KHÔNG bắn loạt -------------- */
{
  // 12 việc quá hạn sẵn của một người, hạn từ tháng 7 — tức trước ngày bật.
  const ds = new Array(12).fill(0).map((_, i) => viec({ tieu_de: 'Nợ cũ ' + i, han_chot: '2026-07-2' + (i % 9) }));
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN },
    { NHAC_VIEC_BAT_DAU_TU: '2026-08-31' });     // hôm nay là NGÀY BẬT
  kiem('AC#18 · 12 việc quá hạn sẵn → tối đa 1 tin/người, không phải 12',
    tb.filter(t => t.nguoi_nhan_id === 'huyen').length <= 1, true);
  /* Nợ cũ là nợ của CẢ HỆ THỐNG. Bắn hết lên quản lý ngay ngày đầu tạo ra một
     buổi sáng thứ Hai đầy tra hỏi về việc chính người quản lý cũng đã quên —
     cách nhanh nhất để cả công ty ghét tính năng này ngay ngày đầu tiên. */
  kiem('AC#18 · 0 tin leo cấp trong 7 ngày ân xá',
    tb.filter(t => t.loai === 'cv_leo_cap').length, 0);
  const het = await chay(2026, 9, 8, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN },
    { NHAC_VIEC_BAT_DAU_TU: '2026-08-31' });
  kiem('AC#18 ĐỐI CHỨNG · hết ân xá thì leo cấp CHẠY — ân xá là hoãn, không phải xoá',
    het.tb.filter(t => t.loai === 'cv_leo_cap').length > 0, true);
}

/* --- AC #14: TRẦN CỨNG 40 tin/lượt ------------------------------------ */
{
  const nhieuNguoi = [];
  const dsNhieu = [];
  for (let i = 0; i < 60; i++) {
    nhieuNguoi.push({ id: 'n' + i, ho_ten: 'Người ' + i, bo_phan: 'Kho', quan_ly_id: null, dang_lam: 1 });
    dsNhieu.push(viec({ nguoi_nhan_id: 'n' + i, nguoi_nhan_ten: 'Người ' + i, nguoi_giao_id: 'n' + i, nguoi_giao_ten: 'Người ' + i, han_chot: '2026-08-30' }));
  }
  const { tb, bo } = await chay(2026, 8, 31, 10, { viec: dsNhieu, nhanSu: nhieuNguoi, taiKhoan: [] });
  kiem('AC#14 · 60 người cần nhắc → DỪNG đúng ở trần 40, không gửi tin thứ 41', tb.length, TRAN_TIN_MOI_LUOT);
  kiem('AC#14 · và có tin Telegram báo Gạo là NGHI CÓ BUG',
    bo.telegram.some(t => /chạm trần/.test(t)), true);
}

/* --- AC #13: vòng quét KHÔNG GHI vào `cong_viec` ----------------------- */
{
  const ds = [viec({ han_chot: '2026-08-30' }), viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-20 10:00:00' })];
  const truoc = JSON.stringify(ds);
  const { bo } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#13 · KHÔNG một câu INSERT/UPDATE/DELETE nào ngoài `thong_bao`', bo.ghiBangKhac, []);
  kiem('AC#13 · trạng thái công việc trước/sau một lượt cron giống hệt nhau', JSON.stringify(ds), truoc);
}

/* --- AC #7: việc hoàn thành / huỷ KHÔNG BAO GIỜ bị nhắc ---------------- */
{
  const ds = [
    viec({ trang_thai: 'hoan_thanh', han_chot: '2026-08-01' }),
    viec({ trang_thai: 'huy', han_chot: '2026-08-01' })
  ];
  kiem('AC#7 · việc hoàn thành/huỷ → 0 tin',
    (await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN })).tb.length, 0);
}

/* --- AC #9: CA CHỨNG MINH CỘT `nop_luc` ĐÁNG CÓ ----------------------- */
{
  /* Chị Hằng nộp ĐÚNG HẠN ngày 29/08. Sếp bận, 03/09 mới bấm duyệt.
     Chấm bằng `nop_luc` → ĐÚNG HẠN. Chấm bằng `cap_nhat_luc` → "trễ 5 ngày".
     Đây là lỗi RẤT DỄ MẮC vì `cap_nhat_luc` có sẵn và trông có vẻ dùng được. */
  const v = viec({
    tieu_de: 'Chốt sổ quỹ tháng 8', trang_thai: 'hoan_thanh',
    nguoi_nhan_id: 'hang', nguoi_nhan_ten: 'Phan Thị Hằng',
    han_chot: '2026-08-29', nop_luc: '2026-08-29 16:02:00', cap_nhat_luc: '2026-09-03 11:00:00'
  });
  // Thứ Hai 07/09/2026, 8h → bản tin tuần.
  const { bo } = await chay(2026, 9, 7, 8, { viec: [v], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const bt = bo.telegram.find(t => /TRẠM MỤC TIÊU/.test(t)) || '';
  kiem('AC#9 · nộp đúng hạn 29/08, duyệt muộn 03/09 → VẪN tính ĐÚNG HẠN cho người nộp',
    /Làm xong đúng hạn: 1 việc/.test(bt), true);
  kiem('AC#9 · và tên chị Hằng nằm ở phần KHEN', /Nổi bật: Phan Thị Hằng/.test(bt), true);
  /* ĐỐI CHỨNG · bản chấm bằng `cap_nhat_luc`. Vì sao BẮT BUỘC khác: cùng bản
     ghi đó, `cap_nhat_luc` (03/09) > `han_chot` (29/08) → bị xếp là TRỄ 5
     NGÀY. Ghi nhận sai người, đổ lỗi sai người. */
  kiem('ĐỐI CHỨNG · chấm bằng cap_nhat_luc thì chính việc này thành "trễ 5 ngày"',
    [String(v.cap_nhat_luc).slice(0, 10) <= v.han_chot, String(v.nop_luc).slice(0, 10) <= v.han_chot],
    [false, true]);
  kiem('AC#9 · phần KHEN đứng TRƯỚC phần chê trong bản tin',
    bt.indexOf('Làm xong đúng hạn') < bt.indexOf('Đang đọng'), true);
}

/* --- AC #10: việc cũ `nop_luc IS NULL` — không khen, cũng KHÔNG chê ---- */
{
  const v = viec({ trang_thai: 'hoan_thanh', han_chot: '2026-08-29', nop_luc: null, cap_nhat_luc: '2026-09-03 11:00:00' });
  const { bo } = await chay(2026, 9, 7, 8, { viec: [v], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const bt = bo.telegram.find(t => /TRẠM MỤC TIÊU/.test(t)) || '';
  kiem('AC#10 · việc cũ không có nop_luc → KHÔNG vào bảng ghi nhận (không có dữ liệu thì không phán)',
    /Làm xong đúng hạn: 0 việc/.test(bt), true);
  kiem('AC#10 · và cũng KHÔNG bị đánh dấu trễ', /trễ/.test(bt), false);
}

/* --- Rollback tức thì: cờ tắt ----------------------------------------- */
{
  const ds = [viec({ han_chot: '2026-08-30' })];
  const { kq, tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, { NHAC_VIEC_TAT: '1' });
  kiem('ROLLBACK · NHAC_VIEC_TAT=1 → câm ngay, 0 tin, không cần deploy', [kq.bo_qua, tb.length], ['tat_bang_co', 0]);
}

/* --- PILOT theo phòng ban (Rollout Đợt 2) ----------------------------- */
{
  const ds = [
    viec({ han_chot: '2026-08-30' }),                                                     // Huyền — Vận hành
    viec({ nguoi_nhan_id: 'nvkho', nguoi_nhan_ten: 'NV Kho A', han_chot: '2026-08-30' })  // Kho
  ];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, { NHAC_VIEC_BO_PHAN: 'Kho' });
  kiem('PILOT · chỉ phòng Kho được nhắc, phòng khác im',
    tb.filter(t => t.loai === 'cv_ban_tin').map(t => t.nguoi_nhan_id).sort(), ['ngoc', 'nvkho']);
}

console.log(loi.join('\n'));
console.log(`\n${dat} đạt · ${hong} hỏng\n`);
process.exit(hong ? 1 : 0);
