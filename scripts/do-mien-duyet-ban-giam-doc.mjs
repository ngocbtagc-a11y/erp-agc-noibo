/* ==========================================================================
   ĐO: "YÊU CẦU CỦA BAN GIÁM ĐỐC THÌ KHÔNG CẦN DUYỆT"
   ---------------------------------------------------------------------------
   Sếp Bùi Thị Ngọc chốt 10/09/2026:
       "Các yêu cầu của ban giám đốc thì không cần duyệt đâu."

   BÀN ĐO NÀY ĐO BA THỨ, KHÔNG PHẢI MỘT:

   ① HAI ĐƯỜNG TẠO PHIẾU PHẢI CHO CÙNG MỘT KẾT QUẢ.
      Lỗi gốc: `taoPhieuGopY()` (Mây bóc câu nói trong Văn phòng ảo) viết cứng
      trang_thai='moi' + ['NGUOI_GUI','QL_CAP1'] và KHÔNG hề gọi luật miễn
      duyệt, trong khi `gopYGui()` (người tự bấm gửi) thì có. Đo được trên bản
      thật: Sếp Ngọc CÓ `duyet_gopy = 1` mà hai phiếu Sếp tạo qua Mây lúc 01:43
      và 01:45 ngày 10/09/2026 (GY-0011 "Kéo đơn hàng về ERP", GY-0012 "Kết nối
      API") vẫn nằm ở 'moi' chờ anh Nguyễn Duy Phong duyệt.
      Nên: MỖI người được đo qua CẢ HAI đường và bốn ô quyết định
      (trang_thai · current_owner · next_owner · duyet_cap1_nguon) phải khớp
      từng ô. Đây là phép đo bắt trực tiếp lớp lỗi "hai đường, một luật".

   ② LUẬT ĐI THEO CƠ CẤU, KHÔNG THEO CÁI CỜ AI ĐÓ PHẢI NHỚ BẬT.
      Trạng thái cờ trên bản thật 10/09/2026: Bùi Thị Ngọc `duyet_gopy = 1`,
      Nguyễn Duy Phong — GIÁM ĐỐC — `duyet_gopy = 0`, mọi người khác 0. Nghĩa
      là góp ý của chính người đứng đầu công ty cũng phải chờ duyệt.
      Nên bàn đo có người được miễn CHỈ nhờ vế cơ cấu, cờ tắt hẳn.

   ③ VỊ TỪ "THUỘC BAN GIÁM ĐỐC" PHẢI ĐÚNG Ở CẢ HAI QUÃNG CSDL.
      · QUÃNG CŨ (hôm nay): `phong_ban` phẳng, chưa có cột `cap`, Ban Giám đốc
        là hàng id = 1.
      · QUÃNG MỚI (sau khi Sếp chạy `them-phongban-ba-tang.sql` +
        `xep-lai-co-cau-2026-09.sql`): có cột `cap`, Ban Giám đốc là hàng
        `cap = 'cong_ty'`.
      Bàn đo dựng ĐÚNG HAI CSDL và chạy trọn bộ phép đo trên từng cái. CSDL
      quãng cũ được dựng bằng cách DỰNG ĐỦ rồi BỎ HẲN cột `cap` khỏi bảng —
      không phải bằng cách đặt cột đó bằng NULL, vì NULL không tái hiện được
      lỗi "no such column" mà đường đọc phòng thủ phải nuốt.

   CÁCH ĐO (BH-34 · BH-44): SQLite THẬT qua `node:sqlite`, nạp `schema.sql` +
   TOÀN BỘ migrations thật. Đường người tự bấm gửi đi qua `worker.fetch()`
   NGUYÊN BẢN với cookie phiên thật; đường Văn phòng ảo gọi thẳng
   `taoPhieuGopY()` NGUYÊN BẢN — đúng hai hàm sản phẩm, không có bản mô phỏng.

   BH-16 — CA ĐỐI CHỨNG: mỗi chốt có một bản `src` BỊ LÀM HỎNG CỐ Ý và bàn đo
   phải ĐỎ trên bản đó. Ca nào không đỏ thì chốt đó là chốt giả.
     DC-A  Mây quay lại viết cứng 'moi' + QL_CAP1   → đúng lỗi gốc
     DC-B  bỏ hẳn vế Ban Giám đốc                   → Giám đốc lại phải chờ duyệt
     DC-C  miễn duyệt cho TẤT CẢ                    → cắt quá tay
     DC-D  miễn duyệt mà KHÔNG ghi dòng lịch sử     → bỏ qua âm thầm
     DC-E  vị từ sai ở quãng CSDL CŨ                → id Ban Giám đốc lệch
     DC-F  vị từ sai ở quãng CSDL MỚI               → đọc nhầm cấp hộp
     DC-G  so chức vụ kiểu "có chứa"                → Trợ lý Giám đốc được miễn
     DC-H  bỏ đọc phòng thủ cột `cap`               → quãng cũ ném lỗi, mất phiếu
     DC-I  cờ trên tài khoản ĐÃ KHOÁ vẫn ăn         → thu tài khoản mà quyền còn

   SỐ TRONG LỜI KHAI PHẢI ĐÚNG BẰNG SỐ CHẠY RA: bản này 168 phép, 9 ca đối
   chứng, chạy trên HAI quãng CSDL. Con số đúng là con số bàn đo in ra, không
   phải con số nhớ được.

   BÀN ĐO PHẢI ĐẾM SỐ PHÉP VÀ ĐÒI ĐỦ SÀN: "trượt = 0" khi KHÔNG phép nào chạy
   vẫn cho exit 0 và đi thẳng qua cổng. Sàn khai ở `SAN_TOI_THIEU` bên dưới.

   MỌI CA ĐỐI CHỨNG ĐỀU PHẢI CHỨNG MINH MŨI TIÊM CÓ GĂM VÀO: `banSrcHong()`
   so nội dung trước/sau và bàn đo ĐỎ nếu không có ký tự nào đổi. Không có
   chốt này thì một cái neo lệch biến ca đối chứng thành "chạy trên bản đúng"
   và nó "không bắt được" vì chẳng có gì để bắt.

   Chạy:  node scripts/do-mien-duyet-ban-giam-doc.mjs
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, cacCauSQL } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.GOPY_SRC ? path.resolve(process.env.GOPY_SRC) : path.join(GOC, 'src');

datDongHo('2026-09-10T03:00:00Z');            // 10:00 giờ VN, ngày Sếp chốt luật

/* ---- Cột mốc kiểm: đếm ĐẠT / TRƯỢT, CÓ SÀN ------------------------------ */

let dat = 0, truot = 0;
function ok(nhan, dieuKien, chiTiet = '') {
  if (dieuKien) { dat++; console.log(`  ✅ ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; console.log(`  ❌ ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`); }
  return !!dieuKien;
}

/* Sàn = số phép bàn đo này PHẢI chạy. Chạy thiếu là bàn đo hỏng, không phải
   "việc ít đi": một câu `return` đặt nhầm chỗ, một ngoại lệ nuốt mất nửa
   bảng, và "TRƯỢT 0" vẫn in ra xanh lè. Con số này là SỐ BÀN ĐO IN RA, cập
   nhật khi thêm phép — không phải con số nhớ được. */
const SAN_TOI_THIEU = 168;

/* ==========================================================================
   MỒI DỮ LIỆU — CƠ CẤU SAU KHI SẾP CHẠY `xep-lai-co-cau-2026-09.sql`
   ---------------------------------------------------------------------------
   Bốn hàng phòng ban giữ ĐÚNG id thật của bản sản xuất, để cả hai quãng CSDL
   dùng chung một bộ hồ sơ nhân sự và chỉ khác nhau đúng một thứ: có hay không
   có cột `cap`.

   BỐN NGƯỜI ĐỂ TÁCH TỪNG VẾ CỦA LUẬT — mỗi người chỉ trúng MỘT vế, nên hỏng
   vế nào là biết ngay vế đó:
     SEP    Bùi Thị Ngọc  — chỉ trúng vế CỜ (`duyet_gopy = 1`, hồ sơ ở Phòng
                            Vận hành và Hỗ trợ, đúng như bản thật sau cơ cấu
                            mới). Đây là ca GY-0011/GY-0012 ngoài đời.
     PHONG  Nguyễn Duy Phong — Giám đốc, CỜ TẮT, hồ sơ ở Ban Giám đốc. Trúng
                            cả hai vế cơ cấu; đây là người mà luật cũ bỏ sót.
     TROLY  Lê Thị Thu    — hồ sơ Ở TRONG Ban Giám đốc nhưng chức vụ thường.
                            Chỉ trúng vế PHÒNG BAN → dùng để đo vị từ hai quãng.
     SEP0   Đỗ Thị Mai    — Phó Giám đốc, CỜ TẮT, hồ sơ ở Phòng Vận hành.
                            Chỉ trúng vế CHỨC VỤ → chứng minh Phó Giám đốc vẫn
                            được miễn sau khi cơ cấu mới đẩy hồ sơ ra khỏi hộp
                            Ban Giám đốc.

   BỐN NGƯỜI CA NGƯỢC — phải KHÔNG được miễn, bắt chiều "cắt quá tay":
     TROLYGD Vũ Văn Nam   — "Trợ lý Giám đốc": chuỗi CÓ CHỨA "Giám đốc" mà
                            không thuộc Ban Giám đốc.
     HUYEN  Nguyễn Thị Huyền — nhân viên vận hành sàn, đúng ca GY-0010 ngoài
                            đời (phiếu của chị PHẢI giữ nguyên trong hàng chờ).
     AN     Nguyễn Văn An — nhân viên kho, có đủ quản lý cấp 1.
     CUSEP  Trần Thị Cũ   — CỜ BẬT nhưng TÀI KHOẢN ĐÃ KHOÁ. Thu tài khoản mà
                            quyền còn sống là một đường vòng thật.
   ========================================================================== */

const PHONG_BAN = [
  // id, tên,                                         cấp,        cha, thứ tự
  [1, 'Ban Giám đốc',                                 'cong_ty',  null, 1],
  [2, 'Phòng Vận hành và Hỗ trợ',                     'phong',    1,    2],
  [3, 'Phòng Kinh doanh và Phát triển thị trường',    'phong',    1,    1],
  [4, 'Nhóm Kho vận – Sản xuất',                      'nhom',     2,    3]
];

const NGUOI = [
  // mã       họ tên                chức vụ                 phòng  quản lý  vai trò          cờ  kích hoạt
  ['PHONG',  'Nguyễn Duy Phong',   'Giám đốc',              1,     null,    'admin',          0, 1],
  ['SEP',    'Bùi Thị Ngọc',       'Phó Giám đốc',          2,     'PHONG', 'admin',          1, 1],
  ['SEP0',   'Đỗ Thị Mai',         'Phó Giám đốc',          2,     'PHONG', 'admin',          0, 1],
  ['TROLY',  'Lê Thị Thu',         'Trợ lý Ban Giám đốc',   1,     'PHONG', 'nhan_vien',      0, 1],
  ['TROLYGD','Vũ Văn Nam',         'Trợ lý Giám đốc',       3,     'PHONG', 'nhan_vien',      0, 1],
  ['HUYEN',  'Nguyễn Thị Huyền',   'NV Vận hành TMĐT',      3,     'PHONG', 'van_hanh_san',   0, 1],
  ['DUY',    'Phạm Khương Duy',    'Quản lý kho',           4,     'SEP',   'quan_ly_kho',    0, 1],
  ['AN',     'Nguyễn Văn An',      'NV Kho',                4,     'DUY',   'nhan_vien_kho',  0, 1],
  ['CUSEP',  'Trần Thị Cũ',        'NV Hành chính',         3,     'PHONG', 'nhan_vien',      1, 0]
];
const TK_CUA = Object.fromEntries(NGUOI.map(([ma], i) => [ma, i + 1]));

/* Bốn người được miễn, và lý do được miễn của từng người. */
const DUOC_MIEN = {
  SEP:   'TU_DUYET_OWNER',   // vế cờ `duyet_gopy`
  PHONG: 'BAN_GIAM_DOC',     // vế cơ cấu
  SEP0:  'BAN_GIAM_DOC',     // vế cơ cấu — chức vụ
  TROLY: 'BAN_GIAM_DOC'      // vế cơ cấu — phòng ban
};
const KHONG_MIEN = ['TROLYGD', 'HUYEN', 'AN', 'CUSEP'];

function moi(db) {
  db.exec(`DELETE FROM gop_y_lich_su; DELETE FROM gop_y; DELETE FROM phien;
           DELETE FROM tai_khoan; DELETE FROM nhan_su; DELETE FROM phong_ban;`);
  const pb = db.prepare(
    'INSERT INTO phong_ban (id, ten, hoat_dong, cap, cha_id, thu_tu, truong_phong_id) VALUES (?,?,1,?,?,?,NULL)');
  for (const [id, ten, cap, cha, tt] of PHONG_BAN) pb.run(id, ten, cap, cha, tt);

  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, phong_ban_id, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,?,1)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk, duyet_gopy) VALUES (?,?,?,?,?,?,0,?)');
  NGUOI.forEach(([ma, ten, cv, pbId, ql, vt, co, kh]) => {
    const tenPhong = (PHONG_BAN.find(p => p[0] === pbId) || [])[1] || null;
    ns.run(ma, ten, ma.slice(0, 2), cv, tenPhong, pbId, ql);
    tk.run(TK_CUA[ma], ma, 'tk' + ma, 'pbkdf2$1$x$x', vt, kh, co);
  });
}

/* Dựng QUÃNG CSDL CŨ: bỏ HẲN cột `cap` khỏi `phong_ban`.
   Vì sao dựng-đủ-rồi-bỏ chứ không dựng-thiếu: `dungDB()` nạp mọi migration
   thật, kể cả `them-phongban-ba-tang.sql`. Bỏ cột sau khi nạp là cách duy nhất
   tái hiện đúng lược đồ ngày hôm nay mà vẫn giữ nguyên phần còn lại của CSDL.
   `CREATE TABLE ... AS SELECT` mất ràng buộc của bảng gốc — chấp nhận được ở
   đây vì phép đo chỉ hỏi "có cột `cap` hay không", và mất ràng buộc là chiều
   DỄ HƠN cho mã nguồn chứ không phải chiều che lỗi. */
function boCotCap(db) {
  const cot = db.prepare("SELECT name FROM pragma_table_info('phong_ban')").all()
                .map(x => x.name).filter(n => n !== 'cap');
  db.exec('DROP INDEX IF EXISTS ix_pb_cap_cay; DROP INDEX IF EXISTS ix_pb_cay;');
  db.exec(`CREATE TABLE phong_ban_cu AS SELECT ${cot.join(', ')} FROM phong_ban`);
  db.exec('DROP TABLE phong_ban');
  db.exec('ALTER TABLE phong_ban_cu RENAME TO phong_ban');
}

/* ==========================================================================
   MỘT LƯỢT ĐO — chạy TRỌN bộ trên một cây `src` và một quãng CSDL
   ========================================================================== */

const O_QUYET_DINH = ['trang_thai', 'current_owner', 'next_owner', 'duyet_cap1_nguon'];

async function doMotQuang(thuMucSrc, quangCu) {
  const { db, d1 } = dungDB();
  moi(db);
  if (quangCu) boCotCap(db);

  const env = dungEnv(d1);
  const v = Math.random();
  const worker = (await import(pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${v}`)).default;
  const vp     = await import(pathToFileURL(path.join(thuMucSrc, 'vp-gopy.js')).href + `?v=${v}`);

  const kq = {
    quangCu,
    coCotCap: db.prepare("SELECT name FROM pragma_table_info('phong_ban')").all()
                .some(x => x.name === 'cap'),
    may: {}, form: {}, lichSuMay: {}, lichSuForm: {}, httpForm: {}
  };

  const dong = (id) => id == null ? null
    : db.prepare(`SELECT id, trang_thai, current_owner, next_owner, risk,
                         duyet_cap1_nguon, duyet_cap1_luc, duyet_owner_luc,
                         cho_duyet_tu_luc, nguoi_gui_id
                    FROM gop_y WHERE id = ?`).get(id);
  const lichSu = (id) => id == null ? []
    : db.prepare('SELECT tu_trang_thai, den_trang_thai, nguoi_doi_id, ghi_chu FROM gop_y_lich_su WHERE gop_y_id = ? ORDER BY id').all(id);

  for (const [ma] of NGUOI) {
    /* ---- Đường ① VĂN PHÒNG ẢO: Mây bóc câu nói thành phiếu ---- */
    let p = null;
    try {
      p = await vp.taoPhieuGopY(env, {
        nguoiGuiId: ma, tieuDe: 'Mây · ' + ma, boiCanh: 'bối cảnh',
        vuongODau: 'vướng ở đâu', mongMuon: 'mong muốn', khuVuc: 'gopy'
      });
    } catch (e) { kq.may[ma] = { nem: e.message }; }
    if (kq.may[ma] === undefined) {
      kq.may[ma] = dong(p?.id);
      kq.lichSuMay[ma] = lichSu(p?.id);
    }

    /* ---- Đường ② NGƯỜI TỰ BẤM GỬI: POST /api/gop-y qua worker thật ---- */
    if (NGUOI.find(n => n[0] === ma)[7] === 1) {          // tài khoản còn kích hoạt
      const token = await taoPhienThat(env, TK_CUA[ma]);
      const r = await goiAPI(worker, env, '/api/gop-y', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tieu_de: 'Form · ' + ma, boi_canh: 'bối cảnh',
                               vuong_o_dau: 'vướng ở đâu', mong_muon: 'mong muốn' })
      });
      kq.httpForm[ma] = r.status;
      kq.form[ma] = dong(r.than?.id);
      kq.lichSuForm[ma] = lichSu(r.than?.id);
    }
  }

  /* Người gửi KHÔNG CÓ trong hồ sơ nhân sự — hỏng theo chiều an toàn: không
     miễn, không ném. */
  try {
    const p = await vp.taoPhieuGopY(env, {
      nguoiGuiId: 'KHONG-CO-AI', tieuDe: 'Mây · người lạ', boiCanh: 'bc',
      vuongODau: 'vd', mongMuon: 'mm'
    });
    kq.nguoiLa = dong(p?.id);
  } catch (e) { kq.nguoiLa = { nem: e.message }; }

  db.close?.();
  return kq;
}

/* ==========================================================================
   CHẤM MỘT LƯỢT
   ========================================================================== */

const khopO = (a, b) => O_QUYET_DINH.every(o => (a?.[o] ?? null) === (b?.[o] ?? null));
const tomTat = (g) => g ? `${g.trang_thai} · ${g.current_owner}→${g.next_owner} · ${g.duyet_cap1_nguon || '—'}`
                        : '(không có phiếu)';
const coDongGiaiThich = (ls, chu) =>
  (ls || []).some(x => new RegExp(chu, 'i').test(x.ghi_chu || ''));

function chamMotQuang(k) {
  const ten = k.quangCu ? 'QUÃNG CSDL CŨ (chưa có cột `cap`)' : 'QUÃNG CSDL MỚI (có cột `cap`)';
  console.log(`\n=== ${ten} ${'='.repeat(Math.max(0, 60 - ten.length))}\n`);

  ok('Đã dựng ĐÚNG quãng cần đo', k.coCotCap === !k.quangCu,
     k.coCotCap ? 'bảng phong_ban CÓ cột cap' : 'bảng phong_ban KHÔNG có cột cap');

  console.log('\n— ĐƯỢC MIỄN DUYỆT: phiếu đi thẳng, KHÔNG qua cổng nào —');
  for (const [ma, nguon] of Object.entries(DUOC_MIEN)) {
    const hoTen = NGUOI.find(n => n[0] === ma)[1];
    for (const [duong, bang] of [['Mây', k.may], ['Form', k.form]]) {
      const g = bang[ma];
      ok(`${hoTen} · ${duong}: vào thẳng 'cho_phan_tich', chờ Hồ Ly`,
         g?.trang_thai === 'cho_phan_tich' && g?.current_owner === 'HOLY' && g?.next_owner === 'HOLY',
         tomTat(g));
      ok(`${hoTen} · ${duong}: đóng dấu đúng lý do miễn (${nguon})`,
         g?.duyet_cap1_nguon === nguon, String(g?.duyet_cap1_nguon));
      ok(`${hoTen} · ${duong}: có đủ dấu cấp 1 + dấu Owner + rủi ro sàn MEDIUM`,
         !!g?.duyet_cap1_luc && !!g?.duyet_owner_luc && g?.risk === 'MEDIUM',
         `cấp1 ${g?.duyet_cap1_luc ? 'có' : 'THIẾU'} · owner ${g?.duyet_owner_luc ? 'có' : 'THIẾU'} · risk ${g?.risk}`);
    }
    const ls = k.lichSuMay[ma] || [];
    ok(`${hoTen} · Mây: MIỄN DUYỆT KHÔNG PHẢI MIỄN GHI VẾT — có đúng 1 dòng lịch sử nói rõ vì sao`,
       ls.length === 1 && /[Bb]ỏ qua/.test(ls[0]?.ghi_chu || '') && ls[0]?.nguoi_doi_id === ma,
       (ls[0]?.ghi_chu || '(không có dòng nào)').slice(0, 70));
    if (nguon === 'BAN_GIAM_DOC') {
      ok(`${hoTen} · Mây: dòng lịch sử nêu đích danh "Ban Giám đốc"`,
         coDongGiaiThich(ls, 'Ban Giám đốc'), (ls[0]?.ghi_chu || '—').slice(0, 70));
    }
  }

  console.log('\n— CA NGƯỢC: người KHÔNG thuộc Ban Giám đốc vẫn phải qua cổng —');
  for (const ma of KHONG_MIEN) {
    const hoTen = NGUOI.find(n => n[0] === ma)[1];
    const g = k.may[ma];
    ok(`${hoTen} · Mây: nằm ở 'moi', chờ quản lý cấp 1`,
       g?.trang_thai === 'moi' && g?.current_owner === 'NGUOI_GUI' && g?.next_owner === 'QL_CAP1',
       tomTat(g));
    ok(`${hoTen} · Mây: KHÔNG có dấu duyệt nào`,
       !g?.duyet_cap1_luc && !g?.duyet_owner_luc && !g?.duyet_cap1_nguon && !g?.risk,
       tomTat(g));
    ok(`${hoTen} · Mây: KHÔNG có dòng lịch sử "bỏ qua" nào`,
       (k.lichSuMay[ma] || []).length === 0, (k.lichSuMay[ma] || []).length + ' dòng');
  }
  ok('Tài khoản ĐÃ KHOÁ mà còn cờ duyệt → KHÔNG được miễn (Trần Thị Cũ)',
     k.may.CUSEP?.next_owner === 'QL_CAP1' && !k.may.CUSEP?.duyet_cap1_nguon,
     tomTat(k.may.CUSEP));

  console.log('\n— HAI ĐƯỜNG TẠO PHIẾU PHẢI RA CÙNG MỘT KẾT QUẢ —');
  for (const [ma, , , , , , , kh] of NGUOI) {
    if (kh !== 1) continue;
    const hoTen = NGUOI.find(n => n[0] === ma)[1];
    ok(`${hoTen}: phiếu qua Mây khớp từng ô với phiếu tự bấm gửi`,
       khopO(k.may[ma], k.form[ma]),
       `Mây [${tomTat(k.may[ma])}] · Form [${tomTat(k.form[ma])}]`);
    ok(`${hoTen}: gửi qua form trả HTTP 200`, k.httpForm[ma] === 200, 'HTTP ' + k.httpForm[ma]);
  }

  console.log('\n— ĐỒNG HỒ HÀNG CHỜ VÀ CA HỎNG-AN-TOÀN —');
  ok('Phiếu Mây tạo CÓ đóng dấu đồng hồ hàng chờ (cửa 14)',
     !!k.may.HUYEN?.cho_duyet_tu_luc, String(k.may.HUYEN?.cho_duyet_tu_luc));
  ok('Người gửi không có trong hồ sơ nhân sự: KHÔNG ném lỗi, KHÔNG được miễn',
     !k.nguoiLa?.nem && k.nguoiLa?.trang_thai === 'moi' && !k.nguoiLa?.duyet_cap1_nguon,
     k.nguoiLa?.nem ? 'ném: ' + k.nguoiLa.nem : tomTat(k.nguoiLa));
}

/* ==========================================================================
   CHẠY BẢN THẬT
   ========================================================================== */

console.log('\n' + '='.repeat(72));
console.log('LUẬT: "Các yêu cầu của ban giám đốc thì không cần duyệt đâu."');
console.log('      — Sếp Bùi Thị Ngọc, 10/09/2026');
console.log('='.repeat(72));

const banThat = { moi: await doMotQuang(SRC, false), cu: await doMotQuang(SRC, true) };
chamMotQuang(banThat.moi);
chamMotQuang(banThat.cu);

console.log('\n— VỊ TỪ PHẢI CHO CÙNG MỘT CÂU TRẢ LỜI Ở CẢ HAI QUÃNG —');
for (const ma of [...Object.keys(DUOC_MIEN), ...KHONG_MIEN]) {
  const hoTen = NGUOI.find(n => n[0] === ma)[1];
  ok(`${hoTen}: quãng cũ và quãng mới ra kết quả giống hệt nhau`,
     khopO(banThat.moi.may[ma], banThat.cu.may[ma]),
     `mới [${tomTat(banThat.moi.may[ma])}] · cũ [${tomTat(banThat.cu.may[ma])}]`);
}

/* ==========================================================================
   FILE SQL THẢ HAI PHIẾU ĐANG KẸT — CHẠY THẬT, KHÔNG ĐỌC BẰNG MẮT
   ---------------------------------------------------------------------------
   `migrations/tha-gopy-11-12-ban-giam-doc.sql` là file Sếp sẽ bấm trên CSDL
   sản xuất. Đọc nó bằng mắt rồi bảo "trông đúng" là đúng loại việc bàn đo sinh
   ra để thay thế: ở đây dựng lại ĐÚNG ba phiếu đang kẹt trên bản thật rồi chạy
   file lên chúng.

   BA THỨ PHẢI ĐÚNG, thiếu một là không được đưa cho Sếp bấm:
     ① GY-0011 và GY-0012 được thả, mọi ô khớp với thứ mã nguồn đã vá sẽ ghi.
     ② GY-0010 của chị Nguyễn Thị Huyền KHÔNG SUY SUYỂN MỘT Ô — chị không thuộc
        Ban Giám đốc.
     ③ Chạy lại lần hai không đổi thêm gì và không đẻ thêm dòng nhật ký nào.
   ========================================================================== */

const O_PHIEU_10 = ['trang_thai', 'current_owner', 'next_owner', 'risk',
                    'duyet_cap1_nguon', 'duyet_cap1_luc', 'duyet_owner_luc', 'cap_nhat_luc'];

function doFileThaPhieu() {
  const { db } = dungDB();
  db.exec(`DELETE FROM gop_y_lich_su; DELETE FROM gop_y; DELETE FROM nhan_su;`);
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)');
  ns.run('ns_admin1',       'Bùi Thị Ngọc',     'BTN', 'Phó Giám đốc',     'Ban Giám đốc');
  ns.run('ns_6222e61d-6a0', 'Nguyễn Thị Huyền', 'NTH', 'NV Vận hành TMĐT', 'P. Kinh Doanh - MKT');

  /* Ba phiếu dựng lại đúng như đo được trên CSDL sản xuất 10/09/2026. */
  const g = db.prepare(`INSERT INTO gop_y
    (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, trang_thai,
     current_owner, next_owner, tao_luc)
    VALUES (?,?,?,'bc','vd','mm','moi','NGUOI_GUI','QL_CAP1',?)`);
  g.run(10, 'ns_6222e61d-6a0', 'Phần mềm',            '2026-09-10 01:40:00');
  g.run(11, 'ns_admin1',       'Kéo đơn hàng về ERP', '2026-09-10 01:43:00');
  g.run(12, 'ns_admin1',       'Kết nối API',         '2026-09-10 01:45:00');

  const truoc10 = db.prepare(`SELECT ${O_PHIEU_10.join(', ')} FROM gop_y WHERE id = 10`).get();

  const sql = readFileSync(path.join(GOC, 'migrations', 'tha-gopy-11-12-ban-giam-doc.sql'), 'utf8');
  const chay = () => { for (const c of cacCauSQL(sql)) db.exec(c); };
  chay();

  const doc = () => ({
    p10: db.prepare(`SELECT ${O_PHIEU_10.join(', ')} FROM gop_y WHERE id = 10`).get(),
    p11: db.prepare('SELECT * FROM gop_y WHERE id = 11').get(),
    p12: db.prepare('SELECT * FROM gop_y WHERE id = 12').get(),
    ls:  db.prepare('SELECT gop_y_id, tu_trang_thai, den_trang_thai, nguoi_doi_id, nguoi_thuc_hien_loai, tac_nhan, uy_quyen_boi_id, ghi_chu FROM gop_y_lich_su ORDER BY gop_y_id, id').all()
  });
  const lan1 = doc();
  chay();                                   // ③ bấm lại lần hai
  const lan2 = doc();
  db.close?.();
  return { truoc10, lan1, lan2 };
}

console.log('\n=== FILE SQL THẢ HAI PHIẾU ĐANG KẸT ===========================\n');
{
  const t = doFileThaPhieu();
  for (const [ma, p] of [['GY-0011 · Kéo đơn hàng về ERP', t.lan1.p11],
                         ['GY-0012 · Kết nối API',         t.lan1.p12]]) {
    ok(`${ma}: đã ra khỏi hàng chờ, vào 'cho_phan_tich' chờ Hồ Ly`,
       p?.trang_thai === 'cho_phan_tich' && p?.current_owner === 'HOLY' && p?.next_owner === 'HOLY',
       tomTat(p));
    ok(`${ma}: next_owner KHÔNG phải NULL (cột NOT NULL, quy ước dùng chữ)`,
       p?.next_owner != null && p.next_owner !== '', String(p?.next_owner));
    ok(`${ma}: đủ dấu cấp 1 + dấu Owner + rủi ro sàn MEDIUM, đóng dấu tên đúng người gửi`,
       p?.risk === 'MEDIUM' && p?.duyet_cap1_nguon === 'TU_DUYET_OWNER'
       && p?.duyet_cap1_boi_id === 'ns_admin1' && p?.duyet_owner_boi_id === 'ns_admin1'
       && !!p?.duyet_cap1_luc && !!p?.duyet_owner_luc && !!p?.cho_duyet_tu_luc,
       `${p?.risk} · ${p?.duyet_cap1_nguon} · ${p?.duyet_cap1_boi_id}`);
  }

  const lsCua = (id) => t.lan1.ls.filter(x => x.gop_y_id === id);
  for (const id of [11, 12]) {
    const ls = lsCua(id);
    ok(`GY-00${id}: có ĐÚNG một dòng nhật ký giải thích vì sao không có dấu duyệt`,
       ls.length === 1 && /[Tt]hả khỏi hàng chờ/.test(ls[0]?.ghi_chu || ''),
       (ls[0]?.ghi_chu || '(không có dòng nào)').slice(0, 60));
    ok(`GY-00${id}: dòng nhật ký ghi dưới danh nghĩa MÁY, có người chịu trách nhiệm`,
       ls[0]?.nguoi_thuc_hien_loai === 'he_thong' && ls[0]?.nguoi_doi_id === null
       && !!ls[0]?.tac_nhan && ls[0]?.uy_quyen_boi_id === 'ns_admin1',
       `${ls[0]?.nguoi_thuc_hien_loai} · ${ls[0]?.tac_nhan} · uỷ quyền ${ls[0]?.uy_quyen_boi_id}`);
  }

  console.log('\n— 🔴 GY-0010 CỦA CHỊ NGUYỄN THỊ HUYỀN PHẢI GIỮ NGUYÊN —');
  ok('GY-0010 không suy suyển MỘT Ô nào sau khi chạy file',
     O_PHIEU_10.every(o => (t.lan1.p10?.[o] ?? null) === (t.truoc10?.[o] ?? null)),
     tomTat(t.lan1.p10));
  ok('GY-0010 vẫn nằm ở cổng duyệt cấp 1 như mọi nhân viên khác',
     t.lan1.p10?.trang_thai === 'moi' && t.lan1.p10?.next_owner === 'QL_CAP1', tomTat(t.lan1.p10));
  ok('GY-0010 KHÔNG có dòng nhật ký nào', t.lan1.ls.filter(x => x.gop_y_id === 10).length === 0,
     t.lan1.ls.filter(x => x.gop_y_id === 10).length + ' dòng');

  console.log('\n— BẤM LẠI LẦN HAI KHÔNG ĐƯỢC ĐỔI THÊM GÌ —');
  ok('Chạy lại: tổng số dòng nhật ký vẫn đúng 2',
     t.lan1.ls.length === 2 && t.lan2.ls.length === 2,
     `lần 1: ${t.lan1.ls.length} · lần 2: ${t.lan2.ls.length}`);
  ok('Chạy lại: ba phiếu không đổi thêm ô nào',
     JSON.stringify(t.lan1) === JSON.stringify(t.lan2));
}

/* ==========================================================================
   BH-16 — CA ĐỐI CHỨNG
   ========================================================================== */

function banSrcHong(ten, sua) {
  const thuMuc = path.join(GOC, '.dc-bgd-' + ten);
  rmSync(thuMuc, { recursive: true, force: true });
  mkdirSync(thuMuc, { recursive: true });
  let daDoi = false;
  for (const f of readdirSync(SRC)) {
    const duong = path.join(SRC, f);
    if (!statSync(duong).isFile()) continue;
    const goc = readFileSync(duong, 'utf8');
    const moiND = sua(f, goc);
    if (moiND !== goc) daDoi = true;
    writeFileSync(path.join(thuMuc, f), moiND, 'utf8');
  }
  return { thuMuc, daDoi };
}

/* Mỗi ca khai rõ nó đo trên QUÃNG nào: một số lỗi chỉ lộ ra ở đúng một quãng
   (DC-E chỉ hỏng ở quãng cũ, DC-F chỉ hỏng ở quãng mới), và đó chính là điều
   phải chứng minh. `batLoi(kMoi, kCu)` nhận cả hai. */
const DC = [
  ['A-may-viet-cung-moi',
   (f, s) => f !== 'vp-gopy.js' ? s
     : s.replace('return await taoPhieuGopYChung(env, {', 'return await taoPhieuGopYCuHong(env, {')
        + `
async function taoPhieuGopYCuHong(env, { nguoiGuiId, tieuDe, boiCanh, vuongODau, mongMuon, khuVuc }) {
  const r = await env.DB.prepare(\`
    INSERT INTO gop_y (nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon,
                       khu_vuc, trang_thai, current_owner, next_owner, tao_luc)
    VALUES (?, ?, ?, ?, ?, ?, 'moi', 'NGUOI_GUI', 'QL_CAP1', datetime('now', '+7 hours'))
  \`).bind(nguoiGuiId, tieuDe, boiCanh, vuongODau, mongMuon, khuVuc || null).run();
  const id = r?.meta?.last_row_id;
  return id ? { id, tieu_de: tieuDe } : null;
}`,
   (m) => m.may.SEP?.next_owner === 'QL_CAP1' || m.may.PHONG?.next_owner === 'QL_CAP1',
   'Mây quay lại viết cứng "moi" + QL_CAP1 — đúng lỗi GY-0011/GY-0012 ngoài đời'],

  ['B-bo-ve-ban-giam-doc',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace('else if (await laBanGiamDoc(env, hoSo)) mien = LY_DO_MIEN_DUYET.BAN_GIAM_DOC;',
                 'else if (false) mien = LY_DO_MIEN_DUYET.BAN_GIAM_DOC;'),
   /* Anh Phong KHÔNG có quản lý cấp trên (đỉnh cây) nên mất vế cơ cấu thì
      phiếu rơi vào nhánh "không có ai ở cấp 1" → chờ OWNER, chứ không phải
      QL_CAP1. Đo bằng TRẠNG THÁI, không đo bằng người đang chờ. */
   (m, c) => m.may.PHONG?.trang_thai !== 'cho_phan_tich'
          || c.may.PHONG?.trang_thai !== 'cho_phan_tich'
          || m.may.TROLY?.next_owner === 'QL_CAP1',
   'bỏ hẳn vế cơ cấu → góp ý của chính Giám đốc lại phải chờ duyệt'],

  ['C-mien-cho-tat-ca',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace('  let mien = null;', '  let mien = LY_DO_MIEN_DUYET.BAN_GIAM_DOC;'),
   (m) => m.may.HUYEN?.trang_thai !== 'moi' || m.may.AN?.trang_thai !== 'moi',
   'cắt quá tay: nhân viên thường cũng bỏ qua cả hai cổng'],

  ['D-mien-ma-khong-ghi-vet',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s : s.replace('  if (qd.ghiChu) {', '  if (false) {'),
   (m) => (m.lichSuMay.PHONG || []).length === 0 || (m.lichSuMay.SEP || []).length === 0,
   'phiếu đi thẳng mà sổ không ghi dòng nào giải thích vì sao không có dấu duyệt'],

  ['E-vi-tu-sai-quang-cu',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace('const BAN_GIAM_DOC_ID_CU = 1;', 'const BAN_GIAM_DOC_ID_CU = 99;'),
   (m, c) => c.may.TROLY?.next_owner === 'QL_CAP1',
   'vị từ Ban Giám đốc sai ở QUÃNG CSDL CŨ — luật không chạy được ngày hôm nay'],

  ['F-vi-tu-sai-quang-moi',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace("const CAP_CONG_TY = 'cong_ty';", "const CAP_CONG_TY = 'phong';"),
   (m) => m.may.TROLY?.next_owner === 'QL_CAP1',
   'vị từ Ban Giám đốc sai ở QUÃNG CSDL MỚI — luật chết đúng lúc Sếp chạy migration'],

  ['G-so-chuc-vu-kieu-co-chua',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace('if (CHUC_VU_BAN_GIAM_DOC.has(chuanHoaChucVu(hoSo.chuc_vu))) return true;',
                 'if (/giám đốc|giam doc/.test(chuanHoaChucVu(hoSo.chuc_vu))) return true;'),
   (m) => m.may.TROLYGD?.trang_thai !== 'moi',
   'so "có chứa" → "Trợ lý Giám đốc" cũng được miễn duyệt'],

  ['H-bo-doc-phong-thu',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace('if (!laLoiThieuCot(e)) throw e;             // ① chưa có cột `cap` — quãng CSDL cũ',
                 'throw e;'),
   /* Đo bằng TROLY chứ không bằng anh Phong: chức vụ "Giám đốc" trúng vế chức
      vụ và thoát TRƯỚC khi chạm tới câu hỏi CSDL, nên anh Phong không bao giờ
      đi qua đường đọc phòng thủ này. TROLY thì có. */
   (m, c) => !!c.may.TROLY?.nem || c.may.TROLY == null,
   'quãng CSDL cũ: thiếu cột `cap` là ném lỗi, phiếu không tạo được'],

  ['I-co-tren-tai-khoan-da-khoa',
   (f, s) => f !== 'gopy-cua-duyet.js' ? s
     : s.replace('WHERE t.nhan_su_id = n.id AND t.kich_hoat = 1)', 'WHERE t.nhan_su_id = n.id)'),
   (m) => m.may.CUSEP?.trang_thai !== 'moi',
   'cờ trên tài khoản ĐÃ KHOÁ vẫn cấp quyền miễn duyệt']
];

console.log('\n=== CA ĐỐI CHỨNG (BH-16) ======================================\n');
let batDu = 0;
for (const [ten, sua, batLoi, moTa] of DC) {
  const { thuMuc, daDoi } = banSrcHong(ten, sua);
  if (!ok(`DC-${ten} → mũi tiêm CÓ găm vào mã nguồn`, daDoi,
          daDoi ? 'nội dung đã đổi' : 'KHÔNG file nào đổi — neo lệch, ca này vô nghĩa')) {
    rmSync(thuMuc, { recursive: true, force: true });
    continue;
  }
  let kMoi = null, kCu = null, vo = false;
  try {
    kMoi = await doMotQuang(thuMuc, false);
    kCu  = await doMotQuang(thuMuc, true);
  } catch (e) { vo = true; console.log('   (bản hỏng ném lỗi: ' + e.message + ')'); }
  const bat = vo || batLoi(kMoi, kCu);
  if (ok(`DC-${ten} → bàn đo BẮT ĐƯỢC`, bat, moTa)) batDu++;
  rmSync(thuMuc, { recursive: true, force: true });
}
ok('Mọi ca đối chứng đều bị bắt (phép đo nhạy cả hai chiều)', batDu === DC.length,
   `${batDu}/${DC.length}`);

/* ==========================================================================
   KẾT — ĐỦ SÀN MỚI ĐƯỢC XANH
   ========================================================================== */

const tong = dat + truot;
console.log('\n' + '='.repeat(72));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot} · TỔNG SỐ PHÉP ĐÃ CHẠY ${tong} (sàn ${SAN_TOI_THIEU})`);
const duSan = ok('Bàn đo chạy ĐỦ SÀN số phép', tong >= SAN_TOI_THIEU,
                 `${tong} / ${SAN_TOI_THIEU}`);
console.log('='.repeat(72));
process.exit(truot === 0 && duSan ? 0 : 1);
