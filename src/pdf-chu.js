/* ==========================================================================
   ĐỌC CHỮ NẰM SẴN TRONG FILE PDF  ·  CTL-0026 vòng 7
   ---------------------------------------------------------------------------
   Sếp Ngọc 03/09/2026: *"định dạng file sẽ là scan pdf"*.

   Máy scan thật ra HAI loại PDF khác hẳn nhau, và người dùng KHÔNG nhìn ra
   khác biệt vì cả hai đều mở lên thấy y hệt nhau:

     ① PDF CÓ LỚP CHỮ (máy scan bật chế độ nhận dạng chữ / "searchable PDF").
        Chữ nằm NGAY TRONG FILE, dưới dạng luồng nội dung đã nén Flate. Lấy ra
        được mà KHÔNG cần thư viện dựng hình, KHÔNG cần gọi AI, KHÔNG tốn đồng
        nào: `DecompressionStream('deflate')` là thứ Workers CÓ SẴN.
     ② PDF CHỈ CÓ ẢNH (máy scan tắt nhận dạng chữ). Trong file chỉ có một tấm
        ảnh mỗi trang, không một ký tự nào. Không đường nào bóc ra được chữ mà
        không dựng hình.

   File này trả lời ĐÚNG MỘT câu: *file này thuộc loại nào, và nếu có chữ thì
   chữ đó là gì*. Nó KHÔNG sửa PDF, KHÔNG dựng hình, KHÔNG gọi mạng.

   ---------------------------------------------------------------------------
   ⚠️ TIẾNG VIỆT CÓ DẤU LÀ CHỖ KHÓ NHẤT — ĐỌC KỸ TRƯỚC KHI ĐỔI
   Byte trong luồng nội dung KHÔNG phải mã Unicode. Nó là "mã ký tự trong
   phông" — con số chỉ có nghĩa với đúng phông đó. Bảng đổi mã→Unicode nằm ở
   luồng `/ToUnicode` của phông. Bỏ qua `/ToUnicode` và đọc byte như Latin-1
   thì chữ ra vẫn "đọc được" bằng mắt lướt qua — nhưng MẤT SẠCH DẤU, và tệ hơn
   là ra rác trông giống chữ ("Cëng ty" thay vì "Công ty"). Đó là kiểu hỏng
   không ai phát hiện cho tới lúc tra cứu không ra.
   → Vì vậy: luôn đi qua `/ToUnicode`; phông nào KHÔNG có bảng đó thì ĐẾM LẠI
     và nói ra tỉ lệ, không im lặng trả chữ mất dấu.

   ⚠️ PDF ĐỜI MỚI GIẤU CẢ CÂY ĐỐI TƯỢNG TRONG `/ObjStm`
   Từ PDF 1.5, phông và trang thường nằm trong "object stream" đã nén — quét
   chuỗi `N 0 obj` trên file thô sẽ KHÔNG thấy chúng, và ta mất luôn bảng
   `/ToUnicode`. Nên phải xả `/ObjStm` ra trước rồi mới dựng mục lục đối tượng.
   ========================================================================== */

/** Trần dò chữ ký `%PDF-`. Trình đọc PDF thật (và cả `pdf.js` của Mozilla)
 *  tìm chữ ký trong 1024 byte ĐẦU chứ không đòi nó ở đúng byte 0 — máy scan
 *  và một số công cụ chèn BOM UTF-8 (3 byte) hoặc vài byte xuống dòng vào
 *  đầu file, và file đó vẫn mở được bằng mọi trình đọc PDF. */
export const TRAN_DO_CHU_KY = 1024;

/** Vị trí chữ ký `%PDF-` trong 1024 byte đầu, hoặc -1 nếu không có.
 *
 *  ⚠️ ĐÂY LÀ BẢN VÁ REV-0054 · LỖI #1. Bản trước đòi `%PDF-` ở ĐÚNG byte 0,
 *  nên một bản scan chuẩn có BOM ở đầu bị chặn oan kèm câu chẩn đoán sai
 *  ("file hỏng hoặc bị đổi tên"). Nới ra 1024 byte KHÔNG mở cửa cho file rác:
 *  một khối byte ngẫu nhiên chứa đúng chuỗi `%PDF-` trong 1 KB đầu là chuyện
 *  gần như không xảy ra, và ca đối chứng trong bàn đo canh đúng chỗ đó. */
export function viTriChuKyPDF(b) {
  if (!b || b.length < 6) return -1;
  const het = Math.min(b.length - 5, TRAN_DO_CHU_KY);
  for (let i = 0; i <= het; i++) {
    if (b[i] === 0x25 && b[i + 1] === 0x50 && b[i + 2] === 0x44 &&
        b[i + 3] === 0x46 && b[i + 4] === 0x2D) return i;
  }
  return -1;
}

export function laByteCuaPDF(b) { return viTriChuKyPDF(b) >= 0; }

/* ---- Ba loại kết luận. Dùng LÀM KHOÁ, câu chữ cho người ở `CAU_LOAI`. ---- */
export const LOAI_PDF = {
  co_lop_chu: 'co_lop_chu',      // tra cứu được bằng nội dung
  chi_anh:    'chi_anh',         // chỉ xem được
  khoa:       'khoa',            // file có mật khẩu / mã hoá
  khong_ro:   'khong_ro'         // đọc hụt — nói thẳng là hụt
};

/* ⚠️ CÂU CHO NGƯỜI THƯỜNG — REV-0054 lỗi #3.
   Không có chữ "thư viện", "Workers", "render", "Flate", "chi phí 0". Bạn kho
   đọc câu này phải biết NGAY (a) file có lưu được không, (b) mình cần làm gì.
   Câu đi vào CỘT `ocr_ghi_chu` nên nó còn nguyên ở màn xem chữ, ở bản sao lưu
   CSV, ở bản khôi phục — không phải một dòng bay mất sau ba giây. */
export const CAU_LOAI = {
  chi_anh:
    'File này là ảnh chụp trang giấy, bên trong chưa có chữ nên không tìm được ' +
    'theo nội dung. Tài liệu vẫn lưu và vẫn mở xem được bình thường, và vẫn tra ' +
    'được bằng tên, số hiệu, loại giấy. Muốn tìm được cả theo nội dung thì chỉnh ' +
    'máy scan sang chế độ nhận dạng chữ (thường ghi là OCR hoặc "PDF tìm kiếm ' +
    'được") rồi quét lại.',
  khoa:
    'File này đang có mật khẩu bảo vệ nên không đọc được chữ bên trong. Tài liệu ' +
    'vẫn lưu và mở xem được. Muốn tìm theo nội dung thì lưu lại một bản không đặt ' +
    'mật khẩu rồi tải lên.',
  khong_ro:
    'Không lấy được chữ trong file này. Tài liệu vẫn lưu và mở xem được, vẫn tra ' +
    'được bằng tên, số hiệu, loại giấy.'
};

/* Trần công sức. PDF scan 50 trang là chuyện thường, mà một lượt lưu không
   được ngồi xả nén cả file. Ba con số này là chỗ dừng, và mọi chỗ dừng đều
   được NÓI RA trong `ghi_chu` chứ không cắt im lặng. */
const TRAN_TRANG_DOC   = 8;                 // đọc 8 trang đầu
const TRAN_BYTE_XA     = 6 * 1024 * 1024;   // tổng byte nén được phép xả
const TRAN_KY_TU       = 60000;             // đủ cho `noi_dung`, khớp trần cột

/* ==========================================================================
   1. Tiện ích byte ⇄ chuỗi
   ========================================================================== */

/** Uint8Array → chuỗi Latin-1 (1 byte = 1 ký tự). Vị trí trong chuỗi TRÙNG
 *  KHÍT vị trí byte, nên tìm bằng chuỗi rồi cắt bằng byte là an toàn.
 *  Ghép theo mẩu 8 KB: `fromCharCode.apply` gãy ở mảng lớn (BH-27). */
function latin1(u8, a = 0, b = u8.length) {
  let s = '';
  const K = 8192;
  for (let i = a; i < b; i += K) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + K, b)));
  return s;
}

function hexThanhByte(h) {
  const s = String(h || '').replace(/[^0-9A-Fa-f]/g, '');
  const n = s.length >> 1;
  const ra = new Uint8Array(n);
  for (let i = 0; i < n; i++) ra[i] = parseInt(s.substr(i * 2, 2), 16);
  return ra;
}

/** Chuỗi hex UTF-16BE của `/ToUnicode` → chữ thật. `cong` là bước nhảy của
 *  `beginbfrange` (mã lo..hi ánh xạ sang dst, dst+1, dst+2…). */
function hexThanhChu(hex, cong = 0) {
  const h = String(hex || '');
  if (!h) return '';
  const chuan = h.length % 4 ? h.padStart(Math.ceil(h.length / 4) * 4, '0') : h;
  const don = [];
  for (let i = 0; i < chuan.length; i += 4) don.push(parseInt(chuan.slice(i, i + 4), 16) || 0);
  if (cong) don[don.length - 1] += cong;
  let ra = '';
  for (const u of don) ra += String.fromCharCode(u & 0xFFFF);
  return ra;
}

/** Xả nén Flate bằng thứ CÓ SẴN trong Workers — không thêm một byte thư viện.
 *  `deflate` = khuôn zlib (RFC1950), đúng khuôn `/FlateDecode` của PDF. Một số
 *  file hỏng nhẹ thiếu 2 byte đầu zlib → thử lại bằng `deflate-raw`.
 *  Hỏng hẳn thì trả `null`, KHÔNG ném: một luồng hỏng không được làm chết cả
 *  lượt lưu tài liệu. */
async function xaFlate(u8) {
  for (const kieu of ['deflate', 'deflate-raw']) {
    try {
      const luong = new Response(u8).body.pipeThrough(new DecompressionStream(kieu));
      const ra = new Uint8Array(await new Response(luong).arrayBuffer());
      if (ra.length) return ra;
    } catch { /* thử khuôn còn lại */ }
  }
  return null;
}

/* ==========================================================================
   2. Mục lục đối tượng
   ========================================================================== */

/** Quét `N G obj … endobj` trên file thô. `than` là phần TỪ SAU `obj`. */
function quetDoiTuong(S) {
  const obj = new Map();
  const re = /(\d{1,10})\s+(\d{1,5})\s+obj\b/g;
  let m;
  while ((m = re.exec(S))) {
    const so = parseInt(m[1], 10);
    const dau = m.index + m[0].length;
    let het = S.indexOf('endobj', dau);
    if (het < 0) het = Math.min(S.length, dau + 200000);
    /* Bản sửa đổi (incremental update) ghi đè: lần xuất hiện SAU là bản mới,
       nên ghi đè map là đúng chiều. */
    obj.set(so, { than: S.slice(dau, het), dau });
    re.lastIndex = dau;
  }
  return obj;
}

/** Ranh giới dữ liệu luồng bên trong `than` (chỉ số TƯƠNG ĐỐI so với `dau`). */
function viTriLuong(than) {
  const m = /\bstream(\r\n|\n|\r)/.exec(than);
  if (!m) return null;
  const a = m.index + m[0].length;
  let b = than.indexOf('endstream', a);
  if (b < 0) return null;
  while (b > a && (than[b - 1] === '\n' || than[b - 1] === '\r')) b--;
  return { a, b, dict: than.slice(0, m.index) };
}

/** Byte thật của luồng, đã xả nén nếu là Flate. `null` khi không đọc được. */
async function docLuong(pdf, o) {
  const v = viTriLuong(o.than);
  if (!v) return null;
  const goc = pdf.byte.subarray(o.dau + v.a, o.dau + v.b);
  if (!/\/Filter/.test(v.dict)) return goc;
  if (!/\/FlateDecode/.test(v.dict)) return null;          // JPX/DCT/CCITT: là ẢNH
  /* Predictor là khuôn lọc thêm một tầng (dùng cho bảng tham chiếu và ảnh).
     Luồng nội dung gần như không bao giờ dùng; gặp thì BỎ QUA, đừng trả rác. */
  if (/\/Predictor\s+[2-9]/.test(v.dict)) return null;
  if (pdf.daXa + goc.length > TRAN_BYTE_XA) { pdf.hetSuc = true; return null; }
  pdf.daXa += goc.length;
  return await xaFlate(goc);
}

/** Xả mọi `/ObjStm` và nạp các đối tượng bên trong vào mục lục.
 *  Không làm bước này thì với PDF 1.5+ ta mất phông, mất `/ToUnicode`, mất cả
 *  danh sách trang — tức là đọc đúng file mà kết luận sai "chỉ có ảnh". */
async function moObjStm(pdf) {
  const dsGoc = [...pdf.obj.values()].filter(o => /\/Type\s*\/ObjStm/.test(o.than));
  for (const o of dsGoc) {
    const d = await docLuong(pdf, o);
    if (!d) continue;
    const s = latin1(d);
    const soN = parseInt((/\/N\s+(\d+)/.exec(o.than) || [])[1], 10) || 0;
    const dau = parseInt((/\/First\s+(\d+)/.exec(o.than) || [])[1], 10) || 0;
    const dauSo = s.slice(0, dau).trim().split(/\s+/).map(Number);
    for (let i = 0; i < soN; i++) {
      const so = dauSo[i * 2], lech = dauSo[i * 2 + 1];
      if (!Number.isFinite(so) || !Number.isFinite(lech)) continue;
      const ketTiep = Number.isFinite(dauSo[(i + 1) * 2 + 1]) ? dau + dauSo[(i + 1) * 2 + 1] : s.length;
      /* Đối tượng trong ObjStm KHÔNG có luồng riêng (luật PDF), nên `dau` để
         -1 làm dấu "đừng đi tìm byte thô cho thằng này". */
      if (!pdf.obj.has(so)) pdf.obj.set(so, { than: s.slice(dau + lech, ketTiep), dau: -1 });
    }
  }
}

/** `12 0 R` → đối tượng. Trả `null` nếu không phải tham chiếu. */
function theoRef(pdf, chuoi) {
  const m = /^\s*(\d+)\s+(\d+)\s+R/.exec(String(chuoi || ''));
  return m ? (pdf.obj.get(parseInt(m[1], 10)) || null) : null;
}

/** Lấy giá trị thô của một khoá trong một từ điển (chuỗi `<< … >>`). */
function layKhoa(than, khoa) {
  const i = than.indexOf('/' + khoa);
  if (i < 0) return null;
  let j = i + khoa.length + 1;
  if (than[j] && /[A-Za-z0-9]/.test(than[j])) return null;   // /Fonts ≠ /Font
  /* Từ điển hoặc mảng thì cắt theo cặp ngoặc; còn lại lấy tới dấu `/` kế. */
  while (j < than.length && /\s/.test(than[j])) j++;
  if (than[j] === '<' && than[j + 1] === '<') {
    let d = 0, k = j;
    while (k < than.length) {
      if (than[k] === '<' && than[k + 1] === '<') { d++; k += 2; }
      else if (than[k] === '>' && than[k + 1] === '>') { d--; k += 2; if (!d) break; }
      else k++;
    }
    return than.slice(j, k);
  }
  if (than[j] === '[') {
    let d = 0, k = j;
    while (k < than.length) {
      if (than[k] === '[') { d++; k++; }
      else if (than[k] === ']') { d--; k++; if (!d) break; }
      else k++;
    }
    return than.slice(j, k);
  }
  const k = than.slice(j).search(/[/\]>]/);
  return than.slice(j, k < 0 ? Math.min(than.length, j + 120) : j + k);
}

/** Từ điển: giá trị trực tiếp, hoặc đi theo tham chiếu một nấc. */
function layTuDien(pdf, than, khoa) {
  const v = layKhoa(than, khoa);
  if (!v) return null;
  if (/^\s*<</.test(v)) return v;
  const o = theoRef(pdf, v);
  return o ? o.than : null;
}

/* ==========================================================================
   3. Bảng đổi mã → chữ (`/ToUnicode`) — chỗ quyết định tiếng Việt sống hay chết
   ========================================================================== */
function docCMap(txt) {
  const bf = new Map();
  let soByte = 1;
  const csr = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(txt);
  if (csr) {
    const h = /<([0-9A-Fa-f]+)>/.exec(csr[1]);
    if (h) soByte = Math.max(1, Math.min(4, Math.ceil(h[1].length / 2)));
  }
  for (const blk of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const p of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      bf.set(parseInt(p[1], 16), hexThanhChu(p[2]));
    }
  }
  for (const blk of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([\s\S]*?)\])/g;
    let m;
    while ((m = re.exec(blk[1]))) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo || hi - lo > 65535) continue;
      if (m[3] !== undefined) {
        for (let c = lo; c <= hi; c++) bf.set(c, hexThanhChu(m[3], c - lo));
      } else if (m[4] !== undefined) {
        let i = 0;
        for (const d of m[4].matchAll(/<([0-9A-Fa-f]*)>/g)) { bf.set(lo + i, hexThanhChu(d[1])); i++; }
      }
    }
  }
  return { bf, soByte };
}

/** Bảng phông của MỘT trang: tên trong luồng (`/F1`) → bảng đổi mã. */
async function bangPhong(pdf, thanRes) {
  const ra = new Map();
  if (!thanRes) return ra;
  const dsFont = layTuDien(pdf, thanRes, 'Font');
  if (!dsFont) return ra;
  for (const m of dsFont.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+(\d+)\s+R/g)) {
    const oF = pdf.obj.get(parseInt(m[2], 10));
    if (!oF) continue;
    if (pdf.phongDaDoc.has(oF)) { ra.set(m[1], pdf.phongDaDoc.get(oF)); continue; }
    let bang = null;
    const ref = layKhoa(oF.than, 'ToUnicode');
    const oU = ref ? theoRef(pdf, ref) : null;
    if (oU) {
      const d = await docLuong(pdf, oU);
      if (d) bang = docCMap(latin1(d));
    }
    /* Không có `/ToUnicode` mà là phông 2 byte (Type0) thì mã KHÔNG đọc nổi —
       ghi nhận để trừ điểm, đừng trả rác trông giống chữ. */
    if (!bang) bang = { bf: new Map(), soByte: /\/Type0\b/.test(oF.than) ? 2 : 1, thieuBang: true };
    pdf.phongDaDoc.set(oF, bang);
    ra.set(m[1], bang);
  }
  return ra;
}

/* ==========================================================================
   4. Đọc luồng nội dung
   ========================================================================== */

/** Chuỗi tròn `( … )` → mảng byte. Xử đủ escape của PDF, kể cả `\251` bát phân
 *  và ngoặc lồng — thiếu một trong hai là chữ đứt giữa chừng. */
function docChuoiTron(s, i) {
  const ra = [];
  let d = 1;
  i++;
  while (i < s.length && d > 0) {
    const c = s[i];
    if (c === '\\') {
      const n = s[i + 1];
      if (n >= '0' && n <= '7') {
        let o = '', k = i + 1;
        while (k < s.length && o.length < 3 && s[k] >= '0' && s[k] <= '7') { o += s[k]; k++; }
        ra.push(parseInt(o, 8) & 0xFF); i = k; continue;
      }
      if (n === '\n') { i += 2; continue; }
      if (n === '\r') { i += 2; if (s[i] === '\n') i++; continue; }
      const bang = { n: 10, r: 13, t: 9, b: 8, f: 12 };
      ra.push(bang[n] !== undefined ? bang[n] : (n || '').charCodeAt(0) & 0xFF);
      i += 2; continue;
    }
    if (c === '(') { d++; ra.push(40); i++; continue; }
    if (c === ')') { d--; if (!d) { i++; break; } ra.push(41); i++; continue; }
    ra.push(c.charCodeAt(0) & 0xFF); i++;
  }
  return { byte: ra, ket: i };
}

/** Bỏ ký tự điều khiển (NUL, BEL, ESC…) khỏi một mẩu chữ vừa tra bảng ra.
 *  Giữ lại `\t` và `\n` vì hai thứ đó là bố cục thật. Trả chuỗi RỖNG nghĩa là
 *  "mã này không đọc được", để nơi gọi tính vào phần HỤT chứ không phải phần
 *  đọc được. */
function boKyTuDieuKhien(u) {
  if (u === undefined || u === null) return '';
  // eslint-disable-next-line no-control-regex
  return String(u).replace(new RegExp('[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', 'g'), '');
}

/** Mã trong phông → chữ. Đếm luôn số mã KHÔNG tra được, để nói ra tỉ lệ hụt. */
function giaiMa(byte, phong, dem) {
  if (phong && phong.bf && phong.bf.size) {
    const w = phong.soByte || 1;
    let ra = '';
    for (let k = 0; k + w <= byte.length; k += w) {
      let ma = 0;
      for (let q = 0; q < w; q++) ma = (ma << 8) | byte[k + q];
      /* ⚠️ VÁ REV-0055 · VỪA-1 — `NUL` KHÔNG PHẢI LÀ "ĐỌC ĐƯỢC".
         Bảng `/ToUnicode` của Skia ánh xạ con chữ nó không tra được sang
         `<0000>`, nên `bf.get(ma)` trả về chuỗi `"NUL"` — KHÁC `undefined`.
         Bản trước tính đó là đọc được: `ty_le_doc_duoc` khai 100% trong khi
         `S3Y0AXD0-0001` bóc ra thành `S3Y0AXD0␀0001` (đo được 4 và 8 ký tự NUL
         trên hai file thật), và ký tự rác ấy đi thẳng vào cột `noi_dung`,
         `tim_kiem`, rồi ra tới bản sao lưu CSV. Chỗ mất gần như luôn là DẤU
         GẠCH NỐI — mà số hiệu giấy tờ Việt Nam tờ nào cũng có gạch nối
         (`124/2026/GCN-ATTP`). Ngưỡng 80% ở dưới chỉ có nghĩa khi cái thước
         này đo đúng. */
      const u = boKyTuDieuKhien(phong.bf.get(ma));
      dem.tong++;
      if (!u) { dem.hut++; } else { dem.duoc++; ra += u; }
    }
    return ra;
  }
  /* KHÔNG có bảng đổi mã. Đọc như Latin-1 là đường DUY NHẤT còn lại, và nó
     MẤT DẤU tiếng Việt — đếm hết vào `hut` để `docChuTuPDF` hạ điểm và nói ra,
     chứ không lặng lẽ trả một đoạn chữ trông có vẻ đúng. */
  let ra = '';
  for (const x of byte) { ra += String.fromCharCode(x); dem.tong++; dem.hut++; }
  return ra;
}

/** Lấy toán hạng SỐ thứ `viTriTuCuoi` (đếm ngược từ cuối) của một lệnh cần
 *  `soToanHang` số. Trả `null` khi ngăn xếp không đủ số — thà không kết luận
 *  còn hơn kết luận trên một con số không có ở đó. */
function soCuoi(ngan, soToanHang, viTriTuCuoi) {
  const so = [];
  for (const t of ngan) if (t.so !== undefined) so.push(parseFloat(t.so));
  if (so.length < soToanHang) return null;
  const v = so[so.length - viTriTuCuoi];
  return Number.isFinite(v) ? v : null;
}

/** Luồng nội dung (đã xả nén) → chữ. Máy quét toán tử, không phải khớp regex:
 *  regex không phân biệt nổi `(` trong chuỗi với `(` mở chuỗi. */
function chuTuLuong(s, phongTheoTen, dem) {
  let i = 0, ra = '', phong = null;
  let yTruoc = null;                 // toạ độ y của `Tm` gần nhất — xem nhánh `Tm`
  const ngan = [];
  const n = s.length;
  const laNgat = (c) => c === undefined || /[\s/[\]<>(){}%]/.test(c);
  while (i < n) {
    const c = s[i];
    if (c === '%') { while (i < n && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
    if (c === '(') { const r = docChuoiTron(s, i); ngan.push({ b: r.byte }); i = r.ket; continue; }
    if (c === '<' && s[i + 1] === '<') {
      let d = 0;
      while (i < n) {
        if (s[i] === '<' && s[i + 1] === '<') { d++; i += 2; }
        else if (s[i] === '>' && s[i + 1] === '>') { d--; i += 2; if (!d) break; }
        else i++;
      }
      continue;
    }
    if (c === '<') {
      const j = s.indexOf('>', i);
      if (j < 0) break;
      ngan.push({ b: hexThanhByte(s.slice(i + 1, j)) }); i = j + 1; continue;
    }
    if (c === '[' || c === ']') { i++; continue; }
    if (c === '/') {
      let j = i + 1;
      while (j < n && !laNgat(s[j])) j++;
      ngan.push({ ten: s.slice(i + 1, j) }); i = j; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    let j = i;
    while (j < n && !laNgat(s[j])) j++;
    if (j === i) { i++; continue; }
    const tk = s.slice(i, j); i = j;
    if (tk === 'Tf') {
      for (let k = ngan.length - 1; k >= 0; k--) if (ngan[k].ten) { phong = phongTheoTen.get(ngan[k].ten) || null; break; }
      ngan.length = 0; continue;
    }
    if (tk === 'Tj' || tk === "'" || tk === '"') {
      for (let k = ngan.length - 1; k >= 0; k--) if (ngan[k].b) { ra += giaiMa(ngan[k].b, phong, dem); break; }
      if (tk !== 'Tj') ra += '\n';
      ngan.length = 0; continue;
    }
    if (tk === 'TJ') {
      /* ⚠️ DẤU CÁCH GIỮA CÁC TỪ THƯỜNG KHÔNG PHẢI MỘT KÝ TỰ.
         Công cụ tạo PDF hay bỏ hẳn ký tự trắng và thay bằng một số ÂM trong
         mảng `TJ` (đơn vị 1/1000 em) để đẩy con chữ sang phải. Bỏ qua con số
         đó thì chữ bóc ra dính liền thành "Hànhvitổchức" — mắt người vẫn đoán
         ra, nhưng ô tìm kiếm thì chết hẳn: gõ "hành vi" không bao giờ trúng.
         Khoảng nhảy nhỏ (< 120) là chỉnh nét giữa hai con chữ trong CÙNG một
         từ — thêm dấu cách ở đó lại cắt đôi từ, nên phải có ngưỡng. */
      for (const t of ngan) {
        if (t.b) { ra += giaiMa(t.b, phong, dem); continue; }
        const v = parseFloat(t.so);
        if (Number.isFinite(v) && v <= -120 && ra && !/\s$/.test(ra)) ra += ' ';
      }
      ngan.length = 0; continue;
    }
    /* ⚠️ VÁ REV-0055 · CHẶN-1 — `Td` KHÔNG PHẢI LÚC NÀO CŨNG LÀ XUỐNG DÒNG.
       `tx ty Td` dời gốc dòng đi (tx, ty). Khi `ty = 0` nó dời NGANG, vẫn trên
       CÙNG một dòng — và Chrome/Skia đặt TỪNG CON CHỮ bằng đúng khuôn đó
       (`<0176> Tj  4.76 0 Td  <01F8> Tj …`). Bản trước bỏ qua hẳn hai toán
       hạng và LUÔN chèn xuống dòng, nên mỗi con chữ thành một dòng: 4/8 file
       PDF có lớp chữ thật trên máy Sếp bóc ra `"I n v o i c e"`, tra cứu theo
       nội dung trả về 0 kết quả. Đo bằng bàn đo của Hồ Ly
       (`scripts/ho-ly-do-pdf-that.mjs`, đối chiếu `pdftotext`) — không phỏng đoán. */
    if (tk === 'Td' || tk === 'TD') {
      const ty = soCuoi(ngan, 2, 1);
      if (ty !== null && ty !== 0) ra += '\n';
      ngan.length = 0; continue;
    }
    /* `a b c d e f Tm` đặt THẲNG ma trận chữ; `f` là toạ độ y. Nhiều bộ sinh
       PDF (Chrome trong đó) mở mỗi dòng bằng một `Tm` chứ không bằng `Td`.
       Không đọc nó thì cả trang dính thành MỘT dòng dài — chữ vẫn tra được,
       nhưng người mở ra đọc thì không đọc nổi. So với y của `Tm` TRƯỚC: khác
       thì xuống dòng. Ngưỡng 0,5 để nhiễu làm tròn không đẻ ra dòng rỗng. */
    if (tk === 'Tm') {
      const y = soCuoi(ngan, 6, 1);
      if (y !== null) {
        if (yTruoc !== null && Math.abs(y - yTruoc) > 0.5) ra += '\n';
        yTruoc = y;
      }
      ngan.length = 0; continue;
    }
    if (tk === 'T*' || tk === 'ET') { ra += '\n'; ngan.length = 0; continue; }
    if (tk === 'BT' || tk === 'Q' || tk === 'q') { ngan.length = 0; continue; }
    ngan.push({ so: tk });
    if (ngan.length > 96) ngan.splice(0, 48);
    if (ra.length > TRAN_KY_TU) break;
  }
  return ra;
}

/* ==========================================================================
   5. Cửa duy nhất ra ngoài
   ========================================================================== */

/** Bao nhiêu phần trăm ký tự tra được bảng đổi mã. Dưới ngưỡng này thì phần
 *  chữ bóc ra không đáng tin cho tiếng Việt — nói thẳng thay vì trả rác. */
const NGUONG_DOC_DUOC = 0.80;
/** Dưới chừng này ký tự thì coi như file KHÔNG có lớp chữ. Một trang giấy A4
 *  có lớp chữ thật luôn vượt xa; vài chục ký tự lẻ thường là số trang hoặc
 *  dấu vết công cụ tạo file, không phải nội dung. */
const NGUONG_CO_CHU = 60;

/* ⚠️ CHỮ VỤN — VÁ REV-0055 · CHẶN-1, TẦNG HAI
   ---------------------------------------------------------------------------
   Sửa luật xuống dòng ở `chuTuLuong` là chữa BỆNH. Chốt này là để lần sau bệnh
   quay lại dưới hình dạng khác thì ERP vẫn KHÔNG dám khai "tra cứu được".

   Chữ vụn = chữ bị tách rời từng con (`"I n v o i c e"`). Nó trông như chữ,
   dài như chữ, đếm ký tự thì nhiều — nhưng gõ "invoice" vào ô tìm ra 0 kết
   quả. Cái nguy không phải chữ hỏng, mà là ERP KHÔNG BIẾT nó hỏng: nó dán nhãn
   tin cậy cao nhất lên rồi đếm vào tỉ lệ "tìm được theo nội dung" — đúng con
   số Sếp dùng để quyết định có phải đi chỉnh máy scan hay không.

   Đo bằng chính thứ người dùng gõ: TỪ. Đếm mẩu cách nhau bằng khoảng trắng;
   mẩu chỉ có MỘT ký tự thì không phải một từ tra cứu được.
   Ngưỡng 50% cố ý rộng tay: tiếng Việt có từ một chữ ("ở", "ê"), bảng biểu có
   cột số một chữ số — 50% thì văn bản thật không bao giờ chạm tới, mà chữ vụn
   thật (đo được: 100% mẩu một ký tự) thì không bao giờ thoát.
   Đòi ít nhất 20 mẩu để một dòng tiêu đề ngắn không bị kết tội oan. */
const NGUONG_MAU_MOT_KY_TU = 0.5;
const TOI_THIEU_MAU_DE_XET = 20;

/** Chữ này có bị tách rời từng ký tự không. Khai ở ĐÂY, dùng chung cho cả
 *  `docChuTuPDF` (hạ LOẠI của file) lẫn `docTinChu` ở `src/tai-lieu.js` (hạ
 *  NHÃN mỏ neo) — hai chỗ chặn, một định nghĩa. */
export function laChuVun(chu) {
  const mau = String(chu || '').trim().split(/\s+/).filter(Boolean);
  if (mau.length < TOI_THIEU_MAU_DE_XET) return false;
  let motKyTu = 0;
  for (const m of mau) if ([...m].length === 1) motKyTu++;
  return motKyTu / mau.length >= NGUONG_MAU_MOT_KY_TU;
}

/** Câu cho người thường khi gặp chữ vụn. KHÔNG nói "toán tử Td" — bạn kho đọc
 *  câu đó không làm được gì; nói đúng thứ họ quyết định được. */
export const CAU_CHU_VUN =
  'File này có chữ bên trong nhưng chữ bị rời rạc từng ký tự, nên tìm theo nội ' +
  'dung sẽ không ra. Tài liệu vẫn lưu nguyên bản và mở xem được bình thường, ' +
  'vẫn tra được bằng tên, số hiệu, loại giấy. Muốn tìm được cả theo nội dung ' +
  'thì quét lại bằng máy scan ở chế độ nhận dạng chữ.';

/**
 * Đọc chữ nằm sẵn trong PDF.
 * @returns {{loai:string, chu:string, trang:Array<{so:number,chu:string}>,
 *            so_trang:number, so_ky_tu:number, ty_le_doc_duoc:number,
 *            co_dau:boolean, ghi_chu:?string, bi_cat:boolean}}
 */
export async function docChuTuPDF(byteVao) {
  const rong = (loai, ghiChu) => ({
    loai, chu: '', trang: [], so_trang: 0, so_ky_tu: 0,
    ty_le_doc_duoc: 0, co_dau: false, ghi_chu: ghiChu, bi_cat: false
  });

  const lech = viTriChuKyPDF(byteVao);
  if (lech < 0) return rong(LOAI_PDF.khong_ro, CAU_LOAI.khong_ro);
  const byte = lech ? byteVao.subarray(lech) : byteVao;

  let S;
  try { S = latin1(byte); } catch { return rong(LOAI_PDF.khong_ro, CAU_LOAI.khong_ro); }

  /* File đặt mật khẩu: luồng bị mã hoá, xả ra chỉ có rác. Nhận ra SỚM và nói
     đúng bệnh — đoán mò "không có chữ" thì Sếp đi chỉnh máy scan vô ích. */
  if (/\/Encrypt\b/.test(S)) return rong(LOAI_PDF.khoa, CAU_LOAI.khoa);

  const pdf = { byte, obj: quetDoiTuong(S), daXa: 0, hetSuc: false, phongDaDoc: new Map() };
  try { await moObjStm(pdf); } catch { /* mất ObjStm thì đọc được tới đâu hay tới đó */ }

  /* ---- Danh sách trang, ĐÚNG THỨ TỰ đối tượng ------------------------- */
  const dsTrang = [];
  for (const [so, o] of pdf.obj) {
    if (/\/Type\s*\/Page(?![s\w])/.test(o.than)) dsTrang.push({ so, o });
  }
  dsTrang.sort((a, b) => a.so - b.so);
  const biCat = dsTrang.length > TRAN_TRANG_DOC;
  const doc = dsTrang.slice(0, TRAN_TRANG_DOC);

  const dem = { tong: 0, duoc: 0, hut: 0 };
  const trang = [];
  for (let i = 0; i < doc.length; i++) {
    const { o } = doc[i];
    let res = layTuDien(pdf, o.than, 'Resources');
    /* `/Resources` được thừa kế từ nút cha — trang không tự khai là chuyện
       thường, và bỏ qua chỗ này là mất sạch bảng phông của cả file. */
    let cha = o, sau = 0;
    while (!res && sau++ < 4) {
      const r = layKhoa(cha.than, 'Parent');
      cha = r ? theoRef(pdf, r) : null;
      if (!cha) break;
      res = layTuDien(pdf, cha.than, 'Resources');
    }
    const phong = await bangPhong(pdf, res);

    const nd = layKhoa(o.than, 'Contents');
    const dsND = [];
    if (nd) {
      for (const m of String(nd).matchAll(/(\d+)\s+(\d+)\s+R/g)) {
        const x = pdf.obj.get(parseInt(m[1], 10));
        if (x) dsND.push(x);
      }
    }
    let chu = '';
    for (const x of dsND) {
      const d = await docLuong(pdf, x);
      if (!d) continue;
      chu += chuTuLuong(latin1(d), phong, dem);
      if (chu.length > TRAN_KY_TU) break;
    }
    chu = chu.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (chu) trang.push({ so: i + 1, chu: chu.slice(0, TRAN_KY_TU) });
  }

  const chuGop = trang.map(t => t.chu).join('\n');
  const soChuThat = chuGop.replace(/\s/g, '').length;
  const tyLe = dem.tong ? dem.duoc / dem.tong : 0;
  const coDau = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(chuGop);

  if (soChuThat < NGUONG_CO_CHU) {
    return {
      ...rong(LOAI_PDF.chi_anh, CAU_LOAI.chi_anh),
      so_trang: dsTrang.length, bi_cat: biCat
    };
  }
  if (tyLe < NGUONG_DOC_DUOC) {
    /* Có chữ, nhưng đọc ra phần lớn là mã không tra được bảng. Trả CHỮ RÁC vào
       kho còn tệ hơn không trả gì — nó vào ô tìm và làm bẩn kết quả mãi mãi. */
    return {
      ...rong(LOAI_PDF.chi_anh,
        'File này có chữ bên trong nhưng ERP đọc ra không đủ rõ để tra cứu ' +
        `(${Math.round(tyLe * 100)}% ký tự đọc được). Tài liệu vẫn lưu và mở xem ` +
        'được, vẫn tra được bằng tên, số hiệu, loại giấy. Muốn tìm theo nội dung ' +
        'thì quét lại bằng máy scan ở chế độ nhận dạng chữ, hoặc chụp bằng máy ảnh.'),
      so_trang: dsTrang.length, so_ky_tu: soChuThat, ty_le_doc_duoc: tyLe, bi_cat: biCat
    };
  }
  /* ⚠️ CHỮ VỤN — VÁ REV-0055 · CHẶN-1 TẦNG HAI. Cùng lý lẽ với nhánh ngay
     trên: chữ tra không ra thì KHÔNG được khai là "tìm được theo nội dung".
     Ở đây còn nặng hơn vì chữ vụn KHÔNG trông giống rác — nó đầy đủ ký tự,
     đủ dấu, qua được mọi ngưỡng khác, nên không chặn ở đây thì không chỗ nào
     chặn nữa. Trả về `chi_anh` ⇒ `chu_nguon = 'khong'` ⇒ không lọt vào vế
     "tìm được theo nội dung" của dải đếm, và màn quét không in câu "TÌM ĐƯỢC
     theo nội dung bên trong". */
  if (laChuVun(chuGop)) {
    return {
      ...rong(LOAI_PDF.chi_anh, CAU_CHU_VUN),
      so_trang: dsTrang.length, so_ky_tu: soChuThat, ty_le_doc_duoc: tyLe, bi_cat: biCat
    };
  }

  return {
    loai: LOAI_PDF.co_lop_chu,
    chu: chuGop.slice(0, TRAN_KY_TU),
    trang,
    so_trang: dsTrang.length,
    so_ky_tu: soChuThat,
    ty_le_doc_duoc: tyLe,
    co_dau: coDau,
    bi_cat: biCat,
    ghi_chu: biCat
      ? `File dày ${dsTrang.length} trang — ERP đọc chữ của ${doc.length} trang đầu. ` +
        'Các trang sau vẫn nằm nguyên trong file và mở xem được, chỉ là không tìm ' +
        'được theo nội dung.'
      : null
  };
}

/** SỐ TRANG — dùng đúng mục lục đối tượng đã dựng, không đếm chuỗi thô.
 *  Trả 0 khi không đếm được: đoán bừa "1 trang" cho bản scan 30 trang là nói
 *  dối vào đúng cột người ta dùng để đối chiếu với xấp giấy. */
export async function demTrangPDFThat(byteVao) {
  const lech = viTriChuKyPDF(byteVao);
  if (lech < 0) return 0;
  const byte = lech ? byteVao.subarray(lech) : byteVao;
  const S = latin1(byte);
  const pdf = { byte, obj: quetDoiTuong(S), daXa: 0, hetSuc: false, phongDaDoc: new Map() };
  try { await moObjStm(pdf); } catch { /* kệ */ }
  let n = 0;
  for (const o of pdf.obj.values()) if (/\/Type\s*\/Page(?![s\w])/.test(o.than)) n++;
  if (n) return n;
  let lonNhat = 0;
  for (const m of S.matchAll(/\/Count\s+(\d+)/g)) {
    const v = parseInt(m[1], 10);
    if (Number.isFinite(v) && v > lonNhat) lonNhat = v;
  }
  return lonNhat;
}
