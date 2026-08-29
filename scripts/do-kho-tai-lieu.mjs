/* ==========================================================================
   BÀN ĐO KHO TÀI LIỆU — CTL-0026 Đợt 1
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-kho-tai-lieu.mjs

   ĐO THẬT, KHÔNG KHỚP CHUỖI. `src/tai-lieu.js` là ESM thuần (không dùng API
   riêng của Workers ở tầng module), nên nạp thẳng vào Node và GỌI THẬT được,
   với một cái D1 giả đếm từng lượt ghi và một `fetch` giả đóng vai Google.
   Nhờ vậy các con số dưới đây là số ĐO ĐƯỢC, không phải số đọc code đoán ra.

   NĂM MỤC:
     ① QUYỀN THEO NHÓM   — ma trận đầy đủ, gọi thật qua hàm xử lý HTTP
     ② CA ĐỐI CHỨNG BH-16 — nạp một bản `tai-lieu.js` ĐÃ BỎ chỗ chặn.
                            Bản đó PHẢI ra 200. Nếu nó cũng 403 thì phép đo
                            hỏng chứ không phải code đúng.
     ③ LƯỢT GHI D1        — đếm số lần `.run()` chạm vào D1 cho MỘT lượt quét
                            và cho các lượt MỞ tài liệu.
     ④ TÌM CÓ DẤU/KHÔNG DẤU — chạy thật qua `danhSachTaiLieu`, xem câu SQL và
                            tham số nó sinh ra.
     ⑤ GỘP TRANG THÀNH PDF — dựng JPEG thật, gộp, rồi mổ lại file PDF: đủ số
                            trang chưa, bảng xref có trỏ đúng byte không.
                            Kèm đối chứng: cố ý lệch 1 byte → phải bắt được.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAM = path.join(GOC, '.do-tam');
mkdirSync(TAM, { recursive: true });

let soHong = 0;
const dat = (ok, nhan, them = '') => {
  if (!ok) soHong++;
  console.log(`  ${ok ? 'ĐẠT ' : '✗ HỎNG'}  ${nhan}${them ? '   ' + them : ''}`);
  return ok;
};
const muc = (s) => console.log(`\n─── ${s} ───`);

/** Đọc mã nguồn để VÁ TẠM (ca đối chứng) — luôn quy về xuống dòng LF.
 *  Git trên máy Windows này tự đổi LF ↔ CRLF khi checkout/stash, nên chuỗi
 *  nhiều dòng viết trong bàn đo có lúc khớp có lúc không, tuỳ file vừa đi qua
 *  lệnh git nào. Số đo mà đổi theo cấu hình git là số đo không dùng được. */
const docNguon = (t) => readFileSync(path.join(GOC, t), 'utf8').replace(/\r\n/g, '\n');

/* ==========================================================================
   D1 GIẢ — đếm từng lượt đọc/ghi
   ========================================================================== */
function d1Gia(traVe = {}) {
  const so = { doc: 0, ghi: 0 };
  const cau = [];
  const db = {
    prepare(sql) {
      const ban = [];
      const o = {
        bind(...b) { ban.push(...b); return o; },
        async first() {
          so.doc++; cau.push({ sql, ban, kieu: 'first' });
          return typeof traVe.first === 'function' ? traVe.first(sql, ban) : (traVe.first ?? null);
        },
        async all() {
          so.doc++; cau.push({ sql, ban, kieu: 'all' });
          const r = typeof traVe.all === 'function' ? traVe.all(sql, ban) : traVe.all;
          return { results: r || [] };
        },
        async run() {
          /* CHỈ đếm là GHI khi câu lệnh thật sự ghi. `SELECT ... .run()` có
             tồn tại trong repo (thăm dò bảng), đếm nhầm là số báo cáo sai. */
          if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql)) so.ghi++;
          else so.doc++;
          cau.push({ sql, ban, kieu: 'run' });
          return { meta: { changes: 1, rows_written: 1 } };
        }
      };
      return o;
    }
  };
  return { db, so, cau };
}

/** `env` giả đủ để `luuTaiLieu` chạy trọn vẹn. */
function envGia(traVe, aiTraVe = 'NỘI DUNG BÓC ĐƯỢC') {
  const { db, so, cau } = d1Gia(traVe);
  return {
    env: {
      DB: db,
      AI: { async run() { return { response: aiTraVe }; } },
      GOOGLE_CLIENT_ID: 'gia', GOOGLE_CLIENT_SECRET: 'gia', GOOGLE_REFRESH_TOKEN: 'gia'
    },
    so, cau
  };
}

/* DRIVE GIẢ — cấp vé, tạo thư mục, nhận file, VÀ XOÁ file. Không một byte nào
   ra Internet: bàn đo phải chạy được cả khi mất mạng.
   Giữ hẳn một `Set` các file đang nằm trên "Drive" để ĐẾM ĐƯỢC FILE MỒ CÔI —
   không đếm được thì câu "0 file mồ côi" chỉ là lời hứa. */
let soLuotGoiGoogle = 0;
const driveGia = new Set();
globalThis.fetch = async (u, tuyChon = {}) => {
  soLuotGoiGoogle++;
  const url = String(u);
  const cach = String(tuyChon.method || 'GET').toUpperCase();
  if (url.includes('oauth2.googleapis.com')) {
    return new Response(JSON.stringify({ access_token: 've-gia', expires_in: 3600 }), { status: 200 });
  }
  if (cach === 'DELETE') {
    const ma = url.split('/files/')[1];
    driveGia.delete(ma);
    /* 204 BẮT BUỘC thân rỗng — `new Response('', {status:204})` ném lỗi ngay
       trong bàn đo, và lỗi đó lại rơi đúng vào `catch` của đường dọn file, làm
       phép đo báo "dọn hụt" trong khi file đã bị xoá. Đúng kiểu số đo vô lý mà
       nguyên nhân nằm ở BÀN ĐO (BH-17). */
    return new Response(null, { status: 204 });
  }
  const id = 'drive-gia-' + soLuotGoiGoogle;
  /* Chỉ tính là FILE khi đây là lượt tải nội dung lên; tạo thư mục thì không. */
  if (url.includes('/upload/')) driveGia.add(id);
  return new Response(JSON.stringify({ id, size: 1234 }), { status: 200 });
};

const phienCua = (vaiTro, id = 'ns_test') => ({ vai_tro: vaiTro, nhan_su_id: id });
const doc = async (res) => { try { return await res.json(); } catch { return {}; } };

/* ==========================================================================
   ① QUYỀN THEO NHÓM GIẤY TỜ
   ========================================================================== */
const tailieu = await import(pathToFileURL(path.join(GOC, 'src/tai-lieu.js')).href);
const quyen = await import(pathToFileURL(path.join(GOC, 'src/quyen.js')).href);

/** Một dòng trong bảng `tai_lieu` — dùng cho mọi phép mở. */
const banGhiNhanSu = {
  id: 'tl_cccd_1', nhom: 'nhan_su', tieu_de: 'CCCD Nguyễn Thị Huyền',
  nhay_cam: 1, kho_nha: 'drive', kho_khoa: 'drive-x', so_trang: 2,
  noi_dung: 'Căn cước công dân', an: 0
};
const banGhiKeToan = {
  id: 'tl_hd_1', nhom: 'ke_toan', tieu_de: 'Hoá đơn GTGT tháng 8',
  nhay_cam: 0, kho_nha: 'drive', kho_khoa: 'drive-y', so_trang: 1, an: 0
};

async function moBang(vaiTro, banGhi, mod = tailieu) {
  /* Kho nhật ký của D1 giả RỖNG — `ghiNhatKy()` đọc trước khi ghi, nên câu tra
     `tai_lieu_nhat_ky` phải trả null, không phải trả nhầm bản ghi tài liệu.
     Trả nhầm là bàn đo tự bịa ra "đã ghi hôm nay rồi" và mọi số đếm sai theo. */
  const { env, so } = envGia({ first: (sql) => /tai_lieu_nhat_ky/i.test(sql) ? null : banGhi });
  const res = await mod.moTaiLieu(env, phienCua(vaiTro), banGhi.id);
  return { ma: res.status, than: await doc(res), so };
}

muc('① QUYỀN THEO NHÓM GIẤY TỜ — cắt ở MÁY CHỦ, gọi thật qua hàm xử lý');

const MA_TRAN = [
  // [vai trò,          nhóm,        được XEM?, được LƯU?]
  ['admin',           'nhan_su',   true,  true],
  ['hcns',            'nhan_su',   true,  true],
  ['quan_ly_kho',     'nhan_su',   false, false],   // ⚠️ ràng buộc CTL-0025 Mục 4
  ['ke_toan_truong',  'nhan_su',   false, false],   // ⚠️ ca đối chứng CTL-0026 Mục 7
  ['nhan_vien_kho',   'nhan_su',   false, false],
  ['cskh',            'nhan_su',   false, false],
  ['admin_backup',    'nhan_su',   false, false],
  ['ke_toan_truong',  'ke_toan',   true,  true],
  ['quan_ly_kho',     'ke_toan',   false, false],
  ['van_hanh_san',    'attp',      true,  true],
  ['van_hanh_san',    'phap_ly',   false, false],
  ['nhan_vien_kho',   'noi_bo',    true,  false],   // xem quy trình, không được lưu
  ['vai_tro_la_hoac', 'noi_bo',    false, false],   // vai trò lạ → không quyền gì
  ['admin',           'nhom_la',   false, false]    // nhóm lạ → chặn, đừng đoán
];
for (const [vt, nh, xemMong, luuMong] of MA_TRAN) {
  const xem = quyen.duocXemNhomTaiLieu(vt, nh);
  const luu = quyen.duocLuuNhomTaiLieu(vt, nh);
  dat(xem === xemMong && luu === luuMong,
    `${vt.padEnd(15)} × ${nh.padEnd(10)}`,
    `xem=${xem ? 'CÓ' : 'KHÔNG'} lưu=${luu ? 'CÓ' : 'KHÔNG'}`);
}

muc('① b. Gọi THẬT qua hàm xử lý HTTP — mã trả về phải là 403');
{
  const a = await moBang('ke_toan_truong', banGhiNhanSu);
  dat(a.ma === 403, 'Kế toán trưởng mở CCCD nhân viên', `→ HTTP ${a.ma} · "${a.than.loi || ''}"`);
  const b = await moBang('quan_ly_kho', banGhiNhanSu);
  dat(b.ma === 403, 'Quản lý kho mở CCCD nhân viên', `→ HTTP ${b.ma}`);
  const c = await moBang('hcns', banGhiNhanSu);
  dat(c.ma === 200, 'HCNS mở CCCD nhân viên (phải ĐƯỢC)', `→ HTTP ${c.ma}`);
  const d = await moBang('ke_toan_truong', banGhiKeToan);
  dat(d.ma === 200, 'Kế toán trưởng mở hoá đơn (phải ĐƯỢC)', `→ HTTP ${d.ma}`);

  // Tải FILE cũng phải chặn — không chỉ chặn ở màn xem thông tin.
  const { env } = envGia({ first: () => banGhiNhanSu });
  const e = await tailieu.tepTaiLieu(env, phienCua('ke_toan_truong'), banGhiNhanSu.id);
  dat(e.status === 403, 'Kế toán trưởng TẢI file CCCD', `→ HTTP ${e.status}`);

  // Lưu vào nhóm không có quyền.
  const { env: env2 } = envGia({ first: () => null });
  const f = await tailieu.luuTaiLieu(env2, phienCua('ke_toan_truong'), {
    nhom: 'nhan_su', tieu_de: 'Thử lách', so_trang: 1, tep: 'AAAA'
  });
  dat(f.status === 403, 'Kế toán trưởng LƯU vào nhóm nhân sự', `→ HTTP ${f.status}`);
}

/* ==========================================================================
   ② CA ĐỐI CHỨNG (BH-16) — bản CỐ Ý BỎ chỗ chặn phải ra 200
   ---------------------------------------------------------------------------
   BH-26: đối chứng phải ĐÚNG CHỖ. Chỗ hỏng ở đây là ĐÚNG MỘT lệnh `if` trong
   `layVaKiemQuyen`. Bỏ nó đi thì kế toán trưởng phải mở được CCCD — nếu bản
   bỏ chặn VẪN ra 403 thì phép đo đang bắt nhầm thứ khác, và mọi dòng "ĐẠT"
   ở mục ① đều vô nghĩa.
   ========================================================================== */
muc('② CA ĐỐI CHỨNG (BH-16) — bản BỎ CHẶN phải LỌT');
{
  const goc = docNguon('src/tai-lieu.js');
  const chan = `  if (!duocXemNhomTaiLieu(phien.vai_tro, tl.nhom)) {
    return { loi: loi('Bạn không có quyền xem nhóm giấy tờ này', 403) };
  }`;
  if (!goc.includes(chan)) {
    dat(false, 'Tìm được đúng chỗ chặn để gỡ', '→ đã đổi mã, sửa lại bàn đo!');
  } else {
    const boChan = goc
      .replace(chan, '  /* CỐ Ý BỎ CHẶN — ca đối chứng BH-16 */')
      .replace(/from '\.\/(quyen|kho-file|nhac-nhan-su)\.js'/g,
               (m, t) => `from '${pathToFileURL(path.join(GOC, 'src', t + '.js')).href}'`);
    const duong = path.join(TAM, 'tai-lieu-BO-CHAN.mjs');
    writeFileSync(duong, boChan);
    const modHong = await import(pathToFileURL(duong).href + '?v=' + Date.now());
    const r = await moBang('ke_toan_truong', banGhiNhanSu, modHong);
    dat(r.ma === 200,
      'Bản BỎ CHẶN: kế toán trưởng mở được CCCD',
      `→ HTTP ${r.ma} (phải 200 — nếu 403 thì PHÉP ĐO hỏng)`);
    console.log('     → Chốt: bản có chặn 403, bản bỏ chặn 200. Phép đo đủ nhạy.');
  }
}

/* ==========================================================================
   ③ LƯỢT GHI D1 — hạn mức vừa vá xong, không được đẻ đường ghi dày
   ========================================================================== */
muc('③ LƯỢT GHI D1');
{
  /* Một lượt quét TRỌN VẸN: 3 trang, nhóm kế toán, đã có sẵn thư mục Drive
     trong `sao_luu_thu_muc` (trạng thái bình thường sau tài liệu đầu tiên). */
  const jpegGia = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
    'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');
  const pdfGia = Buffer.concat([Buffer.from('%PDF-1.4\n'), jpegGia, Buffer.from('\n%%EOF\n')]);

  const { env, so, cau } = envGia({
    first: (sql) => /sao_luu_thu_muc/.test(sql) ? { drive_id: 'tm-co-san' }
                  : /ma_gui/.test(sql) ? null : null
  });
  const res = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), {
    ma_gui: 'mg-1', nhom: 'ke_toan', tieu_de: 'Hoá đơn tháng 8', so_trang: 3,
    ngay_het_han: '2027-12-31',
    tep: pdfGia.toString('base64'),
    anh_boc_chu: [jpegGia.toString('base64'), jpegGia.toString('base64')]
  });
  const than = await doc(res);
  dat(res.status === 200, 'Lưu một bộ 3 trang', `→ HTTP ${res.status} ${than.loi || ''}`);
  dat(so.ghi === 1, 'MỘT lượt quét = ĐÚNG 1 lượt ghi D1', `→ đo được ${so.ghi} lượt ghi, ${so.doc} lượt đọc`);
  const cauGhi = cau.filter(c => /^\s*(INSERT|UPDATE|DELETE)/i.test(c.sql));
  console.log('     → Câu ghi duy nhất: ' + cauGhi.map(c => c.sql.trim().split('\n')[0]).join(' | '));

  /* Gửi LẠI cùng `ma_gui` (sóng yếu) — KHÔNG được ghi thêm, KHÔNG được đẩy
     file lên Drive lần nữa. */
  const truocGoogle = soLuotGoiGoogle;
  const { env: env2, so: so2 } = envGia({ first: (sql) => /ma_gui/.test(sql) ? { id: 'tl_cu', kho_khoa: 'k', so_trang: 3 } : null });
  const res2 = await tailieu.luuTaiLieu(env2, phienCua('ke_toan_truong'), {
    ma_gui: 'mg-1', nhom: 'ke_toan', tieu_de: 'Hoá đơn tháng 8', so_trang: 3,
    tep: pdfGia.toString('base64')
  });
  const than2 = await doc(res2);
  dat(res2.status === 200 && than2.da_co_san === true && so2.ghi === 0,
    'Gửi lại khi sóng yếu: không tạo bản trùng',
    `→ ghi thêm ${so2.ghi} lượt, gọi Drive thêm ${soLuotGoiGoogle - truocGoogle} lượt`);

  /* MỞ tài liệu: nhóm thường KHÔNG ghi gì; nhóm nhạy cảm ghi 1 lượt/người/ngày. */
  const a = await moBang('ke_toan_truong', banGhiKeToan);
  dat(a.so.ghi === 0, 'Mở tài liệu nhóm thường: 0 lượt ghi', `→ ${a.so.ghi}`);
  const b = await moBang('hcns', banGhiNhanSu);
  dat(b.so.ghi === 1, 'Mở tài liệu NHẠY CẢM: 1 lượt ghi (nhật ký)', `→ ${b.so.ghi}`);

  /* Đọc danh sách: tuyệt đối không ghi. */
  const { env: env3, so: so3 } = envGia({ all: () => [] });
  await tailieu.danhSachTaiLieu(env3, phienCua('admin'), new URLSearchParams());
  dat(so3.ghi === 0, 'Xem danh sách kho: 0 lượt ghi', `→ ${so3.ghi}`);
}

/* ==========================================================================
   ④ TÌM ĐƯỢC BẰNG TIẾNG VIỆT CÓ DẤU VÀ KHÔNG DẤU
   ========================================================================== */
muc('④ TÌM CÓ DẤU / KHÔNG DẤU');
{
  const CA = [
    ['Giấy chứng nhận ATTP', 'giay chung nhan attp'],
    ['Hợp đồng lao động',    'hop dong lao dong'],
    ['Tờ khai hải quan',     'to khai hai quan'],
    ['ĐĂNG KÝ KINH DOANH',   'dang ky kinh doanh'],
    ['Quyết định bổ nhiệm',  'quyet dinh bo nhiem']
  ];
  for (const [coDau, mong] of CA) {
    const ra = tailieu.boDau(coDau);
    dat(ra === mong, `boDau("${coDau}")`, `→ "${ra}"`);
  }
  /* Bẫy kinh điển: NFD KHÔNG tách chữ đ. Bỏ sót là "hợp đồng" tra ra "hop ong". */
  dat(!tailieu.boDau('Đồng').includes('ong') || tailieu.boDau('Đồng') === 'dong',
    'Chữ Đ/đ được đổi thành D/d (NFD không tự làm)', `→ "${tailieu.boDau('Đồng')}"`);

  /* Chạy thật qua danh sách: câu SQL sinh ra phải soi cột `tim_kiem` đã bỏ dấu. */
  const { env, cau } = envGia({ all: () => [] });
  await tailieu.danhSachTaiLieu(env, phienCua('admin'),
    new URLSearchParams({ q: 'Hợp Đồng nhà cung cấp' }));
  const c = cau[cau.length - 1];
  const thamSoTim = c.ban.filter(x => typeof x === 'string' && x.startsWith('%'));
  dat(thamSoTim.length === 5 && thamSoTim.every(x => !/[À-ỹ]/.test(x)),
    'Câu tìm gửi xuống D1 đã BỎ DẤU',
    '→ ' + JSON.stringify(thamSoTim));

  /* Người xem hẹp thì SQL chỉ được hỏi đúng các nhóm họ xem được. */
  const { env: e2, cau: c2 } = envGia({ all: () => [] });
  await tailieu.danhSachTaiLieu(e2, phienCua('quan_ly_kho'), new URLSearchParams());
  const cuoi = c2[c2.length - 1];
  const coNhanSu = cuoi.ban.includes('nhan_su');
  dat(!coNhanSu, 'SQL của quản lý kho KHÔNG hỏi nhóm nhân sự',
    '→ nhóm hỏi: ' + cuoi.ban.filter(x => quyen.MA_NHOM_TAI_LIEU.includes(x)).join(', '));

  /* Lọc theo một nhóm mình không được xem → 403, không phải danh sách rỗng.
     Trả rỗng thì người ta tưởng kho trống, mà thật ra là không có quyền. */
  const { env: e3 } = envGia({ all: () => [] });
  const r3 = await tailieu.danhSachTaiLieu(e3, phienCua('quan_ly_kho'),
    new URLSearchParams({ nhom: 'nhan_su' }));
  dat(r3.status === 403, 'Lọc nhóm không có quyền → 403 (không phải rỗng)', `→ HTTP ${r3.status}`);
}

/* ==========================================================================
   ⑤ GỘP NHIỀU TRANG THÀNH MỘT TÀI LIỆU
   ========================================================================== */
muc('⑤ GỘP TRANG THÀNH MỘT FILE PDF');
{
  const gop = await import(pathToFileURL(path.join(GOC, 'public/assets/js/gop-trang-pdf.js')).href);

  /** JPEG tối thiểu ĐÚNG CẤU TRÚC, kích thước tự đặt — để đo `kichThuocJPEG`
   *  đọc đúng chứ không phải ta tự khai. */
  function jpegThu(rong, cao, kenh = 3) {
    const sof = Buffer.alloc(19);
    sof.writeUInt16BE(0xFFC0, 0); sof.writeUInt16BE(17, 2);
    sof.writeUInt8(8, 4); sof.writeUInt16BE(cao, 5); sof.writeUInt16BE(rong, 7);
    sof.writeUInt8(kenh, 9);
    return Buffer.concat([
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
      sof,
      Buffer.from([0xFF, 0xDA, 0x00, 0x08, 1, 1, 0, 0, 0x3F, 0x00]),
      Buffer.alloc(2048, 0x5A),
      Buffer.from([0xFF, 0xD9])
    ]);
  }

  const kt = gop.kichThuocJPEG(new Uint8Array(jpegThu(3024, 4032)));
  dat(kt.rong === 3024 && kt.cao === 4032 && kt.kenh === 3,
    'Đọc đúng kích thước thật trong luồng JPEG', `→ ${kt.rong}×${kt.cao}, ${kt.kenh} kênh`);

  const trang = [jpegThu(3024, 4032), jpegThu(2400, 3200), jpegThu(1800, 2400)]
    .map(b => new Uint8Array(b));
  const pdf = gop.gopTrangThanhPDF(trang, { tieuDe: 'Hợp đồng lao động — Nguyễn Thị Huyền' });
  const chu = Buffer.from(pdf).toString('latin1');

  dat(chu.startsWith('%PDF-1.4'), 'Có chữ ký đầu file PDF');
  dat(chu.trimEnd().endsWith('%%EOF'), 'Có dấu kết thúc %%EOF');
  const soPage = (chu.match(/\/Type \/Page[^s]/g) || []).length;
  dat(soPage === 3, 'BA ảnh rời → MỘT tài liệu ba trang', `→ ${soPage} trang, 1 file`);
  dat((chu.match(/\/Filter \/DCTDecode/g) || []).length === 3,
    'Ảnh nhúng nguyên khối JPEG (không giải mã, không nén lại)');

  const tongAnh = trang.reduce((a, t) => a + t.length, 0);
  dat(pdf.length < tongAnh + 4096,
    'PDF chỉ nặng hơn tổng ảnh vài trăm byte',
    `→ ảnh ${tongAnh} B → PDF ${pdf.length} B (+${pdf.length - tongAnh} B)`);

  /* Bảng xref phải trỏ ĐÚNG BYTE. Sai một byte thì trình đọc PDF báo hỏng
     file — mà nó KHÔNG báo lúc ta ghi, chỉ báo lúc Sếp mở ra ba tháng sau. */
  function xrefDung(bytes) {
    const s = Buffer.from(bytes).toString('latin1');
    const m = /startxref\s+(\d+)/.exec(s);
    if (!m) return false;
    const bang = s.slice(Number(m[1]));
    if (!bang.startsWith('xref')) return false;
    /* Dòng 0 = 'xref', dòng 1 = '0 N', dòng 2 = mục trống của đối tượng 0.
       Đối tượng số 1 nằm ở DÒNG 3 — lệch một dòng ở đây là phép đo báo hỏng
       oan cho một file PDF hoàn toàn đúng (BH-17: số đo vô lý thì nghi PHÉP
       ĐO trước). Lần chạy đầu của bàn đo này đã sai đúng chỗ đó. */
    const dong = bang.split('\n').slice(3);
    const soObj = Number(/xref\s+0\s+(\d+)/.exec(bang)?.[1] || 0) - 1;
    for (let i = 0; i < soObj; i++) {
      const oc = Number((dong[i] || '').slice(0, 10));
      if (!s.startsWith(`${i + 1} 0 obj`, oc)) return false;
    }
    return soObj > 0;
  }
  dat(xrefDung(pdf), 'Bảng xref trỏ đúng byte của từng đối tượng',
    `→ kiểm ${3 + 3 * 3} đối tượng`);

  /* ĐỐI CHỨNG BH-16/BH-26: lệch CƠ HỌC 1 byte — hỏng với mọi dữ liệu đầu vào,
     không phụ thuộc tính chất của ảnh thử. Phép kiểm PHẢI đỏ. */
  const lech = new Uint8Array(pdf.length + 1);
  lech.set([0x0A], 0); lech.set(pdf, 1);
  dat(xrefDung(lech) === false,
    'ĐỐI CHỨNG: chèn 1 byte làm lệch mọi vị trí → phép kiểm BẮT ĐƯỢC',
    '→ nếu vẫn "đúng" thì phép kiểm vô dụng');

  const trong = (() => { try { gop.gopTrangThanhPDF([]); return false; } catch { return true; } })();
  dat(trong, 'Gộp 0 trang thì báo lỗi, không đẻ file rỗng');
}

/* ==========================================================================
   ⑥ CÂU CẢNH BÁO PHÁP LÝ — phải CÓ MẶT, không được lặng lẽ biến mất
   ========================================================================== */
muc('⑥ CÂU "KHÔNG THAY BẢN GIẤY" — có mặt ở cả ba nơi');
{
  const cauGoc = 'KHÔNG thay bản giấy';
  const noi = [
    ['máy chủ (src/tai-lieu.js)', tailieu.CANH_BAO_PHAP_LY],
    ['màn quét (quet-tai-lieu.js)', readFileSync(path.join(GOC, 'public/assets/js/quet-tai-lieu.js'), 'utf8')],
    ['tab Kho tài liệu (app.html)', readFileSync(path.join(GOC, 'public/app.html'), 'utf8')]
  ];
  for (const [ten, noiDung] of noi) dat(String(noiDung).includes(cauGoc), `Có câu ở ${ten}`);

  /* Và câu đó phải THEO cả câu trả lời của máy chủ, không chỉ nằm trong hằng số. */
  const { env } = envGia({ all: () => [] });
  const r = await doc(await tailieu.danhSachTaiLieu(env, phienCua('admin'), new URLSearchParams()));
  dat(String(r.canh_bao || '').includes(cauGoc), 'Máy chủ đính câu đó vào mỗi lượt trả danh sách');

  /* Nhóm nhân sự phải bắt ghi nhận ĐỒNG Ý (Luật BVDLCN 91/2025/QH15). */
  const { env: e2 } = envGia({ first: () => null });
  const thieu = await tailieu.luuTaiLieu(e2, phienCua('hcns'), {
    nhom: 'nhan_su', tieu_de: 'CCCD anh Duy', so_trang: 1, tep: 'AAAA'
  });
  dat(thieu.status === 400 && String((await doc(thieu)).loi).includes('đồng ý'),
    'Thiếu dấu ĐỒNG Ý → chặn ngay, không lưu', `→ HTTP ${thieu.status}`);
}

/* ==========================================================================
   ⑦ NÚT ≥44px — đọc từ CSS THẬT, kèm đối chứng
   ========================================================================== */
muc('⑦ NGƯỠNG NGÓN TAY 44px trong CSS thật');
{
  const css = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');
  const NUT = ['.tl-nut-quet', '.tl-chip', '.tl-nut-mo', '.tl-tim', '.tl-loc-han',
    '.tlq-x', '.tlq-o-nhom', '.tlq-nut-chinh', '.tlq-nut-nhi', '.tlq-nut-phu', '.tlq-o'];
  function caoNhoNhat(sel, nguon) {
    /* Phải chặn ở ranh giới tên lớp: `.tlq-o` KHÔNG được khớp nhầm vào
       `.tlq-o-nhom`. Và giữa tên lớp với dấu ngoặc có khoảng trắng. */
    const m = new RegExp(sel.replace('.', '\\.') + '(?![-\\w])(?:[:,][^{]*)?\\s*\\{([^}]*)\\}').exec(nguon);
    if (!m) return null;
    const h = /min-height:\s*(\d+)px/.exec(m[1]);
    return h ? Number(h[1]) : null;
  }
  for (const sel of NUT) {
    const c = caoNhoNhat(sel, css);
    dat(c !== null && c >= 44, `${sel.padEnd(18)} min-height`, `→ ${c === null ? 'KHÔNG KHAI' : c + 'px'}`);
  }
  /* ĐỐI CHỨNG: hạ đúng một luật xuống 40px trên bản sao → phép đo phải đỏ. */
  const cssHong = css.replace('.tlq-nut-nhi {\n  display: block; width: 100%; min-height: 44px;',
                              '.tlq-nut-nhi {\n  display: block; width: 100%; min-height: 40px;');
  const doiChung = caoNhoNhat('.tlq-nut-nhi', cssHong);
  dat(doiChung === 40, 'ĐỐI CHỨNG: hạ .tlq-nut-nhi xuống 40px → phép đo BẮT ĐƯỢC',
    `→ đọc ra ${doiChung}px`);
}

/* ==========================================================================
   ⑧ BỐN CHỖ REV-0036 BẮT — đo trên SQLite THẬT, không phải D1 giả
   ---------------------------------------------------------------------------
   Ba mục dưới đây đo thứ mà D1 giả KHÔNG đo nổi:
     · "mở 10 lần tốn mấy lượt ghi" — cần một bảng có trí nhớ THẬT
     · "`trich` có lọt ra không" — cần chạy ĐÚNG câu SQL trên dữ liệu thật,
       chứ khớp chuỗi trong mã nguồn thì sửa chuỗi là qua
     · "gửi lại lúc lần 1 còn đang bay" — cần `UNIQUE(ma_gui)` ép thật

   Nên nạp thẳng `migrations/them-kho-tai-lieu.sql` vào `node:sqlite` (có sẵn
   trong Node, không cài gói nào) và cho `src/tai-lieu.js` chạy trên đó. Đây là
   ĐÚNG lược đồ sẽ nạp lên D1, không phải một bản chép tay.
   ========================================================================== */
const { DatabaseSync } = await import('node:sqlite');

function d1SQLite() {
  const kho = new DatabaseSync(':memory:');
  kho.exec(readFileSync(path.join(GOC, 'migrations/them-kho-tai-lieu.sql'), 'utf8'));
  kho.exec('CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT)');
  /* `src/kho-file.js` ghi nhớ thư mục Drive ở đây. Nạp sẵn hai dòng = trạng
     thái BÌNH THƯỜNG sau tài liệu đầu tiên của mỗi nhóm (≤8 dòng cả đời), để
     phép đếm lượt ghi đo đúng lượt quét thứ hai trở đi chứ không đo lượt đầu. */
  kho.exec(`CREATE TABLE IF NOT EXISTS sao_luu_thu_muc (
              khoa TEXT PRIMARY KEY, drive_id TEXT NOT NULL,
              tao_luc TEXT NOT NULL DEFAULT (datetime('now','+7 hours')));
            INSERT INTO sao_luu_thu_muc (khoa, drive_id) VALUES
              ('tailieu_goc','tm-goc'), ('tailieu_ke_toan','tm-kt'), ('tailieu_nhan_su','tm-ns');`);
  const so = { doc: 0, ghi: 0 };
  const db = {
    prepare(sql) {
      const ban = [];
      const o = {
        bind(...b) { ban.push(...b.map(v => v === undefined ? null : v)); return o; },
        async first() { so.doc++; return kho.prepare(sql).get(...ban) ?? null; },
        async all() { so.doc++; return { results: kho.prepare(sql).all(...ban) }; },
        async run() {
          if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql)) so.ghi++; else so.doc++;
          const r = kho.prepare(sql).run(...ban);
          return { meta: { changes: Number(r.changes), rows_written: Number(r.changes) } };
        }
      };
      return o;
    }
  };
  const env = {
    DB: db,
    AI: { async run() { return { response: 'CHỮ BÓC ĐƯỢC TỪ ẢNH' }; } },
    GOOGLE_CLIENT_ID: 'gia', GOOGLE_CLIENT_SECRET: 'gia', GOOGLE_REFRESH_TOKEN: 'gia'
  };
  return { kho, env, so, datLai: () => { so.doc = 0; so.ghi = 0; } };
}

/** Nạp một bản `tai-lieu.js` ĐÃ VÁ — dùng cho mọi ca đối chứng ở dưới.
 *  `thay` là [tìm, thế]. Không tìm thấy chuỗi thì HỎNG NGAY, không âm thầm
 *  chạy bản y hệt rồi báo "đối chứng đạt" (BH-17: bàn đo hỏng cũng phải kêu). */
let soBanVa = 0;
async function napBanVa(nhan, ...thay) {
  let ma = docNguon('src/tai-lieu.js');
  for (const [tim, the] of thay) {
    if (!ma.includes(tim)) { dat(false, `Bản vá "${nhan}": tìm được chỗ để sửa`, '→ đã đổi mã, sửa lại bàn đo!'); return null; }
    ma = ma.replace(tim, the);
  }
  ma = ma.replace(/from '\.\/(quyen|kho-file|nhac-nhan-su)\.js'/g,
    (m, t) => `from '${pathToFileURL(path.join(GOC, 'src', t + '.js')).href}'`);
  const duong = path.join(TAM, `tai-lieu-va-${++soBanVa}.mjs`);
  writeFileSync(duong, ma);
  return await import(pathToFileURL(duong).href + '?v=' + Date.now());
}

const banGhiNhayCam = {
  id: 'tl_ns_9', ma_gui: null, nhom: 'nhan_su', loai: 'CCCD', tieu_de: 'CCCD Nguyễn Thị Huyền',
  so_hieu: '001301234567', tim_kiem: 'cccd nguyen thi huyen', ngay_ban_hanh: '2020-01-05',
  ngay_het_han: null, han_luu: '5 năm', cua_vao: 'kho_chung', gan_id: null, so_trang: 2,
  kho_nha: 'drive', kho_khoa: 'drive-ns', co_byte: 190000,
  noi_dung: 'CĂN CƯỚC CÔNG DÂN — Họ và tên: NGUYỄN THỊ HUYỀN — Số: 001301234567 — ' +
            'Ngày sinh: 05/01/1995 — Quê quán: Yên Hoà, Cầu Giấy, Hà Nội — Lương thoả thuận 18.000.000đ',
  ocr_so_trang: 2, ocr_ghi_chu: null, nhay_cam: 1, dong_y_boi: 'Nguyễn Thị Huyền',
  dong_y_luc: '2026-08-29 09:00:00', dong_y_muc_dich: 'Hồ sơ lao động',
  nguoi_tao: 'ns_hcns', tao_luc: '2026-08-29 09:00:00', an: 0
};
const banGhiThuong = {
  ...banGhiNhayCam, id: 'tl_kt_9', nhom: 'ke_toan', loai: 'Hoá đơn', tieu_de: 'Hoá đơn GTGT tháng 8',
  so_hieu: 'HD-0812', tim_kiem: 'hoa don gtgt thang 8', kho_khoa: 'drive-kt',
  noi_dung: 'HOÁ ĐƠN GIÁ TRỊ GIA TĂNG — Đơn vị bán: CÔNG TY TNHH ALPHA GREEN COMMERCE — ' +
            'Mã số thuế 0110938472 — Tổng cộng tiền thanh toán: 42.350.000 đồng',
  nhay_cam: 0, dong_y_boi: null, dong_y_luc: null, dong_y_muc_dich: null
};
const COT_TL = Object.keys(banGhiNhayCam);
function nhetTaiLieu(kho, ...ds) {
  const cau = kho.prepare(`INSERT INTO tai_lieu (${COT_TL.join(',')}) VALUES (${COT_TL.map(() => '?').join(',')})`);
  for (const b of ds) cau.run(...COT_TL.map(c => b[c] ?? null));
}

muc('⑧a NHẬT KÝ TRUY CẬP — mở MỘT tài liệu MƯỜI lần tốn mấy lượt ghi D1?');
{
  const { kho, env, so, datLai } = d1SQLite();
  nhetTaiLieu(kho, banGhiNhayCam);
  datLai();
  for (let i = 0; i < 10; i++) await tailieu.moTaiLieu(env, phienCua('hcns', 'ns_huong'), 'tl_ns_9');
  const dong = kho.prepare('SELECT COUNT(*) AS n FROM tai_lieu_nhat_ky').get().n;
  dat(so.ghi === 1 && dong === 1,
    'SAU khi vá: mở 10 lần = 1 lượt ghi D1',
    `→ ${so.ghi} lượt ghi, ${so.doc} lượt đọc, ${dong} dòng nhật ký`);

  /* BẢN TRƯỚC KHI VÁ — dựng lại đúng `DO UPDATE SET so_lan+1` không đọc trước.
     Đây là con số "trước" mà REV-0036 đòi, đo chứ không nhớ lại. */
  const cu = await napBanVa('nhật ký bản cũ',
    [`    const daCo = await env.DB.prepare(
      'SELECT 1 AS co FROM tai_lieu_nhat_ky WHERE khoa = ?').bind(khoa).first();
    if (daCo) return 0;                       // lượt mở thứ 2..N trong ngày: 0 ghi`, ''],
    ['ON CONFLICT(khoa) DO NOTHING', 'ON CONFLICT(khoa) DO UPDATE SET so_lan = so_lan + 1']);
  if (cu) {
    const b = d1SQLite();
    nhetTaiLieu(b.kho, banGhiNhayCam);
    b.datLai();
    for (let i = 0; i < 10; i++) await cu.moTaiLieu(b.env, phienCua('hcns', 'ns_huong'), 'tl_ns_9');
    const dongCu = b.kho.prepare('SELECT COUNT(*) AS n, MAX(so_lan) AS m FROM tai_lieu_nhat_ky').get();
    dat(b.so.ghi === 10 && dongCu.n === 1,
      'TRƯỚC khi vá: mở 10 lần = 10 lượt ghi D1 (1 dòng)',
      `→ ${b.so.ghi} lượt ghi, ${dongCu.n} dòng, so_lan=${dongCu.m}`);
    console.log(`     → Chốt: 10 lượt ghi → 1. Lời khai "1 lượt ghi/người/ngày" giờ mới đúng.`);
  }

  /* Nhóm thường vẫn KHÔNG ghi gì, và cũng không tốn thêm lượt đọc nào. */
  const c = d1SQLite();
  nhetTaiLieu(c.kho, banGhiThuong);
  c.datLai();
  for (let i = 0; i < 10; i++) await tailieu.moTaiLieu(c.env, phienCua('ke_toan_truong'), 'tl_kt_9');
  dat(c.so.ghi === 0, 'Nhóm thường mở 10 lần: 0 lượt ghi', `→ ${c.so.ghi}`);
}

muc('⑧b RÒ `trich` — 180 ký tự ruột giấy tờ nhạy cảm, KHÔNG ghi nhật ký');
{
  const { kho, env, so } = d1SQLite();
  nhetTaiLieu(kho, banGhiNhayCam, banGhiThuong);

  const r = await doc(await tailieu.danhSachTaiLieu(env, phienCua('admin'), new URLSearchParams()));
  const ns = (r.ds || []).find(x => x.id === 'tl_ns_9');
  const kt = (r.ds || []).find(x => x.id === 'tl_kt_9');
  dat(!!ns && !!kt, 'Admin thấy cả hai tài liệu trong danh sách', `→ ${r.ds.length} dòng`);
  dat(ns && (ns.trich === null || ns.trich === ''),
    'Tài liệu NHẠY CẢM: danh sách KHÔNG có `trich`', `→ trich=${JSON.stringify(ns && ns.trich)}`);
  dat(kt && String(kt.trich || '').includes('ALPHA GREEN COMMERCE'),
    'Tài liệu thường: `trich` vẫn còn (không cắt quá tay)', `→ ${String(kt && kt.trich).slice(0, 40)}…`);
  dat(so.ghi === 0, 'Đường danh sách vẫn 0 lượt ghi', `→ ${so.ghi}`);
  /* Vét CẢ câu trả lời JSON, không chỉ trường `trich`: mức lương và ngày sinh
     là hai thứ đắt nhất trong đoạn chữ đã bóc, và chúng KHÔNG được đi ra bằng
     bất kỳ trường nào. (`so_hieu` thì có mặt là đúng — đó là thứ để tra cứu,
     và nó chỉ tới tay người đã có quyền xem nhóm.) */
  dat(!/18\.000\.000|05\/01\/1995|Quê quán/.test(JSON.stringify(r)),
    'Cả câu trả lời danh sách KHÔNG chứa lương / ngày sinh / quê quán');

  /* Người KHÔNG được xem nhóm nhân sự thì không thấy cả dòng, nói gì tới trích. */
  const { env: e2 } = (() => { const x = d1SQLite(); nhetTaiLieu(x.kho, banGhiNhayCam, banGhiThuong); return x; })();
  const r2 = await doc(await tailieu.danhSachTaiLieu(e2, phienCua('ke_toan_truong'), new URLSearchParams()));
  dat(!(r2.ds || []).some(x => x.nhom === 'nhan_su'),
    'Kế toán trưởng: không có dòng nhóm nhân sự nào', `→ ${r2.ds.length} dòng`);

  /* ĐỐI CHỨNG: bỏ đúng mệnh đề CASE → `trich` của tài liệu nhạy cảm phải LỌT.
     Nếu bản bỏ chặn vẫn "sạch" thì phép đo này không đo gì cả. */
  const hong = await napBanVa('trich không cắt',
    [`CASE WHEN nhay_cam = 1 THEN NULL
                ELSE substr(COALESCE(noi_dung,''), 1, 180) END AS trich`,
     `substr(COALESCE(noi_dung,''), 1, 180) AS trich`]);
  if (hong) {
    const x = d1SQLite(); nhetTaiLieu(x.kho, banGhiNhayCam, banGhiThuong);
    const r3 = await doc(await hong.danhSachTaiLieu(x.env, phienCua('admin'), new URLSearchParams()));
    const ns3 = (r3.ds || []).find(y => y.id === 'tl_ns_9');
    dat(String(ns3 && ns3.trich).includes('001301234567'),
      'ĐỐI CHỨNG: bỏ mệnh đề CASE → số CCCD LỌT ra danh sách',
      `→ "${String(ns3 && ns3.trich).slice(0, 46)}…" (phải lọt, nếu sạch thì PHÉP ĐO hỏng)`);
  }
}

muc('⑧c BẤM "GỬI LẠI" KHI LẦN 1 CÒN ĐANG BAY — 1 file, 1 dòng, 0 mồ côi');
{
  const jpegGia = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
    'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');
  const pdfGia = Buffer.concat([Buffer.from('%PDF-1.4\n'), jpegGia, Buffer.from('\n%%EOF\n')]);
  const donGui = (maGui) => ({
    ma_gui: maGui, nhom: 'ke_toan', tieu_de: 'Hoá đơn tháng 8', so_trang: 3,
    tep: pdfGia.toString('base64'), anh_boc_chu: [jpegGia.toString('base64')]
  });

  /** Bắn HAI yêu cầu CHỒNG NHAU cùng `ma_gui`. Cả hai cùng qua chốt `ma_gui`
   *  lúc kho còn rỗng — đúng cảnh mở hai tab / tải lại trang giữa lúc đang gửi
   *  trên 3G. `UNIQUE(ma_gui)` của SQLite ép thật, không phải cờ giả. */
  async function haiLuotChongNhau(mod) {
    const { kho, env, so } = d1SQLite();
    const truoc = driveGia.size;
    const kq = await Promise.allSettled([
      mod.luuTaiLieu(env, phienCua('ke_toan_truong'), donGui('mg-bay')),
      mod.luuTaiLieu(env, phienCua('ke_toan_truong'), donGui('mg-bay'))
    ]);
    const than = [];
    for (const k of kq) if (k.status === 'fulfilled') than.push({ ma: k.value.status, ...(await doc(k.value)) });
    return {
      nem: kq.filter(k => k.status === 'rejected').map(k => String(k.reason && k.reason.message)),
      than,
      dong: kho.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n,
      fileThem: driveGia.size - truoc,
      ghi: so.ghi
    };
  }

  const r = await haiLuotChongNhau(tailieu);
  dat(r.nem.length === 0, 'KHÔNG lỗi nào ném ra ngoài', `→ ${r.nem.length} lỗi ${r.nem.join('; ')}`);
  dat(r.than.length === 2 && r.than.every(t => t.ma === 200 && t.ok === true),
    'Cả hai lượt đều trả về "đã lưu", không lượt nào báo lỗi cho người dùng',
    `→ HTTP ${r.than.map(t => t.ma).join(' + ')}`);
  dat(r.dong === 1, 'D1 giữ ĐÚNG 1 dòng', `→ ${r.dong} dòng`);
  dat(r.fileThem === 1, 'Drive giữ ĐÚNG 1 file — 0 file mồ côi', `→ ${r.fileThem} file`);
  dat(r.than.some(t => t.da_co_san === true && t.da_don_ban_thua === true),
    'Lượt thua nhận diện là "đã có rồi" VÀ tự dọn xong bản thừa',
    `→ da_don_ban_thua=${r.than.map(t => t.da_don_ban_thua).join('/')}`);

  /* ĐỐI CHỨNG: bỏ đúng lệnh dọn file thừa → Drive phải còn 2 file. Không bắt
     được 2 thì phép đếm file mồ côi ở trên là đếm suông. */
  const hong = await napBanVa('không dọn file thừa',
    ['      await xoaFile(env, { nha: luuXong.nha, khoa: luuXong.khoa });\n      donDuoc = true;',
     '      donDuoc = false;   /* CỐ Ý KHÔNG DỌN — ca đối chứng */']);
  if (hong) {
    const r2 = await haiLuotChongNhau(hong);
    dat(r2.fileThem === 2 && r2.dong === 1,
      'ĐỐI CHỨNG: bỏ lệnh dọn → Drive có 2 file (1 mồ côi)',
      `→ ${r2.fileThem} file / ${r2.dong} dòng (phải là 2/1, nếu 1/1 thì PHÉP ĐO hỏng)`);
  }

  /* Ca Sếp hỏi — lượt 1 XONG HẲN rồi mới bấm Gửi lại: vẫn 1 file, 1 dòng. */
  const { kho, env } = d1SQLite();
  const truoc = driveGia.size;
  const a = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), donGui('mg-xong'));
  const b = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), donGui('mg-xong'));
  const thanB = await doc(b);
  dat(a.status === 200 && b.status === 200 && thanB.da_co_san === true &&
      kho.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n === 1 &&
      driveGia.size - truoc === 1,
    'Gửi lại SAU khi lượt 1 xong: 1 dòng, 1 file, không đẩy lại lên Drive',
    `→ ${driveGia.size - truoc} file`);
}

muc('⑧d CHỮ BỊA — mô hình không nhìn thấy ảnh vẫn trả lời rất xuôi tai');
{
  const jpegGia = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
    'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');
  const pdfGia = Buffer.concat([Buffer.from('%PDF-1.4\n'), jpegGia, Buffer.from('\n%%EOF\n')]);

  /** Chạy một lượt lưu với chữ AI trả về do ta đặt — dựng lại đúng cảnh đã đo
   *  thật ngày 29/08: mô hình bịa ra một công văn của Bộ Giáo dục. */
  async function luuVoiChuAI(chuAI, soHieu) {
    const x = d1SQLite();
    x.env.AI = { async run() { return { response: chuAI }; } };
    const res = await tailieu.luuTaiLieu(x.env, phienCua('van_hanh_san'), {
      ma_gui: 'mg-' + Math.random().toString(36).slice(2), nhom: 'attp',
      tieu_de: 'Giấy chứng nhận ATTP', so_hieu: soHieu, so_trang: 1,
      tep: pdfGia.toString('base64'), anh_boc_chu: [jpegGia.toString('base64')]
    });
    const than = await doc(res);
    const dong = x.kho.prepare('SELECT noi_dung, tim_kiem, ocr_so_trang, ocr_ghi_chu FROM tai_lieu').get();
    return { ma: res.status, than, dong };
  }

  const CHU_BIA = 'Số: 2345/KH-UBND Kế hoạch Triển khai thực hiện Nghị định số ' +
                  '01/2021/NĐ-CP của Chính phủ. Bộ Giáo dục và Đào tạo, tỉnh Quảng Ngãi.';
  const CHU_THAT = 'GIẤY CHỨNG NHẬN CƠ SỞ ĐỦ ĐIỀU KIỆN AN TOÀN THỰC PHẨM. ' +
                   'Số: 124/2026/GCN-ATTP. Tên cơ sở: CÔNG TY TNHH ALPHA GREEN COMMERCE.';

  const bia = await luuVoiChuAI(CHU_BIA, '124/2026/GCN-ATTP');
  dat(bia.ma === 200 && !bia.dong.noi_dung,
    'Chữ BỊA (không chứa số hiệu vừa gõ) → KHÔNG vào cột nội dung',
    `→ noi_dung=${JSON.stringify(bia.dong.noi_dung)}`);
  dat(!/Quảng Ngãi|Giáo dục/.test(String(bia.dong.tim_kiem || '')),
    'Chữ bịa cũng KHÔNG lọt vào ô tìm kiếm', `→ "${String(bia.dong.tim_kiem).slice(0, 46)}…"`);
  dat(String(bia.than.ocr_ghi_chu || '').includes('bịa'),
    'Người quét ĐƯỢC BÁO vì sao không có chữ, không im lặng',
    `→ "${String(bia.than.ocr_ghi_chu).slice(0, 60)}…"`);

  const that = await luuVoiChuAI(CHU_THAT, '124/2026/GCN-ATTP');
  dat(that.ma === 200 && String(that.dong.noi_dung || '').includes('ALPHA GREEN'),
    'Chữ THẬT (có số hiệu) vẫn được lưu bình thường — không cắt quá tay',
    `→ ocr_so_trang=${that.dong.ocr_so_trang}`);

  /* Số hiệu viết khác dấu gạch/khoảng trắng vẫn phải nhận là cùng một số. */
  const gonDau = await luuVoiChuAI('Số: 124 / 2026 / GCN – ATTP, cấp ngày 15/03/2026.', '124/2026/GCN-ATTP');
  dat(String(gonDau.dong.noi_dung || '').includes('124'),
    'Số hiệu lệch dấu gạch / khoảng trắng: KHÔNG vứt oan chữ đọc đúng');

  /* Không gõ số hiệu thì không có mốc nào để đối chiếu — phải nói thẳng là
     chốt này KHÔNG chạy, đừng để ai tưởng nó bắt được mọi ca bịa. */
  const khongMoc = await luuVoiChuAI(CHU_BIA, null);
  dat(String(khongMoc.dong.noi_dung || '').includes('Quảng Ngãi'),
    'Không gõ số hiệu → chốt KHÔNG chạy (giới hạn đã biết, có ghi trong mã)',
    '→ chữ vẫn vào kho, đây là chỗ hở còn lại');
}

muc('⑧e HAI FILE LUẬT phải NẰM TRONG REPO — trích dẫn mà không có thì lần sau mất');
{
  for (const f of ['docs/BANG-MAU.md', 'docs/LUAT-GOP-Y-LA-TRIEU-CHUNG.md']) {
    let co = false, dai = 0;
    try { const s = readFileSync(path.join(GOC, f), 'utf8'); co = s.length > 500; dai = s.length; } catch { /* thiếu */ }
    dat(co, `Có ${f} trong repo`, `→ ${dai} ký tự`);
  }
}

muc('⑧f MÔ HÌNH ĐỌC ẢNH — một chỗ khai, hai đường dùng');
{
  const nhansu = readFileSync(path.join(GOC, 'src/nhansu.js'), 'utf8');
  /* Soi chỗ GỌI, không soi cả file: chuỗi mô hình cũ vẫn được phép nằm trong
     chú thích (đó là kết quả đo, phải giữ để người sau khỏi thử lại). Cấm là
     cấm nó quay lại làm THAM SỐ THẬT của `AI.run`. */
  const goiAI = [...(nhansu + readFileSync(path.join(GOC, 'src/tai-lieu.js'), 'utf8'))
    .matchAll(/AI\.run\(\s*(['"][^'"]+['"]|[A-Z_]+)/g)].map(m => m[1]);
  dat(goiAI.length > 0 && goiAI.every(x => x === 'MO_HINH_DOC_ANH'),
    'Không chỗ gọi AI nào chép tay chuỗi mô hình', `→ ${goiAI.join(', ')}`);
  dat(!/llama-3\.2-11b-vision/.test(tailieu.MO_HINH_DOC_ANH),
    'Mô hình đang dùng KHÔNG phải mô hình đòi ký thoả thuận Meta');
  dat(/import \{ MO_HINH_DOC_ANH, khuonDocAnh \} from '\.\/tai-lieu\.js'/.test(nhansu) &&
      /env\.AI\.run\(MO_HINH_DOC_ANH,/.test(nhansu),
    'src/nhansu.js dùng CHUNG hằng số với kho tài liệu (không chép tay)',
    `→ ${tailieu.MO_HINH_DOC_ANH}`);

  /* KHUÔN ĐẦU VÀO — chỗ đã làm hỏng cả tính năng mà KHÔNG báo một lỗi nào.
     Khoá lại bằng phép đo: ảnh phải đi trong `messages`, không phải `image`. */
  const khuon = tailieu.khuonDocAnh('QUktQUktQUk=', 'chép chữ đi');
  const noiDung = khuon?.messages?.[0]?.content || [];
  dat(Array.isArray(khuon.messages) && !('image' in khuon) && !('prompt' in khuon),
    'Ảnh đi qua `messages` (khuôn mới), KHÔNG qua `image`+`prompt` (khuôn cũ bị bỏ qua lặng lẽ)');
  dat(noiDung.some(p => p.type === 'text' && p.text === 'chép chữ đi') &&
      noiDung.some(p => p.type === 'image_url' &&
        String(p.image_url?.url) === 'data:image/jpeg;base64,QUktQUktQUk='),
    'Khuôn mang ĐỦ cả câu nhắc lẫn ảnh, ảnh đúng dạng data: URI',
    `→ ${noiDung.map(p => p.type).join(' + ')}`);
  /* Điện thoại hay gửi kèm sẵn tiền tố `data:` — không được bọc hai lần. */
  const kep = tailieu.khuonDocAnh('data:image/jpeg;base64,QUJD', 'x');
  dat(kep.messages[0].content[1].image_url.url === 'data:image/jpeg;base64,QUJD',
    'Ảnh đã có sẵn tiền tố `data:` thì KHÔNG bị bọc hai lần',
    `→ ${kep.messages[0].content[1].image_url.url}`);
  dat(/khuonDocAnh\(anh, prompt\)/.test(nhansu),
    'Đường đọc CCCD đi CÙNG khuôn với kho tài liệu (đường đã chết 11 ngày)');
}

console.log('\n───────────────────────────────────────────────────────────');
console.log(soHong === 0 ? '  KẾT LUẬN: ĐẠT toàn bộ.' : `  KẾT LUẬN: ✗ ${soHong} mục HỎNG.`);
process.exit(soHong === 0 ? 0 : 1);
