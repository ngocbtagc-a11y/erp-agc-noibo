/* ==========================================================================
   BÀN ĐO: SƠ ĐỒ TỔ CHỨC — "DỄ ĐIỀU CHỈNH" (Sếp Ngọc 10/09/2026)
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc nhìn màn Sơ đồ tổ chức và nói nguyên văn:
     *"chỉnh lại chỗ này cho dễ điều chỉnh đi — tao thấy khó điều chỉnh quá"*
   Không phải chê xấu. Chê KHÓ SỬA.

   CHẠY:
     node scripts/do-so-do-de-dieu-chinh.mjs                → đo đủ (máy chủ + Chrome)
     node scripts/do-so-do-de-dieu-chinh.mjs --chi-may-chu  → bỏ phần Chrome
     node scripts/do-so-do-de-dieu-chinh.mjs --tu-kiem-san  → BH-16 cho chính cái sàn.
                                                              PHẢI ĐỎ.
     node scripts/do-so-do-de-dieu-chinh.mjs --truoc        → đo thêm BẢN CŨ để có
                                                              cặp số trước/sau
   MÃ THOÁT: 0 = xanh · 1 = đỏ.

   ---------------------------------------------------------------------------
   NĂM THỨ BÀN ĐO NÀY PHẢI BẮT ĐƯỢC (yêu cầu tối thiểu của vòng việc này)
   ---------------------------------------------------------------------------
   ① HỘP VẼ HAI LẦN. Nhánh dự phòng (chưa có hộp cấp `cong_ty`) đổ TOÀN BỘ
      danh sách vào một hàng phẳng, trong khi `veNhanh()` tự vẽ luôn cây con.
      Đo trên bản sản xuất 10/09/2026: `phong_ban` có ĐÚNG 4 hàng (id 2 và 3
      có cha_id = 1) → màn hình hiện 6 HỘP. Phép ① đếm hộp thật trong DOM.
   ② DÒNG TÓM TẮT NÓI DỐI. Cùng lúc đó dòng tóm tắt ghi "4 phòng · 0 nhóm" —
      ba con số cho cùng một thứ, không con số nào nói về hai con số kia.
      Phép ② đòi số ở dòng tóm tắt PHẢI BẰNG số hộp đếm được trong DOM.
   ③ ẨN HỘP CÒN NGƯỜI MÀ KHÔNG CẢNH BÁO. `nhan_su.phong_ban_id` có 22 hàng
      trỏ vào 4 hộp này. Phép ③ gọi API thật: lượt không có `xac_nhan` phải
      bị TỪ CHỐI kèm CON SỐ, và hộp phải còn nguyên `hoat_dong = 1`.
   ④ NGƯỜI KHÔNG ĐỦ QUYỀN VẪN ĐỔI ĐƯỢC CƠ CẤU. Phép ④ đăng nhập thật bằng
      một nhân viên kho part-time rồi gọi thẳng 5 cửa ghi — phải 403 hết, và
      CSDL phải không xê dịch một hàng nào. Ẩn nút KHÔNG tính là chặn.
   ⑤ TRÀN NGANG Ở 375px. Cửa "Sửa" chứa danh sách 24 người + 4 ô xổ; đo cả
      lúc cửa ĐANG MỞ, ở cả 1440×900 lẫn 375×812.

   ---------------------------------------------------------------------------
   MỖI CHỐT MỘT CA ĐỐI CHỨNG (BH-16)
   ---------------------------------------------------------------------------
   "Thước đo báo sạch trong khi thứ nó đo đang hỏng" là lỗi nặng nhất ở đây.
   Nên mỗi phép trên có một lượt chạy trên bản BẺ CỐ Ý, và lượt đó KHÔNG đỏ
   thì chính bàn đo bị tính là TRƯỢT:
     DC-1 ← gỡ phần lọc "chỉ hộp không có cha" ở nhánh phẳng → phải bắt 6 hộp
     DC-2 ← trả dòng tóm tắt về công thức cũ (đếm theo `cap`) → phải bắt lệch
     DC-3 ← bỏ cửa `can_xac_nhan` khi ẩn hộp                  → phải bắt ẩn êm
     DC-4 ← gỡ CẢ HAI lớp quyền của đường gán người           → phải bắt lọt
     DC-5 ← ép danh sách người trong cửa Sửa nằm ngang        → phải bắt tràn
     DC-6 ← bỏ nhánh hỏng-an-toàn khi thiếu cột `cap`         → phải bắt 500
     DC-7 ← lối "Ẩn" ở ô danh sách quên đọc `can_xac_nhan`    → phải bắt im ru
   Cộng thêm một phép CHẶN KÉP: gỡ ĐÚNG cửa ngoài rồi hỏi lại cửa trong —
   không có nó thì "chặn ở máy chủ" mới chỉ là lời hứa về một lớp duy nhất.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');

datDongHo('2026-09-10T03:00:00Z');            // 10:00 giờ VN

const dso = process.argv;
const TU_KIEM_SAN = dso.includes('--tu-kiem-san');
const CHI_MAY_CHU = dso.includes('--chi-may-chu') || TU_KIEM_SAN;
const CO_TRUOC = dso.includes('--truoc');

/* ⚠️ MỐC SO SÁNH LÀ SỐ HIỆU COMMIT CHẾT, KHÔNG PHẢI TÊN NHÁNH.
   Tên nhánh DI CHUYỂN. Đo "trước" bằng `origin/main` thì đúng hôm việc này
   được gộp vào main, mốc "trước" trượt lên thành chính bản mới — và bàn đo
   in ra "không đổi gì" hoặc ĐỎ đúng vào lúc việc thành công. Lớp lỗi này bị
   bắt ba lần trong một ngày, nên ở đây nó là một hằng số chết. */
const MOC_TRUOC = 'fd178a4535e28b3b9d1086079229d2a5fbea4e0a';

/* ==========================================================================
   SÀN SỐ PHÉP — chống ca "bàn đo XANH vì nó KHÔNG ĐO GÌ CẢ"
   ---------------------------------------------------------------------------
   `tongKet()` trả `truot === 0`, mà `truot` BẰNG 0 khi KHÔNG PHÉP NÀO CHẠY.
   Bàn đo treo giữa chừng, in một dòng tiêu đề, rồi `exit 0` đi thẳng qua
   cổng — bắt được đúng ca này ngày 09/09/2026. Nên `kt()` ĐẾM số phép đã
   chạy và cuối file đòi ĐỦ SÀN; thiếu phép là ĐỎ dù không phép nào trượt.
   Sàn đặt bằng SỐ CHẠY THẬT (chạy rồi chép số), không bằng phép nhẩm.
   ========================================================================== */
let SO_PHEP = 0;
function kt(nhan, dieuKien, chiTiet = '') { SO_PHEP++; return ok(nhan, dieuKien, chiTiet); }
/* ĐẾM THẬT bằng cách CHẠY rồi chép số, không bằng phép nhẩm: 27 phép máy chủ
   (gồm 3 ca đối chứng + 1 phép chặn kép) · 20 phép × 2 màn · 2 phép hỏi-lại
   khi ẩn hộp · 3 phép cho quãng "CSDL đã có cột cap" · 4 ca đối chứng trình
   duyệt = 76.
   Sàn đặt ĐÚNG BẰNG số hiện có, KHÔNG nới; thêm phép mới thì NÂNG sàn — để
   sàn thấp hơn thực tế là một lời hứa suông. */
const SAN_PHEP = { du: 76, chi_may_chu: 27 };

/* ==========================================================================
   DỮ LIỆU THẬT — chụp từ CSDL sản xuất 10/09/2026 (chỉ ĐỌC, không ghi)
   ---------------------------------------------------------------------------
   `phong_ban` có ĐÚNG 4 hàng, và hai trong số đó có cha. Chính bộ này làm
   bản cũ vẽ ra 6 hộp.
   ========================================================================== */
const PHONG_BAN_THAT = [
  // id, ten,                                    cha_id
  [1, 'Ban Giám đốc',                          null],
  [2, 'P. Support (Kế toán - Nhân sự - Admin)',    1],
  [3, 'P. Kinh Doanh - MKT',                       1],
  [4, 'P. Kho Vận - Sản Xuất',                  null]
];
/* 22 hàng `nhan_su` trỏ vào các hộp trên — con số ràng buộc cứng của vòng
   việc này ("KHÔNG xoá cứng hộp nào"). Rút gọn còn đủ mặt mỗi phòng. */
const NHAN_SU_THAT = [
  ['ns_admin2',       'Nguyễn Duy Phong',     'Giám đốc',            1],
  ['ns_admin1',       'Bùi Thị Ngọc',         'Phó Giám đốc',        1],
  ['ns_nv010014',     'Phan Thị Hằng',        'Kế toán trưởng',      2],
  ['ns_nv010015',     'Dương Thị Hồng Khánh', 'NV Kế toán',          2],
  ['ns_fcc63fda-0cd', 'Phạm Thị Lan',         'NV HCNS kiêm Admin',  2],
  ['ns_6222e61d-6a0', 'Nguyễn Thị Huyền',     'NV Vận hành TMĐT', null],
  ['ns_a81898a3-f7b', 'Vũ Lan Hương',         'NV Chăm sóc KH',   null],
  ['ns_b8e66305-845', 'Phạm Khương Duy',      'TP. Kho Vận',         4],
  /* 16 bạn kho + anh Duy = 17 người ở hộp id 4, đúng con số bản thật. */
  ...Array.from({ length: 16 }, (_, i) =>
    [`ns_kho${String(i + 1).padStart(2, '0')}`, `Nhân viên Kho ${i + 1}`, 'NV Kho Vận', 4])
];
const SO_HANG_PHONG_BAN = PHONG_BAN_THAT.length;                 // 4
/* 24 người đang làm, 22 trong số đó có `phong_ban_id` trỏ vào 4 hộp trên —
   đúng con số của ràng buộc "KHÔNG xoá cứng hộp nào". */
const SO_TRO_VAO_HOP = NHAN_SU_THAT.filter(n => n[3] != null).length;
const SO_HOP_MAN_CU = 6;   // đo được trên bản cũ: 4 hàng vẽ ra 6 hộp

/* ==========================================================================
   PHẦN MÁY CHỦ — SQLite thật, worker thật, phiên đăng nhập thật
   ========================================================================== */

/* [khoá, họ tên, chức vụ, ô 1 vai trò hệ thống, ô 2 vị trí công việc] */
const VAI = [
  ['SEP',  'Bùi Thị Ngọc',    'Phó Giám đốc', 'admin',      null],
  ['LAN',  'Phạm Thị Lan',    'NV HCNS',      'nguoi_dung', 'hcns'],
  ['LINH', 'Đinh Mạnh Linh',  'NV Kho Vận',   'nguoi_dung', 'nhan_vien_kho']
];
const KHOA = Object.fromEntries(VAI.map(([id], i) => [id, i + 1]));

function moi(db) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su; DELETE FROM phong_ban;');
  const coCap = db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('phong_ban') WHERE name='cap'").get().n > 0;
  const cPB = coCap
    ? db.prepare('INSERT INTO phong_ban (id, ten, cha_id, cap, trang_thai, hoat_dong) VALUES (?,?,?,?,\'nhap\',1)')
    : db.prepare('INSERT INTO phong_ban (id, ten, cha_id, trang_thai, hoat_dong) VALUES (?,?,?,\'nhap\',1)');
  for (const [id, ten, cha] of PHONG_BAN_THAT) {
    /* KHÔNG đặt cấp cho hàng nào — đúng hiện trạng: `xep-lai-co-cau-2026-09.sql`
       CHƯA chạy, nên mọi hàng đều mang giá trị mặc định 'phong' và không có
       hộp nào cấp `cong_ty`. Đó chính là ca dẫn tới nhánh vẽ phẳng. */
    if (coCap) cPB.run(id, ten, cha, 'phong'); else cPB.run(id, ten, cha);
  }
  const cNS = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, phong_ban_id, dang_lam) VALUES (?,?,?,?,?,?,1)');
  /* `bo_phan` là NOT NULL trong `schema.sql` d.21 — người chưa xếp hộp nào
     mang chuỗi rỗng, không mang NULL. Mồi sai chỗ này là bàn đo đo một lược
     đồ không giống bản thật. */
  const tenPb = id => (PHONG_BAN_THAT.find(p => p[0] === id) || [])[1] || '';
  for (const [id, ten, cv, pb] of NHAN_SU_THAT) cNS.run(id, ten, ten.slice(0, 2), cv, tenPb(pb), pb);

  const coCotViTri = db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('tai_khoan') WHERE name='vi_tri_cong_viec'").get().n > 0;
  const tk = coCotViTri
    ? db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, vi_tri_cong_viec) VALUES (?,?,?,?,?,?)')
    : db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro) VALUES (?,?,?,?,?)');
  const nsCua = { SEP: 'ns_admin1', LAN: 'ns_fcc63fda-0cd', LINH: 'ns_kho01' };
  VAI.forEach(([id, , , o1, o2], i) => {
    if (coCotViTri) tk.run(i + 1, nsCua[id], 'tk' + id.toLowerCase(), 'h', o1, o2);
    else tk.run(i + 1, nsCua[id], 'tk' + id.toLowerCase(), 'h', o2 || o1);
  });
}

async function napWorker(thuMucSrc) {
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  return (await import(url)).default;
}
const JSONH = { 'Content-Type': 'application/json' };
const dang = (worker, env, duong, token, than) => goiAPI(worker, env, duong, token,
  { method: 'POST', headers: JSONH, body: JSON.stringify(than) });

/* Một lượt đo trọn vẹn trên một thư mục `src`. Trả về SỐ, không trả lời văn. */
async function doMayChu(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);
  const the = {};
  for (const k of Object.keys(KHOA)) the[k] = await taoPhienThat(env, KHOA[k]);

  const that = { error: console.error, warn: console.warn };
  console.error = () => {}; console.warn = () => {};
  const demPB = () => db.prepare('SELECT COUNT(*) AS n FROM phong_ban').get().n;
  const hop = id => db.prepare('SELECT id, ten, cha_id, hoat_dong FROM phong_ban WHERE id = ?').get(id);
  const capCua = id => { try { return db.prepare('SELECT cap FROM phong_ban WHERE id = ?').get(id).cap; } catch { return null; } };
  const nguoi = id => db.prepare('SELECT id, phong_ban_id, bo_phan FROM nhan_su WHERE id = ?').get(id);
  const demTrongHop = id => db.prepare('SELECT COUNT(*) AS n FROM nhan_su WHERE phong_ban_id = ? AND dang_lam = 1').get(id).n;

  const kq = {};
  try {
    kq.danhSach = await goiAPI(worker, env, '/api/dulieunen/phong-ban', the.SEP);

    /* --- ⑥ THÊM NHÓM CON NGAY DƯỚI MỘT PHÒNG, MỘT LƯỢT ------------------ */
    const truocThem = demPB();
    kq.themCon = await dang(worker, env, '/api/dulieunen/phong-ban/them', the.SEP,
      { ten: 'Nhóm Kế toán – Tài chính', cap: 'nhom', cha_id: 2 });
    kq.hopMoi = kq.themCon.than && kq.themCon.than.id ? hop(kq.themCon.than.id) : null;
    kq.capHopMoi = kq.themCon.than && kq.themCon.than.id ? capCua(kq.themCon.than.id) : null;
    kq.themDongPB = demPB() - truocThem;

    /* --- ĐỔI CẤP (Phòng ⇄ Nhóm) ----------------------------------------- */
    kq.doiCap = await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.SEP,
      { id: 4, cap: 'nhom' });
    kq.capSauDoi = capCua(4);

    /* --- ③ ẨN HỘP CÒN NGƯỜI: lượt 1 KHÔNG có `xac_nhan` ----------------- */
    kq.soNguoiHop4 = demTrongHop(4);
    kq.anLan1 = await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.SEP, { id: 4, hoat_dong: 0 });
    kq.hop4SauLan1 = hop(4);
    kq.anLan2 = await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.SEP,
      { id: 4, hoat_dong: 0, xac_nhan: true });
    kq.hop4SauLan2 = hop(4);
    kq.soHangSauAn = demPB();
    /* Hiện lại — hoàn tác phải chạy được thật, không chỉ có nút */
    kq.hienLai = await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.SEP, { id: 4, hoat_dong: 1 });
    kq.hop4SauHien = hop(4);

    /* --- GÁN NGƯỜI VÀO HỘP ---------------------------------------------- */
    kq.ganNguoi = await dang(worker, env, '/api/dulieunen/phong-ban/gan-nguoi', the.SEP,
      { id: 2, them: ['ns_6222e61d-6a0', 'ns_a81898a3-f7b'], bo: [] });
    kq.huyenSauGan = nguoi('ns_6222e61d-6a0');
    kq.goNguoi = await dang(worker, env, '/api/dulieunen/phong-ban/gan-nguoi', the.SEP,
      { id: 2, them: [], bo: ['ns_6222e61d-6a0'] });
    kq.huyenSauGo = nguoi('ns_6222e61d-6a0');
    /* Người đã nghỉ gửi lên thì UPDATE khớp 0 hàng — điều kiện nằm trong SQL */
    db.exec("UPDATE nhan_su SET dang_lam = 0 WHERE id = 'ns_kho14'");
    kq.ganNguoiNghi = await dang(worker, env, '/api/dulieunen/phong-ban/gan-nguoi', the.SEP,
      { id: 2, them: ['ns_kho14'], bo: [] });
    kq.khoNghiSauGan = nguoi('ns_kho14');
    db.exec("UPDATE nhan_su SET dang_lam = 1 WHERE id = 'ns_kho14'");

    /* --- ④ QUYỀN: nhân viên kho gọi thẳng NĂM cửa ghi -------------------- */
    const anhChup = {
      pb: db.prepare('SELECT id, ten, cha_id, hoat_dong FROM phong_ban ORDER BY id').all(),
      ns: db.prepare('SELECT id, phong_ban_id FROM nhan_su ORDER BY id').all()
    };
    kq.chan = {
      them:    await dang(worker, env, '/api/dulieunen/phong-ban/them', the.LINH,
        { ten: 'Nhóm ma', cap: 'nhom', cha_id: 1 }),
      sua:     await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.LINH, { id: 3, ten: 'Đổi trộm' }),
      doiCap:  await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.LINH, { id: 3, cap: 'nhom' }),
      an:      await dang(worker, env, '/api/dulieunen/phong-ban/sua', the.LINH,
        { id: 3, hoat_dong: 0, xac_nhan: true }),
      ganNguoi: await dang(worker, env, '/api/dulieunen/phong-ban/gan-nguoi', the.LINH,
        { id: 3, them: ['ns_kho01'], bo: [] }),
      sapXep:  await dang(worker, env, '/api/dulieunen/phong-ban/sap-xep', the.LINH,
        { ds: [{ id: 4, cha_id: 1 }] })
    };
    kq.sauChan = {
      pb: db.prepare('SELECT id, ten, cha_id, hoat_dong FROM phong_ban ORDER BY id').all(),
      ns: db.prepare('SELECT id, phong_ban_id FROM nhan_su ORDER BY id').all()
    };
    kq.khongXeDich = JSON.stringify(anhChup) === JSON.stringify(kq.sauChan);

    /* --- HCNS (có `them_nhan_su`) VẪN LÀM ĐƯỢC — không siết nhầm --------- */
    kq.hcnsGan = await dang(worker, env, '/api/dulieunen/phong-ban/gan-nguoi', the.LAN,
      { id: 3, them: ['ns_a81898a3-f7b'], bo: [] });
  } finally { Object.assign(console, that); db.close(); }
  return kq;
}

/* Dựng một CSDL THIẾU CỘT `cap` rồi hỏi đúng cửa danh sách. Đây là quãng
   "CSDL cũ" mà mã phải chạy được: hỏng theo chiều AN TOÀN, không 500. */
async function doThieuCotCap(thuMucSrc) {
  const { db, d1 } = dungDB();
  moi(db);
  /* SQLite < 3.35 không có DROP COLUMN cho mọi ca; dựng lại bảng là cách chắc
     chắn giống hệt một CSDL chưa nạp `them-phongban-ba-tang.sql`. */
  db.exec(`
    CREATE TABLE pb_cu AS SELECT id, ten, hoat_dong, trang_thai, truong_phong_id, thu_tu, cha_id FROM phong_ban;
    DROP TABLE phong_ban;
    CREATE TABLE phong_ban (
      id INTEGER PRIMARY KEY, ten TEXT NOT NULL,
      hoat_dong INTEGER NOT NULL DEFAULT 1, trang_thai TEXT NOT NULL DEFAULT 'nhap',
      truong_phong_id TEXT, thu_tu INTEGER, cha_id INTEGER REFERENCES phong_ban(id));
    INSERT INTO phong_ban (id, ten, hoat_dong, trang_thai, truong_phong_id, thu_tu, cha_id)
      SELECT id, ten, hoat_dong, trang_thai, truong_phong_id, thu_tu, cha_id FROM pb_cu;
    DROP TABLE pb_cu;
  `);
  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);
  const token = await taoPhienThat(env, KHOA.SEP);
  const that = { error: console.error, warn: console.warn };
  console.error = () => {}; console.warn = () => {};
  let r, doiCap;
  try {
    r = await goiAPI(worker, env, '/api/dulieunen/phong-ban', token);
    doiCap = await dang(worker, env, '/api/dulieunen/phong-ban/sua', token, { id: 3, cap: 'nhom' });
  } finally { Object.assign(console, that); db.close(); }
  return { r, doiCap };
}

/* Bản `src` bẻ cố ý — dùng cho ca đối chứng máy chủ. */
function banSrcHong(ten, sua) {
  const thuMuc = path.join(GOC, '.dc-sodo-' + ten);
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  for (const f of readdirSync(SRC)) {
    if (!f.endsWith('.js')) continue;
    const noi = readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
    writeFileSync(path.join(thuMuc, f), sua(f, noi), 'utf8');
  }
  /* Mũi tiêm KHÔNG găm được = ca đối chứng vô nghĩa. */
  let daGam = false;
  for (const f of readdirSync(SRC)) {
    if (!f.endsWith('.js')) continue;
    const goc = readFileSync(path.join(SRC, f), 'utf8').replace(/\r\n/g, '\n');
    if (readFileSync(path.join(thuMuc, f), 'utf8') !== goc) { daGam = true; break; }
  }
  return { thuMuc, daGam };
}

/* ==========================================================================
   PHẦN TRÌNH DUYỆT — app.js THẬT, style.css THẬT, Chrome THẬT
   ========================================================================== */
const MAN = [{ rong: 1440, cao: 900 }, { rong: 375, cao: 812 }];

/* Đúng khối máy chủ trả về Ở HIỆN TRẠNG: 4 hàng, `cap` chưa xếp, hai hàng có
   cha. Chép khoá y hệt `src/dulieunen.js` — lệch một chữ là bàn đo đo bản
   dựng riêng của nó chứ không đo thứ máy chủ gửi. */
function duLieuHienTrang() {
  const dem = pb => NHAN_SU_THAT.filter(n => n[3] === pb).length;
  return {
    co_cot_cap: false,
    ds: PHONG_BAN_THAT.map(([id, ten, cha], i) => ({
      id, ten, hoat_dong: 1, trang_thai: 'nhap',
      truong_phong_id: null, truong_phong_ten: null,
      so_nguoi: dem(id), thu_tu: i + 1, cha_id: cha,
      cap: null, mo_ta: null, phu_trach_id: null,
      phu_trach_ten: null, phu_trach_chuc_vu: null
    })),
    tom_tat: {
      tong_dang_lam: NHAN_SU_THAT.length,
      dinh_cay: [],
      khong_phong: NHAN_SU_THAT.filter(n => n[3] == null).map(n => ({ id: n[0], ho_ten: n[1], chuc_vu: n[2] })),
      khong_quan_ly: [], trong_chuc_vu: [], trong_chuc_danh: []
    }
  };
}

function apiRieng(du) {
  const nhanSu = NHAN_SU_THAT.map(([id, ho_ten, chuc_vu, pb]) => ({
    id, ho_ten, viet_tat: ho_ten.slice(0, 2), chuc_vu, bo_phan: null,
    phong_ban_id: pb, chuc_danh_id: null, quan_ly_id: null, dang_lam: 1,
    ma_nv: null, trang_thai: 'da_ky', co_anh: 0
  }));
  return function (duong, u, traJson) {
    if (duong === '/api/toi-la-ai') {
      traJson({
        id: 'ns_admin1', ten: 'Bùi Thị Ngọc', viet_tat: 'BN', chuc_vu: 'Phó Giám đốc',
        vai_tro: 'admin', vi_tri_cong_viec: null, phai_doi_mk: false, co_anh: false,
        phong_ban_quan_ly: [],
        quyen: ['tongquan', 'danhba', 'chat', 'nhansu', 'quantri', 'dulieunen'],
        xem_luong: true, la_admin: true, them_nhan_su: true, quan_ly_chinh_sach_ca: true,
        duoc_tao_tai_khoan: true, duoc_dat_vi_tri: true, duyet_gopy: true,
        kho: { thao_tac: true, quan_ly: true, gia_von: true },
        shopee: { xem: true, quan_ly: true }, thao_tac_van_hanh: true,
        mat_khau_dai_toi_thieu: 8
      });
      return true;
    }
    if (duong === '/api/dulieunen/phong-ban') { traJson(du); return true; }
    /* Máy chủ TỪ CHỐI lượt ẩn đầu tiên vì hộp còn người — đúng thân JSON mà
       `suaPhongBan` trả về. Giao diện phải ĐỌC câu này; không đọc thì nút
       "Ẩn" bấm xong im ru và người dùng tưởng ERP treo. */
    if (duong === '/api/dulieunen/phong-ban/sua') {
      traJson({ can_xac_nhan: true, so_nguoi: 17, so_con: 0,
        thong_diep: 'Hộp "P. Kho Vận - Sản Xuất" còn 17 người đang thuộc về nó. '
          + 'Ẩn đi thì họ rơi khỏi sơ đồ nhưng hồ sơ vẫn trỏ vào hộp này.' });
      return true;
    }
    if (duong === '/api/dulieunen/chuc-danh') { traJson({ ds: [] }); return true; }
    if (duong === '/api/dulieunen/don-vi')    { traJson({ ds: [] }); return true; }
    if (duong === '/api/dulieunen/tinh-trang') { traJson({ muc: [], viec_tiep_theo: [] }); return true; }
    if (duong === '/api/quan-tri/danh-sach') {
      traJson({ nhan_su: nhanSu, vai_tro: [], vai_tro_he_thong: [], vi_tri_cong_viec: [], co_cot_vi_tri: true });
      return true;
    }
    if (/^\/api\/(don-hoan|hoan|shopee|tiktok|lich-su-hoan)/.test(duong)) {
      traJson({ ok: true, don_hoan: [], lich_su: [], danh_sach: [], ket_noi: null,
                quyen: { quan_ly: false, xem: false } });
      return true;
    }
    return false;
  };
}

/* Đo TRÀN NGANG trên mọi phần tử con: bề rộng nội dung so với bề rộng khung,
   và mép phải so với mép phải của khối cha. Đo cả hai vì một hộp có thể đúng
   `scrollWidth` mà vẫn thò ra do lề âm hay rãnh lưới cứng. */
const DOC_TRAN = `(khung, goc) => {
  const qa = s => [...goc.querySelectorAll(s)];
  const r0 = khung.getBoundingClientRect();
  const thoRa = qa('*').map(e => ({
    lop: String(e.className || e.tagName).slice(0, 44),
    lech: Math.round(e.getBoundingClientRect().right - r0.right)
  })).filter(x => x.lech > 1).sort((a, b) => b.lech - a.lech);
  const cuonNgang = qa('*').filter(e => e.scrollWidth > e.clientWidth + 1)
    .map(e => String(e.className || e.tagName).slice(0, 44) + ' +' + (e.scrollWidth - e.clientWidth));
  return { thoRa: thoRa.slice(0, 6), cuonNgang: cuonNgang.slice(0, 6) };
}`;

async function doMotMan(du, { rong, cao }, { suaTep = null, moCua = false, commit = null } = {}) {
  const may = await dungMayGia({ commit, apiRieng: apiRieng(du), suaTep, tatHoatAnh: true });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, cao, doiMs: 2600 });
  try {
    await cr.chay(`document.querySelector('[data-tab="quantri"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 500))`);
    await cr.chay(`document.querySelector('[data-qt="cocau"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 900))`);
    if (moCua) {
      await cr.chay(`document.querySelector('#dln-sodo [data-sua-hop]')?.click(), 1`);
      await cr.chay(`new Promise(r => setTimeout(r, 700))`);
    }
    const kq = await cr.chay(`(() => {
      const o = document.getElementById('dln-sodo');
      if (!o) return { co: false };
      const tom = document.getElementById('dln-sodo-tom');
      const qa = s => [...o.querySelectorAll(s)];
      const docTran = ${DOC_TRAN};

      /* ĐẾM HỘP THẬT TRONG DOM. Không hỏi mã nguồn, không cộng lại từ dữ liệu
         — đếm đúng thứ Sếp nhìn thấy. */
      const hop = qa('.sodo-o');
      const idHop = hop.map(e => e.dataset.pb);
      const trung = idHop.filter((x, i) => idHop.indexOf(x) !== i);

      const cua = document.getElementById('sodoSuaNen');
      const cuaMo = !!(cua && !cua.hidden);
      const oCua = cua ? cua.querySelector('.modal') : null;

      return {
        co: true,
        soHop: hop.length,
        idHop,
        soHopTrungLap: trung.length,
        idTrungLap: [...new Set(trung)],
        chuTom: tom ? tom.textContent.trim() : '',
        tomSoHop: tom ? Number(tom.dataset.soHop) : null,
        tomSoHang: tom ? Number(tom.dataset.soHang) : null,
        /* Số ĐẦU TIÊN đọc được trong dòng tóm tắt — kiểm bằng CHỮ in ra, không
           chỉ bằng dataset, vì Sếp đọc chữ chứ không đọc thuộc tính.
           ⚠️ KHÔNG dấu huyền ngược trong khối này: nó nằm TRONG một chuỗi
           mẫu, một dấu là đóng chuỗi sớm và cả tệp không dịch nổi. */
        soDauTrongChu: tom ? Number((tom.textContent.match(/\\d+/) || [])[0]) : null,
        soNutSua: qa('[data-sua-hop]').length,
        soNutTruongTrenHop: qa('[data-gan-truong]').length,
        soOXoTrenHop: qa('.sodo-chon').length,
        giuSuaTen: qa('[data-sua-ten]').length,
        giuKeoTha: qa('.sodo-o[draggable="true"]').length,
        coThanhLui: !!o.querySelector('[data-hoan-tac]'),
        cayPhang: !!o.querySelector('[data-loi="cay-phang"]'),
        caoSoDo: Math.round(o.getBoundingClientRect().height),
        /* Cửa "Sửa" — đủ bảy việc hay không, đo bằng đúng các ô có thật */
        cuaMo,
        cuaCo: cuaMo ? {
          ten: !!document.getElementById('sodoSua-ten'),
          cap: !!document.getElementById('sodoSua-cap'),
          cha: !!document.getElementById('sodoSua-cha'),
          truong: !!document.getElementById('sodoSua-truong'),
          nguoi: cua.querySelectorAll('#sodoSua-nguoi [data-nguoi]').length,
          themCon: !!document.getElementById('sodoSua-themcon'),
          an: !!document.getElementById('sodoSua-an'),
          luu: !!document.getElementById('sodoSua-luu')
        } : null,
        capTat: cuaMo && document.getElementById('sodoSua-cap')
          ? document.getElementById('sodoSua-cap').disabled : null,
        /* Chiều cao nút — 44px là ngưỡng bấm bằng ngón tay */
        caoNutSua: (() => { const b = o.querySelector('[data-sua-hop]');
          return b ? Math.round(b.getBoundingClientRect().height) : 0; })(),
        tranSoDo: docTran(o, o),
        tranCua: oCua ? docTran(oCua, oCua) : { thoRa: [], cuonNgang: [] },
        rongTrang: Math.round(document.documentElement.scrollWidth),
        rongMan: window.innerWidth
      };
    })()`);
    kq.loi = [...cr.ngoaiLe, ...cr.loiConsole].slice(0, 4);
    return kq;
  } finally { cr.dong(); may.dong(); }
}

/* Bấm "Ẩn" ở CẢ HAI lối rồi ghi lại câu hỏi lại. `window.confirm` bị thay
   bằng một hàm GHI LẠI rồi trả `false` — bàn đo không được phép thật sự ẩn
   thứ gì, và trả `false` cũng chính là đường "người dùng bấm Huỷ". */
async function doHoiLaiKhiAn(du, { rong, cao }, suaTep = null) {
  const may = await dungMayGia({ apiRieng: apiRieng(du), suaTep, tatHoatAnh: true });
  const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong, cao, doiMs: 2600 });
  try {
    await cr.chay(`document.querySelector('[data-tab="quantri"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 500))`);
    await cr.chay(`document.querySelector('[data-qt="cocau"]')?.click(), 1`);
    await cr.chay(`new Promise(r => setTimeout(r, 900))`);
    return await cr.chay(`(async () => {
      window.__hoi = [];
      window.confirm = (m) => { window.__hoi.push(String(m)); return false; };
      const ghi = () => { const c = window.__hoi.pop() || ''; return { daHoi: !!c, cauHoi: c }; };

      /* Lối 1 — cửa "Sửa" trên sơ đồ */
      document.querySelector('#dln-sodo .sodo-o:not(.cap-cong_ty) [data-sua-hop]')?.click();
      await new Promise(r => setTimeout(r, 600));
      document.getElementById('sodoSua-an')?.click();
      await new Promise(r => setTimeout(r, 700));
      const cua = ghi();
      document.getElementById('sodoSua-dong')?.click();
      await new Promise(r => setTimeout(r, 300));

      /* Lối 2 — nút "Ẩn" ở ô danh sách "Phòng ban" phía dưới */
      document.querySelector('#dln-pb-list [data-an][data-hd="0"]')?.click();
      await new Promise(r => setTimeout(r, 700));
      return { cua, ds: ghi() };
    })()`);
  } finally { cr.dong(); may.dong(); }
}

/* ==========================================================================
   CHẠY
   ========================================================================== */
console.log('\n' + '='.repeat(74));
console.log('BÀN ĐO SƠ ĐỒ TỔ CHỨC — "DỄ ĐIỀU CHỈNH" · ' + new Date().toISOString().slice(0, 10));
console.log('mốc so sánh (số hiệu chết): ' + MOC_TRUOC.slice(0, 12));
console.log('='.repeat(74));

console.log('\n─── MÁY CHỦ: NĂM VIỆC MỚI + QUYỀN ───');
{
  const k = await doMayChu(SRC);

  kt('Cửa danh sách trả 200 và có cờ `co_cot_cap`',
    k.danhSach.status === 200 && k.danhSach.than && k.danhSach.than.co_cot_cap !== undefined,
    `HTTP ${k.danhSach.status} · co_cot_cap = ${k.danhSach.than && k.danhSach.than.co_cot_cap}`);

  /* ---- THÊM NHÓM CON ---- */
  kt('Thêm Nhóm con: MỘT lệnh gọi ra hộp đã có sẵn cả cấp lẫn cha',
    k.themCon.status === 200 && k.themDongPB === 1
    && k.hopMoi && Number(k.hopMoi.cha_id) === 2 && k.capHopMoi === 'nhom',
    `HTTP ${k.themCon.status} · +${k.themDongPB} hàng · cha ${k.hopMoi && k.hopMoi.cha_id} · cấp ${k.capHopMoi}`);

  /* ---- ĐỔI CẤP ---- */
  kt('Đổi cấp Phòng → Nhóm ghi được thật', k.doiCap.status === 200 && k.capSauDoi === 'nhom',
    `HTTP ${k.doiCap.status} · cấp id 4 = ${k.capSauDoi}`);

  /* ---- ③ ẨN HỘP CÒN NGƯỜI ---- */
  kt('③ Hộp id 4 đang có 17 người thật (không đo trên hộp rỗng)', k.soNguoiHop4 === 17,
    `${k.soNguoiHop4} người · tổng ${SO_TRO_VAO_HOP} hồ sơ trỏ vào 4 hộp`);
  kt('③ Ẩn hộp còn người mà KHÔNG xác nhận → bị TỪ CHỐI kèm con số',
    k.anLan1.status === 200 && k.anLan1.than && k.anLan1.than.can_xac_nhan === true
    && Number(k.anLan1.than.so_nguoi) === k.soNguoiHop4,
    `can_xac_nhan = ${k.anLan1.than && k.anLan1.than.can_xac_nhan} · so_nguoi = ${k.anLan1.than && k.anLan1.than.so_nguoi}`);
  kt('③ Và hộp VẪN CÒN HIỆN — lời từ chối không phải lời nói suông',
    k.hop4SauLan1 && k.hop4SauLan1.hoat_dong === 1, `hoat_dong = ${k.hop4SauLan1 && k.hop4SauLan1.hoat_dong}`);
  kt('③ Xác nhận rồi thì ẩn được', k.anLan2.status === 200 && k.hop4SauLan2.hoat_dong === 0);
  kt('③ ẨN, KHÔNG XOÁ — đủ số hàng `phong_ban` sau khi ẩn',
    k.soHangSauAn === SO_HANG_PHONG_BAN + 1,
    `${k.soHangSauAn} hàng (4 gốc + 1 nhóm vừa thêm)`);
  kt('Hoàn tác ẩn: hiện lại được ngay', k.hienLai.status === 200 && k.hop4SauHien.hoat_dong === 1);

  /* ---- GÁN NGƯỜI ---- */
  kt('Gán người vào hộp: `phong_ban_id` VÀ `bo_phan` đổi cùng một lượt',
    k.ganNguoi.status === 200 && k.huyenSauGan.phong_ban_id === 2
    && k.huyenSauGan.bo_phan === PHONG_BAN_THAT[1][1],
    `pb ${k.huyenSauGan.phong_ban_id} · bộ phận "${k.huyenSauGan.bo_phan}"`);
  kt('Gỡ khỏi hộp = về "chưa xếp hộp nào", KHÔNG xoá người',
    k.goNguoi.status === 200 && k.huyenSauGo && k.huyenSauGo.phong_ban_id == null,
    `pb = ${k.huyenSauGo && k.huyenSauGo.phong_ban_id}`);
  kt('Điều kiện `dang_lam = 1` nằm TRONG SQL — id người đã nghỉ khớp 0 hàng',
    k.khoNghiSauGan && k.khoNghiSauGan.phong_ban_id === 4,
    `pb người đã nghỉ = ${k.khoNghiSauGan && k.khoNghiSauGan.phong_ban_id} (giữ nguyên 4)`);

  /* ---- ④ QUYỀN ---- */
  for (const [ten, r] of Object.entries(k.chan)) {
    kt(`④ Nhân viên kho gọi thẳng /${ten} → 403`, r.status === 403,
      `HTTP ${r.status} · ${r.than && (r.than.loi || r.than.thong_diep || '')}`.slice(0, 90));
  }
  kt('④ Và CSDL không xê dịch một hàng nào sau 6 lượt gọi trộm', k.khongXeDich);
  kt('Không siết nhầm: HCNS (`them_nhan_su`) vẫn gán người được',
    k.hcnsGan.status === 200, `HTTP ${k.hcnsGan.status}`);
}

console.log('\n─── MÁY CHỦ: CSDL CŨ CHƯA CÓ CỘT `cap` — HỎNG THEO CHIỀU AN TOÀN ───');
{
  const k = await doThieuCotCap(SRC);
  kt('Thiếu cột `cap`: cửa danh sách VẪN 200, không 500',
    k.r.status === 200, `HTTP ${k.r.status}`);
  kt('Thiếu cột `cap`: trả đủ 4 hàng và cờ `co_cot_cap` = false',
    k.r.than && (k.r.than.ds || []).length === SO_HANG_PHONG_BAN && k.r.than.co_cot_cap === false,
    `${k.r.than && (k.r.than.ds || []).length} hàng · co_cot_cap = ${k.r.than && k.r.than.co_cot_cap}`);
  kt('Thiếu cột `cap`: "Đổi cấp" TỪ CHỐI KÈM LÝ DO, không ném 500',
    k.doiCap.status === 409 && /them-phongban-ba-tang/.test(String(k.doiCap.than && k.doiCap.than.loi)),
    `HTTP ${k.doiCap.status} · ${k.doiCap.than && k.doiCap.than.loi}`);
}

console.log('\n─── CA ĐỐI CHỨNG MÁY CHỦ (BH-16) ───');
{
  const DC = [
    ['3', 'bỏ cửa `can_xac_nhan` khi ẩn hộp còn người',
      (f, s) => f !== 'dulieunen.js' ? s
        : s.replace('if ((soNguoi > 0 || soCon > 0) && !body.xac_nhan) {', 'if (false) {'),
      async (thuMuc) => { const k = await doMayChu(thuMuc);
        return !(k.anLan1.than && k.anLan1.than.can_xac_nhan) && k.hop4SauLan1.hoat_dong === 0; }],
    /* ⚠️ PHẢI GỠ CẢ HAI LỚP, KHÔNG CHỈ LỚP TRONG.
       Bản đầu của ca này chỉ gỡ `batBuocToChuc` trong `ganNguoiVaoPhongBan`
       rồi chờ 200 — và nó LỌT: cửa ngoài (`batBuocXemDuLieuNen`) vẫn cắt
       nhân viên kho từ trước, nên lượt gọi vẫn 403 và ca đối chứng KHÔNG
       chứng minh được gì. Ca đối chứng phải bẻ ĐỦ để việc hỏng thật; bẻ nửa
       vời thì nó chỉ đo lại lớp còn nguyên. Lớp trong tự đứng được một mình
       hay không thì đo riêng ở khối "CHẶN KÉP" bên dưới. */
    ['4', 'gỡ CẢ HAI lớp quyền của đường gán người',
      (f, s) => f === 'index.js'
        ? s.replace(`async function dlnGanNguoiVaoPhongBan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);`,
                    `async function dlnGanNguoiVaoPhongBan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);`)
        : (f === 'dulieunen.js'
          ? s.replace(`export async function ganNguoiVaoPhongBan(env, phien, body) {
  const chan = batBuocToChuc(phien);
  if (chan) return chan;`, `export async function ganNguoiVaoPhongBan(env, phien, body) {`)
          : s),
      async (thuMuc) => { const k = await doMayChu(thuMuc); return k.chan.ganNguoi.status !== 403; }],
    /* Mũi tiêm PHẢI LÀ JS HỢP LỆ. Bản đầu bẻ vỡ cú pháp và ca này "bắt được"
       vì tệp không dịch nổi — bắt đúng vì lý do sai, tức là chưa chứng minh
       bàn đo nhìn thấy CÁI GÌ. Nay đổi đúng MỘT dòng: catch ném thẳng. */
    ['6', 'bỏ nhánh hỏng-an-toàn khi thiếu cột `cap` (catch ném thẳng)',
      (f, s) => f !== 'dulieunen.js' ? s
        : s.replace(`      const tin = String(e && e.message);
      if (!/no such column/i.test(tin)) throw e;      // lỗi khác — lỗi thật, không nuốt`,
                    `      const tin = String(e && e.message);
      if (tin) throw e;                               // ĐỐI CHỨNG: ném thẳng`),
      async (thuMuc) => { const k = await doThieuCotCap(thuMuc);
        return k.r.status !== 200 || (k.r.than && (k.r.than.ds || []).length !== SO_HANG_PHONG_BAN); }]
  ];
  for (const [ma, ten, sua, batDuoc] of DC) {
    const { thuMuc, daGam } = banSrcHong(ma, sua);
    let bat = false, ghiChu = '';
    if (!daGam) ghiChu = 'MŨI TIÊM KHÔNG GĂM — chuỗi neo đã lệch, sửa bàn đo';
    else {
      try { bat = !!(await batDuoc(thuMuc)); }
      catch (e) { bat = true; ghiChu = 'ném lỗi: ' + String(e.message).slice(0, 60); }
    }
    rmSync(thuMuc, { recursive: true, force: true });
    kt(`ĐỐI CHỨNG DC-${ma} — ${ten}`, daGam && bat,
      !daGam ? ghiChu : (bat ? 'bàn đo BẮT ĐƯỢC' + (ghiChu ? ' (' + ghiChu + ')' : '')
                             : 'LỌT — bàn đo mù chỗ này'));
  }

  /* ---- CHẶN KÉP: cửa TRONG phải tự đứng được một mình -------------------
     Đường gán người đi qua HAI cửa: `batBuocXemDuLieuNen` ở router và
     `batBuocToChuc` (duocThemNhanSu) trong `dulieunen.js`. Trên bản lành
     không đo được cửa trong, vì cửa ngoài luôn cắt trước — nên gỡ ĐÚNG cửa
     ngoài rồi hỏi lại cửa trong. Không có phép này thì "chặn ở máy chủ" chỉ
     là một lời hứa về một lớp duy nhất. */
  {
    const { thuMuc, daGam } = banSrcHong('kep', (f, s) => f !== 'index.js' ? s
      : s.replace(`async function dlnGanNguoiVaoPhongBan(req, env) {
  const { phien, loi: l } = await batBuocXemDuLieuNen(req, env);`,
                  `async function dlnGanNguoiVaoPhongBan(req, env) {
  const { phien, loi: l } = await batBuocDangNhap(req, env);`));
    let k = null, loi = '';
    try { k = await doMayChu(thuMuc); } catch (e) { loi = String(e.message).slice(0, 70); }
    finally { rmSync(thuMuc, { recursive: true, force: true }); }
    kt('CHẶN KÉP — gỡ cửa ngoài thì cửa trong (`duocThemNhanSu`) VẪN 403',
      daGam && !!k && k.chan.ganNguoi.status === 403 && k.khongXeDich,
      !daGam ? 'MŨI TIÊM KHÔNG GĂM' : (loi || `HTTP ${k && k.chan.ganNguoi.status}`
        + ` · CSDL ${k && k.khongXeDich ? 'không xê dịch' : 'ĐÃ ĐỔI'}`));
  }
}

if (!CHI_MAY_CHU) {
  const DU = duLieuHienTrang();

  /* ---- SỐ ĐO BẢN CŨ, theo SỐ HIỆU COMMIT CHẾT ------------------------- */
  if (CO_TRUOC) {
    console.log(`\n─── SỐ ĐO BẢN CŨ (commit ${MOC_TRUOC.slice(0, 12)}) ───`);
    for (const man of MAN) {
      const c = await doMotMan(DU, man, { commit: MOC_TRUOC });
      console.log(`  ${man.rong}×${man.cao}  ${c.soHop} hộp (trùng lặp ${c.soHopTrungLap}: `
        + `${(c.idTrungLap || []).join(', ') || '—'}) · tóm tắt "${c.chuTom}"`);
      console.log(`             nút trên hộp: ${c.soNutTruongTrenHop} nút trưởng + ${c.soOXoTrenHop} ô xổ`
        + ` · cao sơ đồ ${c.caoSoDo}px · trang ${c.rongTrang}/${c.rongMan}px`);
    }
  }

  for (const man of MAN) {
    console.log(`\n─── MÀN ${man.rong}×${man.cao} ───`);
    const k = await doMotMan(DU, man);
    if (!kt('Vẽ được sơ đồ', k.co)) continue;
    kt('Không một lỗi console / ngoại lệ nào khi vẽ', (k.loi || []).length === 0,
      (k.loi || []).join(' | ').slice(0, 200) || '—');

    /* ① HỘP VẼ HAI LẦN */
    kt(`① Đúng ${SO_HANG_PHONG_BAN} hộp trên màn, không phải ${SO_HOP_MAN_CU}`,
      k.soHop === SO_HANG_PHONG_BAN, `đếm được ${k.soHop} hộp: ${(k.idHop || []).join(', ')}`);
    kt('① Không id hộp nào xuất hiện hai lần', k.soHopTrungLap === 0,
      (k.idTrungLap || []).join(', ') || '—');

    /* ② DÒNG TÓM TẮT KHÔNG NÓI DỐI */
    kt('② Dòng tóm tắt in ĐÚNG số hộp đang vẽ trên màn',
      k.tomSoHop === k.soHop && k.soDauTrongChu === k.soHop,
      `tóm tắt "${k.chuTom}" · dataset ${k.tomSoHop} · DOM ${k.soHop}`);
    kt('② Và nói rõ nhận được bao nhiêu hàng từ máy chủ',
      k.tomSoHang === SO_HANG_PHONG_BAN, `${k.tomSoHang} hàng`);
    kt('② Vẫn KÊU TO chuyện cây đang phẳng (chưa nạp migration)', k.cayPhang);

    /* CỬA "SỬA" — mỗi hộp một chỗ làm việc, nhưng chỉ MỘT nút trên hộp */
    kt('Mỗi hộp đúng MỘT nút "Sửa", không đẻ thêm nút nào',
      k.soNutSua === k.soHop && k.soNutTruongTrenHop === 0 && k.soOXoTrenHop === 0,
      `${k.soNutSua} nút Sửa · ${k.soNutTruongTrenHop} nút trưởng · ${k.soOXoTrenHop} ô xổ trên hộp`);
    kt('Nút "Sửa" cao ít nhất 44px — bấm được bằng ngón tay', k.caoNutSua >= 44,
      `${k.caoNutSua}px`);
    kt('Giữ nguyên: sửa tên tại chỗ và kéo–thả',
      k.giuSuaTen === k.soHop && k.giuKeoTha > 0,
      `sửa tên ${k.giuSuaTen} · kéo thả ${k.giuKeoTha}`);

    /* ⑤ KHÔNG TRÀN NGANG — sơ đồ */
    kt(`⑤ Sơ đồ không thò ra ngoài khung (${man.rong}px)`, k.tranSoDo.thoRa.length === 0,
      k.tranSoDo.thoRa.map(x => `${x.lop} +${x.lech}px`).join(' · ') || '—');
    kt('⑤ Không phần tử nào của sơ đồ phải cuộn ngang', k.tranSoDo.cuonNgang.length === 0,
      k.tranSoDo.cuonNgang.join(' · ') || '—');
    kt('⑤ Cả trang không có thanh kéo ngang', k.rongTrang <= k.rongMan,
      `trang ${k.rongTrang}px / màn ${k.rongMan}px`);

    /* CỬA MỞ RA — đo lại tất cả với cửa đang mở */
    const c = await doMotMan(DU, man, { moCua: true });
    kt('Cửa "Sửa" mở được từ chính hộp đó', c.cuaMo);
    kt('Cửa có đủ bảy việc: tên · cấp · trực thuộc · trưởng · người · thêm Nhóm con · ẩn hộp',
      !!c.cuaCo && c.cuaCo.ten && c.cuaCo.cap && c.cuaCo.cha && c.cuaCo.truong
      && c.cuaCo.nguoi > 0 && c.cuaCo.themCon && c.cuaCo.an && c.cuaCo.luu,
      JSON.stringify(c.cuaCo));
    kt('Cửa liệt kê đủ người để gán — cả người chưa xếp hộp nào',
      c.cuaCo && c.cuaCo.nguoi === NHAN_SU_THAT.length,
      `${c.cuaCo && c.cuaCo.nguoi}/${NHAN_SU_THAT.length} người`);
    kt('CSDL chưa có cột `cap` thì ô "Cấp" TẮT, không mời bấm rồi báo lỗi',
      c.capTat === true, `disabled = ${c.capTat}`);
    kt(`⑤ Cửa "Sửa" không thò ra ngoài khung ở ${man.rong}px`,
      c.tranCua.thoRa.length === 0,
      c.tranCua.thoRa.map(x => `${x.lop} +${x.lech}px`).join(' · ') || '—');
    kt('⑤ Cửa "Sửa" không sinh thanh kéo NGANG (cuộn dọc thì được)',
      c.tranCua.cuonNgang.length === 0, c.tranCua.cuonNgang.join(' · ') || '—');
    kt('⑤ Cửa mở ra cũng không làm cả trang kéo ngang', c.rongTrang <= c.rongMan,
      `trang ${c.rongTrang}px / màn ${c.rongMan}px`);

    console.log(`      cao sơ đồ ${k.caoSoDo}px · trang ${k.rongTrang}/${k.rongMan}px`);
  }

  /* ======================================================================
     CA ĐỐI CHỨNG TRÌNH DUYỆT (BH-16)
     ====================================================================== */
  console.log('\n─── CA ĐỐI CHỨNG TRÌNH DUYỆT (BH-16) ───');
  const M = MAN[1];    // bẻ ở 375px — nơi mọi thứ dễ hỏng nhất

  /* ---- ẨN HỘP CÒN NGƯỜI: CẢ HAI LỐI ĐỀU PHẢI CẢNH BÁO -------------------
     Lối 1 là cửa "Sửa" trên sơ đồ. Lối 2 là nút "Ẩn" ở ô danh sách "Phòng
     ban" phía dưới — lối CŨ, dễ bị bỏ quên nhất khi máy chủ đổi cách trả lời.
     Không canh lối 2 thì nó bấm xong IM RU: máy chủ từ chối, giao diện không
     đọc câu từ chối, danh sách vẽ lại y như cũ. */
  {
    const k = await doHoiLaiKhiAn(DU, MAN[0]);
    kt('Ẩn hộp còn người ở cửa "Sửa" → HỎI LẠI, có kèm con số người',
      k.cua.daHoi && /17 người/.test(k.cua.cauHoi), `"${(k.cua.cauHoi || '').slice(0, 80)}"`);
    kt('Ẩn hộp còn người ở ô danh sách "Phòng ban" → cũng HỎI LẠI, không im ru',
      k.ds.daHoi && /17 người/.test(k.ds.cauHoi), `"${(k.ds.cauHoi || '').slice(0, 80)}"`);
  }

  /* ---- QUÃNG THỨ HAI: CSDL ĐÃ CÓ CỘT `cap` (mặc định 'phong') -----------
     `them-phongban-ba-tang.sql` đã chạy nhưng `xep-lai-co-cau-2026-09.sql`
     thì chưa — cả 4 hàng mang giá trị mặc định 'phong', không hàng nào cấp
     `cong_ty`. Đây ĐÚNG là ảnh chụp Sếp mô tả: màn 6 hộp, tóm tắt "4 phòng ·
     0 nhóm". Mã phải chạy đúng ở CẢ HAI quãng, nên đo cả hai. */
  {
    const du2 = JSON.parse(JSON.stringify(DU));
    du2.co_cot_cap = true;
    for (const p of du2.ds) p.cap = 'phong';
    const k = await doMotMan(du2, M, { moCua: true });
    kt('Quãng "đã có cột `cap`, chưa xếp cơ cấu": vẫn ĐÚNG 4 hộp, không 6',
      k.co && k.soHop === SO_HANG_PHONG_BAN && k.soHopTrungLap === 0,
      `${k.soHop} hộp · trùng ${k.soHopTrungLap}`);
    kt('Quãng đó dòng tóm tắt in "4 hộp (4 phòng)", không phải "4 phòng" cho 6 hộp',
      k.tomSoHop === k.soHop && /^4 hộp \(4 phòng\)/.test(k.chuTom), `"${k.chuTom}"`);
    kt('Quãng đó ô "Cấp" MỞ — có chỗ ghi cấp thì mới mời bấm', k.capTat === false,
      `disabled = ${k.capTat}`);
  }

  /* ⚠️ CHUẨN HOÁ `\r\n` → `\n` TRƯỚC KHI THAY. Kho này trả CRLF trên Windows,
     nên một mũi tiêm nhiều dòng viết bằng `\n` KHÔNG khớp gì cả — và ca đối
     chứng lặng lẽ trở thành "chạy bản lành rồi khen bản lành". Bắt được đúng
     chuyện đó ở lượt chạy đầu: DC-1 báo 4 hộp, tức là mũi tiêm chưa găm. */
  const nhu = s => String(s).replace(/\r\n?/g, '\n');
  /* Mũi tiêm không găm = ca đối chứng vô nghĩa; báo hỏng BÀN ĐO, không báo lọt. */
  const tiem = (nhan, cu, moi) => (s, ten) => {
    if (ten !== 'assets/js/app.js') return s;
    const g = nhu(s);
    if (!g.includes(cu)) throw new Error('MŨI TIÊM ' + nhan + ' KHÔNG GĂM — chuỗi neo đã lệch');
    return g.replace(cu, moi);
  };

  /* DC-1: gỡ phần lọc "chỉ hộp không có cha" → hộp có cha bị vẽ hai lần */
  {
    const k = await doMotMan(DU, M, { suaTep: tiem('DC-1',
      `const goiPhang = [...ds]
      .filter(p => p.cha_id == null || !ds.some(x => Number(x.id) === Number(p.cha_id)))
      .sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0));`,
      `const goiPhang = [...ds].sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0));`) });
    kt(`ĐỐI CHỨNG DC-1 — bắt được hộp vẽ hai lần (${SO_HOP_MAN_CU} hộp cho ${SO_HANG_PHONG_BAN} hàng)`,
      k.co && k.soHop === SO_HOP_MAN_CU && k.soHopTrungLap === 2,
      `${k.soHop} hộp · trùng ${k.soHopTrungLap} (${(k.idTrungLap || []).join(', ')})`);
  }

  /* DC-2: trả dòng tóm tắt về ĐÚNG công thức cũ (đếm theo cột `cap`). Trên
     bộ dữ liệu hiện trạng nó in "0 phòng · 0 nhóm" trong khi màn có 4 hộp —
     chính là lớp lỗi Sếp gặp: màn 6 hộp, tóm tắt "4 phòng · 0 nhóm".
     ⚠️ Bản đầu của ca này tiêm con số 4 — trùng đúng số hộp thật nên bàn đo
     không thấy gì. Ca đối chứng phải nói một con số SAI, không phải một con
     số khác cách viết. */
  {
    const k = await doMotMan(DU, M, { suaTep: tiem('DC-2',
      'tom.dataset.soHop = String(daVe);',
      "tom.textContent = phong + ' phòng · ' + nhom + ' nhóm'; tom.dataset.soHop = '';") });
    kt('ĐỐI CHỨNG DC-2 — bắt được dòng tóm tắt lệch số hộp thật',
      k.co && !(k.tomSoHop === k.soHop && k.soDauTrongChu === k.soHop),
      `tóm tắt "${k.chuTom}" · DOM ${k.soHop} hộp · tóm tắt đọc ra ${k.soDauTrongChu}`);
  }

  /* DC-7: trả lối "Ẩn" ở ô danh sách về cách gọi cũ (không đọc `can_xac_nhan`)
     → nút bấm xong IM RU, không một câu hỏi nào. Đây là lớp lỗi dễ tái phát
     nhất: máy chủ đổi cách trả lời mà MỘT trong hai lối gọi quên đọc. */
  {
    const k = await doHoiLaiKhiAn(DU, MAN[0], tiem('DC-7',
      'const kq = await API.dlnSuaPhongBan(id, { hoat_dong: 0 });',
      'const kq = await API.dlnSuaPhongBan(id, { hoat_dong: 0 }); return kq;'));
    kt('ĐỐI CHỨNG DC-7 — bắt được lối "Ẩn" ở ô danh sách khi nó im ru',
      !k.ds.daHoi && k.cua.daHoi,
      `ô danh sách hỏi lại: ${k.ds.daHoi} · cửa "Sửa" hỏi lại: ${k.cua.daHoi}`);
  }

  /* DC-5: ép danh sách người trong cửa Sửa nằm ngang → tràn ở 375px */
  {
    const CHEN = `<style id="dc-tran">#sodoSua-nguoi{display:flex !important;flex-wrap:nowrap !important}`
      + `#sodoSua-nguoi .sodo-nguoi{flex:0 0 240px !important}</style>`;
    const k = await doMotMan(DU, M, { moCua: true, suaTep: (s, ten) =>
      ten === 'app.html' ? s.replace('</head>', CHEN + '</head>') : s });
    kt('ĐỐI CHỨNG DC-5 — bắt được tràn ngang khi ép danh sách người nằm ngang ở 375px',
      k.co && k.cuaMo && (k.tranCua.thoRa.length > 0 || k.tranCua.cuonNgang.length > 0
        || k.rongTrang > k.rongMan),
      k.tranCua.thoRa.map(x => `${x.lop} +${x.lech}px`).join(' · ')
        || k.tranCua.cuonNgang.join(' · ') || `trang ${k.rongTrang}/${k.rongMan}`);
  }
}

/* SÀN TRƯỚC, TỔNG KẾT SAU. `tongKet()` chỉ biết "có phép nào trượt không";
   nó KHÔNG biết "có phép nào chạy không". Hỏi câu thứ hai ở đây. */
const san = (CHI_MAY_CHU && !TU_KIEM_SAN) ? SAN_PHEP.chi_may_chu : SAN_PHEP.du;
const xanh = tongKet();
if (SO_PHEP < san) {
  console.log(`\n❌ BÀN ĐO CHỈ CHẠY ${SO_PHEP}/${san} PHÉP — ĐỎ, dù không phép nào trượt.`);
  console.log('   Bàn đo dừng giữa chừng (ngoại lệ nuốt mất, treo, hay ai đó xoá phép đi).');
  console.log('   "Không phép nào trượt" và "đã đo xong" là hai chuyện khác nhau.');
  process.exit(1);
}
process.exit(xanh ? 0 : 1);
