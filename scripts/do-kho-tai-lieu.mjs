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

/* `fetch` giả đóng vai Google: cấp vé, tạo thư mục, nhận file. Không một byte
   nào ra Internet — bàn đo phải chạy được cả khi mất mạng. */
let soLuotGoiGoogle = 0;
globalThis.fetch = async (u) => {
  soLuotGoiGoogle++;
  const url = String(u);
  if (url.includes('oauth2.googleapis.com')) {
    return new Response(JSON.stringify({ access_token: 've-gia', expires_in: 3600 }), { status: 200 });
  }
  return new Response(JSON.stringify({ id: 'drive-gia-' + soLuotGoiGoogle, size: 1234 }), { status: 200 });
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
  const { env, so } = envGia({ first: () => banGhi });
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
  const goc = readFileSync(path.join(GOC, 'src/tai-lieu.js'), 'utf8');
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

console.log('\n───────────────────────────────────────────────────────────');
console.log(soHong === 0 ? '  KẾT LUẬN: ĐẠT toàn bộ.' : `  KẾT LUẬN: ✗ ${soHong} mục HỎNG.`);
process.exit(soHong === 0 ? 0 : 1);
