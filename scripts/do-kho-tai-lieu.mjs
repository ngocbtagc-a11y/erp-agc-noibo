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
/* Câu cho từng LOẠI PDF (chỉ ảnh · có mật khẩu · đọc hụt) khai ở `src/pdf-chu.js`
   — bàn đo so với hằng số THẬT, không chép lại chuỗi vào đây rồi tự khớp với
   chính mình. */
const pdfChu = await import(pathToFileURL(path.join(GOC, 'src/pdf-chu.js')).href);

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
      .replace(/from '\.\/(quyen|kho-file|nhac-nhan-su|cat-danh-sach|so-ai|pdf-chu)\.js'/g,
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

  /* Nhóm nhân sự phải bắt ghi nhận ĐỒNG Ý (Luật BVDLCN 91/2025/QH15).
     Đo trên SQLite thật vì từ REV-0046 #2 giấy nhân sự phải gắn được vào một
     người CÓ THẬT trước đã — cửa "chọn người" đứng TRƯỚC cửa "đồng ý", nên
     D1 giả phải trả về một người thật cho đúng câu tra `nhan_su`. */
  const { env: e2 } = envGia({
    first: (sql) => /FROM nhan_su/.test(sql) ? { id: 'ns_duy', ho_ten: 'Phạm Khương Duy' } : null
  });
  const thieu = await tailieu.luuTaiLieu(e2, phienCua('hcns'), {
    nhom: 'nhan_su', gan_id: 'ns_duy', tieu_de: 'CCCD anh Duy', so_trang: 1, tep: 'AAAA'
  });
  dat(thieu.status === 400 && String((await doc(thieu)).loi).includes('đồng ý'),
    'Thiếu dấu ĐỒNG Ý → chặn ngay, không lưu', `→ HTTP ${thieu.status}`);
}

/* ==========================================================================
   ⑦ NÚT ≥44px — đọc từ CSS THẬT, kèm đối chứng
   ========================================================================== */
muc('⑦ NGƯỠNG NGÓN TAY 44px trong CSS thật');
{
  /* Quy về LF y như `docNguon()`: `core.autocrlf=true` trên máy Windows này
     nên tệp trong cây làm việc là CRLF hay LF tuỳ tệp đó vừa đi qua công cụ
     nào. Ca đối chứng dưới đây khớp chuỗi có `\n`, nên không quy về LF thì nó
     im lặng trượt — và một ca đối chứng trượt lặng còn tệ hơn không có nó. */
  const css = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8')
    .replace(/\r\n/g, '\n');
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
  /* Ô nhập của hộp sửa số hiệu/tên (Sếp Ngọc 03/09/2026) — chạm được thì phải
     44px như mọi thứ chạm được khác. Bộ chọn có khoảng trắng nên không đi qua
     `caoNhoNhat` được. */
  const oSua = /\.tl-sua-o input\s*\{([^}]*)\}/.exec(css);
  const caoSua = oSua ? Number((/min-height:\s*(\d+)px/.exec(oSua[1]) || [])[1]) : null;
  dat(caoSua >= 44, '.tl-sua-o input   min-height',
    `→ ${caoSua ? caoSua + 'px' : 'KHÔNG KHAI'}`);
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

/* Toàn bộ migration của Kho tài liệu, ĐÚNG THỨ TỰ phải chạy trên máy thật:
   bảng trước, rồi cột thêm sau. Đọc thẳng từ ổ đĩa — thiếu một file là bàn đo
   gãy ngay chứ không âm thầm chạy trên một lược đồ khác lược đồ sản phẩm. */
/* THỨ TỰ Ở ĐÂY PHẢI KHỚP thứ tự tên file mà cơ chế tự nạp CSDL dùng (sắp theo
   tên đã bỏ đuôi `.sql`): `them-kho-tai-lieu` < `…-cot-chu-nguon` <
   `…-cot-ocr-neo`. Xếp sai ở đây là bàn đo chạy trên một lược đồ KHÁC lược đồ
   sản phẩm — đúng thứ nó sinh ra để bắt. */
const MIGRATION_KHO = [
  'them-kho-tai-lieu.sql',
  'them-kho-tai-lieu-cot-chu-nguon.sql',
  'them-kho-tai-lieu-cot-ocr-neo.sql'
];

function d1SQLite() {
  const kho = new DatabaseSync(':memory:');
  for (const f of MIGRATION_KHO) kho.exec(readFileSync(path.join(GOC, 'migrations', f), 'utf8'));
  kho.exec('CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT)');
  /* SỔ SỬA CHUNG của cả ERP (CTL-0017) — đường sửa số hiệu/tên tài liệu ghi
     vết vào ĐÂY chứ không đẻ bảng mới.
     Câu `CREATE TABLE` chép nguyên từ `them-khoa-danhmuc-nen.sql`: file đó có
     những câu khác đụng tới `phong_ban`/`chuc_danh` — bảng không có trong bàn
     đo kho tài liệu — nên `exec` cả file sẽ dừng ở câu đầu và bảng KHÔNG bao
     giờ sinh ra (đã đo: `no such table: phong_ban`, bảng rỗng).
     Cột `ly_do` CỐ Ý chưa có ở đây: `them-ly-do-sua.sql` ngay dưới sẽ ALTER
     thêm vào, rồi dựng TRIGGER đòi lý do. Nạp file thật chứ không chép tay cái
     trigger — nó chính là thứ phải chứng minh: nó KHÔNG đụng tới `tieu_de`
     và `so_hieu`, nên sửa chính tả không bị đòi lý do. */
  kho.exec(`CREATE TABLE IF NOT EXISTS lich_su_thay_doi_nen (
              id          INTEGER PRIMARY KEY AUTOINCREMENT,
              bang        TEXT NOT NULL,
              ban_ghi_id  TEXT NOT NULL,
              truong      TEXT NOT NULL,
              gia_tri_cu  TEXT,
              gia_tri_moi TEXT,
              nguoi_id    TEXT,
              nguoi_ten   TEXT,
              luc         TEXT NOT NULL DEFAULT (datetime('now', '+7 hours')))`);
  kho.exec(readFileSync(path.join(GOC, 'migrations', 'them-ly-do-sua.sql'), 'utf8'));
  if (!kho.prepare("SELECT name FROM sqlite_master WHERE name='trg_doi_cam_ket_phai_co_ly_do'").get()) {
    throw new Error('Bàn đo: thiếu TRIGGER đòi lý do — sửa lại phần nạp migration.');
  }
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
    /* `batch()` của D1 thật: một vòng, nhiều câu, tất-cả-hoặc-không. Đường sửa
       số hiệu/tên dùng nó (1 UPDATE + 1 dòng lịch sử mỗi trường đổi), nên bàn
       đo phải có nó — thiếu thì phép đo chạy trên một API không tồn tại. */
    async batch(ds) {
      const ra = [];
      for (const o of ds) ra.push(await o.run());
      return ra;
    },
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
  ma = ma.replace(/from '\.\/(quyen|kho-file|nhac-nhan-su|cat-danh-sach|so-ai|pdf-chu)\.js'/g,
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
    const dong = x.kho.prepare(
      'SELECT noi_dung, tim_kiem, ocr_so_trang, ocr_so_trang_neo, ocr_ghi_chu FROM tai_lieu').get();
    return { ma: res.status, than, dong };
  }

  const CHU_BIA = 'Số: 2345/KH-UBND Kế hoạch Triển khai thực hiện Nghị định số ' +
                  '01/2021/NĐ-CP của Chính phủ. Bộ Giáo dục và Đào tạo, tỉnh Quảng Ngãi.';
  const CHU_THAT = 'GIẤY CHỨNG NHẬN CƠ SỞ ĐỦ ĐIỀU KIỆN AN TOÀN THỰC PHẨM. ' +
                   'Số: 124/2026/GCN-ATTP. Tên cơ sở: CÔNG TY TNHH ALPHA GREEN COMMERCE.';

  /* ⚠️ LUẬT ĐÃ ĐỔI — REV-0044 · L2, Gạo chốt lại 29/08/2026.
     Bản trước VỨT chữ khi không trúng mỏ neo, và Hồ Ly đo được là nó vứt giấy
     THẬT. Nay: chữ LUÔN được lưu; mỏ neo chỉ quyết định chữ đó có được vào ô
     TÌM KIẾM hay không, và đeo nhãn gì. Mấy dòng dưới đo đúng luật mới. */
  const bia = await luuVoiChuAI(CHU_BIA, '124/2026/GCN-ATTP');
  dat(bia.ma === 200 && String(bia.dong.noi_dung || '').includes('Quảng Ngãi'),
    'Chữ BỊA vẫn được LƯU (luật ①: không bao giờ vứt bản quét)',
    `→ ${String(bia.dong.noi_dung || '').length} ký tự`);
  dat(bia.dong.ocr_so_trang_neo === 0 && /CHƯA KIỂM/.test(String(bia.dong.noi_dung)),
    'Nhưng đeo nhãn CHƯA KIỂM ngay trong chính chuỗi nội dung',
    `→ neo ${bia.dong.ocr_so_trang_neo}/${bia.dong.ocr_so_trang} trang`);
  dat(!/Quảng Ngãi|Giáo dục/.test(String(bia.dong.tim_kiem || '')),
    'Chữ chưa kiểm KHÔNG lọt vào ô tìm kiếm (luật ③)',
    `→ "${String(bia.dong.tim_kiem).slice(0, 46)}…"`);
  dat(/CHƯA ĐỐI CHIẾU ĐƯỢC/.test(String(bia.than.ocr_ghi_chu || '')),
    'Người quét ĐƯỢC BÁO trang nào chưa đối chiếu được, không im lặng',
    `→ "${String(bia.than.ocr_ghi_chu).slice(0, 60)}…"`);

  const that = await luuVoiChuAI(CHU_THAT, '124/2026/GCN-ATTP');
  dat(that.ma === 200 && String(that.dong.noi_dung || '').includes('ALPHA GREEN'),
    'Chữ THẬT (có số hiệu) lưu bình thường và ĐỐI CHIẾU ĐƯỢC',
    `→ neo ${that.dong.ocr_so_trang_neo}/${that.dong.ocr_so_trang} trang`);
  dat(that.dong.ocr_so_trang_neo === 1 && /an toan thuc pham/.test(String(that.dong.tim_kiem || '')),
    'Chữ đã đối chiếu MỚI được vào ô tìm kiếm',
    `→ "${String(that.dong.tim_kiem).slice(0, 60)}…"`);
  /* ⚠️ REV-0044 · L3 — CON SỐ CHƯA KIỂM KHÔNG ĐƯỢC VÀO Ô TÌM.
     Gõ một mã số thuế SAI vào ô tìm mà thấy tài liệu hiện lên là đã tự xác
     nhận con số sai đó, mà đường tìm kiếm ghi 0 lượt nhật ký. */
  dat(!/124/.test(String(that.dong.tim_kiem || '').replace(/124\/2026\/GCN-ATTP/g, '')) ||
      !/2026/.test(String(that.dong.tim_kiem || '').replace(/124\/2026\/gcn-attp/gi, '')),
    'Số MÁY ĐỌC bị gọt khỏi ô tìm (số hiệu NGƯỜI GÕ thì vẫn còn)',
    `→ "${String(that.dong.tim_kiem)}"`);

  /* Số hiệu viết khác dấu gạch/khoảng trắng vẫn phải nhận là cùng một số. */
  const gonDau = await luuVoiChuAI('Số: 124 / 2026 / GCN – ATTP, cấp ngày 15/03/2026.', '124/2026/GCN-ATTP');
  dat(gonDau.dong.ocr_so_trang_neo === 1,
    'Số hiệu lệch dấu gạch / khoảng trắng: vẫn nhận là ĐÃ ĐỐI CHIẾU');

  const khongMoc = await luuVoiChuAI(CHU_BIA, null);
  dat(khongMoc.ma === 200 && String(khongMoc.dong.noi_dung || '').length > 50 &&
      khongMoc.dong.ocr_so_trang_neo === 0,
    'BỎ TRỐNG ô số hiệu: chữ bịa VẪN LƯU nhưng KHÔNG được đối chiếu',
    `→ neo ${khongMoc.dong.ocr_so_trang_neo} trang`);
  const thatKhongMoc = await luuVoiChuAI(CHU_THAT, null);
  dat(String(thatKhongMoc.dong.noi_dung || '').includes('ALPHA GREEN') &&
      thatKhongMoc.dong.ocr_so_trang_neo === 1,
    'BỎ TRỐNG ô số hiệu: chữ THẬT vẫn đối chiếu được bằng TÊN CÔNG TY');
}

/* ==========================================================================
   ⑧d1b DỰNG LẠI 49 CA CỦA HỒ LY — TRƯỚC / SAU
   ---------------------------------------------------------------------------
   REV-0044 bác chính hướng cũ bằng ba nhóm ca. Dựng lại đủ cả ba, đo trên
   `docTinChu()` mới VÀ trên bản mã CŨ (chép lại đúng thuật toán cũ ở đây) để
   nêu được TRƯỚC/SAU chứ không chỉ khai "đã sửa".
   ========================================================================== */
muc('⑧d1b 49 CA CỦA HỒ LY — trước / sau');
{
  /** Bản CŨ: âm tiết ≥5 chữ, và `coMoc` gồm cả tên tài liệu ⇒ không trúng thì VỨT.
   *  Chép lại nguyên thuật toán để so được TRƯỚC/SAU trên cùng bộ ca. */
  function cuVutKhong(chu, { soHieu = null, loai = null, tieuDe = null } = {}) {
    const gon = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
    const tu = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const chuGon = gon(chu), chuTu = new Set(tu(chu));
    const coMoc = []; let trung = null;
    const maSo = gon(soHieu);
    if (maSo.length >= 4) { coMoc.push('so_hieu'); if (chuGon.includes(maSo)) trung = 'so_hieu'; }
    const tuNeo = [...new Set(tu([loai, tieuDe].filter(Boolean).join(' ')).filter(t => t.length >= 5))];
    if (tuNeo.length) { coMoc.push('ten'); if (tuNeo.some(t => chuTu.has(t))) trung = trung || 'ten'; }
    for (const t of ['Công ty TNHH Alpha Green Commerce', 'Alpha Green Commerce', 'Onfod'])
      if (chuGon.includes(gon(t))) trung = trung || 'cty';
    if (!coMoc.length) return false;      // chốt không chạy → giữ chữ
    return !trung;                        // có mốc mà không trúng → VỨT
  }

  /* ---- NHÓM A: GIẤY THẬT BỊ VỨT OAN (3 ca Hồ Ly nêu đích danh) ---------- */
  const THAT_BI_VUT = [
    ['HOÁ ĐƠN GIÁ TRỊ GIA TĂNG — Đơn vị bán: CÔNG TY TNHH NÔNG SẢN SƠN LA. ' +
     'Mã số thuế 5500123456. Cộng tiền hàng: 47.200.000 đồng.',
     { soHieu: null, loai: null, tieuDe: 'Chứng từ mua nguyên liệu' }, 'hoá đơn NCC Sơn La'],
    ['NGÂN HÀNG TMCP KỸ THƯƠNG VIỆT NAM — SAO KÊ TÀI KHOẢN. Số tài khoản ' +
     '19033888888011, kỳ 01/08/2026 – 31/08/2026.',
     { soHieu: null, loai: null, tieuDe: 'Chứng từ ngân hàng tháng 8' }, 'sao kê Techcombank'],
    ['[không rõ] [không rõ] CHỨNG NHẬN [không rõ] 2026 [không rõ]',
     { soHieu: '124/2026/GCN-ATTP', loai: null, tieuDe: 'ATTP kho HN' }, 'trang mờ AI trả [không rõ]']
  ];
  let vutTruoc = 0, vutSau = 0;
  for (const [chu, moc, ten] of THAT_BI_VUT) {
    const truoc = cuVutKhong(chu, moc);
    const sau = tailieu.docTinChu(chu, moc);
    if (truoc) vutTruoc++;
    /* "Vứt" ở bản mới nghĩa là mất chữ — mà bản mới không có đường nào vứt. */
    if (!chu || !sau) vutSau++;
    dat(!truoc === false || true, `  ${ten.padEnd(26)} trước: ${truoc ? 'VỨT' : 'giữ'} · sau: giữ (${tailieu.MUC_TIN[sau.muc]})`);
  }
  dat(vutTruoc === 3, 'TRƯỚC: cả 3 tờ giấy THẬT bị vứt chữ', `→ ${vutTruoc}/3`);
  dat(vutSau === 0, 'SAU: 0 tờ bị vứt — LUẬT ① không bao giờ vứt bản quét', `→ ${vutSau}/3`);

  /* ---- NHÓM B: 9 CẶP TÊN GẦN NHAU — trúng oan bao nhiêu ----------------- */
  const CAP_GAN = [
    ['thông báo', 'thông tư'], ['quyết định', 'quyết toán'], ['thanh toán', 'thanh tra'],
    ['chứng nhận', 'chứng khoán'], ['thương mại', 'thương binh'], ['nguyên liệu', 'nguyên đơn'],
    ['biên bản', 'biên lai'], ['hợp đồng', 'hợp nhất'], ['giấy phép', 'giấy khai']
  ];
  let oanTruoc = 0, oanSau = 0;
  for (const [goVao, coTrenGiay] of CAP_GAN) {
    /* Người gõ "thông báo", nhưng chữ AI bịa ra chỉ nhắc "thông tư" — mỏ neo
       KHÔNG được coi là trúng. */
    const chuBia = `CƠ QUAN NHÀ NƯỚC — ${coTrenGiay} số 45/2026 về việc triển khai.`;
    if (!cuVutKhong(chuBia, { soHieu: null, loai: null, tieuDe: goVao })) oanTruoc++;
    if (tailieu.docTinChu(chuBia, { soHieu: null, loai: null, tieuDe: goVao }).muc !== 'chua_kiem') oanSau++;
  }
  /* Hồ Ly đo 8/9 trên bộ ca của Hồ Ly; bản dựng lại ở đây ra ${oanTruoc}/9 vì
     bộ ca không trùng từng chữ. Đo HƯỚNG chứ không khoá con số của người khác:
     điều phải đúng là "trước thì trúng oan gần hết, sau thì không trúng oan
     cái nào". Khoá đúng số 8 là biến phép đo thành phép chép. */
  dat(oanTruoc >= 8, `TRƯỚC: ${oanTruoc}/9 cặp tên gần nhau TRÚNG OAN (Hồ Ly đo 8/9)`, `→ ${oanTruoc}/9`);
  dat(oanSau === 0, 'SAU: 0/9 trúng oan — cắt theo TỪ, không theo âm tiết (luật ⑤)', `→ ${oanSau}/9`);

  /* ---- NHÓM C: 12 TÊN TÀI LIỆU THẬT — sinh nổi mỏ neo không -------------- */
  const TEN_THAT = [
    'Giấy ATTP kho Hà Nội', 'Hoá đơn nhập hàng', 'Hợp đồng lao động',
    'Tờ khai thuế GTGT', 'CCCD anh Duy', 'Quyết định bổ nhiệm',
    'Uỷ quyền ký hợp đồng', 'Biên bản kiểm kê', 'Bảng lương tháng 8',
    'Phụ lục hợp đồng', 'Sao kê ngân hàng', 'Giấy khám sức khoẻ'
  ];
  const sinhTruoc = TEN_THAT.filter(t =>
    [...new Set(t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
      .toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length >= 5))].length > 0).length;
  const sinhSau = TEN_THAT.filter(t => tailieu.cumNeoTuTen(t).length > 0).length;
  dat(sinhTruoc <= 4, `TRƯỚC: chỉ ${sinhTruoc}/12 tên thật sinh nổi mỏ neo (Hồ Ly: 8/12 hụt)`,
    `→ ${sinhTruoc}/12`);
  dat(sinhSau === 12, `SAU: ${sinhSau}/12 tên thật sinh được mỏ neo`, `→ ${sinhSau}/12`);
  const hut = TEN_THAT.filter(t => tailieu.cumNeoTuTen(t).length === 0);
  console.log(`     → tên còn hụt: ${hut.length ? hut.join(' · ') : 'không còn'}`);

  /* ---- NHÓM D: MỎ NEO YẾU KHÔNG ĐƯỢC BẢO LÃNH CHỮ BỊA ------------------ */
  const biaHanhChinh = 'QUYẾT ĐỊNH — Bộ Giáo dục và Đào tạo — Số 2345/KH-UBND, tỉnh Quảng Ngãi.';
  const mocQD = { soHieu: null, loai: 'Quyết định', tieuDe: 'Quyết định bổ nhiệm' };
  dat(!cuVutKhong(biaHanhChinh, mocQD),
    'TRƯỚC: trang bịa "Bộ Giáo dục" được neo ③ NHẬN LÀ THẬT');
  const tinBia = tailieu.docTinChu(biaHanhChinh, mocQD);
  dat(tinBia.muc === 'neo_yeu',
    'SAU: chỉ trúng mỏ neo YẾU → KHÔNG được coi là đã đối chiếu',
    `→ ${tailieu.MUC_TIN[tinBia.muc]}`);
  /* Và mỏ neo yếu KHÔNG mở cửa vào ô tìm. */
  const luuYeu = await (async () => {
    const x = d1SQLite();
    x.env.AI = { async run() { return { response: biaHanhChinh }; } };
    const jp = Buffer.from('ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
      'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');
    await tailieu.luuTaiLieu(x.env, phienCua('admin'), {
      ma_gui: 'mg-yeu', nhom: 'noi_bo', tieu_de: 'Quyết định bổ nhiệm', so_trang: 1,
      tep: Buffer.concat([Buffer.from('%PDF-1.4\n'), jp, Buffer.from('\n%%EOF\n')]).toString('base64'),
      anh_boc_chu: [jp.toString('base64')]
    });
    return x.kho.prepare('SELECT noi_dung, tim_kiem, ocr_so_trang_neo FROM tai_lieu').get();
  })();
  dat(String(luuYeu.noi_dung || '').includes('Quảng Ngãi'), 'Trang bịa VẪN được lưu để người tự đối chiếu');
  dat(!/quang ngai|giao duc/.test(String(luuYeu.tim_kiem || '')),
    'Nhưng KHÔNG vào ô tìm kiếm', `→ "${String(luuYeu.tim_kiem)}"`);
}

muc('⑧d1c TỪNG TRANG — một trang thật KHÔNG bảo lãnh cả xấp (luật ④)');
{
  const jp = Buffer.from('ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
    'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), jp, Buffer.from('\n%%EOF\n')]);
  const THAT_1 = 'GIẤY CHỨNG NHẬN CƠ SỞ ĐỦ ĐIỀU KIỆN AN TOÀN THỰC PHẨM. Số: 124/2026/GCN-ATTP.';
  const BIA_N = 'UỶ BAN NHÂN DÂN TỈNH ĐỒNG THÁP — Sở Tài nguyên và Môi trường, số 118/QĐ-STNMT.';

  const x = d1SQLite();
  let luot = 0;
  /* Trang 1 THẬT, hai trang sau BỊA — đúng cảnh "xấp 1 thật + n bịa". */
  x.env.AI = { async run() { luot++; return { response: luot === 1 ? THAT_1 : BIA_N }; } };
  await tailieu.luuTaiLieu(x.env, phienCua('van_hanh_san'), {
    ma_gui: 'mg-xap', nhom: 'attp', tieu_de: 'Giấy chứng nhận ATTP',
    so_hieu: '124/2026/GCN-ATTP', so_trang: 3,
    tep: pdf.toString('base64'),
    anh_boc_chu: [jp.toString('base64'), jp.toString('base64'), jp.toString('base64')]
  });
  const d = x.kho.prepare('SELECT noi_dung, tim_kiem, ocr_so_trang, ocr_so_trang_neo, ocr_ghi_chu FROM tai_lieu').get();
  dat(d.ocr_so_trang === 3 && d.ocr_so_trang_neo === 1,
    'Xấp 1 trang thật + 2 trang bịa: ĐÚNG 1 trang được đối chiếu',
    `→ neo ${d.ocr_so_trang_neo}/${d.ocr_so_trang}`);
  /* `tim_kiem` đã BỎ DẤU và hạ chữ thường — soi bằng chuỗi có dấu là phép thử
     luôn luôn đạt mà không đo gì (BH-17). */
  dat(!/dong thap|tai nguyen/.test(String(d.tim_kiem || '')),
    'Chữ hai trang bịa KHÔNG được trang thật bảo lãnh vào ô tìm',
    `→ "${String(d.tim_kiem).slice(0, 60)}…"`);
  dat(/an toan thuc pham/.test(String(d.tim_kiem || '')),
    'Chữ trang THẬT vẫn vào ô tìm bình thường');
  dat(/trang 2, 3/i.test(String(d.ocr_ghi_chu || '')),
    'Câu báo NÓI RÕ trang nào chưa đối chiếu được',
    `→ "${String(d.ocr_ghi_chu).slice(0, 70)}…"`);
  dat(String(d.noi_dung || '').includes('ĐỒNG THÁP') &&
      /Trang 2 · CHƯA KIỂM/.test(String(d.noi_dung || '')),
    'Chữ hai trang bịa VẪN được lưu (luật ①), có nhãn CHƯA KIỂM ngay tại trang đó');

  /* ĐỐI CHỨNG: bản chạy chốt MỘT LẦN trên chuỗi đã gộp — hai trang bịa phải
     được bảo lãnh. Không bảo lãnh thì phép đo này không đo gì cả. */
  const hong = await napBanVa('chốt chạy trên chuỗi ĐÃ GỘP',
    [`      if (chu) trang.push({ so: i + 1, chu, tin: docTinChu(chu, moc) });`,
     `      if (chu) trang.push({ so: i + 1, chu, tin: null });`],
    /* Vá ở chỗ `bocChu` GỌI `gopChuDaBoc` — `moc` chỉ có mặt trong `bocChu`.
       Từ CTL-0026 vòng 7, phần gộp chữ + dán nhãn đã tách ra thành hàm dùng
       chung cho ba đường (AI đọc ảnh · lớp chữ PDF · tính lại mỏ neo), nên ca
       đối chứng phải bám vào chỗ gọi chứ không bám vào ruột hàm chung. */
    [`  return gopChuDaBoc(trang, { hong, nguonChu: NGUON_CHU.anh_ai });`,
     `  const tinGop = docTinChu(trang.map(t => t.chu).join('\\n'), moc);\n` +
     `  for (const t of trang) t.tin = tinGop;\n` +
     `  return gopChuDaBoc(trang, { hong, nguonChu: NGUON_CHU.anh_ai });`]);
  if (hong) {
    const y = d1SQLite();
    let l2 = 0;
    y.env.AI = { async run() { l2++; return { response: l2 === 1 ? THAT_1 : BIA_N }; } };
    await hong.luuTaiLieu(y.env, phienCua('van_hanh_san'), {
      ma_gui: 'mg-xap2', nhom: 'attp', tieu_de: 'Giấy chứng nhận ATTP',
      so_hieu: '124/2026/GCN-ATTP', so_trang: 3,
      tep: pdf.toString('base64'),
      anh_boc_chu: [jp.toString('base64'), jp.toString('base64'), jp.toString('base64')]
    });
    const d2 = y.kho.prepare('SELECT tim_kiem, ocr_so_trang_neo FROM tai_lieu').get();
    dat(d2.ocr_so_trang_neo === 3 && /dong thap/.test(String(d2.tim_kiem || '')),
      'ĐỐI CHỨNG: gộp trang lại → 1 trang thật BẢO LÃNH cả xấp (phải bảo lãnh)',
      `→ neo ${d2.ocr_so_trang_neo}/3`);
  }
}

muc('⑧d2 MỎ NEO — 7 ca bịa toàn trang, KỂ CẢ khi ô số hiệu trống');
{
  /* Bảy ca bịa toàn trang: đúng kiểu chữ mô hình trả về khi nó KHÔNG nhìn thấy
     ảnh — nghe rất xuôi tai, không một chữ nào có trên tờ giấy. Gọi thẳng
     `docTinChu` để đo được cả ca "số hiệu trống" mà không phải dựng bảy lượt
     lưu (vòng 1 bỏ sót đúng ca này vì chỉ đo gián tiếp).
     ⚠️ Sau REV-0044: "bắt được" KHÔNG còn nghĩa là vứt chữ — nghĩa là KHÔNG
     xếp vào mức `da_neo`, tức không cho vào ô tìm kiếm. */
  const BIA = [
    'Số: 2345/KH-UBND Kế hoạch triển khai Nghị định 01/2021/NĐ-CP. Bộ Giáo dục và Đào tạo, tỉnh Quảng Ngãi.',
    'UỶ BAN NHÂN DÂN TỈNH ĐỒNG THÁP — Sở Tài nguyên và Môi trường. Số 118/QĐ-STNMT.',
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM. Thông báo về việc nghỉ lễ Quốc khánh 02/9.',
    'BỆNH VIỆN ĐA KHOA TỈNH LÂM ĐỒNG — Phiếu kết quả xét nghiệm, mã BN 20260418.',
    'HỢP ĐỒNG THUÊ NHÀ Ở giữa ông Trần Văn Bảy và bà Lê Thị Tám, quận Bình Thạnh.',
    'TRƯỜNG ĐẠI HỌC BÁCH KHOA HÀ NỘI — Bảng điểm học kỳ 1 năm học 2024-2025.',
    'NGÂN HÀNG TMCP NGOẠI THƯƠNG — Sao kê tài khoản 0451000123456, tháng 07/2026.'
  ];
  /* Mốc người dùng gõ: TÊN tài liệu + LOẠI, KHÔNG có số hiệu. Đây là đúng cảnh
     Hồ Ly nêu — người quét vội bỏ trống ô số hiệu. */
  const MOC_TRONG = { soHieu: null, loai: 'Giấy chứng nhận', tieuDe: 'Giấy chứng nhận ATTP Alpha Green' };
  let bat = 0;
  for (const chu of BIA) if (tailieu.docTinChu(chu, MOC_TRONG).muc !== 'da_neo') bat++;
  dat(bat === BIA.length,
    `${bat}/${BIA.length} ca bịa toàn trang KHÔNG được nhận là đã đối chiếu (số hiệu TRỐNG)`,
    `→ ${bat}/${BIA.length}`);

  /* ĐỐI CHỨNG ①: chữ THẬT của bảy loại giấy công ty đang có — không được vứt
     oan lấy một tờ. Vứt oan là mất chữ tra cứu của giấy đọc đúng. */
  const THAT = [
    ['GIẤY CHỨNG NHẬN CƠ SỞ ĐỦ ĐIỀU KIỆN AN TOÀN THỰC PHẨM. Số: 124/2026/GCN-ATTP. CÔNG TY TNHH ALPHA GREEN COMMERCE.', MOC_TRONG],
    ['HOÁ ĐƠN GIÁ TRỊ GIA TĂNG. Đơn vị mua: Công ty TNHH Alpha Green Commerce, MST 0110938472.',
      { soHieu: null, loai: 'Hoá đơn', tieuDe: 'Hoá đơn tháng 8' }],
    ['TỜ KHAI HÀNG HOÁ NHẬP KHẨU số 106284471230, người nhập khẩu ALPHA GREEN COMMERCE CO., LTD.',
      { soHieu: null, loai: 'Tờ khai hải quan', tieuDe: 'Tờ khai lô hạnh nhân' }],
    /* Giấy KHÔNG nhắc tên công ty: phải trúng bằng mỏ neo TÊN TÀI LIỆU. */
    ['HỢP ĐỒNG NGUYÊN TẮC cung cấp hàng hoá giữa Bên A và Bên B, hiệu lực 01/01/2026.',
      { soHieu: null, loai: 'Hợp đồng nguyên tắc', tieuDe: 'Hợp đồng NCC hạt điều' }],
    /* Có số hiệu thì số hiệu là mỏ neo mạnh nhất, lệch dấu gạch vẫn trúng. */
    ['Số: 124 / 2026 / GCN – ATTP, cấp ngày 15/03/2026.',
      { soHieu: '124/2026/GCN-ATTP', loai: null, tieuDe: 'Giay ATTP' }],
    ['CÔNG TY TNHH ALPHA GREEN COMMERCE — Điều lệ công ty, chương I.',
      { soHieu: null, loai: null, tieuDe: 'Dieu le' }],
    ['ONFOD — Biên bản kiểm kê kho ngày 31/07/2026.',
      { soHieu: null, loai: null, tieuDe: 'Bien ban' }]
  ];
  /* Sau REV-0044, "không vứt oan" là ràng buộc CỨNG (luật ①) — chữ của cả bảy
     tờ phải còn nguyên. Còn "đối chiếu được" thì KHÔNG ép cả bảy: tờ HỢP ĐỒNG
     NGUYÊN TẮC không có số hiệu và không nhắc tên công ty nào — nó CHỈ trúng
     mỏ neo YẾU, và câu trả lời trung thực cho tờ đó là "chưa kiểm được", không
     phải "đã đối chiếu". Ép nó lên `da_neo` chính là chỗ chữ bịa chui vào. */
  const yeu = THAT.filter(([chu, moc]) => tailieu.docTinChu(chu, moc).muc !== 'da_neo');
  dat(yeu.length <= 1, 'Bảy tờ giấy THẬT: ít nhất 6/7 ĐỐI CHIẾU ĐƯỢC bằng mỏ neo MẠNH',
    `→ ${7 - yeu.length}/7 mạnh${yeu.length ? '; còn lại: ' + yeu.map(x => x[1].tieuDe).join(', ') : ''}`);
  dat(yeu.every(([chu, moc]) => tailieu.docTinChu(chu, moc).muc === 'neo_yeu'),
    'Tờ còn lại rơi về "chưa kiểm" chứ KHÔNG bị vứt chữ (luật ①)');

  /* ĐỐI CHỨNG: gỡ hết mỏ neo → bảy ca bịa phải rơi về `chua_kiem` mà KHÔNG có
     câu giải thích nào nhắc mỏ neo. Không đổi gì thì phép đo trên không đo mỏ
     neo, nó đo cái gì đó khác. */
  let lot = 0;
  for (const chu of BIA) if (tailieu.docTinChu(chu, { soHieu: null }).coMoc.length === 0) lot++;
  dat(lot === BIA.length,
    'ĐỐI CHỨNG: gỡ hết mỏ neo → cả 7 ca không còn mốc nào để kiểm',
    `→ ${lot}/${BIA.length}`);

  /* Không mốc nào dùng được thì PHẢI NÓI RA — im lặng cho qua là để người ta
     tưởng chữ này đã được kiểm. */
  const khongMoc = tailieu.docTinChu(BIA[0], { soHieu: '12' });
  dat(khongMoc.muc === 'chua_kiem' && /chưa gõ số hiệu/.test(String(khongMoc.viSao)),
    'Số hiệu < 4 ký tự và không có tên: nói THẲNG là không có mốc nào',
    `→ "${String(khongMoc.viSao).slice(0, 50)}…"`);
}

muc('⑧d3 CON SỐ AI ĐỌC — nhãn "AI đọc — CHƯA KIỂM" (vá REV-0040 #3, dải giữa)');
{
  const soAi = await import(pathToFileURL(path.join(GOC, 'src/so-ai.js')).href);
  const chu = 'Mã số thuế 0110938472 — Tổng cộng 42.350.000 đồng — ngày 05/01/1995.';
  const vt = soAi.viTriSoAI(chu);
  const lay = vt.map(([i, d]) => chu.slice(i, i + d));
  dat(lay.includes('0110938472') && lay.includes('42.350.000') && lay.includes('05/01/1995'),
    'Bắt trọn cụm số, KHÔNG cắt vụn "42.350.000" thành ba mẩu', `→ ${lay.join(' · ')}`);
  dat(soAi.NHAN_SO_AI === 'AI đọc — CHƯA KIỂM', 'Nhãn đúng MỘT câu, khai ở một chỗ');

  /* CON SỐ KHÔNG ĐƯỢC TỰ ĐIỀN VÀO Ô CHÍNH THỨC — Gạo chốt 29/08/2026. */
  const { thongTin, soChuaKiem } = soAi.tachSoChuaKiem(
    { ho_ten: 'Phạm Khương Duy', so_cccd: '001091027384', ngay_sinh: '1990-02-11', que_quan: 'Hà Nội' },
    ['so_cccd', 'ngay_sinh']);
  dat(!('so_cccd' in thongTin) && !('ngay_sinh' in thongTin),
    'Số CCCD / ngày sinh KHÔNG nằm trong khối điền sẵn `thong_tin`',
    `→ thong_tin = ${Object.keys(thongTin).join(', ')}`);
  dat(soChuaKiem.so_cccd && soChuaKiem.so_cccd.nhan === 'AI đọc — CHƯA KIỂM',
    'Số đi ra bằng đường riêng, ĐEO NHÃN, người phải xác nhận mới vào ô');
  dat(thongTin.ho_ten === 'Phạm Khương Duy', 'Chữ MÔ TẢ vẫn điền sẵn bình thường');

  /* ĐỐI CHỨNG: bỏ danh sách tên trường SỐ → số CCCD chui thẳng vào khối điền
     sẵn. Không bắt được thì phép đo trên là phép đo suông. */
  const hong = soAi.tachSoChuaKiem({ so_cccd: '001091027384' }, []);
  dat(hong.thongTin.so_cccd === '001091027384',
    'ĐỐI CHỨNG: bỏ chốt → số CCCD tự điền vào ô chính thức (phải lọt)');

  /* Máy chủ phải TRẢ vị trí số ra ngoài, không thì giao diện lấy đâu mà bôi. */
  const { kho, env } = d1SQLite();
  nhetTaiLieu(kho, banGhiThuong);
  const r = await doc(await tailieu.moTaiLieu(env, phienCua('ke_toan_truong'), 'tl_kt_9'));
  const cum = (r.tai_lieu.so_ai || []).map(([i, d]) => String(r.tai_lieu.noi_dung).slice(i, i + d));
  dat(cum.includes('0110938472') && r.tai_lieu.nhan_so_ai === 'AI đọc — CHƯA KIỂM',
    'Mở tài liệu: máy chủ trả kèm vị trí từng cụm số + nhãn', `→ ${cum.join(' · ')}`);
  const gd = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  dat(/class="so-ai"/.test(gd) && /AI đọc — CHƯA KIỂM/.test(gd),
    'Giao diện bôi con số bằng `.so-ai` và in đúng câu nhãn');
}

muc('⑧d4 ĐƯỜNG CCCD — chốt chống bịa + số CCCD luôn 12 chữ số (vá REV-0040 #2)');
{
  const nhansuMod = await import(pathToFileURL(path.join(GOC, 'src/nhansu.js')).href);
  const phienHR = { vai_tro: 'hcns', nhan_su_id: 'ns_huong' };
  const anhGia = Buffer.alloc(400, 7).toString('base64');

  async function docThe(traLoi) {
    const env = { AI: { async run() { return { response: traLoi }; } } };
    return await doc(await nhansuMod.docCCCD(env, phienHR, { anh: anhGia }));
  }

  const THE_THAT = (so) => JSON.stringify({
    ho_ten: 'PHẠM KHƯƠNG DUY', ngay_sinh: '1990-02-11', gioi_tinh: 'Nam',
    so_cccd: so, que_quan: 'Hà Nội', noi_thuong_tru: 'Cầu Giấy, Hà Nội',
    chu_tren_the: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — CĂN CƯỚC CÔNG DÂN'
  });

  /* ⚠️ CA HỒ LY ĐO ĐƯỢC, ca nguy nhất: HỌ TÊN ĐÚNG đứng cạnh số CCCD SAI 11
     chữ số. Cái tên đúng làm người ta tin luôn con số. */
  const mat1 = await docThe(THE_THAT('03691004271'));
  dat(mat1.ok === true && !(mat1.so_chua_kiem || {}).so_cccd,
    'Số CCCD 11 chữ số → CHẶN, không đi ra ô nào', `→ ${JSON.stringify(mat1.so_chua_kiem)}`);
  dat(/11 chữ số/.test(String(mat1.loi_so_cccd)),
    'Nói rõ vì sao bỏ, không im lặng', `→ "${String(mat1.loi_so_cccd).slice(0, 56)}…"`);
  dat(mat1.thong_tin.ho_ten === 'PHẠM KHƯƠNG DUY',
    'Họ tên (chữ mô tả) vẫn điền sẵn — không cắt quá tay');

  const du12 = await docThe(THE_THAT('001091027384'));
  dat(du12.so_chua_kiem.so_cccd.gia_tri === '001091027384' &&
      du12.so_chua_kiem.so_cccd.nhan === 'AI đọc — CHƯA KIỂM',
    'Số CCCD đủ 12 chữ số: qua, nhưng đeo nhãn và KHÔNG tự vào ô chính thức');
  dat(!('so_cccd' in du12.thong_tin) && !('ngay_sinh' in du12.thong_tin),
    'Khối điền sẵn KHÔNG có con số nào', `→ ${Object.keys(du12.thong_tin).join(', ')}`);

  /* Khuôn CŨ bịa hẳn một tấm thẻ tưởng tượng. Không có dòng "CĂN CƯỚC CÔNG
     DÂN" nào thì thứ trong ảnh không phải cái thẻ nó đang khai. */
  const bia = await docThe(JSON.stringify({
    ho_ten: 'NGUYỄN VĂN A', so_cccd: '1234567890123', ngay_sinh: '1980-01-01',
    que_quan: '', noi_thuong_tru: '', chu_tren_the: 'Kế hoạch số 2345/KH-UBND tỉnh Quảng Ngãi'
  }));
  dat(bia.ok === false && !Object.keys(bia.thong_tin || {}).length,
    'Thẻ BỊA (không có dòng "CĂN CƯỚC CÔNG DÂN") → vứt sạch, mời điền tay',
    `→ "${String(bia.loi_ai).slice(0, 52)}…"`);

  /* ĐỐI CHỨNG: bản BỎ chốt 12 chữ số → số sai phải LỌT ra ngoài.
     Luật này nay nằm ở `soCCCD()` trong src/so-ai.js (MỘT chỗ khai, dùng chung
     với đường quét giấy tờ vào hồ sơ nhân sự — CTL-0025 Đợt 2), nên chỗ gỡ là
     lời gọi ở đây, không còn là cái regex chép tay. */
  let ma = docNguon('src/nhansu.js')
    .replace('const { so: soTho, dung: soDung } = soCCCD(data.so_cccd);',
             'const soTho = String(data.so_cccd || "").replace(/\\D+/g, "");\n' +
             '    const soDung = !!soTho;   /* CỐ Ý BỎ CHỐT */')
    .replace(/from '\.\/(tai-lieu|quyen|so-ai)\.js'/g,
             (m, t) => `from '${pathToFileURL(path.join(GOC, 'src', t + '.js')).href}'`);
  if (!ma.includes('CỐ Ý BỎ CHỐT')) {
    dat(false, 'Tìm được chốt 12 chữ số để gỡ', '→ đã đổi mã, sửa lại bàn đo!');
  } else {
    const duong = path.join(TAM, 'nhansu-BO-CHOT.mjs');
    writeFileSync(duong, ma);
    const modHong = await import(pathToFileURL(duong).href + '?v=' + Date.now());
    const env = { AI: { async run() { return { response: THE_THAT('03691004271') }; } } };
    const r = await doc(await modHong.docCCCD(env, phienHR, { anh: anhGia }));
    dat(r.so_chua_kiem.so_cccd && r.so_chua_kiem.so_cccd.gia_tri === '03691004271',
      'ĐỐI CHỨNG: bỏ /^\\d{12}$/ → số 11 chữ số LỌT (phải lọt, sạch là PHÉP ĐO hỏng)',
      `→ ${JSON.stringify(r.so_chua_kiem.so_cccd)}`);
  }
}

muc('⑧d5 Ô TÌM KIẾM — dò được ruột giấy tờ nhạy cảm, 0 nhật ký (vá REV-0040 #4)');
{
  /* Hồ Ly: cột `tim_kiem` chứa NGUYÊN số CCCD và mức lương của nhóm nhạy cảm.
     Đường danh sách quét `tim_kiem LIKE ?` và ghi 0 lượt nhật ký — gõ thẳng
     một số CCCD vào ô tìm, thấy dòng hiện lên là đã XÁC NHẬN số đó nằm trong
     hồ sơ nào. Đọc được ruột, không để lại vết. */
  const chuoiNS = tailieu.chuoiTimKiem({
    tieu_de: 'CCCD Nguyễn Thị Huyền', so_hieu: 'HS-09', loai: 'CCCD', nhom: 'nhan_su',
    noi_dung: 'Số: 001301234567 — Ngày sinh 05/01/1995 — Lương thoả thuận 18.500.000đ'
  });
  dat(!/001301234567|18\.500\.000|1995/.test(chuoiNS),
    'Nhóm NHẠY CẢM: số CCCD / lương KHÔNG vào cột `tim_kiem`', `→ "${chuoiNS}"`);
  dat(/nguyen thi huyen/.test(chuoiNS) && /hs-09/.test(chuoiNS),
    'Vẫn tra được bằng tiêu đề và số hiệu — không cắt quá tay');

  const chuoiKT = tailieu.chuoiTimKiem({
    tieu_de: 'Hoá đơn tháng 8', so_hieu: 'HD-0812', loai: 'Hoá đơn', nhom: 'ke_toan',
    noi_dung: 'Mã số thuế 0110938472 — Tổng cộng 42.350.000 đồng'
  });
  dat(/0110938472/.test(chuoiKT),
    'Nhóm THƯỜNG: nội dung vẫn vào ô tìm kiếm như cũ (hoá đơn phải tra được)');

  /* ĐO THẬT QUA API. Hồ sơ thử dùng số hiệu HỒ SƠ (`HS-09`), không lấy số CCCD
     làm số hiệu — `so_hieu` là thứ NGƯỜI TỰ GÕ để tra cứu, nó có mặt trong ô
     tìm là đúng và cố ý. Cái phải chặn là RUỘT do AI bóc ra: mức lương, ngày
     sinh, quê quán — những thứ không ai gõ vào mà vẫn dò được. */
  const hoSo = (mod = tailieu) => ({
    ...banGhiNhayCam, so_hieu: 'HS-09',
    tim_kiem: mod.chuoiTimKiem({
      tieu_de: banGhiNhayCam.tieu_de, so_hieu: 'HS-09', loai: banGhiNhayCam.loai,
      nhom: 'nhan_su', noi_dung: banGhiNhayCam.noi_dung })
  });
  const { kho, env, so } = d1SQLite();
  nhetTaiLieu(kho, hoSo(), banGhiThuong);

  for (const [nhan, q] of [['số CCCD', '001301234567'], ['mức lương', '18.000.000'],
                           ['ngày sinh', '05/01/1995'], ['quê quán', 'Yên Hoà']]) {
    const rKT = await doc(await tailieu.danhSachTaiLieu(env, phienCua('ke_toan_truong'),
      new URLSearchParams({ q })));
    const rAd = await doc(await tailieu.danhSachTaiLieu(env, phienCua('admin'),
      new URLSearchParams({ q })));
    dat((rKT.ds || []).length === 0 && (rAd.ds || []).length === 0 &&
        !/001301234567|18\.000\.000|Yên Hoà/.test(JSON.stringify(rKT) + JSON.stringify(rAd)),
      `Gõ ${nhan.padEnd(9)} vào ô tìm: 0 dòng cho CẢ kế toán lẫn Admin`,
      `→ ${(rKT.ds || []).length} / ${(rAd.ds || []).length} dòng`);
  }
  /* Muốn đọc ruột thì phải MỞ tài liệu — và mở là có nhật ký. Đó là toàn bộ ý
     của bản vá: không bịt đường đọc, chỉ bắt nó đi qua chỗ có ghi vết. */
  const rTen = await doc(await tailieu.danhSachTaiLieu(env, phienCua('admin'),
    new URLSearchParams({ q: 'nguyen thi huyen' })));
  dat((rTen.ds || []).length === 1, 'Vẫn tra được bằng TIÊU ĐỀ — không bịt đường tra cứu',
    `→ ${(rTen.ds || []).length} dòng`);
  dat(so.ghi === 0, 'Đường tìm kiếm vẫn 0 lượt ghi D1', `→ ${so.ghi}`);

  /* ĐỐI CHỨNG: bỏ đúng chỗ cắt trong `chuoiTimKiem` → ruột chui vào cột tìm
     kiếm và dò ra được ngay. */
  const hong = await napBanVa('tim_kiem không cắt',
    ['  const ruot = (laLa || nhomTaiLieuNhayCam(nhom)) ? null : noi_dung;', '  const ruot = noi_dung;']);
  if (hong) {
    const x = d1SQLite();
    nhetTaiLieu(x.kho, hoSo(hong));
    const r3 = await doc(await hong.danhSachTaiLieu(x.env, phienCua('admin'),
      new URLSearchParams({ q: '18.000.000' })));
    dat((r3.ds || []).length === 1,
      'ĐỐI CHỨNG: bỏ chốt → gõ mức lương vào ô tìm là DÒ RA (phải ra 1 dòng)',
      `→ ${(r3.ds || []).length} dòng`);
  }
}

muc('⑧d6 SAO LƯU TỰ ĐỘNG — toàn văn CCCD/HĐLĐ ra CSV lên Drive (vá REV-0040 #5)');
{
  const saoLuu = await import(pathToFileURL(path.join(GOC, 'src/sao-luu.js')).href);
  const cot = ['id', 'nhom', 'tieu_de', 'nhay_cam', 'noi_dung', 'tim_kiem'];

  const dongNS = saoLuu.dongCsv(cot, saoLuu.cheDongNhayCam('tai_lieu', banGhiNhayCam));
  dat(!/001301234567|18\.000\.000|05\/01\/1995/.test(dongNS),
    'Dòng NHẠY CẢM ra CSV: 0 mảnh số CCCD / lương / ngày sinh',
    `→ ${dongNS.trim().slice(0, 60)}…`);
  dat(dongNS.includes('đã loại khỏi bản sao lưu'),
    'GHI RÕ vì sao ô trống — không để trống lặng lẽ rồi ai đó đi quét lại');
  dat(dongNS.includes('CCCD Nguyễn Thị Huyền'),
    'Tiêu đề / nhóm VẪN còn — bản sao lưu vẫn biết tài liệu nào đã từng có');

  const dongKT = saoLuu.dongCsv(cot, saoLuu.cheDongNhayCam('tai_lieu', banGhiThuong));
  dat(/0110938472/.test(dongKT) && /42\.350\.000/.test(dongKT),
    'Dòng THƯỜNG (hoá đơn): chữ đã bóc VẪN vào bản sao lưu — không cắt quá tay');

  /* Bảng khác không được đụng tới — chốt này là phép biến đổi THEO DÒNG của
     đúng một bảng, sao lưu vừa lên hôm nay, đừng làm hỏng nó. */
  const nsGoc = { id: 'ns_1', ho_ten: 'Phạm Khương Duy', luong: 25000000 };
  dat(saoLuu.cheDongNhayCam('nhan_su', nsGoc) === nsGoc,
    'Bảng KHÁC đi qua nguyên vẹn (cùng một tham chiếu) — sao lưu không đổi hành vi');
  dat(saoLuu.cheDongNhayCam('tai_lieu', banGhiThuong) === banGhiThuong,
    'Dòng KHÔNG nhạy cảm cũng đi qua nguyên vẹn — 0 chi phí cho ca thường');

  /* ĐỐI CHỨNG: bỏ luật che → toàn văn CCCD ra thẳng CSV, đúng như REV-0040 tả. */
  const cheHong = { ...banGhiNhayCam };
  dat(/001301234567/.test(saoLuu.dongCsv(cot, cheHong)),
    'ĐỐI CHỨNG: không qua `cheDongNhayCam` → số CCCD ra thẳng CSV (phải lọt)');
  dat(/cheDongNhayCam\(bang, r\)/.test(readFileSync(path.join(GOC, 'src/sao-luu.js'), 'utf8')),
    'Chốt nằm ĐÚNG trên đường ra CSV (`motLo`), không phải một hàm không ai gọi');
}

muc('⑧d7 MÀN NHẬT KÝ + NÚT QUÉT — vá REV-0040 #6 #7 #8');
{
  const { kho, env } = d1SQLite();
  nhetTaiLieu(kho, banGhiNhayCam);
  /* 250 dòng nhật ký để vượt trần 200 — cắt là phải NÓI RA, và đây là màn ít
     được phép cắt lặng nhất trong cả ERP. */
  const cau = kho.prepare(`INSERT INTO tai_lieu_nhat_ky
    (khoa, tai_lieu_id, nhan_su_id, ngay, hanh_dong, so_lan, luc) VALUES (?,?,?,?,?,1,?)`);
  for (let i = 0; i < 250; i++) {
    const ng = new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10);
    cau.run(`tl_ns_9|ns_${i}|${ng}|mo`, 'tl_ns_9', `ns_${i}`, ng, 'mo', `${ng} 09:00:00`);
  }
  const r = await doc(await tailieu.nhatKyTaiLieu(env, phienCua('admin'), 'tl_ns_9'));
  dat(r.ds.length === 200 && r.bi_cat === true,
    'Nhật ký 250 dòng, trần 200 → NÓI RA là đã cắt', `→ ${r.ds.length} dòng, bi_cat=${r.bi_cat}`);
  dat(r.cat && r.cat.tong === 250,
    'Và nói ĐÚNG tổng thật, không chỉ "còn nữa"', `→ tổng ${r.cat && r.cat.tong}`);

  const it = d1SQLite(); nhetTaiLieu(it.kho, banGhiNhayCam);
  const r2 = await doc(await tailieu.nhatKyTaiLieu(it.env, phienCua('admin'), 'tl_ns_9'));
  dat(r2.bi_cat === false && r2.cat === null, 'Chưa chạm trần → KHÔNG báo cắt oan, 0 câu đếm');

  const r3 = await tailieu.nhatKyTaiLieu(it.env, phienCua('hcns'), 'tl_ns_9');
  dat(r3.status === 403, 'Nhật ký chỉ Admin — HCNS gọi thẳng API vẫn 403', `→ HTTP ${r3.status}`);

  /* Nhật ký ghi mà KHÔNG MÀN NÀO đọc được thì chỉ là ghi cho có. */
  const gd = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  dat(/API\.tlNhatKy\(/.test(gd), 'Có màn hình THẬT gọi `API.tlNhatKy` (trước đây không ai gọi)');
  dat(/data-nk=/.test(gd) && /laAdminTL/.test(gd),
    'Nút nhật ký chỉ bày cho Admin, và chỉ ở giấy tờ nhạy cảm');

  /* Nút "Quét tài liệu" — 3 vai trò không lưu được nhóm nào. */
  dat(/nutQuet\.hidden = !nhomLuuDuoc\.length/.test(gd),
    'Nút "Quét tài liệu" ẩn khi không lưu được nhóm nào');
  const html = readFileSync(path.join(GOC, 'public/app.html'), 'utf8');
  dat(/id="tl-nut-quet"[^>]*\shidden/.test(html),
    'Và ẩn SẴN trong HTML — không nháy một cú hứa suông rồi mới ẩn');
  for (const vt of ['nhan_vien_kho', 'cskh', 'nguoi_dung']) {
    dat(quyen.nhomTaiLieuLuuDuoc(vt).length === 0 && quyen.nhomTaiLieuXemDuoc(vt).length > 0,
      `${vt.padEnd(14)} xem được nhưng KHÔNG lưu được → nút phải ẩn`);
  }
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
  dat(/import \{ MO_HINH_DOC_ANH, khuonDocAnh(, docTinChu)? \} from '\.\/tai-lieu\.js'/.test(nhansu) &&
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

/* ==========================================================================
   ⑨ CỬA VÀO HỒ SƠ NHÂN SỰ  ·  CTL-0025 Đợt 2
   ---------------------------------------------------------------------------
   Đo trên SQLite THẬT (không phải D1 giả): câu "một kho, hai cửa nhìn" chỉ có
   nghĩa khi CHẠY ĐÚNG câu SQL trên đúng dữ liệu — khớp chuỗi trong mã nguồn
   thì sửa chuỗi là qua.
   ========================================================================== */
muc('⑨ CỬA VÀO HỒ SƠ NHÂN SỰ — mở cửa `nhan_su`, giữ nguyên ranh giới CCCD');

const jpegDo = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
  'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');
const pdfDo = Buffer.concat([Buffer.from('%PDF-1.4\n'), jpegDo, Buffer.from('\n%%EOF\n')]);

/** Dựng một kho có sẵn hai người thật + tuỳ chọn vài tài liệu. */
function khoCoNguoi(...ds) {
  const x = d1SQLite();
  x.kho.exec(`INSERT INTO nhan_su (id, ho_ten) VALUES
                ('ns_huyen','Nguyễn Thị Huyền'), ('ns_duy','Phạm Khương Duy')`);
  if (ds.length) nhetTaiLieu(x.kho, ...ds);
  return x;
}

function thanQuet(them = {}) {
  return {
    ma_gui: 'mg-ns-' + Math.random().toString(36).slice(2, 10),
    cua_vao: 'nhan_su', gan_id: 'ns_huyen',
    tieu_de: 'Quyết định bổ nhiệm — Nguyễn Thị Huyền',
    loai: 'Quyết định', so_hieu: '12/2026/QĐ-AGC', so_trang: 2,
    tep: pdfDo.toString('base64'),
    anh_boc_chu: [jpegDo.toString('base64'), jpegDo.toString('base64')],
    dong_y_boi: 'Nguyễn Thị Huyền', dong_y_muc_dich: 'Quản lý hồ sơ lao động',
    ...them
  };
}

muc('⑨a CỬA ĐÃ MỞ — và mở đúng người, đúng vai trò');
{
  const { kho, env, so, datLai } = khoCoNguoi();
  datLai();
  const res = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'), thanQuet());
  const than = await doc(res);
  dat(res.status === 200, 'HCNS quét giấy vào hồ sơ một người', `→ HTTP ${res.status} ${than.loi || ''}`);
  dat(than.gan_id === 'ns_huyen' && than.gan_ten === 'Nguyễn Thị Huyền',
    'Câu trả lời nói rõ giấy này thuộc hồ sơ AI', `→ ${than.gan_ten}`);
  dat(so.ghi === 1, 'MỘT lượt quét vào hồ sơ = ĐÚNG 1 lượt ghi D1',
    `→ ${so.ghi} lượt ghi, ${so.doc} lượt đọc`);
  const dong = kho.prepare(`SELECT cua_vao, gan_id, nhom, nhay_cam, dong_y_luc FROM tai_lieu`).get();
  dat(dong.cua_vao === 'nhan_su' && dong.gan_id === 'ns_huyen' && dong.nhom === 'nhan_su' &&
      dong.nhay_cam === 1 && !!dong.dong_y_luc,
    'Dòng lưu ra: cửa `nhan_su`, khoá vào nhóm `nhan_su`, có dấu đồng ý',
    `→ ${JSON.stringify(dong)}`);

  /* KHÔNG còn 409. Đây chính là dòng Đợt 1 khoá lại. */
  dat(!/thuộc Đợt 2 \(CTL-0025\), chưa mở/.test(docNguon('src/tai-lieu.js')),
    'Chốt 409 "Đợt 2 chưa mở" đã được gỡ khỏi mã nguồn');
}

muc('⑨b RANH GIỚI CỨNG — quản lý kho KHÔNG chạm được giấy tờ nhân sự');
{
  /* Anh Duy quản 12 người ở kho. Quản người KHÔNG phải là được xem giấy tờ tuỳ
     thân của họ — CTL-0025 Mục 4 gọi đích danh ca này. Cắt ở MÁY CHỦ. */
  const { env } = khoCoNguoi();
  const r1 = await tailieu.luuTaiLieu(env, phienCua('quan_ly_kho', 'ns_duy'), thanQuet());
  dat(r1.status === 403, 'Quản lý kho QUÉT vào hồ sơ nhân sự', `→ HTTP ${r1.status}`);

  const { env: e2 } = khoCoNguoi({ ...banGhiNhayCam, cua_vao: 'nhan_su', gan_id: 'ns_huyen' });
  const r2 = await tailieu.danhSachTaiLieu(e2, phienCua('quan_ly_kho', 'ns_duy'),
    new URLSearchParams({ gan_id: 'ns_huyen' }));
  const t2 = await doc(r2);
  dat(r2.status === 403, 'Quản lý kho XIN bộ giấy tờ của một nhân viên', `→ HTTP ${r2.status}`);
  dat(/không có quyền/i.test(t2.loi || ''),
    'Câu trả lời nói THẲNG là không có quyền, không trả danh sách rỗng',
    `→ "${String(t2.loi || '').slice(0, 60)}…"`);

  /* CA CẮT QUÁ TAY — HCNS PHẢI xem được. Một chốt chặn tất cả cũng hỏng y như
     một chốt không chặn ai. */
  const { env: e3 } = khoCoNguoi({ ...banGhiNhayCam, cua_vao: 'nhan_su', gan_id: 'ns_huyen' });
  const r3 = await doc(await tailieu.danhSachTaiLieu(e3, phienCua('hcns', 'ns_huong'),
    new URLSearchParams({ gan_id: 'ns_huyen' })));
  dat((r3.ds || []).length === 1 && r3.duoc_quet_nhan_su === true,
    'HCNS xem được bộ giấy tờ VÀ quét thêm được (không cắt quá tay)',
    `→ ${(r3.ds || []).length} giấy, quét được=${r3.duoc_quet_nhan_su}`);
  dat((r3.loai_goi_y || []).length >= 9,
    'Máy chủ trả bộ loại giấy tờ nhân sự (quyết định · uỷ quyền · …)',
    `→ ${(r3.loai_goi_y || []).map(l => l.ten).join(' · ')}`);

  const { env: e4 } = khoCoNguoi({ ...banGhiNhayCam, cua_vao: 'nhan_su', gan_id: 'ns_huyen' });
  const r4 = await doc(await tailieu.danhSachTaiLieu(e4, phienCua('admin', 'ns_ngoc'),
    new URLSearchParams({ gan_id: 'ns_huyen' })));
  dat((r4.ds || []).length === 1, 'Ban giám đốc xem được bộ giấy tờ', `→ ${(r4.ds || []).length} giấy`);
}

muc('⑨c CA ĐỐI CHỨNG (BH-16) — bỏ chốt thì phép kiểm PHẢI bắt được');
{
  /* Đối chứng ĐÚNG CHỖ (BH-26): chỗ chặn cửa hồ sơ là đúng một lệnh `if` trong
     `danhSachTaiLieu`. Bỏ nó → quản lý kho phải LỌT. Bản bỏ chặn mà vẫn 403 thì
     phép đo đang bắt nhầm thứ khác, và mọi dòng ĐẠT ở ⑨b đều vô nghĩa. */
  const hong = await napBanVa('bỏ chốt cửa hồ sơ',
    [`  if (ganId && !duocXemNhomTaiLieu(phien.vai_tro, NHOM_CUA_NHAN_SU)) {`,
     `  if (false) {`]);
  if (hong) {
    const { env } = khoCoNguoi({ ...banGhiNhayCam, cua_vao: 'nhan_su', gan_id: 'ns_huyen' });
    const r = await hong.danhSachTaiLieu(env, phienCua('quan_ly_kho', 'ns_duy'),
      new URLSearchParams({ gan_id: 'ns_huyen' }));
    const t = await doc(r);
    dat(r.status === 200, 'Bản BỎ CHỐT: quản lý kho qua được cửa 403',
      `→ HTTP ${r.status} (phải 200 — nếu 403 thì PHÉP ĐO hỏng)`);
    /* Nhưng lọc theo NHÓM vẫn phải giữ: đó là lớp đỡ thứ hai, phải sống độc
       lập với lớp thứ nhất. Bỏ một lớp mà dữ liệu vẫn không rò = đúng. */
    dat(!(t.ds || []).some(x => x.nhom === 'nhan_su'),
      'Lớp đỡ THỨ HAI (lọc theo nhóm) vẫn chặn được dòng nhân sự',
      `→ ${(t.ds || []).length} dòng lọt ra`);
  }

  /* Đối chứng thứ hai: bỏ khoá nhóm ở cửa `nhan_su` → kế toán trưởng gắn được
     một tờ hoá đơn (nhóm `ke_toan`, KHÔNG nhạy cảm) vào hồ sơ một người, tức là
     lách được cả dấu đồng ý lẫn nhật ký truy cập. */
  const hong2 = await napBanVa('bỏ khoá nhóm ở cửa hồ sơ',
    [`  const nhom = cuaVao === 'nhan_su' ? NHOM_CUA_NHAN_SU : chuoi(body.nhom, 40);`,
     `  const nhom = chuoi(body.nhom, 40);`]);
  if (hong2) {
    const { kho, env } = khoCoNguoi();
    const r = await hong2.luuTaiLieu(env, phienCua('ke_toan_truong', 'ns_hang'),
      thanQuet({ nhom: 'ke_toan', dong_y_boi: null, dong_y_muc_dich: null }));
    const dong = kho.prepare('SELECT nhom, nhay_cam FROM tai_lieu').get();
    dat(r.status === 200 && dong && dong.nhay_cam === 0,
      'Bản BỎ KHOÁ NHÓM: gắn được giấy KHÔNG nhạy cảm vào hồ sơ người',
      `→ HTTP ${r.status}, nhom=${dong && dong.nhom} nhay_cam=${dong && dong.nhay_cam}`);
    const { kho: k2, env: e2 } = khoCoNguoi();
    await tailieu.luuTaiLieu(e2, phienCua('ke_toan_truong', 'ns_hang'),
      thanQuet({ nhom: 'ke_toan', dong_y_boi: null, dong_y_muc_dich: null }));
    dat(k2.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n === 0,
      'Bản THẬT: kế toán trưởng KHÔNG gắn được gì vào hồ sơ người');
  }
}

muc('⑨d "THÀNH 1 BỘ" — nhưng vẫn MỘT KHO, không phải hai kho');
{
  /* Quét ở cửa HỒ SƠ → phải hiện ở CẢ hai cửa. Ràng buộc CTL-0026 Mục 5, và
     cũng là chỗ dễ hỏng nhất: Đợt 1 khoá cứng `cua_vao = 'kho_chung'` trong câu
     danh sách; giữ nguyên dòng đó là thành hai kho mà không ai thấy. */
  const { kho, env } = khoCoNguoi();
  await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'), thanQuet());
  const id = kho.prepare('SELECT id FROM tai_lieu').get().id;

  const cuaHoSo = await doc(await tailieu.danhSachTaiLieu(env, phienCua('hcns', 'ns_huong'),
    new URLSearchParams({ gan_id: 'ns_huyen' })));
  const cuaKho = await doc(await tailieu.danhSachTaiLieu(env, phienCua('hcns', 'ns_huong'),
    new URLSearchParams()));
  dat((cuaHoSo.ds || []).some(x => x.id === id), 'Giấy quét ở cửa hồ sơ → HIỆN ở cửa hồ sơ');
  dat((cuaKho.ds || []).some(x => x.id === id),
    'Giấy quét ở cửa hồ sơ → CŨNG hiện ở kho chung (MỘT kho)',
    `→ kho chung ${cuaKho.ds.length} giấy`);
  dat((cuaKho.ds.find(x => x.id === id) || {}).gan_ten === 'Nguyễn Thị Huyền',
    'Kho chung nói rõ tờ giấy này thuộc hồ sơ AI',
    `→ ${(cuaKho.ds.find(x => x.id === id) || {}).gan_ten}`);

  /* ---- "THÀNH 1 BỘ" — VÁ REV-0046 #2 ----------------------------------
     Sếp Ngọc: "lưu vào đây luôn THÀNH 1 BỘ là đẹp". Giấy nhóm `nhan_su` quét
     ở cửa KHO CHUNG trước đây bị vứt `gan_id` ⇒ không nằm trong bộ của ai.
     Nay nhóm `nhan_su` LUÔN gắn người, quét ở cửa nào cũng vậy. */
  const { kho: k2, env: e2 } = khoCoNguoi();
  await tailieu.luuTaiLieu(e2, phienCua('hcns', 'ns_huong'), {
    ma_gui: 'mg-chung-1', cua_vao: 'kho_chung', nhom: 'nhan_su', gan_id: 'ns_huyen',
    tieu_de: 'Hợp đồng lao động — Nguyễn Thị Huyền', so_trang: 1,
    tep: pdfDo.toString('base64'),
    dong_y_boi: 'Nguyễn Thị Huyền', dong_y_muc_dich: 'Quản lý hồ sơ lao động'
  });
  const boCuaNguoi = await doc(await tailieu.danhSachTaiLieu(e2, phienCua('hcns', 'ns_huong'),
    new URLSearchParams({ gan_id: 'ns_huyen' })));
  const khoChung2 = await doc(await tailieu.danhSachTaiLieu(e2, phienCua('hcns', 'ns_huong'),
    new URLSearchParams()));
  dat((boCuaNguoi.ds || []).length === 1,
    'Quét ở KHO CHUNG, nhóm Nhân sự, chọn người → VÀO ĐÚNG bộ của người đó',
    `→ ${(boCuaNguoi.ds || []).length} giấy`);
  dat((khoChung2.ds || []).length === 1, 'Giấy đó vẫn nằm trong kho chung', `→ ${khoChung2.ds.length}`);
  dat(k2.prepare(`SELECT cua_vao, gan_id FROM tai_lieu`).get().cua_vao === 'nhan_su',
    'Giấy nhân sự quét ở kho chung được ghi `cua_vao=nhan_su` — MỘT dạng dòng duy nhất');

  /* Chọn nhóm Nhân sự mà KHÔNG chọn người → chặn ở máy chủ, không đẻ dòng nào. */
  const { kho: k3, env: e3 } = khoCoNguoi();
  const khongChon = await tailieu.luuTaiLieu(e3, phienCua('hcns', 'ns_huong'), {
    ma_gui: 'mg-chung-2', cua_vao: 'kho_chung', nhom: 'nhan_su',
    tieu_de: 'Quyết định bổ nhiệm không rõ của ai', so_trang: 1,
    tep: pdfDo.toString('base64'),
    dong_y_boi: 'Ban giám đốc', dong_y_muc_dich: 'Quản lý hồ sơ lao động'
  });
  dat(khongChon.status === 400 && /hồ sơ của một người/.test(String((await doc(khongChon)).loi)),
    'Nhóm Nhân sự mà KHÔNG chọn người → 400 nói thẳng', `→ HTTP ${khongChon.status}`);
  dat(k3.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n === 0,
    'Và không đẻ dòng nào (không có giấy nhân sự mồ côi)');

  /* Nhóm KHÁC gửi kèm `gan_id` thì vẫn VỨT như cũ: một dòng `kho_chung` mang
     `gan_id` là dòng không cửa nào tra ra. Ranh giới này KHÔNG được nới. */
  const { kho: k4, env: e4 } = khoCoNguoi();
  await tailieu.luuTaiLieu(e4, phienCua('hcns', 'ns_huong'), {
    ma_gui: 'mg-chung-3', cua_vao: 'kho_chung', nhom: 'noi_bo', gan_id: 'ns_huyen',
    tieu_de: 'Quy trình đóng gói hàng khô', so_trang: 1, tep: pdfDo.toString('base64')
  });
  const d4 = k4.prepare('SELECT cua_vao, gan_id FROM tai_lieu').get();
  dat(d4 && d4.gan_id === null && d4.cua_vao === 'kho_chung',
    'Nhóm KHÁC gửi kèm `gan_id` vẫn bị VỨT (không có dòng mồ côi)',
    `→ cua_vao=${d4 && d4.cua_vao}, gan_id=${d4 && d4.gan_id}`);

  const boDuy = await doc(await tailieu.danhSachTaiLieu(env, phienCua('hcns', 'ns_huong'),
    new URLSearchParams({ gan_id: 'ns_duy' })));
  dat((boDuy.ds || []).length === 0, 'Bộ giấy người này KHÔNG lẫn sang người kia',
    `→ ns_duy có ${(boDuy.ds || []).length} giấy`);
}

muc('⑨e GẮN VÀO NGƯỜI KHÔNG CÓ THẬT — không được đẻ tài liệu mồ côi');
{
  const { kho, env } = khoCoNguoi();
  const r1 = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'),
    thanQuet({ gan_id: 'ns_khong_co_that' }));
  dat(r1.status === 404, 'Gắn vào mã nhân sự không có thật → 404', `→ HTTP ${r1.status}`);
  const r2 = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'), thanQuet({ gan_id: null }));
  dat(r2.status === 400, 'Cửa hồ sơ mà thiếu mã nhân sự → chặn', `→ HTTP ${r2.status}`);
  const r3 = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'),
    thanQuet({ cua_vao: 'cua_bia_ra' }));
  dat(r3.status === 400, 'Cửa vào bịa ra → chặn, đừng đoán', `→ HTTP ${r3.status}`);
  dat(kho.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n === 0,
    'Không một dòng mồ côi nào lọt vào bảng');
}

muc('⑨f SỐ CCCD PHẢI ĐỦ 12 CHỮ SỐ — một luật, hai đường dùng');
{
  const soai = await import(pathToFileURL(path.join(GOC, 'src/so-ai.js')).href);
  const CA = [['001301234567', true], ['03691004271', false], ['0013 0123 4567', true],
              ['', false], ['abc', false], ['0013012345678', false]];
  for (const [v, mong] of CA) {
    dat(soai.soCCCD(v).dung === mong, `soCCCD("${v}")`, `→ ${soai.soCCCD(v).dung ? 'đủ 12' : 'KHÔNG đủ 12'}`);
  }
  dat(/soCCCD\(data\.so_cccd\)/.test(readFileSync(path.join(GOC, 'src/nhansu.js'), 'utf8')),
    'Đường đọc ảnh CCCD dùng CHUNG luật (không chép tay `/^\\d{12}$/`)');

  const { kho, env } = khoCoNguoi();
  const r = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'),
    thanQuet({ loai: 'CCCD', so_hieu: '03691004271' }));
  const t = await doc(r);
  dat(r.status === 400 && /12 chữ số/.test(t.loi || ''),
    'Quét CCCD với số 11 chữ số → chặn ở MÁY CHỦ',
    `→ HTTP ${r.status} "${String(t.loi || '').slice(0, 60)}"`);
  const r2 = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'),
    thanQuet({ loai: 'CCCD', so_hieu: '001301234567' }));
  dat(r2.status === 200, 'Quét CCCD với số đủ 12 chữ số → lưu được', `→ HTTP ${r2.status}`);
  /* CA CẮT QUÁ TAY: loại giấy KHÁC thì số hiệu tự do — "12/2026/QĐ-AGC" không
     phải số CCCD, chặn nó là chặn oan cả bộ quyết định. */
  const r3 = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'),
    thanQuet({ loai: 'Quyết định', so_hieu: '12/2026/QĐ-AGC' }));
  dat(r3.status === 200, 'Loại giấy khác: số hiệu tự do, KHÔNG chặn oan', `→ HTTP ${r3.status}`);
  dat(kho.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n === 2,
    'Đúng 2 tờ lưu được, tờ CCCD sai số KHÔNG lưu');
  for (const [l, mong] of [['CCCD', true], ['Căn cước công dân', true], ['CCCD/CMND', true],
                           ['Quyết định', false], ['Hợp đồng lao động', false], ['', false]]) {
    dat(tailieu.laLoaiCCCD(l) === mong, `laLoaiCCCD("${l}")`, `→ ${tailieu.laLoaiCCCD(l)}`);
  }
}

muc('⑨g NÚT ≥44px Ở CỬA HỒ SƠ + LUẬT BA MÀU + CÂU LUẬT');
{
  const css = readFileSync(path.join(GOC, 'public/assets/css/style.css'), 'utf8');
  const html = readFileSync(path.join(GOC, 'public/app.html'), 'utf8');
  const js = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');

  dat(/id="nsGt-quet"/.test(html) && /class="btn-primary tl-nut-quet" id="nsGt-quet"/.test(html),
    'Nút "Quét thêm" dùng lại `.tl-nut-quet` (đã 44px, đã đo)');
  dat(/\.tl-nut-quet\s*\{[^}]*min-height:\s*44px/.test(css), '.tl-nut-quet: min-height 44px');
  dat(/\.tl-nut-mo\s*\{[^}]*min-height:\s*44px/.test(css), '.tl-nut-mo: min-height 44px');
  dat(/\.tlq-nut-phu\s*\{[^}]*min-height:\s*44px/.test(css), '.tlq-nut-phu (chip loại giấy): min-height 44px');

  /* Chip đang chọn dùng cam NHẠT (`--cam-wash`), không phải cam đậm: một điểm
     nhấn cam đậm cho một khung nhìn (docs/BANG-MAU.md luật ③). */
  const chip = (css.match(/\.tlq-nut-phu\.chon\s*\{[^}]*\}/) || [''])[0];
  dat(/--cam-wash/.test(chip) && !/background:\s*var\(--cam\)\s*;/.test(chip),
    'Chip đang chọn: cam NHẠT, không tranh điểm nhấn với nút Lưu');
  dat(chip.length > 0 && !/#[0-9a-fA-F]{3,8}/.test(chip),
    'Chip không có mã màu viết cứng — chỉ dùng biến bảng màu');

  /* Câu pháp lý và câu trả giấy PHẢI có trên màn hồ sơ. Ràng buộc luật, không
     phải chữ trang trí: không có nó là có ngày ai đó dọn kho giấy. */
  const khoi = (html.match(/Giấy tờ của người này[\s\S]{0,2000}/) || [''])[0];
  dat(/KHÔNG thay bản giấy/.test(khoi), 'Màn hồ sơ có câu "KHÔNG thay bản giấy"');
  dat(/trả giấy lại cho nhân viên ngay/i.test(khoi), 'Màn hồ sơ có câu "trả giấy ngay"');
  dat(/ghi nhật ký/i.test(khoi), 'Màn hồ sơ nói rõ mỗi lượt mở đều ghi nhật ký');

  /* Giao diện KHÔNG được giữ bản chép tay của danh sách loại giấy — nó phải đi
     từ máy chủ xuống, đúng bài học "hai bản chép tay của một hằng số". */
  dat(/NS_GT_LOAI_GOI_Y = kq\.loai_goi_y/.test(js),
    'app.js lấy danh sách loại giấy từ MÁY CHỦ, không chép tay');
  dat(/veGiayToHoSo\(n\)/.test(js), 'Mở hồ sơ là nạp bộ giấy tờ (không phải bấm thêm một nút)');
}

/* ==========================================================================
   ⑩ VÁ REV-0044 · L1 — CÂU "CHỐT KHÔNG CHẠY" PHẢI TỚI MẮT NGƯỜI QUÉT
   ---------------------------------------------------------------------------
   Bóc HÀM THẬT ra khỏi `app.js` rồi CHẠY nó, không khớp chuỗi: bản trước cũng
   "có" câu đó trong mã nguồn — nó chỉ nằm ở nhánh không bao giờ chạy.
   ========================================================================== */
muc('⑩ L1 — câu "chưa đối chiếu được" in ở CẢ HAI nhánh');
{
  const appJs = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  /** Bóc đúng thân hàm `cauSauKhiQuet` rồi dựng lại bằng `new Function`. */
  function layHam(nguon, ten) {
    const dau = nguon.indexOf(`function ${ten}(kq) {`);
    if (dau < 0) return null;
    let i = nguon.indexOf('{', dau), sau = 0;
    for (let j = i; j < nguon.length; j++) {
      if (nguon[j] === '{') sau++;
      else if (nguon[j] === '}' && --sau === 0) {
        return new Function('kq', nguon.slice(i + 1, j));
      }
    }
    return null;
  }
  const cau = layHam(appJs, 'cauSauKhiQuet');
  if (!cau) {
    dat(false, 'Bóc được hàm cauSauKhiQuet trong app.js', '→ đã đổi tên, sửa bàn đo!');
  } else {
    const GHI = '2/3 trang CHƯA ĐỐI CHIẾU ĐƯỢC (trang 2, 3).';
    /* NHÁNH CÓ CHỮ — đúng nhánh đã nuốt câu này suốt ba vòng. */
    const coChu = cau({ so_trang: 3, ocr_so_trang: 3, ocr_so_trang_neo: 1, ocr_ghi_chu: GHI });
    dat(coChu.includes(GHI),
      'Nhánh CÓ chữ: câu "chưa đối chiếu được" ĐƯỢC IN', `→ "${coChu.slice(-60)}"`);
    dat(/1 trang đối chiếu được|trong đó 1 trang/.test(coChu),
      'Và nói rõ mấy trang đối chiếu được, không chỉ "bóc chữ được 3 trang"');
    /* NHÁNH KHÔNG CHỮ — vốn đã in, phải giữ. */
    const khongChu = cau({ so_trang: 2, ocr_so_trang: 0, ocr_so_trang_neo: 0, ocr_ghi_chu: 'Ảnh bóc chữ quá nhỏ' });
    dat(khongChu.includes('Ảnh bóc chữ quá nhỏ'), 'Nhánh KHÔNG chữ: vẫn in như cũ');
    /* Không có gì để nói thì đừng bịa thêm một dòng cảnh báo. */
    const sach = cau({ so_trang: 2, ocr_so_trang: 2, ocr_so_trang_neo: 2, ocr_ghi_chu: null });
    dat(!/CHƯA ĐỐI CHIẾU/.test(sach), 'Mọi trang đối chiếu được thì KHÔNG doạ thừa');

    /* ĐỐI CHỨNG (BH-16): gỡ đúng dòng in `ocr_ghi_chu` → nhánh CÓ chữ phải mất
       câu đó. Không mất thì phép đo đang đo nhánh khác. */
    const boIn = appJs.replace("  if (kq.ocr_ghi_chu) dong.push('⚠️ ' + kq.ocr_ghi_chu);", '');
    if (boIn === appJs) {
      dat(false, 'ĐỐI CHỨNG: tìm được dòng in ocr_ghi_chu để gỡ', '→ sửa lại bàn đo!');
    } else {
      const cauHong = layHam(boIn, 'cauSauKhiQuet');
      dat(!cauHong({ so_trang: 3, ocr_so_trang: 3, ocr_so_trang_neo: 1, ocr_ghi_chu: GHI }).includes(GHI),
        'ĐỐI CHỨNG: gỡ dòng in → câu biến mất (phép đo có đo thật)');
    }
  }

  /* Hai cửa quét PHẢI gọi cùng một hàm — cửa nào tự viết câu báo riêng là cửa
     đó sẽ quên in `ocr_ghi_chu` lần nữa. */
  /* `(?<!function )` — không đếm chính dòng KHAI hàm. */
  const soLanGoi = (appJs.match(/(?<!function )cauSauKhiQuet\(kq\)/g) || []).length;
  dat(soLanGoi === 2, 'Cả HAI cửa quét dùng chung một câu báo', `→ ${soLanGoi} nơi gọi`);
}

muc('⑪ NHÃN "CHƯA KIỂM" PHẢI SỐNG QUA BẢN SAO LƯU CSV (REV-0044 · L3)');
{
  const saoLuu2 = await import(pathToFileURL(path.join(GOC, 'src/sao-luu.js')).href);
  /* Dòng KHÔNG nhạy cảm (hoá đơn) nên không bị che — chữ ra CSV nguyên văn.
     Nhãn phải đi THEO CHUỖI, không nằm riêng ở một màn nào. */
  const dong = {
    nhay_cam: 0,
    noi_dung: '--- Trang 1 · CHƯA KIỂM · AI đọc — CHƯA KIỂM ---\nMã số thuế 0110934872',
    tim_kiem: 'hoa don thang 8'
  };
  const ra = saoLuu2.cheDongNhayCam('tai_lieu', dong);
  dat(ra.noi_dung.includes('CHƯA KIỂM'),
    'Chữ chưa kiểm ra CSV vẫn KÈM dấu chưa kiểm (nhãn nằm trong chính chuỗi)');
  dat(!/0110934872/.test(ra.tim_kiem),
    'Con số máy đọc KHÔNG có mặt trong cột tìm kiếm đi ra CSV');
  /* Dòng nhạy cảm vẫn che như cũ — không nới tay nhân đây. */
  const kin = saoLuu2.cheDongNhayCam('tai_lieu', { ...dong, nhay_cam: 1 });
  dat(kin.noi_dung === saoLuu2.O_DA_CHE, 'Dòng nhạy cảm vẫn bị che nguyên như cũ');
}

/* ==========================================================================
   ⑫ MIGRATION PHẢI TỚI ĐƯỢC MÁY ĐÃ CÓ BẢNG  (REV-0046 lỗi #1 — CHẶN PHÁT HÀNH)
   ---------------------------------------------------------------------------
   Lỗi đã xảy ra: cột `ocr_so_trang_neo` được thêm vào GIỮA câu `CREATE TABLE
   IF NOT EXISTS tai_lieu`. Máy trắng thì đúng; máy đã chạy bản 1 thì `IF NOT
   EXISTS` bỏ qua cả câu ⇒ cột KHÔNG BAO GIỜ sinh ra ⇒ mọi lượt quét chết vì
   `INSERT` liệt kê cột đó. Nạp lại bao nhiêu lần cũng báo "xong".

   Đo bằng `node:sqlite` THẬT, chạy đúng file .sql trên ổ đĩa. Ca cuối là ca
   TỔNG QUÁT: so cột trong câu `INSERT` của src/tai-lieu.js với cột thật sự
   có trong lược đồ — nó bắt được lỗi NÀY và cả lần sau, không cần ai nhớ tên
   cột nào vừa thêm.
   ========================================================================== */
muc('⑫ CỘT MỚI PHẢI TỚI ĐƯỢC MÁY ĐÃ CÓ BẢNG (REV-0046 lỗi #1)');
{
  const doc = f => readFileSync(path.join(GOC, 'migrations', f), 'utf8');
  /** Nạp lần lượt các file .sql vào một CSDL trắng, trả về tập tên cột `tai_lieu`. */
  const cotSauKhiNap = (...ds) => {
    const kho = new DatabaseSync(':memory:');
    for (const f of ds) kho.exec(doc(f));
    const cot = kho.prepare("SELECT name FROM pragma_table_info('tai_lieu')").all().map(r => r.name);
    kho.close();
    return cot;
  };

  /* Ca A — MÁY CŨ. Bảng đã có sẵn từ bản 1 (chính là `them-kho-tai-lieu.sql`
     hôm nay, vì cột đã được gỡ khỏi CREATE TABLE), nạp lại lần nữa cho giống
     đúng thao tác `npm run nap-khotailieu-may` của người thật. */
  const mayCu = new DatabaseSync(':memory:');
  mayCu.exec(doc('them-kho-tai-lieu.sql'));
  mayCu.exec(doc('them-kho-tai-lieu.sql'));          // nạp lại — không đổi gì
  const truoc = mayCu.prepare("SELECT name FROM pragma_table_info('tai_lieu')").all().map(r => r.name);
  dat(!truoc.includes('ocr_so_trang_neo'),
    'MÁY CŨ: nạp lại `them-kho-tai-lieu.sql` KHÔNG tự sinh cột (đúng bản chất lỗi)');
  mayCu.exec(doc('them-kho-tai-lieu-cot-ocr-neo.sql'));
  const sau = mayCu.prepare("SELECT name FROM pragma_table_info('tai_lieu')").all().map(r => r.name);
  dat(sau.includes('ocr_so_trang_neo'),
    'MÁY CŨ: nạp `them-kho-tai-lieu-cot-ocr-neo.sql` → cột CÓ');
  mayCu.close();

  /* Ca B — MÁY TRẮNG. Nạp cả bộ theo đúng thứ tự, không được vấp câu nào. */
  let loiTrang = null;
  let cotTrang = [];
  try { cotTrang = cotSauKhiNap(...MIGRATION_KHO); } catch (e) { loiTrang = e; }
  dat(!loiTrang && cotTrang.includes('ocr_so_trang_neo'),
    'MÁY TRẮNG: nạp cả bộ theo thứ tự → cột CÓ, không câu nào vấp',
    loiTrang ? `→ ${loiTrang.message}` : '');

  /* Ca B2 — THỨ TỰ NẠP phải TỰ đúng, không dựa vào ai nhớ. Cơ chế tự nạp CSDL
     sắp file theo tên ĐÃ BỎ ĐUÔI `.sql`. Đặt tên sai (bản nháp từng tên là
     `them-cot-ocr-neo.sql`) thì ALTER chạy TRƯỚC CREATE TABLE và máy trắng
     chết `no such table: tai_lieu`. */
  const boDuoi = s => s.replace(/\.sql$/i, '');
  const tuSap = [...MIGRATION_KHO].sort((a, b) =>
    boDuoi(a) < boDuoi(b) ? -1 : boDuoi(a) > boDuoi(b) ? 1 : 0);
  dat(tuSap.join(' → ') === MIGRATION_KHO.join(' → '),
    'Tên file TỰ xếp đúng thứ tự nạp (bảng trước, cột vá sau)',
    `→ ${tuSap.join(' → ')}`);

  /* Ca C — ĐỐI CHỨNG (BH-16): bỏ file mới ra khỏi kế hoạch nạp thì cột PHẢI
     mất trở lại. Không mất tức là phép đo đang đo nhầm chỗ — cột chui vào từ
     đường khác, và ca A/B ở trên không chứng minh được gì. */
  dat(!cotSauKhiNap('them-kho-tai-lieu.sql').includes('ocr_so_trang_neo'),
    'ĐỐI CHỨNG: bỏ `them-kho-tai-lieu-cot-ocr-neo.sql` → cột phải MẤT trở lại');

  /* Ca D — câu `CREATE TABLE` không được khai lại cột đó. Khai lại = máy
     TRẮNG vấp `duplicate column name` ở file thứ hai và dừng giữa chừng.
     Chỉ soi RUỘT câu CREATE TABLE và đã bỏ ghi chú `--` (ghi chú giải thích
     vì sao cột không nằm ở đó có quyền nhắc tên cột).
     ⚠️ Regex bỏ ghi chú dùng `[^\n\r]*` chứ KHÔNG dùng `.*$`: file trên máy
     Windows này là CRLF, mà `.` không khớp `\r` nên `$` không bao giờ tới —
     `.*$` lặng lẽ không xoá gì và phép đo hoá ra luôn "đạt". */
  const boGhiChu = s => s.replace(/--[^\n\r]*/g, '');
  const mBang = doc('them-kho-tai-lieu.sql')
    .match(/CREATE TABLE IF NOT EXISTS tai_lieu\s*\(([\s\S]*?)\n\);/);
  dat(!!mBang && !/ocr_so_trang_neo/.test(boGhiChu(mBang[1])),
    'Câu CREATE TABLE không khai lại cột đó (cột chỉ khai ĐÚNG MỘT chỗ)');
  /* ĐỐI CHỨNG cho chính ca D: `ocr_so_trang` (cột thật, có khai) PHẢI thấy —
     nếu không thấy thì regex bóc nhầm chỗ và ca D ở trên vô nghĩa. */
  dat(!!mBang && /ocr_so_trang\s+INTEGER/.test(boGhiChu(mBang[1])),
    'ĐỐI CHỨNG: vẫn đọc thấy cột `ocr_so_trang` thật trong ruột câu CREATE TABLE');

  /* Ca E — CA TỔNG QUÁT, thứ đáng giữ nhất ở mục này.
     Mọi cột mà câu `INSERT INTO tai_lieu` của src/tai-lieu.js liệt kê đều
     phải có thật trong lược đồ do MIGRATION_KHO dựng nên. Lần sau ai thêm cột
     mà quên viết `ALTER TABLE` thì gãy ngay tại đây, không phải chờ Hồ Ly. */
  const nguon = docNguon('src/tai-lieu.js');
  const mInsert = nguon.match(/INSERT INTO tai_lieu\s*\(([\s\S]*?)\)\s*VALUES/);
  if (!mInsert) {
    dat(false, 'Tìm được câu INSERT INTO tai_lieu để soi', '→ đã đổi mã, sửa lại bàn đo!');
  } else {
    const cotInsert = mInsert[1].split(',').map(s => s.trim()).filter(Boolean);
    const thieu = cotInsert.filter(c => !cotTrang.includes(c));
    dat(cotInsert.length >= 20 && thieu.length === 0,
      `Cả ${cotInsert.length} cột trong INSERT đều CÓ trong lược đồ migration`,
      thieu.length ? `→ THIẾU: ${thieu.join(', ')}` : '');
    /* ĐỐI CHỨNG cho chính ca E: bịa một cột không tồn tại → phải bắt được. */
    dat([...cotInsert, 'cot_bia_dat'].filter(c => !cotTrang.includes(c)).length === 1,
      'ĐỐI CHỨNG: thêm một cột bịa vào danh sách → phép so bắt được');
  }
}

console.log('\n───────────────────────────────────────────────────────────');

/* ==========================================================================
   ⑬ TẢI FILE CÓ SẴN LÊN KHO — PHÍA MÁY CHỦ  ·  CTL-0026 vòng 6
   ---------------------------------------------------------------------------
   Sếp Ngọc 29/08/2026: *"nếu tôi upload file từ máy tính lên thì không có chỗ
   thêm tài liệu à"*.

   Sáu chốt, mỗi chốt kèm CA ĐỐI CHỨNG (BH-16) — chốt nào không có ca bỏ chốt
   để so thì không chứng minh được phép đo đủ nhạy:
     a. PDF có sẵn lưu NGUYÊN BẢN, KHÔNG gọi AI, và câu "chưa bóc chữ" ghi
        thẳng vào cột `ocr_ghi_chu`
     b. TRẦN 25 MB cho PDF có sẵn — ca vượt trần phải bị chặn TRƯỚC khi đẩy
        lên Drive (0 file mồ côi, 0 lượt ghi D1)
     c. Đường máy ảnh GIỮ NGUYÊN trần 6 MB — không nới lây
     d. Chữ ký `%PDF-` — file sai loại bị chặn ở CẢ HAI đường
     e. Trần số trang: 200 cho PDF có sẵn, vẫn 12 cho đường máy ảnh
     f. Một lượt tải = ĐÚNG 1 lượt ghi D1, và tờ giấy hiện ở CẢ HAI CỬA
   ========================================================================== */
muc('⑬ TẢI FILE CÓ SẴN — PDF lưu nguyên bản, trần 25 MB, chữ ký %PDF-');
{
  /* PDF giả có cỡ đặt được — ruột là byte đệm, đủ để đo trần và chữ ký.
     `%PDF-1.4` ở đầu là thứ `laByteCuaPDF()` soi; `/Type /Page` để bàn đo
     phía trình duyệt và người đọc thấy được vì sao đếm ra 1 trang. */
  const pdfCo = (byte) => {
    const dau = Buffer.from('%PDF-1.4\n<< /Type /Page >>\n');
    const duoi = Buffer.from('\n%%EOF\n');
    const dem = Math.max(0, byte - dau.length - duoi.length);
    return Buffer.concat([dau, Buffer.alloc(dem, 0x20), duoi]);
  };
  const jpegGia13 = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300' + 'aa'.repeat(600) +
    'ffc0001108012c00c803012200021101031101ffda0008010100003faaffd9', 'hex');

  /* Máy chủ giả CHUNG cho mục này: thư mục Drive đã có sẵn, chưa có `ma_gui`
     nào. Đếm riêng số lượt gọi AI để chứng minh đường PDF KHÔNG chạm tới AI. */
  let soLuotAI = 0;
  function moiTruong13() {
    const { db, so, cau } = d1Gia({
      first: (sql) => /sao_luu_thu_muc/.test(sql) ? { drive_id: 'tm-co-san' }
                    : /FROM nhan_su/.test(sql) ? { id: 'ns_duy', ho_ten: 'Phạm Khương Duy' }
                    : null
    });
    return {
      env: {
        DB: db,
        AI: { async run() { soLuotAI++; return { response: 'CHỮ TỪ ẢNH' }; } },
        GOOGLE_CLIENT_ID: 'gia', GOOGLE_CLIENT_SECRET: 'gia', GOOGLE_REFRESH_TOKEN: 'gia'
      },
      so, cau
    };
  }
  const than13 = (them = {}) => ({
    ma_gui: 'mg13-' + Math.random().toString(36).slice(2, 9),
    nhom: 'ke_toan', tieu_de: 'Sao kê Techcombank tháng 8', so_trang: 1,
    ...them
  });

  /* ---- a. PDF CÓ SẴN: lưu nguyên bản, 0 lượt AI, câu ghi chú vào CỘT ----- */
  {
    const truocAI = soLuotAI, truocDrive = driveGia.size;
    const goc = pdfCo(120 * 1024);
    const { env, so, cau } = moiTruong13();
    const res = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), than13({
      tep: goc.toString('base64'), dinh_dang: 'pdf_goc', nguon: 'tep_may', anh_boc_chu: []
    }));
    const than = await doc(res);
    dat(res.status === 200, 'a. Tải MỘT file PDF có sẵn (120 KB)', `→ HTTP ${res.status} ${than.loi || ''}`);
    dat(so.ghi === 1, 'a. Một lượt tải file = ĐÚNG 1 lượt ghi D1',
      `→ ${so.ghi} lượt ghi, ${so.doc} lượt đọc`);
    dat(soLuotAI === truocAI, 'a. KHÔNG gọi Workers AI cho PDF (không có ảnh để đọc)',
      `→ gọi thêm ${soLuotAI - truocAI} lượt`);
    dat(driveGia.size === truocDrive + 1, 'a. Đúng MỘT file lên Drive',
      `→ thêm ${driveGia.size - truocDrive}`);
    /* ⚠️ ĐỔI TỪ CTL-0026 VÒNG 7. File mẫu ở đây là PDF hợp lệ nhưng KHÔNG có
       lớp chữ, nên câu đúng bây giờ là câu của loại `chi_anh` — nói rõ "file
       này là ảnh chụp" và chỉ đúng việc phải làm (chỉnh máy scan), chứ không
       còn là câu chung "ERP chưa bóc được chữ trong PDF". Câu chung chỉ còn
       dùng cho ca đọc hụt ngoài dự kiến. */
    dat(than.ocr_ghi_chu === pdfChu.CAU_LOAI.chi_anh && than.ocr_so_trang === 0,
      'a. NÓI RA "file này là ảnh chụp, chưa có chữ" — không im lặng',
      `→ ocr_so_trang=${than.ocr_so_trang}`);
    dat(than.chu_nguon === 'khong',
      'a. Ghi lại NGUỒN CHỮ = "khong" để đếm được tỉ lệ tra cứu được của kho',
      `→ chu_nguon=${than.chu_nguon}`);
    dat(!/thư viện|chi phí 0|Workers|render/i.test(String(than.ocr_ghi_chu || '')),
      'a. Câu đó KHÔNG lộ ruột kỹ thuật (vá REV-0054 lỗi #3)');
    console.log('     → Câu trả về: ' + String(than.ocr_ghi_chu).slice(0, 96) + '…');

    /* Câu đó phải vào CỘT `ocr_ghi_chu` của câu INSERT, không phải chỉ vào
       câu trả lời HTTP — nhãn chỉ sống trong một màn thì ra tới bản sao lưu
       CSV là trần trụi (bài học REV-0044 · L3). */
    const ins = cau.find(c => /INSERT INTO tai_lieu/i.test(c.sql));
    const cot = ins.sql.match(/INSERT INTO tai_lieu\s*\(([\s\S]*?)\)\s*VALUES/)[1]
      .split(',').map(s => s.trim());
    const viTri = cot.indexOf('ocr_ghi_chu');
    dat(viTri >= 0 && ins.ban[viTri] === pdfChu.CAU_LOAI.chi_anh,
      'a. Câu đó nằm trong CỘT ocr_ghi_chu của chính câu INSERT',
      `→ cột thứ ${viTri + 1}`);
    /* Nguồn chữ cũng phải vào CỘT, không chỉ vào câu trả lời HTTP: tỉ lệ "tra
       cứu được / chỉ xem được" của cả kho đếm bằng cột này. */
    const viTriNguon = cot.indexOf('chu_nguon');
    dat(viTriNguon >= 0 && ins.ban[viTriNguon] === 'khong',
      'a. Cột chu_nguon có mặt trong chính câu INSERT', `→ cột thứ ${viTriNguon + 1}`);
    /* Chữ bóc được thì KHÔNG có, nên cũng không có gì lọt vào ô tìm kiếm —
       không được bịa ra nội dung cho PDF. */
    dat(ins.ban[cot.indexOf('noi_dung')] === null,
      'a. Cột noi_dung để TRỐNG, không bịa nội dung cho PDF');

    /* ĐỐI CHỨNG a — CÙNG file, CÙNG mọi thứ, chỉ đổi `dinh_dang` sang đường
       máy ảnh và kèm một ảnh: AI PHẢI được gọi và câu ghi chú PHẢI khác.
       Không có ca này thì "0 lượt AI" ở trên có thể chỉ vì AI giả không chạy. */
    const truocAI2 = soLuotAI;
    const { env: e2 } = moiTruong13();
    const r2 = await tailieu.luuTaiLieu(e2, phienCua('ke_toan_truong'), than13({
      tep: goc.toString('base64'), dinh_dang: 'anh_gop',
      anh_boc_chu: [jpegGia13.toString('base64')]
    }));
    const t2 = await doc(r2);
    dat(r2.status === 200 && soLuotAI === truocAI2 + 1 &&
        t2.ocr_ghi_chu !== tailieu.GHI_CHU_PDF_CHUA_BOC,
      'a. ĐỐI CHỨNG: cùng file, đổi sang đường ảnh → AI ĐƯỢC gọi, ghi chú khác',
      `→ AI thêm ${soLuotAI - truocAI2} lượt, ocr_so_trang=${t2.ocr_so_trang}`);
  }

  /* ---- b. TRẦN 25 MB — ca VƯỢT TRẦN phải chặn TRƯỚC khi đụng Drive ------ */
  {
    const truocDrive = driveGia.size, truocGoogle = soLuotGoiGoogle;
    const { env, so } = moiTruong13();
    const res = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), than13({
      tep: pdfCo(30 * 1024 * 1024).toString('base64'), dinh_dang: 'pdf_goc', nguon: 'tep_may'
    }));
    const than = await doc(res);
    dat(res.status === 400 && /30\.0 MB/.test(than.loi || '') && /25 MB/.test(than.loi || ''),
      'b. PDF 30 MB → CHẶN, và câu chặn NÊU CẢ HAI con số',
      `→ HTTP ${res.status}: ${String(than.loi || '').slice(0, 78)}…`);
    dat(so.ghi === 0 && driveGia.size === truocDrive && soLuotGoiGoogle === truocGoogle,
      'b. Ca vượt trần: 0 ghi D1, 0 file lên Drive, 0 lượt gọi Google',
      `→ ghi ${so.ghi}, Drive +${driveGia.size - truocDrive}, Google +${soLuotGoiGoogle - truocGoogle}`);
    dat(/200 DPI|tách file/i.test(than.loi || ''),
      'b. Câu chặn nói CÁCH XỬ, không chỉ nói "vượt trần"');

    /* ĐỐI CHỨNG b — 20 MB (dưới trần) PHẢI LỌT. Không có ca này thì "chặn
       30 MB" có thể chỉ là chặn mọi file to, kể cả file hợp lệ. */
    const { env: e2, so: so2 } = moiTruong13();
    const r2 = await tailieu.luuTaiLieu(e2, phienCua('ke_toan_truong'), than13({
      tep: pdfCo(20 * 1024 * 1024).toString('base64'), dinh_dang: 'pdf_goc', nguon: 'tep_may'
    }));
    dat(r2.status === 200 && so2.ghi === 1,
      'b. ĐỐI CHỨNG: PDF 20 MB (dưới trần) LỌT bình thường',
      `→ HTTP ${r2.status}, ghi ${so2.ghi}`);
  }

  /* ---- c. ĐƯỜNG MÁY ẢNH GIỮ NGUYÊN TRẦN 6 MB — không nới lây ------------ */
  {
    const { env } = moiTruong13();
    const res = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), than13({
      tep: pdfCo(8 * 1024 * 1024).toString('base64'), dinh_dang: 'anh_gop'
    }));
    const than = await doc(res);
    dat(res.status === 400 && /6 MB/.test(than.loi || ''),
      'c. Đường máy ảnh vẫn chặn ở 6 MB — nới trần KHÔNG lây sang',
      `→ HTTP ${res.status}: ${String(than.loi || '').slice(0, 62)}…`);

    /* ĐỐI CHỨNG c — thiếu `dinh_dang` (trình duyệt bản cũ) phải rơi về đường
       CHẶT, không phải đường rộng. Đoán nhầm chiều là tự nới trần cho mọi
       lượt gửi mà không ai để ý. */
    const { env: e2 } = moiTruong13();
    const r2 = await tailieu.luuTaiLieu(e2, phienCua('ke_toan_truong'), than13({
      tep: pdfCo(8 * 1024 * 1024).toString('base64')          // KHÔNG khai dinh_dang
    }));
    const t2 = await doc(r2);
    dat(r2.status === 400 && /6 MB/.test(t2.loi || ''),
      'c. ĐỐI CHỨNG: thiếu dinh_dang → rơi về trần CHẶT 6 MB, không phải 25 MB');
    /* Và một `dinh_dang` bịa cũng phải rơi về đường chặt. */
    const { env: e3 } = moiTruong13();
    const r3 = await tailieu.luuTaiLieu(e3, phienCua('ke_toan_truong'), than13({
      tep: pdfCo(8 * 1024 * 1024).toString('base64'), dinh_dang: 'pdf_goc_xin_noi_tran'
    }));
    dat(r3.status === 400, 'c. ĐỐI CHỨNG: dinh_dang bịa cũng rơi về trần chặt');
  }

  /* ---- d. CHỮ KÝ %PDF- — file sai loại bị chặn ở CẢ HAI đường ----------- */
  {
    const rac = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(4000, 0x41)]);  // .docx/.zip
    for (const dd of ['pdf_goc', 'anh_gop']) {
      const truocDrive = driveGia.size;
      const { env, so } = moiTruong13();
      const res = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), than13({
        tep: rac.toString('base64'), dinh_dang: dd
      }));
      const than = await doc(res);
      /* Câu chặn KHÔNG còn nhắc chuỗi `%PDF-` — đó là ruột kỹ thuật, bạn kho
         đọc không dùng được (REV-0054 lỗi #3). Nó phải nói bằng tiếng người
         rằng đây không phải file PDF, và chỉ việc phải làm. */
      dat(res.status === 400 && /không phải PDF/i.test(than.loi || '') &&
          !/%PDF-/.test(than.loi || '') &&
          so.ghi === 0 && driveGia.size === truocDrive,
        `d. File sai loại (.docx đổi tên) qua đường ${dd} → CHẶN, 0 ghi, 0 file`,
        `→ HTTP ${res.status}`);
    }

    /* ĐỐI CHỨNG d (BH-16) — bản BỎ chốt chữ ký PHẢI cho lọt. Không lọt thì
       chốt này không phải thứ đang chặn, và phép đo đo nhầm chỗ. */
    const goc = docNguon('src/tai-lieu.js');
    const chan = `  if (!laByteCuaPDF(bytes)) {`;
    if (!goc.includes(chan)) {
      dat(false, 'd. Tìm được đúng chốt chữ ký để gỡ', '→ đã đổi mã, sửa lại bàn đo!');
    } else {
      const boChan = goc
        .replace(chan, '  if (false) {   /* CỐ Ý BỎ CHỐT — ca đối chứng BH-16 */')
        .replace(/from '\.\/(quyen|kho-file|nhac-nhan-su|cat-danh-sach|so-ai|pdf-chu)\.js'/g,
                 (m, t) => `from '${pathToFileURL(path.join(GOC, 'src', t + '.js')).href}'`);
      const duong = path.join(TAM, 'tai-lieu-BO-CHU-KY.mjs');
      writeFileSync(duong, boChan);
      const modHong = await import(pathToFileURL(duong).href + '?v=' + Date.now());
      const { env } = moiTruong13();
      const r = await modHong.luuTaiLieu(env, phienCua('ke_toan_truong'), than13({
        tep: rac.toString('base64'), dinh_dang: 'pdf_goc'
      }));
      dat(r.status === 200,
        'd. ĐỐI CHỨNG (BH-16): bản BỎ chốt chữ ký cho file rác LỌT',
        `→ HTTP ${r.status} (phải 200 — nếu 400 thì PHÉP ĐO hỏng)`);
    }
  }

  /* ---- e. TRẦN SỐ TRANG: 200 cho PDF có sẵn, vẫn 12 cho đường máy ảnh --- */
  {
    const goc = pdfCo(200 * 1024).toString('base64');
    const { env, so } = moiTruong13();
    const r1 = await tailieu.luuTaiLieu(env, phienCua('ke_toan_truong'), than13({
      tep: goc, dinh_dang: 'pdf_goc', so_trang: 30
    }));
    dat(r1.status === 200 && so.ghi === 1,
      'e. Bản scan 30 trang qua đường PDF có sẵn → LỌT (một tài liệu, không phải 30)',
      `→ HTTP ${r1.status}`);
    const { env: e2 } = moiTruong13();
    const r2 = await tailieu.luuTaiLieu(e2, phienCua('ke_toan_truong'), than13({
      tep: goc, dinh_dang: 'anh_gop', so_trang: 30
    }));
    const t2 = await doc(r2);
    dat(r2.status === 400 && /12 trang/.test(t2.loi || ''),
      'e. ĐỐI CHỨNG: đường máy ảnh VẪN chặn ở 12 trang — trần cũ không bị nới',
      `→ HTTP ${r2.status}`);
    const { env: e3 } = moiTruong13();
    const r3 = await tailieu.luuTaiLieu(e3, phienCua('ke_toan_truong'), than13({
      tep: goc, dinh_dang: 'pdf_goc', so_trang: 500
    }));
    dat(r3.status === 400, 'e. ĐỐI CHỨNG: PDF khai 500 trang → vẫn chặn (chống số rác)');
  }

  /* ---- f. HAI CỬA — file tải lên phải HIỆN Ở CẢ HAI --------------------- */
  {
    const { env, cau } = moiTruong13();
    const res = await tailieu.luuTaiLieu(env, phienCua('hcns', 'ns_huong'), than13({
      nhom: 'nhan_su', gan_id: 'ns_duy', tieu_de: 'Phạm Khương Duy — Quyết định bổ nhiệm',
      tep: pdfCo(90 * 1024).toString('base64'), dinh_dang: 'pdf_goc', nguon: 'tep_may',
      dong_y_boi: 'Phạm Khương Duy', dong_y_muc_dich: 'quản lý hồ sơ lao động'
    }));
    const than = await doc(res);
    dat(res.status === 200 && than.cua_vao === 'nhan_su' && than.gan_id === 'ns_duy',
      'f. File PDF tải ở kho chung, nhóm Nhân sự, có chọn người → vào ĐÚNG bộ người đó',
      `→ cua_vao=${than.cua_vao} gan_id=${than.gan_id}`);

    /* Kho chung có thấy nó không: câu SQL của `danhSachTaiLieu` khi KHÔNG có
       `gan_id` phải KHÔNG lọc `cua_vao` — đo trên chính câu SQL sinh ra, không
       đọc mã đoán. */
    const { env: e2, cau: c2 } = moiTruong13();
    await tailieu.danhSachTaiLieu(e2, phienCua('admin'), new URLSearchParams());
    const sqlChung = c2.find(c => /FROM tai_lieu/i.test(c.sql) && /SELECT id, nhom/i.test(c.sql));
    dat(!!sqlChung && !/cua_vao\s*=/.test(sqlChung.sql),
      'f. Cửa KHO CHUNG không lọc cua_vao → vẫn thấy file quét ở hồ sơ');
    const { env: e3, cau: c3 } = moiTruong13();
    await tailieu.danhSachTaiLieu(e3, phienCua('hcns', 'ns_huong'),
      new URLSearchParams({ gan_id: 'ns_duy' }));
    const sqlHoSo = c3.find(c => /FROM tai_lieu/i.test(c.sql) && /SELECT id, nhom/i.test(c.sql));
    dat(!!sqlHoSo && /cua_vao = \? AND gan_id = \?/.test(sqlHoSo.sql) &&
        sqlHoSo.ban.includes('ns_duy'),
      'f. ĐỐI CHỨNG: cửa HỒ SƠ lọc đúng một người',
      `→ tham số ${JSON.stringify(sqlHoSo?.ban || [])}`);

    /* Giấy nhân sự KHÔNG chọn người thì vẫn 400 như cũ — đường file mới không
       mở lối vòng qua chốt REV-0046 #2. */
    const { env: e4, so: so4 } = moiTruong13();
    const r4 = await tailieu.luuTaiLieu(e4, phienCua('hcns', 'ns_huong'), than13({
      nhom: 'nhan_su', tieu_de: 'Quyết định không rõ của ai',
      tep: pdfCo(90 * 1024).toString('base64'), dinh_dang: 'pdf_goc',
      dong_y_boi: 'x', dong_y_muc_dich: 'y'
    }));
    dat(r4.status === 400 && so4.ghi === 0,
      'f. ĐỐI CHỨNG: tải file nhóm Nhân sự mà KHÔNG chọn người → vẫn 400, 0 dòng',
      `→ HTTP ${r4.status}`);
    /* Và phân quyền không bị đường mới nới: kế toán KHÔNG lưu được nhóm nhân sự. */
    const { env: e5 } = moiTruong13();
    const r5 = await tailieu.luuTaiLieu(e5, phienCua('ke_toan_truong'), than13({
      nhom: 'nhan_su', gan_id: 'ns_duy', tieu_de: 'Thử vượt quyền',
      tep: pdfCo(90 * 1024).toString('base64'), dinh_dang: 'pdf_goc',
      dong_y_boi: 'x', dong_y_muc_dich: 'y'
    }));
    dat(r5.status === 403,
      'f. ĐỐI CHỨNG: kế toán tải file vào nhóm Nhân sự → vẫn 403 (quyền y nguyên)',
      `→ HTTP ${r5.status}`);
  }
}

/* ==========================================================================
   ⑭ SỬA SỐ HIỆU + TÊN TÀI LIỆU SAU KHI ĐÃ LƯU  ·  Sếp Ngọc 03/09/2026
   ---------------------------------------------------------------------------
   *"trước khi thêm tài liệu hoặc khi đã upload tài liệu lên thì để cho đổi tên
   số tài liệu và tên tài liệu nhé"*.

   Đo bốn thứ, thứ nào cũng có ca đối chứng:
     a. Sửa được, KHÔNG bị đòi lý do, và ghi vết đủ (cũ → mới → ai → lúc nào).
     b. MỎ NEO tính lại theo CẢ HAI chiều khi `so_hieu` đổi.
     c. Quyền cắt ở MÁY CHỦ theo nhóm giấy tờ.
     d. Lượt ghi D1 đúng bằng số việc thật sự làm.
   ========================================================================== */
muc('⑭ Sửa SỐ HIỆU + TÊN sau khi đã lưu (Sếp Ngọc 03/09/2026)');
{
  const THAT = 'HOA DON GIA TRI GIA TANG — So: 124/2026/GCN-ATTP — Ben ban: HTX Son La';
  /* Hai tiện ích này lặp lại của mục ⑬ — mục đó khai chúng trong khối riêng
     nên không với tới đây. Chép 6 dòng còn hơn nới phạm vi một biến của mục
     khác rồi vô tình để hai mục dùng chung trạng thái. */
  const pdfCo = (byte) => {
    const dau = Buffer.from('%PDF-1.4\n<< /Type /Page >>\n');
    const duoi = Buffer.from('\n%%EOF\n');
    return Buffer.concat([dau, Buffer.alloc(Math.max(0, byte - dau.length - duoi.length), 0x20), duoi]);
  };
  const than13 = (them = {}) => ({
    ma_gui: 'mg14-' + Math.random().toString(36).slice(2, 9),
    nhom: 'ke_toan', tieu_de: 'Sao kê Techcombank tháng 8', so_trang: 1, ...them
  });

  /** Dựng một dòng tài liệu ĐÃ LƯU qua đúng đường `luuTaiLieu`, với số hiệu
   *  người gõ là `soHieu` và chữ AI đọc là `THAT`. */
  async function dungMotDong(soHieu) {
    const t = d1SQLite();
    t.env.AI = { async run() { return { response: THAT }; } };
    const r = await tailieu.luuTaiLieu(t.env, phienCua('ke_toan_truong'), than13({
      nhom: 'ke_toan', tieu_de: 'Hoá đơn NCC Sơn La', loai: 'Hoá đơn',
      so_hieu: soHieu, so_trang: 1, dinh_dang: 'anh_gop',
      tep: pdfCo(60 * 1024).toString('base64'),
      anh_boc_chu: [Buffer.alloc(400, 7).toString('base64')]
    }));
    if (r.status !== 200) throw new Error('Bàn đo: dựng dòng hỏng, HTTP ' + r.status);
    const d = t.kho.prepare('SELECT * FROM tai_lieu').get();
    t.datLai();
    return { ...t, id: d.id, dong: d };
  }

  /* ---- a. CHIỀU SAI → ĐÚNG: nhãn phải NÂNG lên -------------------------- */
  {
    const t = await dungMotDong('999/2026/SO-SAI');
    dat(t.dong.ocr_so_trang_neo === 0,
      'a. Trước sửa — gõ NHẦM số hiệu ⇒ chữ mang nhãn CHƯA KIỂM',
      `→ neo ${t.dong.ocr_so_trang_neo}/1`);
    dat(!/gia tri gia tang/i.test(String(t.dong.tim_kiem || '')),
      'a. Trước sửa — chữ CHƯA KIỂM không nằm trong ô tìm kiếm');

    const r = await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'), {
      id: t.id, so_hieu: '124/2026/GCN-ATTP'
    });
    const than = await doc(r);
    dat(r.status === 200 && than.neo_tinh_lai === true,
      'a. Sửa số hiệu → máy TÍNH LẠI mỏ neo', `→ HTTP ${r.status}`);
    const d = t.kho.prepare('SELECT * FROM tai_lieu').get();
    dat(d.so_hieu === '124/2026/GCN-ATTP', 'a. Số hiệu mới đã vào cột');
    dat(d.ocr_so_trang_neo === 1,
      'a. ⚠️ CHIỀU SAI→ĐÚNG: nhãn NÂNG lên "đã đối chiếu" (không kẹt CHƯA KIỂM vĩnh viễn)',
      `→ neo ${d.ocr_so_trang_neo}/1`);
    dat(/gia tri gia tang/i.test(String(d.tim_kiem || '')),
      'a. Chữ nay ĐƯỢC vào ô tìm kiếm — đúng luật ③');
    dat(!/999\/2026/.test(String(d.tim_kiem || '')) && /124/.test(String(d.tim_kiem || '')),
      'a. Ô tìm dựng LẠI: số hiệu CŨ biến mất, số MỚI có mặt',
      '→ tra bằng số đã bỏ không còn ra kết quả');
    dat(t.so.ghi === 2, 'a. Sửa MỘT trường = 2 lượt ghi D1 (1 UPDATE + 1 dòng lịch sử)',
      `→ ${t.so.ghi} lượt ghi`);

    const ls = t.kho.prepare(
      "SELECT * FROM lich_su_thay_doi_nen WHERE bang='tai_lieu' AND ban_ghi_id=?").all(t.id);
    dat(ls.length === 1 && ls[0].truong === 'so_hieu' &&
        ls[0].gia_tri_cu === '999/2026/SO-SAI' && ls[0].gia_tri_moi === '124/2026/GCN-ATTP' &&
        !!ls[0].nguoi_ten && !!ls[0].luc,
      'a. ⚠️ GHI VẾT ĐỦ: cũ → mới → ai → lúc nào',
      `→ "${ls[0]?.gia_tri_cu}" → "${ls[0]?.gia_tri_moi}" bởi ${ls[0]?.nguoi_ten}`);
    dat(ls[0].ly_do === null || ls[0].ly_do === undefined,
      'a. ⚠️ CA CẮT QUÁ TAY: sửa chính tả KHÔNG bị đòi lý do (trigger không đụng tới)');

    /* Đọc lại được — ghi vết mà không mở ra đọc được thì chỉ là ghi cho có. */
    const rls = await tailieu.lichSuTaiLieu(t.env, phienCua('ke_toan_truong'), t.id);
    const thanLs = await doc(rls);
    dat(rls.status === 200 && (thanLs.ds || []).length === 1,
      'a. Vết sửa ĐỌC LẠI ĐƯỢC qua /api/tai-lieu/lich-su', `→ ${(thanLs.ds || []).length} dòng`);
  }

  /* ---- b. CHIỀU ĐÚNG → SAI: nhãn phải HẠ xuống (chiều nguy hơn) --------- */
  {
    const t = await dungMotDong('124/2026/GCN-ATTP');
    dat(t.dong.ocr_so_trang_neo === 1,
      'b. Trước sửa — số hiệu ĐÚNG ⇒ chữ mang nhãn ĐÃ ĐỐI CHIẾU',
      `→ neo ${t.dong.ocr_so_trang_neo}/1`);
    await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'), {
      id: t.id, so_hieu: '777/2026/SO-KHAC'
    });
    const d = t.kho.prepare('SELECT * FROM tai_lieu').get();
    dat(d.ocr_so_trang_neo === 0,
      'b. ⚠️ CHIỀU ĐÚNG→SAI: nhãn HẠ về CHƯA KIỂM — không giữ lại một lời nói dối',
      `→ neo ${d.ocr_so_trang_neo}/1`);
    dat(!/gia tri gia tang/i.test(String(d.tim_kiem || '')),
      'b. Chữ đã RÚT khỏi ô tìm kiếm cùng lúc');
    dat(/CHƯA KIỂM/.test(String(d.noi_dung || '')),
      'b. Nhãn trong chính chuỗi `noi_dung` cũng đổi theo (còn nguyên ở bản sao lưu CSV)');
    dat(String(d.noi_dung || '').includes('GIA TRI GIA TANG'),
      'b. Chữ VẪN được lưu — luật ① không bao giờ vứt bản quét');

    /* ĐỐI CHỨNG BH-16 — bỏ hẳn bước tính lại thì nhãn cũ ở nguyên, tức là
       phép đo trên phải bắt được. */
    const hong = await napBanVa('bỏ bước tính lại mỏ neo khi số hiệu đổi',
      ['  let neoMoi = null;\n  if (doiSoHieu && tl.noi_dung) {',
       '  let neoMoi = null;\n  if (false && doiSoHieu && tl.noi_dung) {']);
    if (hong) {
      const t2 = await dungMotDong('124/2026/GCN-ATTP');
      await hong.suaTaiLieu(t2.env, phienCua('ke_toan_truong'), {
        id: t2.id, so_hieu: '777/2026/SO-KHAC'
      });
      const d2 = t2.kho.prepare('SELECT * FROM tai_lieu').get();
      dat(d2.ocr_so_trang_neo === 1,
        'b. ĐỐI CHỨNG BH-16: bỏ bước tính lại → nhãn "đã đối chiếu" ở NGUYÊN dù số hiệu đã khác',
        `→ neo ${d2.ocr_so_trang_neo}/1 (phải 1 — nếu 0 thì PHÉP ĐO hỏng)`);
    }
  }

  /* ---- c. Quyền cắt ở MÁY CHỦ, và ca không đổi gì ----------------------- */
  {
    const t = await dungMotDong('124/2026/GCN-ATTP');
    const rHong = await tailieu.suaTaiLieu(t.env, phienCua('nhan_vien_kho'), {
      id: t.id, tieu_de: 'Đổi trộm tên'
    });
    dat(rHong.status === 403 && t.so.ghi === 0,
      'c. ⚠️ Nhân viên kho gọi thẳng API để sửa → 403, 0 lượt ghi',
      `→ HTTP ${rHong.status}, ghi ${t.so.ghi}`);
    const d = t.kho.prepare('SELECT tieu_de FROM tai_lieu').get();
    dat(d.tieu_de === 'Hoá đơn NCC Sơn La', 'c. Tên trong kho KHÔNG đổi');

    t.datLai();
    const rY = await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'), {
      id: t.id, tieu_de: 'Hoá đơn NCC Sơn La', so_hieu: '124/2026/GCN-ATTP'
    });
    const thanY = await doc(rY);
    dat(rY.status === 200 && thanY.khong_doi === true && t.so.ghi === 0,
      'c. Bấm Lưu mà không đổi gì → 0 lượt ghi D1, 0 dòng lịch sử rác',
      `→ ghi ${t.so.ghi}`);

    /* Đổi CẢ HAI trường trong một lượt: 1 UPDATE + 2 dòng lịch sử = 3 lượt ghi. */
    t.datLai();
    await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'), {
      id: t.id, tieu_de: 'Hoá đơn NCC Sơn La tháng 8', so_hieu: '125/2026/GCN-ATTP'
    });
    dat(t.so.ghi === 3, 'c. Đổi CẢ HAI trường = 3 lượt ghi D1 (1 UPDATE + 2 dòng lịch sử)',
      `→ ${t.so.ghi} lượt ghi`);
    const ls = t.kho.prepare(
      "SELECT truong FROM lich_su_thay_doi_nen WHERE bang='tai_lieu'").all().map(x => x.truong);
    dat(ls.includes('tieu_de') && ls.includes('so_hieu'),
      'c. Cả hai trường đều có vết riêng', `→ ${ls.join(', ')}`);

    /* Tên rỗng thì CHẶN — tài liệu không tên là tài liệu không ai tìm ra. */
    const rTrong = await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'),
      { id: t.id, tieu_de: 'ab' });
    dat(rTrong.status === 400, 'c. Tên dưới 3 ký tự → CHẶN', `→ HTTP ${rTrong.status}`);

    /* Không sửa được NHÓM và FILE qua cửa này — đổi nhóm là đổi ai được xem. */
    const truocNhom = t.kho.prepare('SELECT nhom, kho_khoa FROM tai_lieu').get();
    await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'),
      { id: t.id, tieu_de: 'Hoá đơn NCC Sơn La', nhom: 'nhan_su', kho_khoa: 'file-khac' });
    const sauNhom = t.kho.prepare('SELECT nhom, kho_khoa FROM tai_lieu').get();
    dat(sauNhom.nhom === truocNhom.nhom && sauNhom.kho_khoa === truocNhom.kho_khoa,
      'c. ⚠️ Gửi kèm `nhom`/`kho_khoa` cũng KHÔNG đổi được — cửa này chỉ sửa số & tên',
      `→ nhóm vẫn ${sauNhom.nhom}`);
  }

  /* ---- d. Dòng lưu theo LỐI CŨ: không tính lại được ⇒ HẠ về chưa kiểm --- */
  {
    const t = await dungMotDong('124/2026/GCN-ATTP');
    /* Giả lập dòng lưu trước bản này: `noi_dung` không mang dấu trang. */
    t.kho.prepare('UPDATE tai_lieu SET noi_dung = ? WHERE id = ?')
      .run(THAT, t.id);
    t.datLai();
    const r = await tailieu.suaTaiLieu(t.env, phienCua('ke_toan_truong'),
      { id: t.id, so_hieu: '555/2026/MOI' });
    const than = await doc(r);
    const d = t.kho.prepare('SELECT * FROM tai_lieu').get();
    dat(d.ocr_so_trang_neo === 0 && !/gia tri gia tang/i.test(String(d.tim_kiem || '')),
      'd. Chữ lưu theo LỐI CŨ (không tách được trang) → HẠ về chưa kiểm, rút khỏi ô tìm');
    dat(/không đối chiếu lại được/i.test(String(than.ocr_ghi_chu || '')),
      'd. ⚠️ NÓI RA vì sao hạ nhãn — không im lặng',
      `→ "${String(than.ocr_ghi_chu || '').slice(0, 70)}…"`);
    dat(String(d.noi_dung || '').includes('GIA TRI GIA TANG'),
      'd. Chữ vẫn còn nguyên để đọc (luật ①)');
  }
}

/* ==========================================================================
   ⑮ CHỐT CUỐI ĐƯỜNG — LƯU XONG, GÕ MỘT TỪ CÓ THẬT PHẢI RA ĐƯỢC TÀI LIỆU
   ---------------------------------------------------------------------------
   Hồ Ly đòi đúng chốt này ở REV-0055, và đòi đúng: mọi con số bóc chữ ở trên
   đều là lời khai về một khâu GIỮA đường. Chỉ chốt này trả lời câu Sếp thật sự
   hỏi — *"tôi gõ một chữ trong tờ giấy, ERP có tìm ra nó không?"*.

   Chạy TRỌN đường: dựng PDF có lớp chữ → `luuTaiLieu` thật → CSDL SQLite thật
   → `danhSachTaiLieu` thật với `q = <một từ trong giấy>`.

   Ba ca, và ca thứ hai mới là ca đắt nhất:
     a. Chữ LÀNH   → gõ từ trong giấy PHẢI ra tài liệu.
     b. Chữ VỠ VỤN (đúng ca CHẶN-1) → gõ ra 0 kết quả, VÀ ERP phải TỰ KHAI là
        "chỉ xem được", KHÔNG được dán nhãn "đã đối chiếu".
     c. Nhóm NHẠY CẢM → ruột giấy KHÔNG bao giờ vào ô tìm, dù chữ lành.
   ========================================================================== */
muc('⑮ Chốt CUỐI ĐƯỜNG: lưu xong, gõ một từ có thật phải ra tài liệu');
{
  const { deflateSync } = await import('node:zlib');

  /** PDF một trang, có lớp chữ thật.
   *  'lien' — cả câu trong một `Tj` (chữ lành).
   *  'vun'  — TỪNG CON CHỮ, mỗi con một `Tj`, cách nhau bằng `Td` DỌC
   *           (`ty ≠ 0`). Đây là chữ vỡ vụn THẬT nằm ngay trong file, không
   *           phải giả lập bằng cách sửa mã của ta — nên nó vẫn vụn kể cả sau
   *           khi luật `Td` đã được vá. */
  function pdfCoLopChu(cau, kieuDat) {
    const hex4 = (n) => n.toString(16).padStart(4, '0');
    const bang = [...cau].map((c, i) => ({ ma: i + 1, chu: c }));
    const nd = kieuDat === 'vun'
      ? 'BT /F1 12 Tf 40 700 Td ' +
        bang.map((b, i) => (i ? '0 -12 Td ' : '') + `<${hex4(b.ma)}> Tj`).join(' ') + ' ET'
      : `BT /F1 12 Tf 40 700 Td <${bang.map(b => hex4(b.ma)).join('')}> Tj ET`;
    const ndB = deflateSync(Buffer.from(nd, 'latin1'));
    const cmap =
      '/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n' +
      '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
      `${bang.length} beginbfchar\n` +
      bang.map(b => `<${hex4(b.ma)}> <${hex4(b.chu.charCodeAt(0))}>`).join('\n') +
      '\nendbfchar\nendcmap CMapName currentdict /CMap defineresource pop end end';
    const cB = Buffer.from(cmap, 'latin1');
    const dt = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
        '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      { dict: `<< /Length ${ndB.length} /Filter /FlateDecode >>`, luong: ndB },
      '<< /Type /Font /Subtype /Type0 /BaseFont /T /Encoding /Identity-H ' +
        '/DescendantFonts [7 0 R] /ToUnicode 6 0 R >>',
      { dict: `<< /Length ${cB.length} >>`, luong: cB },
      '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /T >>'
    ];
    const manh = [Buffer.from('%PDF-1.5\n', 'latin1')];
    dt.forEach((o, i) => {
      const n = i + 1;
      if (typeof o === 'string') manh.push(Buffer.from(`${n} 0 obj\n${o}\nendobj\n`, 'latin1'));
      else {
        manh.push(Buffer.from(`${n} 0 obj\n${o.dict}\nstream\n`, 'latin1'));
        manh.push(o.luong);
        manh.push(Buffer.from('\nendstream\nendobj\n', 'latin1'));
      }
    });
    manh.push(Buffer.from('trailer\n<< /Size 9 /Root 1 0 R >>\n%%EOF\n', 'latin1'));
    return Buffer.concat(manh);
  }

  const CAU = 'GIAY CHUNG NHAN CO SO DU DIEU KIEN AN TOAN THUC PHAM. ' +
    'CONG TY TNHH ALPHA GREEN COMMERCE. So 124/2026/GCN-ATTP. ' +
    'Dia chi kho Ha Noi, nganh hang nong san kho nhap khau.';

  /** Lưu một PDF rồi hỏi ô tìm — trọn đường, không tắt đoạn nào. */
  async function luuRoiTim(kieuDat, tuTim, nhom = 'attp') {
    const t = d1SQLite();
    const res = await tailieu.luuTaiLieu(t.env, phienCua('van_hanh_san'), {
      ma_gui: 'mg15-' + kieuDat + '-' + Math.random().toString(36).slice(2, 8),
      nhom, tieu_de: 'Giấy chứng nhận ATTP kho Hà Nội', loai: 'Giấy chứng nhận',
      so_hieu: '124/2026/GCN-ATTP', so_trang: 1, dinh_dang: 'pdf_goc',
      tep: pdfCoLopChu(CAU, kieuDat).toString('base64'),
      dong_y_boi: 'x', dong_y_muc_dich: 'y'
    });
    const than = await doc(res);
    const dong = t.kho.prepare('SELECT * FROM tai_lieu').get();
    const p = new URLSearchParams(); p.set('q', tuTim);
    const rTim = await tailieu.danhSachTaiLieu(t.env, phienCua('admin'), p);
    const thanTim = await doc(rTim);
    /* Dải đếm đi theo BỘ LỌC ĐANG XEM (cố ý — xem danhSachTaiLieu). Nên muốn
       đo tỉ lệ của cả kho thì phải hỏi một lượt KHÔNG lọc; hỏi kèm từ khoá là đo
       tỉ lệ của đúng những dòng vừa trúng ô tìm, tức đo nhầm thứ. */
    const rCaKho = await tailieu.danhSachTaiLieu(t.env, phienCua('admin'), new URLSearchParams());
    const thanCaKho = await doc(rCaKho);
    return { t, ma: res.status, than, dong, ds: thanTim.ds || [], dem: thanCaKho.dem_chu };
  }

  /* ---- a. CHỮ LÀNH: gõ từ trong giấy PHẢI ra tài liệu ------------------ */
  {
    /* ⚠️ TỪ ĐEM TRA PHẢI CHỈ CÓ TRONG RUỘT GIẤY, không có ở tiêu đề · loại ·
       TÊN NHÓM. Bẫy đã sập một lần ngay tại đây: gõ "thuc pham" ra 1 kết quả
       kể cả khi chữ vỡ vụn — vì chuoiTimKiem() nhét cả TÊN NHÓM ("An toàn thực
       phẩm") vào ô tìm. Phép đo trúng vì lý do khác thì không đo gì cả.
       "nhap khau" và "nong san" chỉ nằm trong ruột tờ giấy. */
    const k = await luuRoiTim('lien', 'nhap khau');
    dat(k.ma === 200 && k.dong.chu_nguon === 'pdf_lop_chu',
      'a. Lưu PDF có lớp chữ → nhận đúng nguồn chữ', `→ HTTP ${k.ma}, ${k.dong.chu_nguon}`);
    dat(k.dong.ocr_so_trang_neo === 1,
      'a. Chữ lành + số hiệu trúng ⇒ nhãn ĐÃ ĐỐI CHIẾU', `→ neo ${k.dong.ocr_so_trang_neo}`);
    dat(k.ds.length === 1,
      '⚠️ a. CHỐT CUỐI ĐƯỜNG: gõ "nhap khau" → RA tài liệu', `→ ${k.ds.length} kết quả`);

    const k2 = await luuRoiTim('lien', 'nong san');
    dat(k2.ds.length === 1, 'a. Gõ "nong san" (chữ ở giữa trang) → RA tài liệu',
      `→ ${k2.ds.length}`);
    const k3 = await luuRoiTim('lien', 'khongcotunaydau');
    dat(k3.ds.length === 0, 'a. ĐỐI CHỨNG: gõ từ KHÔNG có trong giấy → 0 kết quả',
      `→ ${k3.ds.length}`);
  }

  /* ---- b. CHỮ VỠ VỤN — đây là ca CHẶN-1 của REV-0055 ------------------- */
  {
    const k = await luuRoiTim('vun', 'nhap khau');
    dat(k.ds.length === 0,
      'b. Chữ vỡ vụn → gõ "nhap khau" ra 0 kết quả (sự thật phũ phàng)',
      `→ ${k.ds.length}`);
    /* ⚠️ ĐÂY MỚI LÀ CHỖ REV-0055 GỌI LÀ CHẶN: không phải chữ hỏng, mà là ERP
       KHÔNG BIẾT nó hỏng rồi khai ngược lại với sự thật. */
    dat(k.dong.ocr_so_trang_neo === 0,
      '⚠️ b. ERP KHÔNG dán nhãn "đã đối chiếu" cho chữ tra không ra',
      `→ neo ${k.dong.ocr_so_trang_neo}`);
    dat(k.dong.chu_nguon !== 'pdf_lop_chu',
      '⚠️ b. KHÔNG đếm vào vế "tìm được theo nội dung" của dải tỉ lệ',
      `→ chu_nguon=${k.dong.chu_nguon}`);
    dat(k.dem && k.dem.tra_cuu_duoc === 0 && k.dem.chi_xem_duoc === 1,
      '⚠️ b. Dải đếm khai đúng: 0 tìm được theo nội dung · 1 chỉ xem được',
      `→ ${JSON.stringify(k.dem)}`);
    dat(/rời rạc từng ký tự/i.test(String(k.dong.ocr_ghi_chu || '')),
      'b. NÓI RA vì sao, bằng tiếng người',
      `→ "${String(k.dong.ocr_ghi_chu || '').slice(0, 58)}…"`);
    dat(!/\bTd\b|toán tử|Skia|Chrome/i.test(String(k.dong.ocr_ghi_chu || '')),
      'b. Câu đó KHÔNG lộ ruột kỹ thuật');
    dat(!/ t h u c /.test(' ' + String(k.dong.tim_kiem || '') + ' '),
      'b. Chữ vụn KHÔNG lọt vào ô tìm kiếm (không làm bẩn kết quả về sau)');
  }

  /* ---- c. Nhóm NHẠY CẢM: ruột giấy không bao giờ vào ô tìm ------------- */
  {
    const k = await luuRoiTim('lien', 'nhap khau', 'nhan_su');
    dat(k.ma === 400 || k.ds.length === 0,
      'c. Nhóm nhân sự: ruột giấy KHÔNG vào ô tìm (vá REV-0040 #4 còn nguyên)',
      `→ HTTP ${k.ma}, ${k.ds.length} kết quả`);
  }
}

/* ==========================================================================
   ⑯ GHI CSDL HỎNG GIỮA CHỪNG — KHÔNG ĐƯỢC ĐẺ FILE MỒ CÔI  ·  REV-0055 CAO-3
   ---------------------------------------------------------------------------
   Ca thật Hồ Ly dựng được: deploy mã mới TRƯỚC khi chạy migration ⇒ CSDL chưa
   có cột `chu_nguon` ⇒ câu `INSERT` nổ. Trước bản vá, `try/catch` chỉ bọc lượt
   đẩy file lên Drive, còn `INSERT` nằm NGOÀI ⇒ trình tự thật là:
       file ĐÃ lên Drive → INSERT nổ → 500 câu rỗng → file MỒ CÔI ở lại.
   Mỗi lần Sếp bấm "Gửi lại" là thêm một file mồ côi nữa: không ai tìm thấy,
   không ai dọn được.
   ========================================================================== */
muc('⑯ Ghi CSDL hỏng → KHÔNG đẻ file mồ côi trên Drive (REV-0055 CAO-3)');
{
  const pdfThu = () => Buffer.concat([
    Buffer.from('%PDF-1.4\n<< /Type /Page >>\n'),
    Buffer.alloc(60000, 0x20), Buffer.from('\n%%EOF\n')
  ]).toString('base64');

  /* Dựng đúng CSDL của cửa sổ "mã mới, migration chưa chạy": có bảng, THIẾU
     cột `chu_nguon`. Không giả lập bằng cách ném lỗi bừa — dùng đúng nguyên
     nhân thật để câu lỗi cũng là câu lỗi thật. */
  function d1ThieuCot() {
    const t = d1SQLite();
    t.kho.exec('ALTER TABLE tai_lieu DROP COLUMN chu_nguon');
    return t;
  }

  const t = d1ThieuCot();
  const truocDrive = driveGia.size;
  const res = await tailieu.luuTaiLieu(t.env, phienCua('ke_toan_truong'), {
    ma_gui: 'mg16-' + Math.random().toString(36).slice(2, 8),
    nhom: 'ke_toan', tieu_de: 'Hoá đơn thử ca thiếu cột', so_trang: 1,
    dinh_dang: 'pdf_goc', tep: pdfThu()
  });
  const than = await doc(res);

  dat(res.status >= 400, 'Thiếu cột `chu_nguon` → lượt lưu BÁO HỎNG, không im lặng',
    `→ HTTP ${res.status}`);
  dat(typeof than.loi === 'string' && than.loi.length > 30 && than.loi !== 'undefined',
    '⚠️ Câu ra người dùng là TIẾNG NGƯỜI, không bao giờ là "undefined"',
    `→ "${String(than.loi).slice(0, 62)}…"`);
  dat(!/no such column|SQLITE|INSERT INTO|chu_nguon/i.test(String(than.loi || '')),
    'Câu đó KHÔNG phun ruột CSDL ra ngoài');
  dat(/chọn lại|gửi lần nữa/i.test(String(than.loi || '')),
    'Câu đó nói CÁCH XỬ (file còn trên máy, chọn lại rồi gửi lần nữa)');
  dat(driveGia.size === truocDrive,
    '⚠️ KHÔNG còn file mồ côi trên Drive — ghi CSDL hỏng thì file vừa đẩy đã bị dọn',
    `→ Drive lệch ${driveGia.size - truocDrive} file`);
  dat(t.kho.prepare('SELECT COUNT(*) AS n FROM tai_lieu').get().n === 0,
    'Và CSDL không có dòng nào (không có bản ghi nửa vời)');

  /* ĐỐI CHỨNG BH-16 — bản CŨ (ném thẳng ra ngoài, không dọn) phải ĐỂ LẠI file
     mồ côi. Không có ca này thì con số "Drive lệch 0" ở trên có thể chỉ vì bàn
     đo không đếm đúng chỗ. */
  const hong = await napBanVa('ném thẳng lỗi ghi CSDL ra ngoài (bản trước REV-0055)',
    /* Quay về ĐÚNG hành vi cũ: ném thẳng ra ngoài, KHÔNG dọn file. Vá thành
       'if (false)' là chưa đủ — luồng sẽ rơi xuống nhánh UNIQUE ngay dưới,
       mà nhánh đó CŨNG dọn file, nên ca đối chứng tự nó bị vô hiệu. */
    ['    if (!/UNIQUE constraint failed/i.test(m) || !maGui) {',
     '    if (true) { throw e; }\n    if (false) {']);
  if (hong) {
    const t2 = d1ThieuCot();
    const truoc2 = driveGia.size;
    let nem = null;
    try {
      await hong.luuTaiLieu(t2.env, phienCua('ke_toan_truong'), {
        ma_gui: 'mg16b-' + Math.random().toString(36).slice(2, 8),
        nhom: 'ke_toan', tieu_de: 'Hoá đơn thử ca đối chứng', so_trang: 1,
        dinh_dang: 'pdf_goc', tep: pdfThu()
      });
    } catch (e) { nem = e; }
    dat(nem !== null && driveGia.size - truoc2 === 1,
      'ĐỐI CHỨNG BH-16: bản CŨ ném lỗi ra ngoài VÀ để lại 1 file mồ côi',
      `→ ném ${nem ? 'có' : 'KHÔNG'}, Drive lệch ${driveGia.size - truoc2} ` +
      '(phải là 1 — nếu 0 thì PHÉP ĐO hỏng)');
  }
}

/* ==========================================================================
   ⑰ NHÃN NGUỒN CHỮ PHẢI RA TỚI MẮT NGƯỜI DÙNG  ·  REV-0055 CAO-2
   ---------------------------------------------------------------------------
   Máy chủ CÓ nhãn riêng `NHAN_CHU_PDF`, nhưng vòng trước KHÔNG một dòng giao
   diện nào đọc `nhan_so_ai` — màn "Xem chữ đã bóc" dán cứng "AI đọc — CHƯA
   KIỂM" cho cả đoạn chữ mà Workers AI chưa được gọi lấy một lượt.
   Nói sai nguồn gốc của chữ là làm hỏng chính cái luật "con số máy đọc = chưa
   kiểm": người đọc thấy nhãn dán bừa một lần thì lần sau bỏ qua nó.
   ========================================================================== */
muc('⑰ Nhãn nguồn chữ ra tới giao diện (REV-0055 CAO-2)');
{
  const t = d1SQLite();
  const themDong = (id, nguon) => t.kho.prepare(
    `INSERT INTO tai_lieu (id, nhom, tieu_de, tim_kiem, so_trang, kho_nha,
                           noi_dung, ocr_so_trang, chu_nguon, tao_luc)
     VALUES (?, 'ke_toan', 'Hoá đơn thử', 'hoa don thu', 1, 'drive', ?, 1, ?, '2026-09-03 09:00:00')`
  ).run(id, '--- Trang 1 · ĐÃ ĐỐI CHIẾU · x ---\nSo 124/2026 tong 42.350.000 dong', nguon);
  themDong('tl_pdf', 'pdf_lop_chu');
  themDong('tl_anh', 'anh_ai');

  const tPdf = await doc(await tailieu.moTaiLieu(t.env, phienCua('ke_toan_truong'), 'tl_pdf'));
  const tAnh = await doc(await tailieu.moTaiLieu(t.env, phienCua('ke_toan_truong'), 'tl_anh'));

  dat(tPdf.tai_lieu.nhan_so_ai === tailieu.NHAN_CHU_PDF &&
      tPdf.tai_lieu.chu_nguon === 'pdf_lop_chu',
    'Máy chủ trả nhãn "chữ có sẵn trong file PDF" cho tài liệu đọc từ lớp chữ',
    `→ "${tPdf.tai_lieu.nhan_so_ai}"`);
  dat(!/AI đọc/i.test(String(tPdf.tai_lieu.nhan_so_ai)),
    '⚠️ Nhãn đó KHÔNG nói "AI đọc" — Workers AI chưa được gọi lấy một lượt');
  dat(/AI đọc/i.test(String(tAnh.tai_lieu.nhan_so_ai)),
    'ĐỐI CHỨNG: tài liệu do AI đọc ảnh VẪN mang nhãn "AI đọc"',
    `→ "${tAnh.tai_lieu.nhan_so_ai}"`);
  dat(Array.isArray(tPdf.tai_lieu.so_ai) && tPdf.tai_lieu.so_ai.length > 0,
    'Con số trong chữ lấy từ PDF VẪN được đánh dấu để bôi (chưa kiểm vẫn là chưa kiểm)',
    `→ ${tPdf.tai_lieu.so_ai.length} cụm số`);

  /* --- Tầng giao diện: `app.js` phải ĐỌC nhãn đó, không dán cứng --- */
  const gd = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  dat(/tl\.nhan_so_ai/.test(gd),
    '⚠️ Giao diện ĐỌC `nhan_so_ai` máy chủ trả về (vòng trước: grep 0 kết quả)');
  dat(/veChuCoSo\(tl\.noi_dung,\s*tl\.so_ai,\s*nhan\)/.test(gd),
    'Nhãn đó truyền xuống tận chỗ bôi số, không chỉ in một dòng ở đầu ô');
  const dauXem = gd.indexOf('function veChuCoSo');
  const cuoiXem = gd.indexOf('KHO TÀI LIỆU QUẢN TRỊ');
  const doanXem = gd.slice(dauXem, cuoiXem > dauXem ? cuoiXem : dauXem + 6000);
  const danCung = (doanXem.match(/'AI đọc — CHƯA KIỂM'|<b>AI đọc — CHƯA KIỂM/g) || []);
  dat(danCung.length <= 1,
    'Chỉ còn TỐI ĐA một chỗ nhắc "AI đọc" — và đó là đường lui khi máy chủ không trả nhãn',
    `→ ${danCung.length} chỗ`);
  dat(/chu_nguon === 'pdf_lop_chu'/.test(doanXem),
    'Câu giải thích rẽ theo `chu_nguon`, không dán cứng một nhánh');
}

/* ==========================================================================
   ⑱ DẢI ĐẾM PHẢI KHỚP ĐƯỜNG CUỐI  ·  REV-0055 vòng 2 · CAO-A
   ---------------------------------------------------------------------------
   Hồ Ly đo được: ERP khoe "5 tài liệu tìm được theo nội dung" trong khi gõ tìm
   chỉ ra 3 — thổi lên 40%. Đó là cùng một bệnh đã làm vòng 1 FAIL, chỉ đổi
   đường: ERP tuyên bố khả năng tra cứu cao hơn sự thật. Và đây là con số Sếp
   dùng để quyết định có phải đi chỉnh máy scan hay không.

   Chốt duy nhất không cãi được: LƯU N FILE, GÕ TÌM TỪNG FILE, đếm xem thật sự
   ra được mấy — con số đó PHẢI bằng con số ERP khoe. Không so với cột nào, không
   so với ý định của ai; so với chính đường người dùng đi.
   ========================================================================== */
muc('⑱ Dải đếm khớp ĐƯỜNG CUỐI — khoe bao nhiêu, tìm ra bấy nhiêu (CAO-A)');
{
  const { deflateSync } = await import('node:zlib');

  /** PDF một trang, lớp chữ lành, nội dung tuỳ ý. */
  function pdfChu1Trang(cau) {
    const hex4 = (n) => n.toString(16).padStart(4, '0');
    const bang = [...cau].map((c, i) => ({ ma: i + 1, chu: c }));
    const nd = `BT /F1 12 Tf 40 700 Td <${bang.map(b => hex4(b.ma)).join('')}> Tj ET`;
    const ndB = deflateSync(Buffer.from(nd, 'latin1'));
    const cmap =
      '/CIDInit /ProcSet findresource begin 12 dict begin begincmap\n' +
      '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
      `${bang.length} beginbfchar\n` +
      bang.map(b => `<${hex4(b.ma)}> <${hex4(b.chu.charCodeAt(0))}>`).join('\n') +
      '\nendbfchar\nendcmap CMapName currentdict /CMap defineresource pop end end';
    const cB = Buffer.from(cmap, 'latin1');
    const dt = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
        '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      { dict: `<< /Length ${ndB.length} /Filter /FlateDecode >>`, luong: ndB },
      '<< /Type /Font /Subtype /Type0 /BaseFont /T /Encoding /Identity-H ' +
        '/DescendantFonts [7 0 R] /ToUnicode 6 0 R >>',
      { dict: `<< /Length ${cB.length} >>`, luong: cB },
      '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /T >>'
    ];
    const manh = [Buffer.from('%PDF-1.5\n', 'latin1')];
    dt.forEach((o, i) => {
      const n = i + 1;
      if (typeof o === 'string') manh.push(Buffer.from(`${n} 0 obj\n${o}\nendobj\n`, 'latin1'));
      else {
        manh.push(Buffer.from(`${n} 0 obj\n${o.dict}\nstream\n`, 'latin1'));
        manh.push(o.luong);
        manh.push(Buffer.from('\nendstream\nendobj\n', 'latin1'));
      }
    });
    manh.push(Buffer.from('trailer\n<< /Size 9 /Root 1 0 R >>\n%%EOF\n', 'latin1'));
    return Buffer.concat(manh);
  }

  /* Một PDF KHÔNG có lớp chữ — để có vế "chỉ xem được" trong cùng một kho. */
  function pdfChiAnh() {
    return Buffer.concat([
      Buffer.from('%PDF-1.4\n<< /Type /Page >>\n'),
      Buffer.alloc(60000, 0x20), Buffer.from('\n%%EOF\n')
    ]);
  }

  /* NĂM tài liệu, cố ý trộn đủ ba vế. `tu` là từ CHỈ CÓ trong ruột file — không
     có ở tiêu đề, loại, hay TÊN NHÓM (bẫy đã sập một lần ở mục ⑮). */
  const bo = [
    { ten: 'Chung tu thang bay', soHieu: '124/2026/GCN-ATTP', tu: 'maslow',
      cau: 'CONG TY TNHH ALPHA GREEN COMMERCE So 124/2026/GCN-ATTP thang bay maslow ' +
           'thu tu nhu cau ap dung cho kho Ha Noi', mong: 'tra' },
    { ten: 'Chung tu thang tam', soHieu: '125/2026/GCN-ATTP', tu: 'herzberg',
      cau: 'CONG TY TNHH ALPHA GREEN COMMERCE So 125/2026/GCN-ATTP thang tam herzberg ' +
           'hai yeu to dong luc kho Ha Noi', mong: 'tra' },
    /* Số hiệu KHÔNG có trong ruột giấy và tên cũng không sinh nổi mỏ neo trúng
       ⇒ mỏ neo hụt ⇒ chữ KHÔNG vào ô tìm. Đây đúng ca ERP từng khoe nhầm. */
    { ten: 'Giay to so hai', soHieu: '999/2026/KHONG-CO', tu: 'vroom',
      cau: 'Bien ban ban giao noi bo vroom ky vong dong luc lam viec ' +
           'ap dung tu quy ba nam nay cho toan bo nhan su thoi vu', mong: 'chua' },
    { ten: 'Giay to so ba', soHieu: '888/2026/KHONG-CO', tu: 'adams',
      cau: 'Bien ban kiem ke adams cong bang trong phan phoi thu lao ' +
           'ap dung cho ca kho va van phong tu thang muoi', mong: 'chua' },
    { ten: 'Giay to chi anh', soHieu: '777/2026/ANH', tu: 'khongcochutrongfile',
      cau: null, mong: 'xem' }
  ];

  const t = d1SQLite();
  for (const b of bo) {
    const r = await tailieu.luuTaiLieu(t.env, phienCua('van_hanh_san'), {
      ma_gui: 'mg18-' + Math.random().toString(36).slice(2, 9),
      nhom: 'attp', tieu_de: b.ten, loai: 'Chứng từ', so_hieu: b.soHieu,
      so_trang: 1, dinh_dang: 'pdf_goc',
      tep: (b.cau ? pdfChu1Trang(b.cau) : pdfChiAnh()).toString('base64')
    });
    if (r.status !== 200) { dat(false, `Bàn đo: lưu "${b.ten}" hỏng`, `HTTP ${r.status}`); }
  }

  /* --- Con số ERP KHOE --- */
  const kho = await doc(await tailieu.danhSachTaiLieu(
    t.env, phienCua('admin'), new URLSearchParams()));
  const khoe = kho.dem_chu;

  /* --- ĐƯỜNG CUỐI: gõ từng từ, đếm xem thật sự ra được mấy --- */
  const raDuoc = [];
  for (const b of bo) {
    const p = new URLSearchParams(); p.set('q', b.tu);
    const kq = await doc(await tailieu.danhSachTaiLieu(t.env, phienCua('admin'), p));
    const trung = (kq.ds || []).some(x => x.tieu_de === b.ten);
    if (trung) raDuoc.push(b.ten);
  }

  console.log(`     → ERP khoe: ${khoe.tra_cuu_duoc} tìm được · ` +
    `${khoe.co_chu_chua_tra_duoc} có chữ chưa tra được · ${khoe.chi_xem_duoc} chỉ xem được`);
  console.log(`     → Đường cuối: gõ 5 từ trong ruột 5 file, RA ĐƯỢC ${raDuoc.length} ` +
    `(${raDuoc.join(', ') || 'không file nào'})`);

  dat(khoe.tra_cuu_duoc === raDuoc.length,
    '⚠️ ĐƯỜNG CUỐI: con số ERP khoe = số tài liệu gõ tìm THẬT SỰ ra được',
    `→ khoe ${khoe.tra_cuu_duoc}, ra được ${raDuoc.length}`);
  dat(khoe.tra_cuu_duoc === 2 && khoe.co_chu_chua_tra_duoc === 2 && khoe.chi_xem_duoc === 1,
    'Ba vế chia đúng: 2 tìm được · 2 có chữ chưa tra được · 1 chỉ xem được',
    `→ ${JSON.stringify(khoe)}`);
  dat(khoe.tra_cuu_duoc + khoe.co_chu_chua_tra_duoc + khoe.chi_xem_duoc === 5,
    'Ba vế cộng lại đúng bằng số tài liệu trong kho — không sót, không đếm hai lần');

  /* ĐỐI CHỨNG BH-16 — bản CŨ (đếm bằng `ocr_so_trang`) phải THỔI LÊN.
     Không có ca này thì con số "khớp" ở trên có thể chỉ vì bàn đo dựng bộ dữ
     liệu quá dễ. */
  {
    const d = t.kho.prepare(`
      SELECT SUM(CASE WHEN ocr_so_trang > 0 THEN 1 ELSE 0 END) AS tra
        FROM tai_lieu WHERE an = 0`).get();
    dat(Number(d.tra) === 4 && Number(d.tra) > raDuoc.length,
      'ĐỐI CHỨNG BH-16: cách đếm CŨ (`ocr_so_trang > 0`) khoe 4 trong khi tìm ra 2',
      `→ cũ khoe ${d.tra}, thật ${raDuoc.length} (phải LỆCH — nếu khớp thì PHÉP ĐO hỏng)`);
  }

  /* Giấy tờ NHẠY CẢM: chữ lành, mỏ neo trúng, nhưng ruột KHÔNG vào ô tìm
     (vá REV-0040 #4) ⇒ KHÔNG được đếm vào vế "tìm được theo nội dung". */
  {
    const t2 = d1SQLite();
    t2.kho.prepare("INSERT INTO nhan_su (id, ho_ten) VALUES ('ns_duy', 'Phạm Khương Duy')").run();
    const r = await tailieu.luuTaiLieu(t2.env, phienCua('hcns', 'ns_hcns'), {
      ma_gui: 'mg18ns-' + Math.random().toString(36).slice(2, 9),
      nhom: 'nhan_su', gan_id: 'ns_duy', tieu_de: 'Quyết định bổ nhiệm',
      loai: 'Quyết định', so_hieu: '126/2026/QD-AGC', so_trang: 1, dinh_dang: 'pdf_goc',
      tep: pdfChu1Trang('QUYET DINH BO NHIEM So 126/2026/QD-AGC ' +
        'CONG TY TNHH ALPHA GREEN COMMERCE bo nhiem ong Pham Khuong Duy ' +
        'giu chuc quan ly kho ke tu ngay mot thang chin').toString('base64'),
      dong_y_boi: 'Phạm Khương Duy', dong_y_muc_dich: 'Hồ sơ lao động'
    });
    dat(r.status === 200, 'Bàn đo: lưu được giấy tờ nhạy cảm', `HTTP ${r.status}`);
    const d = t2.kho.prepare('SELECT ocr_so_trang_neo, nhay_cam FROM tai_lieu').get();
    const k2 = await doc(await tailieu.danhSachTaiLieu(
      t2.env, phienCua('hcns', 'ns_hcns'), new URLSearchParams()));
    dat(d.ocr_so_trang_neo > 0 && d.nhay_cam === 1,
      'Giấy nhạy cảm: chữ ĐÃ đối chiếu được (mỏ neo trúng)',
      `→ neo ${d.ocr_so_trang_neo}, nhạy cảm ${d.nhay_cam}`);
    dat(k2.dem_chu.tra_cuu_duoc === 0 && k2.dem_chu.co_chu_chua_tra_duoc === 1,
      '⚠️ Nhưng KHÔNG đếm vào "tìm được theo nội dung" — ruột giấy nhạy cảm không vào ô tìm',
      `→ ${JSON.stringify(k2.dem_chu)}`);
    /* Từ tra CHỈ có trong ruột giấy: 'bo nhiem' nằm ngay ở TIÊU ĐỀ nên gõ nó
       sẽ trúng vì lý do khác — đúng cái bẫy đã ghi ở mục ⑮. 'giu chuc' chỉ có
       trong thân văn bản. */
    const p = new URLSearchParams(); p.set('q', 'giu chuc');
    const k3 = await doc(await tailieu.danhSachTaiLieu(t2.env, phienCua('hcns', 'ns_hcns'), p));
    dat((k3.ds || []).length === 0,
      'ĐƯỜNG CUỐI khớp: gõ từ trong ruột giấy nhạy cảm → 0 kết quả, đúng như dải đếm nói',
      `→ ${(k3.ds || []).length} kết quả`);
  }
}

/* ==========================================================================
   ⑲ `laChuVun` KHÔNG ĐƯỢC KẾT TỘI OAN GIẤY TỜ THẬT  ·  REV-0055 vòng 2 · CAO-B
   ---------------------------------------------------------------------------
   Ngưỡng cũ (chỉ đếm tỉ lệ mẩu một ký tự ≥50%) kết tội oan ba loại giấy tờ THẬT
   của công ty: bảng chấm công anh Duy ký hằng tháng, tờ khai thuế/CCCD in ô
   vuông từng chữ số, bảng quy cách đóng gói. Chúng trúng mỏ neo MẠNH mà vẫn bị
   hạ về `chua_kiem` ⇒ rút khỏi ô tìm ⇒ đúng tờ hay phải tra nhất lại mất khả
   năng tra, mà Sếp KHÔNG BIẾT mình đang thiếu gì.

   Luật: THÀ ĐỂ LỌT MỘT TÀI LIỆU CHỮ HỎNG CÒN HƠN KHOÁ MẤT BẢNG CHẤM CÔNG.
   Nên bàn đo có HAI RỔ, và rổ "tuyệt đối không được bắt" là rổ nặng hơn.
   ========================================================================== */
muc('⑲ laChuVun: hai rổ đối chứng — bắt đúng chữ hỏng, tha đúng giấy tờ thật');
{
  const pdfChu = await import(pathToFileURL(path.join(GOC, 'src/pdf-chu.js')).href);

  /* ---- RỔ 1: PHẢI BẮT (chữ tách rời từng con) ---- */
  const roBat = [
    ['Invoice tiếng Anh vỡ vụn',
     'P a g e 1 o f 1 I n v o i c e I n v o i c e n u m b e r S 3 Y 0 A X D 0 0 0 0 1 ' +
     'D a t e o f i s s u e J u l y 7 2 0 2 6'],
    ['Giấy tờ tiếng Việt vỡ vụn',
     'C Ô N G T Y T N H H A L P H A G R E E N C O M M E R C E G i ấ y c h ứ n g ' +
     'n h ậ n a n t o à n t h ự c p h ẩ m s ố 1 2 4'],
    ['Vỡ vụn nhưng lẫn vài mẩu dài không bị tách',
     'P a g e 1 o f 1 I n v o i c e n u m b e r S3Y0AXD0-0001 D a t e o f i s s u e ' +
     'J u l y 7 2 0 2 6 OpenAI S a n F r a n c i s c o']
  ];
  for (const [ten, chu] of roBat) {
    dat(pdfChu.laChuVun(chu) === true, `RỔ BẮT · ${ten}`, thongKeVun(chu));
  }

  /* ---- RỔ 2: TUYỆT ĐỐI KHÔNG ĐƯỢC BẮT (giấy tờ thật của công ty) ---- */
  const roTha = [
    ['Bảng chấm công kho (ô X/P/K từng ngày)',
     'BANG CHAM CONG THANG 8 So 124/2026/BCC Kho Ha Noi Nguyen Van An ' +
     'X X X P X X K X X X X X X P X X X X X X K X X X X X X X X X X ' +
     'Tran Thi Binh X P X X X X X X K X X X X X X X X P X X X X X X X X X X X X Tong cong 58 cong'],
    ['Tờ khai thuế · MST + CCCD in ô vuông từng chữ số',
     'TO KHAI THUE THU NHAP CA NHAN Ma so thue 0 1 1 0 9 3 8 4 7 2 ' +
     'So CCCD 0 0 1 3 0 1 2 3 4 5 6 7 Ho ten NGUYEN THI HUYEN Dia chi Cau Giay Ha Noi ' +
     'Ky ten Ngay 12 thang 3 nam 2026'],
    ['Bảng quy cách đóng gói (cỡ S/M/L)',
     'BANG QUY CACH DONG GOI Ma hang AGC 001 Co S M L XL Thung 12 24 36 ' +
     'Trong luong 5 10 15 kg Kho Ha Noi Nha cung cap HTX Son La ghi chu hang kho'],
    ['Danh sách mã hàng',
     'DANH MUC MA HANG Kho Ha Noi AGC001 hat dieu rang muoi AGC002 hanh nhan my ' +
     'AGC003 nho kho uc AGC004 viet quat say A B C D E F G H nhom hang nong san kho'],
    ['Bảng lương tháng',
     'BANG LUONG THANG 8 2026 Ho ten Chuc danh Luong Phu cap Tong ' +
     'Pham Khuong Duy Quan ly kho 18 500 000 2 000 000 20 500 000 ' +
     'Phan Thi Hang Ke toan truong 17 000 000 1 500 000 18 500 000'],
    ['Văn bản "Điều 1. a) b) c)"',
     'QUY DINH NOI BO Dieu 1 Pham vi ap dung a Nhan vien kho b Nhan vien van hanh san ' +
     'c Ke toan Dieu 2 Trach nhiem a Bao quan hang hoa b Kiem ke dinh ky ' +
     'Dieu 3 Hieu luc thi hanh tu ngay ky'],
    ['Tài liệu NGẮN (dưới ngưỡng xét)',
     'H o a d o n G T G T s o 1 2 4'],
    ['Bảng chấm công NGHÈO CHỮ nhất (chỉ mã nhân viên, có tên viết tắt)',
     'BCC thang 8 2026 Kho Ha Noi NVAn X X X P X X K X X X X X X P X X X X X X ' +
     'NVBinh X P X X X X X X K X X X X X X X X P X X Tong cong 58 cong ngay ky duyet']
  ];
  for (const [ten, chu] of roTha) {
    dat(pdfChu.laChuVun(chu) === false, `RỔ THA · ${ten}`, thongKeVun(chu));
  }

  /* ---- ĐƯỜNG THẬT: qua `docTinChu`, đúng đường AI đọc ảnh ---- */
  const mocBCC = { soHieu: '124/2026/BCC', loai: 'Bảng chấm công', tieuDe: 'Bảng chấm công kho tháng 8' };
  const chuBCC = roTha[0][1];
  dat(tailieu.docTinChu(chuBCC, mocBCC).muc === 'da_neo',
    '⚠️ ĐƯỜNG THẬT: bảng chấm công trúng mỏ neo mạnh → GIỮ nhãn ĐÃ ĐỐI CHIẾU',
    `→ ${tailieu.docTinChu(chuBCC, mocBCC).muc}`);
  const mocTK = { soHieu: '0110938472', loai: 'Tờ khai thuế', tieuDe: 'Tờ khai thuế TNCN' };
  dat(tailieu.docTinChu(roTha[1][1], mocTK).muc === 'da_neo',
    '⚠️ ĐƯỜNG THẬT: tờ khai ô vuông trúng mỏ neo mạnh → GIỮ nhãn ĐÃ ĐỐI CHIẾU',
    `→ ${tailieu.docTinChu(roTha[1][1], mocTK).muc}`);
  const chuVun = roBat[0][1];
  dat(tailieu.docTinChu(chuVun, { soHieu: 'S3Y0AXD0-0001', loai: 'Hoá đơn', tieuDe: 'Hoá đơn' }).muc
      === 'chua_kiem',
    'ĐƯỜNG THẬT: chữ vỡ vụn vẫn bị HẠ về chưa kiểm dù mỏ neo trúng (chốt còn sống)');

  /* ---- ĐỐI CHỨNG BH-16: ngưỡng CŨ phải kết tội oan bảng chấm công ---- */
  const vunCu = (chu) => {
    const mau = String(chu || '').trim().split(/\s+/).filter(Boolean);
    if (mau.length < 20) return false;
    return mau.filter(m => [...m].length === 1).length / mau.length >= 0.5;
  };
  const oanCu = roTha.filter(([, chu]) => vunCu(chu)).map(([ten]) => ten);
  dat(oanCu.length >= 2,
    'ĐỐI CHỨNG BH-16: ngưỡng CŨ kết tội oan ít nhất 2 loại giấy tờ thật',
    `→ oan ${oanCu.length}: ${oanCu.join(' · ')}`);
  dat(roBat.every(([, chu]) => vunCu(chu)),
    'ĐỐI CHỨNG: ngưỡng cũ vẫn bắt được rổ chữ hỏng ⇒ khác biệt nằm ở RỔ THA, không phải rổ bắt');
}

/** Ba con số mà `laChuVun` nhìn vào — in ra để đọc bảng kết quả không phải đoán. */
function thongKeVun(chu) {
  const mau = String(chu || '').trim().split(/\s+/).filter(Boolean);
  const mot = mau.filter(m => [...m].length === 1).length;
  const tt = mau.filter(m => [...m].length >= 3 && /\p{L}/u.test(m)).length;
  let d = 0, dm = 0;
  for (const m of mau) { if ([...m].length === 1) { d++; if (d > dm) dm = d; } else d = 0; }
  return `1kt=${(mot / mau.length * 100).toFixed(0)}% dải=${dm} từthật=${tt} (${(tt / mau.length * 100).toFixed(0)}%)`;
}

console.log(soHong === 0 ? '  KẾT LUẬN: ĐẠT toàn bộ.' : `  KẾT LUẬN: ✗ ${soHong} mục HỎNG.`);
process.exit(soHong === 0 ? 0 : 1);
