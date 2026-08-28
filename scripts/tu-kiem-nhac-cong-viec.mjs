/* ==========================================================================
   BÀN THỬ NGOẠI TUYẾN — SPEC-0004 (Trạm Mục Tiêu chủ động nhắc việc)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/tu-kiem-nhac-cong-viec.mjs
   0 phút GitHub Actions, 0 token, không chạm mạng, không chạm D1 thật (BH-25).

   Kiểm HAI tầng:
   ① Hàm THUẦN (đồng hồ giả) — lịch nhắc 1-3-7, leo cấp, cửa giờ, gộp tin.
   ② Luồng quét THẬT trên **D1 THẬT** (SQLite trong bộ nhớ, nạp `schema.sql` +
     toàn bộ `migrations/`), gọi qua `worker.scheduled()` thật.

   ⚠️ TẦNG ② TRƯỚC ĐÂY CHẠY TRÊN "D1 GIẢ" KHỚP CHUỖI SQL BẰNG TAY — và cả 8
   lỗi của REV-0019 đều lọt qua 67 phép kiểm ở đây. Đó là BH-34 bằng xương
   bằng thịt: bàn thử không chạy câu SQL nào thì không bao giờ bắt được lỗi
   nằm trong `WHERE`. Đã thay bằng DB thật (`scripts/ban-thu-d1.mjs`).
   Ca đo TRƯỚC/SAU của 8 lỗi REV-0019 nằm ở `scripts/do-va-rev0019.mjs`;
   ngưỡng chạm tay 44px ở `scripts/do-nut-44px.mjs`.

   MỖI tính chất đều có CA ĐỐI CHỨNG CỐ Ý SAI (BH-16/BH-26): ca mà ta biết
   TRƯỚC là nó PHẢI hỏng, và nói được vì sao kết quả BẮT BUỘC phải khác.
   ========================================================================== */

import {
  soNgayGiua, congNgay, canNhacQuaHan, canLeoCap, canNhacDongMoi,
  canNhacDongChoDuyet, chonDuyetCap1, soanBanTin, laTatKhan,
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
   ② LUỒNG QUÉT THẬT — trên D1 THẬT (node:sqlite), qua worker.scheduled() THẬT
   ---------------------------------------------------------------------------
   TRƯỚC ĐÂY tầng này chạy trên "D1 giả": một đối tượng khớp CHUỖI SQL bằng
   tay rồi trả về mảng dựng sẵn. Hồ Ly chỉ ra trong REV-0019 rằng bàn thử kiểu
   đó KHÔNG bắt được lỗi nằm trong mệnh đề `WHERE` (BH-34) — nó chỉ kiểm tra
   câu SQL có đúng hình dạng mình đoán không, chứ chưa từng chạy câu nào. Bằng
   chứng sống: cả 8 lỗi REV-0019 đều lọt qua 67 phép kiểm ở đây.
   GIỜ: `schema.sql` + toàn bộ `migrations/` nạp vào SQLite thật, mọi câu SQL
   của mã sản phẩm chạy thật, và lượt quét đi qua `worker.scheduled()` thật.
   ========================================================================== */

/* --- REV-0019 L4: nút cứu hoả nhận nhiều cách viết --------------------- */
for (const v of ['1', 'true', 'TRUE', ' yes ', 'on', 'bat', 'tắt', 'taat'])
  kiem(`nút tắt khẩn "${v}" → TẮT`, laTatKhan(v).tat, true);
for (const v of ['', '0', 'false', 'no', 'off', 'khong', undefined])
  kiem(`"${v}" → KHÔNG tắt (không được tắt nhầm)`, laTatKhan(v).tat, false);
kiem('gõ lạ thì vẫn tắt NHƯNG có cảnh báo ra log', laTatKhan('taat').la, 'taat');

console.log('\n=== ② LUỒNG QUÉT THẬT (D1 thật trên node:sqlite) ===\n');

const { dungDB, dungEnv, datDongHo, goiCron, TELEGRAM } =
  await import('./ban-thu-d1.mjs');
const worker = (await import('../src/index.js')).default;

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
  { nhan_su_id: 'duy', vai_tro: 'quan_ly_kho', kich_hoat: 1, nhac_viec_tat: 0 },
  { nhan_su_id: 'huyen', vai_tro: 'van_hanh_san', kich_hoat: 1, nhac_viec_tat: 0 }
];

let idViec = 0;
function viec(o) {
  return { tieu_de: o.tieu_de || 'Việc ' + (++idViec), trang_thai: 'dang_lam',
    han_chot: null, tao_luc: '2026-08-01 09:00:00', nop_luc: null, cap_nhat_luc: null,
    nguoi_giao_id: 'ngoc', nguoi_giao_ten: 'Bùi Thị Ngọc',
    nguoi_nhan_id: 'huyen', nguoi_nhan_ten: 'Nguyễn Thị Huyền', ...o };
}

/** Mốc UTC ứng với `gio` giờ VIỆT NAM ngày y-m-d. */
function mocUTC(y, m, d, gio) {
  return new Date(Date.UTC(y, m - 1, d, gio, 0, 0) - 7 * 3600 * 1000);
}

/** Dựng DB thật + nạp dữ liệu + chạy MỘT lượt cron thật.
 *  `giuDB` để chạy nhiều lượt liên tiếp trên CÙNG một DB (ca chống trùng). */
async function chay(y, m, d, gio, boDl, env = {}, giuDB = null) {
  let db, d1;
  if (giuDB) ({ db, d1 } = giuDB);
  else {
    ({ db, d1 } = dungDB());
    for (const n of boDl.nhanSu || []) {
      db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam)
                  VALUES (?, ?, ?, 'NV', ?, ?, ?)`)
        .run(n.id, n.ho_ten, n.id, n.bo_phan, n.quan_ly_id, n.dang_lam);
    }
    for (const t of boDl.taiKhoan || []) {
      db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, nhac_viec_tat)
                  VALUES (?, ?, 'x', ?, ?, ?)`)
        .run(t.nhan_su_id, t.nhan_su_id, t.vai_tro, t.kich_hoat, t.nhac_viec_tat || 0);
    }
    for (const v of boDl.viec || []) {
      db.prepare(`INSERT INTO cong_viec (tieu_de, dau_ra, nguoi_giao_id, nguoi_giao_ten,
                    nguoi_nhan_id, nguoi_nhan_ten, han_chot, trang_thai, tao_luc, cap_nhat_luc, nop_luc)
                  VALUES (?, 'đầu ra', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(v.tieu_de, v.nguoi_giao_id, v.nguoi_giao_ten, v.nguoi_nhan_id, v.nguoi_nhan_ten,
             v.han_chot, v.trang_thai, v.tao_luc, v.cap_nhat_luc, v.nop_luc);
    }
  }
  const soCu = db.prepare("SELECT COUNT(*) AS n FROM thong_bao").get().n;
  const tgCu = TELEGRAM.length;
  datDongHo(mocUTC(y, m, d, gio).toISOString());
  await goiCron(worker, dungEnv(d1, { NHAC_VIEC_BAT_DAU_TU: '2026-08-01', ...env }));
  const tb = db.prepare('SELECT nhom, noi_dung, loai, nguoi_nhan_id, tao_luc FROM thong_bao ORDER BY id')
    .all().slice(soCu);
  return { tb, telegram: TELEGRAM.slice(tgCu), db, d1 };
}

/* --- AC #2: 5 việc trễ của MỘT người → ĐÚNG 1 tin ----------------------- */
{
  // 31/08/2026 là thứ HAI. Cả 5 việc đều trễ đúng 1 ngày (mốc nhắc hợp lệ).
  const ds = [1, 2, 3, 4, 5].map(i => viec({ tieu_de: 'Việc trễ ' + i, han_chot: '2026-08-30' }));
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const cuaHuyen = tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'huyen');
  kiem('AC#2 · 5 việc trễ → ĐÚNG 1 tin cho người nhận', cuaHuyen.length, 1);
  kiem('AC#2 · và tin đó liệt kê đủ cả 5 việc',
    ds.every(v => cuaHuyen[0].noi_dung.includes(v.tieu_de)), true);
  kiem('AC#2 đối chứng · nếu bắn mỗi việc một tin thì phải là 5 — bàn thử đủ nhạy để phân biệt',
    [cuaHuyen.length, ds.length], [1, 5]);
  kiem('AC#2 · người giao nhận đúng 1 tin, không phải 5',
    tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'ngoc').length, 1);
}

/* --- AC #1: cron chạy 12 lượt/giờ → vẫn ĐÚNG 1 tin --------------------- */
{
  const ds = [viec({ han_chot: '2026-08-30' })];
  let giu = null; const so = [];
  for (let i = 0; i < 12; i++) {
    const r = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, {}, giu);
    giu = { db: r.db, d1: r.d1 }; so.push(r.tb.length);
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
  const ds = [viec({ han_chot: '2026-08-29' })];
  kiem('AC#6 · Chủ nhật 30/08 → 0 tin',
    (await chay(2026, 8, 30, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN })).tb.length, 0);
  kiem('AC#6 · 19h → 0 tin',
    (await chay(2026, 8, 31, 19, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN })).tb.length, 0);
  /* ĐỐI CHỨNG BẮT BUỘC (BH-26): thứ Bảy PHẢI gửi. Không có ca này thì phép
     kiểm Chủ nhật ở trên không chứng minh gì — nó chỉ chứng minh hàm chưa bao
     giờ gửi được tin nào. ADR-0013: thứ Bảy kho vận VẪN làm. */
  const bay = await chay(2026, 8, 29, 10, { viec: [viec({ han_chot: '2026-08-28' })], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#6 ĐỐI CHỨNG · thứ Bảy 29/08 CÓ gửi (ADR-0013)',
    bay.tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 1);
}

/* --- AC #5: việc "Chờ duyệt" nhắc NGƯỜI GIAO, KHÔNG nhắc nhân viên ----- */
{
  const ds = [viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-29 16:00:00', han_chot: '2026-08-29' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('AC#5 · người GIAO (Sếp Ngọc) nhận tin "chờ BẠN duyệt"',
    tb.filter(t => t.nguoi_nhan_id === 'ngoc' && /chờ BẠN duyệt/.test(t.noi_dung)).length, 1);
  kiem('AC#5 · nhân viên KHÔNG nhận tin nào về việc đó',
    tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 0);
}

/* --- Việc ĐÃ NỘP mà quá hạn: KHÔNG được đổ lỗi lên người nộp ----------- */
{
  const ds = [viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-27 16:00:00', han_chot: '2026-08-30' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  kiem('việc ĐÃ NỘP mà quá hạn → người nộp nhận 0 tin (họ không có nút nào để bấm)',
    tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 0);
  kiem('…và tin của người GIAO nói "chờ BẠN duyệt", KHÔNG nói người nhận trễ',
    tb.filter(t => t.nguoi_nhan_id === 'ngoc').every(t => /chờ BẠN duyệt/.test(t.noi_dung) && !/bạn giao đang quá hạn/.test(t.noi_dung)), true);
  const cu = [viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-20 16:00:00', han_chot: '2026-08-23' })];
  kiem('việc đã nộp, quá hạn 8 ngày → 0 tin leo cấp về người nộp',
    (await chay(2026, 8, 31, 10, { viec: cu, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }))
      .tb.filter(t => t.loai === 'cv_leo_cap').length, 0);
  kiem('ĐỐI CHỨNG · cùng hạn chót nhưng CHƯA nộp thì người nhận CÓ nhận tin',
    (await chay(2026, 8, 31, 10, { viec: [viec({ trang_thai: 'dang_lam', han_chot: '2026-08-30' })], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }))
      .tb.filter(t => t.nguoi_nhan_id === 'huyen').length, 1);
}

/* --- AC #17: người TỰ TẮT nhắc — nhưng quản lý VẪN nhận leo cấp -------- */
{
  const tkTat = TAI_KHOAN.map(t => t.nhan_su_id === 'huyen' ? { ...t, nhac_viec_tat: 1 } : t);
  const ds = [viec({ han_chot: '2026-08-30' }), viec({ han_chot: '2026-08-23' })];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: tkTat });
  kiem('AC#17 · người đã tắt nhận 0 tin cá nhân',
    tb.filter(t => t.loai === 'cv_ban_tin' && t.nguoi_nhan_id === 'huyen').length, 0);
  kiem('AC#17 · nhưng quản lý (Sếp Ngọc) VẪN nhận leo cấp về việc đó',
    tb.filter(t => t.loai === 'cv_leo_cap' && t.nguoi_nhan_id === 'ngoc').length, 1);
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
  // 12 việc nợ cũ THẬT: giao từ 15/07, hạn cuối tháng 7 — tức trước ngày bật.
  const ds = new Array(12).fill(0).map((_, i) => viec({
    tieu_de: 'Nợ cũ ' + i, han_chot: '2026-07-2' + (i % 9), tao_luc: '2026-07-15 09:00:00' }));
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN },
    { NHAC_VIEC_BAT_DAU_TU: '2026-08-31' });     // hôm nay là NGÀY BẬT
  kiem('AC#18 · 12 việc quá hạn sẵn → tối đa 1 tin/người, không phải 12',
    tb.filter(t => t.nguoi_nhan_id === 'huyen').length <= 1, true);
  kiem('AC#18 · 0 tin leo cấp trong 7 ngày ân xá',
    tb.filter(t => t.loai === 'cv_leo_cap').length, 0);
  const het = await chay(2026, 9, 8, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN },
    { NHAC_VIEC_BAT_DAU_TU: '2026-08-31' });
  kiem('AC#18 ĐỐI CHỨNG · hết ân xá thì leo cấp CHẠY — ân xá là hoãn, không phải xoá',
    het.tb.filter(t => t.loai === 'cv_leo_cap').length > 0, true);
}

/* --- AC #14: TRẦN CỨNG 40 tin/lượt ------------------------------------ */
{
  const nhieuNguoi = [], dsNhieu = [];
  for (let i = 0; i < 60; i++) {
    nhieuNguoi.push({ id: 'n' + i, ho_ten: 'Người ' + i, bo_phan: 'Kho', quan_ly_id: null, dang_lam: 1 });
    dsNhieu.push(viec({ nguoi_nhan_id: 'n' + i, nguoi_nhan_ten: 'Người ' + i, nguoi_giao_id: 'n' + i, nguoi_giao_ten: 'Người ' + i, han_chot: '2026-08-30' }));
  }
  const { tb, telegram } = await chay(2026, 8, 31, 10, { viec: dsNhieu, nhanSu: nhieuNguoi, taiKhoan: [] });
  kiem('AC#14 · 60 người cần nhắc → DỪNG đúng ở trần 40, không gửi tin thứ 41', tb.length, TRAN_TIN_MOI_LUOT);
  kiem('AC#14 · và có tin Telegram báo Gạo là NGHI CÓ BUG',
    telegram.some(t => /chạm trần/.test(t)), true);
  // REV-0019 L5 — tin đó phải NÊU TÊN ai bị bỏ, không bỏ im lặng.
  kiem('AC#14 · tin Telegram NÊU TÊN người bị bỏ (REV-0019 L5)',
    telegram.some(t => /chạm trần/.test(t) && /Người \d+/.test(t)), true);
}

/* --- AC #13: vòng quét KHÔNG GHI vào `cong_viec` ----------------------- */
{
  /* Đọc THẲNG bảng `cong_viec` trước/sau — bản cũ đếm câu SQL có chữ
     INSERT/UPDATE hay không, tức lại là khớp chuỗi (BH-34). */
  const ds = [viec({ han_chot: '2026-08-30' }), viec({ trang_thai: 'cho_duyet', nop_luc: '2026-08-20 10:00:00' })];
  const { db, d1 } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const doc = () => JSON.stringify(db.prepare('SELECT * FROM cong_viec ORDER BY id').all());
  const truoc = doc();
  await chay(2026, 9, 1, 10, {}, {}, { db, d1 });     // thêm một lượt cron nữa
  kiem('AC#13 · trạng thái công việc trước/sau một lượt cron giống hệt nhau', doc(), truoc);
  kiem('AC#13 ĐỐI CHỨNG · lượt cron thứ hai CÓ ghi thêm vào `thong_bao` — bảng khác thì đổi được, riêng cong_viec thì không',
    db.prepare("SELECT COUNT(*) AS n FROM thong_bao").get().n > 0, true);
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
     Chấm bằng `nop_luc` → ĐÚNG HẠN. Chấm bằng `cap_nhat_luc` → "trễ 5 ngày". */
  const v = viec({
    tieu_de: 'Chốt sổ quỹ tháng 8', trang_thai: 'hoan_thanh',
    nguoi_nhan_id: 'hang', nguoi_nhan_ten: 'Phan Thị Hằng',
    han_chot: '2026-08-29', nop_luc: '2026-08-29 16:02:00', cap_nhat_luc: '2026-09-03 11:00:00'
  });
  const { telegram } = await chay(2026, 9, 7, 8, { viec: [v], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const bt = telegram.find(t => /TRẠM MỤC TIÊU/.test(t)) || '';
  kiem('AC#9 · nộp đúng hạn 29/08, duyệt muộn 03/09 → VẪN tính ĐÚNG HẠN cho người nộp',
    /Làm xong đúng hạn: 1 việc/.test(bt), true);
  kiem('AC#9 · và tên chị Hằng nằm ở phần KHEN', /Nổi bật: Phan Thị Hằng/.test(bt), true);
  kiem('ĐỐI CHỨNG · chấm bằng cap_nhat_luc thì chính việc này thành "trễ 5 ngày"',
    [String(v.cap_nhat_luc).slice(0, 10) <= v.han_chot, String(v.nop_luc).slice(0, 10) <= v.han_chot],
    [false, true]);
  kiem('AC#9 · phần KHEN đứng TRƯỚC phần chê trong bản tin',
    bt.indexOf('Làm xong đúng hạn') < bt.indexOf('Đang đọng'), true);
}

/* --- AC #10: việc cũ `nop_luc IS NULL` — không khen, cũng KHÔNG chê ---- */
{
  const v = viec({ trang_thai: 'hoan_thanh', han_chot: '2026-08-29', nop_luc: null, cap_nhat_luc: '2026-09-03 11:00:00' });
  const { telegram } = await chay(2026, 9, 7, 8, { viec: [v], nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN });
  const bt = telegram.find(t => /TRẠM MỤC TIÊU/.test(t)) || '';
  kiem('AC#10 · việc cũ không có nop_luc → KHÔNG vào bảng ghi nhận (không có dữ liệu thì không phán)',
    /Làm xong đúng hạn: 0 việc/.test(bt), true);
  kiem('AC#10 · và cũng KHÔNG bị đánh dấu trễ', /trễ/.test(bt), false);
}

/* --- Rollback tức thì: cờ tắt ----------------------------------------- */
{
  const ds = [viec({ han_chot: '2026-08-30' })];
  kiem('ROLLBACK · NHAC_VIEC_TAT=1 → câm ngay, 0 tin, không cần deploy',
    (await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, { NHAC_VIEC_TAT: '1' })).tb.length, 0);
  // REV-0019 L4 — nút cứu hoả gõ kiểu khác cũng phải nổ.
  kiem('ROLLBACK · gõ "true" cũng TẮT THẬT (REV-0019 L4)',
    (await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, { NHAC_VIEC_TAT: 'true' })).tb.length, 0);
}

/* --- PILOT theo phòng ban (Rollout Đợt 2) ----------------------------- */
{
  const ds = [
    viec({ han_chot: '2026-08-30' }),                                                     // Huyền — Vận hành
    viec({ nguoi_nhan_id: 'nvkho', nguoi_nhan_ten: 'NV Kho A', han_chot: '2026-08-30' })  // Kho
  ];
  const { tb } = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, { NHAC_VIEC_BO_PHAN: 'Kho' });
  /* REV-0019 L1 — kỳ vọng ĐÃ ĐỔI, và đổi là đúng: trước đây Sếp Ngọc (phòng
     BGĐ) vẫn nhận tin vì bà là NGƯỜI GIAO việc kho, tức tin vẫn lọt ra ngoài
     phòng đang chạy thử. Giờ chỉ người TRONG phòng thử nhận tin. Muốn Sếp
     nhận thì liệt kê thêm phòng của Sếp. */
  kiem('PILOT · chỉ phòng Kho được nhắc, mọi phòng khác im — kể cả người GIAO việc',
    tb.filter(t => t.loai === 'cv_ban_tin').map(t => t.nguoi_nhan_id).sort(), ['nvkho']);
  const rong = await chay(2026, 8, 31, 10, { viec: ds, nhanSu: NHAN_SU, taiKhoan: TAI_KHOAN }, { NHAC_VIEC_BO_PHAN: 'Kho,BGĐ' });
  kiem('PILOT ĐỐI CHỨNG · liệt kê thêm "BGĐ" thì Sếp nhận lại — bộ lọc thật sự đang lọc',
    rong.tb.filter(t => t.loai === 'cv_ban_tin').map(t => t.nguoi_nhan_id).sort(), ['ngoc', 'nvkho']);
}

console.log(loi.join('\n'));
console.log(`\n${dat} đạt · ${hong} hỏng\n`);
process.exit(hong ? 1 : 0);
