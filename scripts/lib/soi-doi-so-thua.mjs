/* ==========================================================================
   SOI LỚP "ĐỐI SỐ RƠI VÀO HƯ KHÔNG"
   ---------------------------------------------------------------------------
   REV-0057 · L2. Hai tuỳ chọn `{ goc: … }` bị truyền vào nhầm chỗ — một cái
   thành `thisArg` của `Array.prototype.filter`, một cái thành tham số THỨ TƯ
   của `veBang` (hàm chỉ nhận ba). Cả hai **vô tác dụng** và **không kêu một
   tiếng nào**: không nổ, không log, chỉ là tính năng lặng lẽ không chạy.

   Lớp lỗi này nguy hiểm đúng vì nó im. Nên phải có máy soi, không trông vào
   mắt người đọc lại bản vá.

   NGUYÊN TẮC KHÔNG BÁO OAN: chỉ kết luận với những cái tên được khai ĐÚNG MỘT
   LẦN trong tệp. Repo này có nhiều hàm trùng tên ở các phạm vi khác nhau
   (`taiLai`, `nap`, `veNut`…) — tên trùng thì không ai biết chỗ gọi đang trỏ
   vào cái nào, mà bàn đo báo oan là bàn đo sẽ bị tắt.
   ========================================================================== */

/* Ký tự CÓ NGHĨA gần nhất trước dấu `/` quyết định đó là REGEX hay phép chia.
   Sau `( , = : [ ! & | ? { } ; return typeof …` thì `/` mở một regex; sau tên
   biến, số, `)` hay `]` thì nó là phép chia. */
const TRUOC_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const TU_KHOA_TRUOC_REGEX = /(^|[^\w$.])(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;

/**
 * Bóc chú thích + chuỗi + REGEX LITERAL thành khoảng trắng, giữ nguyên số dòng.
 *
 * VÌ SAO PHẢI HIỂU REGEX (REV-0057 vòng 2 · VỪA-1). Bản đầu coi mọi dấu nháy
 * là mở chuỗi, nên gặp `/[&<>"']/g` (quet-tai-lieu.js) thì hai dấu nháy TRONG
 * regex mở một "chuỗi" không bao giờ đóng — và từ đó tới cuối tệp bị xoá
 * trắng: 244 dòng mã của `quet-tai-lieu.js`, 107 dòng của `app.js`, mất 18/318
 * hàm khỏi bảng số tham số. Hồ Ly gài lỗi vào vùng mù đó thì máy soi không
 * thấy gì. Một máy soi mù im lặng còn tệ hơn không có máy soi, vì nó làm người
 * ta ngừng nhìn bằng mắt.
 */
export function lamSachMa(s) {
  return bocMa(s, true);
}

/** Chỉ bóc CHÚ THÍCH (giữ nguyên chuỗi/regex) — dùng cho chốt tự kiểm. */
export function bocChuThich(s) {
  return bocMa(s, false);
}

/* Máy trạng thái có NGĂN XẾP. Phải có ngăn xếp vì repo này lồng chuỗi mẫu
   nhiều tầng, thí dụ `app.js:461`:
       `…${n.ma_nv ? ` <span>· ${esc(n.ma_nv)}</span>` : ''}…`
   Bản trước coi mọi dấu huyền là đóng chuỗi, nên dấu huyền BÊN TRONG `${…}`
   đóng nhầm chuỗi ngoài và mọi thứ lệch pha từ đó tới cuối tệp (39 dòng mã bị
   xoá oan ở `app.js`). Giữ NGUYÊN mã bên trong `${…}`: đó là mã thật, có lời
   gọi hàm thật, bỏ đi là tự tạo vùng mù mới. */
function bocMa(s, bocCaChuoi) {
  const n = s.length;
  let r = '', i = 0;
  // khung: { loai: 'ma' | 'mau', ngoac } — 'mau' = đang trong chuỗi mẫu
  const ngan = [{ loai: 'ma', ngoac: 0, tuNoiSuy: false }];
  const dinh = () => ngan[ngan.length - 1];
  /* `an(k)` = thay k ký tự bằng khoảng trắng (giữ nguyên dấu xuống dòng).
     `giu(k)` = chép nguyên. Chú thích thì LUÔN `an`; chuỗi/regex thì `an` hay
     `giu` tuỳ `bocCaChuoi` — nhưng đường đi của máy trạng thái GIỐNG HỆT nhau
     ở cả hai chế độ. Đó là điểm mấu chốt: chốt tự kiểm so hai bản, nên hai
     bản phải cùng một cách hiểu mã, chỉ khác chỗ in ra. */
  const an = (k) => { r += s.slice(i, i + k).replace(/[^\n]/g, ' '); i += k; };
  const giu = (k) => { r += s.slice(i, i + k); i += k; };
  const chuoi = bocCaChuoi ? an : giu;

  while (i < n) {
    const k = dinh();
    const c = s[i], c2 = s[i + 1];

    if (k.loai === 'mau') {                       // ---- đang trong chuỗi mẫu
      if (c === '\\') { chuoi(2); continue; }
      if (c === '`') { chuoi(1); ngan.pop(); continue; }
      if (c === '$' && c2 === '{') { chuoi(2); ngan.push({ loai: 'ma', ngoac: 0, tuNoiSuy: true }); continue; }
      if (c === '\n') { r += '\n'; i++; continue; }
      chuoi(1); continue;
    }

    // ---- đang trong mã
    if (c === '/' && c2 === '/') { while (i < n && s[i] !== '\n') an(1); continue; }
    if (c === '/' && c2 === '*') {
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\n') { r += '\n'; i++; } else an(1); }
      an(Math.min(2, n - i)); continue;
    }
    if (c === '"' || c === "'") {
      const q = c; chuoi(1);
      while (i < n && s[i] !== q && s[i] !== '\n') {
        if (s[i] === '\\') { chuoi(2); continue; }
        chuoi(1);
      }
      if (i < n && s[i] === q) chuoi(1);
      continue;
    }
    if (c === '`') { chuoi(1); ngan.push({ loai: 'mau', ngoac: 0 }); continue; }
    if (c === '/' && laRegex(lamSachDe(r))) {
      const batDau = i;
      let j = i + 1, trongNgoacVuong = false, dong = false;
      while (j < n && s[j] !== '\n') {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '[') trongNgoacVuong = true;
        else if (s[j] === ']') trongNgoacVuong = false;
        else if (s[j] === '/' && !trongNgoacVuong) { dong = true; break; }
        j++;
      }
      /* KHÔNG đóng trên cùng dòng = đoán sai, đó là phép chia. Coi như ký tự
         thường. Bản trước nuốt tới hết dòng rồi nuốt luôn dấu XUỐNG DÒNG —
         lệch số dòng, và mọi địa chỉ máy soi in ra đều sai. */
      if (!dong) { r += c; i++; continue; }
      j++;                                                   // qua dấu `/` đóng
      while (j < n && /[a-z]/.test(s[j])) j++;                // cờ g i m s u y d
      chuoi(j - batDau); continue;
    }
    if (c === '{') { k.ngoac++; r += c; i++; continue; }
    if (c === '}') {
      if (k.tuNoiSuy && k.ngoac === 0) { chuoi(1); ngan.pop(); continue; }   // hết `${…}`
      if (k.ngoac > 0) k.ngoac--;
      r += c; i++; continue;
    }
    r += c; i++;
  }
  return r;
}

/* Ở chế độ GIỮ chuỗi, phần đã ghi ra còn nguyên dấu nháy, nên `laRegex` nhìn
   ngược có thể trúng một ký tự nằm trong chuỗi. Cắt đuôi chuỗi/khoảng trắng
   cho phép đoán regex nhìn đúng ký tự mã cuối cùng. */
function lamSachDe(r) {
  return r.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1\s*$/, 'X');
}

/** Nhìn ngược phần ĐÃ BÓC để đoán `/` sắp tới là regex hay phép chia. */
function laRegex(daBoc) {
  const truoc = daBoc.replace(/\s+$/, '');
  if (!truoc) return true;                       // đầu tệp / đầu dòng
  const ch = truoc[truoc.length - 1];
  if (TRUOC_REGEX.has(ch)) return true;
  return TU_KHOA_TRUOC_REGEX.test(truoc);
}

/**
 * CHỐT TỰ KIỂM cho `lamSachMa` (REV-0057 vòng 2 · VỪA-1). Trả về danh sách
 * dòng bị BÓC TRẮNG oan: bản gốc còn mã thật (`function` / `const` / `=>`)
 * mà bản đã bóc thì trắng trơn. Phải luôn RỖNG — có dòng nào là máy soi đang
 * mù đúng chỗ nó phải nhìn, và mù im lặng.
 */
export function soiDongBiXoaOan(src) {
  const goc = src.split(/\r?\n/);
  const sach = lamSachMa(src).split(/\r?\n/);
  /* So với bản CHỈ bóc chú thích. Dòng nào bản đó cũng trắng thì đó là chú
     thích thật — trắng là đúng. Dòng nào bản đó CÒN CHỮ mà bản đầy đủ lại
     trắng thì máy soi đang nuốt mã thật. So kiểu này không phải đoán bằng
     dấu `//` hay `*` ở đầu dòng nữa (chú thích JSDoc `@param …` không có dấu
     nào ở đầu, bản trước chấm oan đúng vì thế). */
  const chiChuThich = bocChuThich(src).split(/\r?\n/);
  const bao = [];
  /* Số dòng phải khớp TUYỆT ĐỐI. Lệch một dòng là mọi số dòng máy soi in ra
     đều trỏ sai chỗ — hỏng còn tệ hơn im. */
  if (sach.length !== goc.length) {
    bao.push({ ln: 0, ma: `LỆCH SỐ DÒNG: gốc ${goc.length} · sau khi bóc ${sach.length}` });
    return bao;
  }
  for (let i = 0; i < goc.length; i++) {
    if ((sach[i] || '').trim() !== '') continue;
    const conChu = (chiChuThich[i] || '').replace(/['"`]/g, '').trim();
    if (!conChu) continue;                       // chú thích thật, trắng là đúng
    if (!/[A-Za-z0-9_$][\s]*\(|=>|\b(function|const|let|var|return)\b/.test(conChu)) continue;
    bao.push({ ln: i + 1, ma: (goc[i] || '').trim().slice(0, 80) });
  }
  return bao;
}

/** Đếm đối số ở MỨC NGOÀI CÙNG trong một cặp ngoặc đã bóc sạch chuỗi. */
function demDoiSo(chuoi) {
  const t = chuoi.trim();
  if (!t) return { so: 0, rest: false };
  let sau = 0, so = 1;
  const rest = /\.\.\./.test(t);
  for (const ch of t) {
    if ('([{'.includes(ch)) sau++;
    else if (')]}'.includes(ch)) sau--;
    else if (ch === ',' && sau === 0) so++;
  }
  return { so, rest };
}

/**
 * Trả về danh sách chỗ gọi truyền NHIỀU đối số hơn hàm nhận.
 * @param {string} src mã nguồn JavaScript
 * @returns {{ten:string, ln:number, truyen:number, nhan:number, khaiO:number, ma:string}[]}
 */
export function soiDoiSoThua(src) {
  const sach = lamSachMa(src);
  const dong = src.split(/\r?\n/);
  const viTriDong = (idx) => sach.slice(0, idx).split('\n').length;

  /* ---- ① Bảng số tham số của hàm khai trong tệp ---- */
  const arity = new Map();
  const MAU = [
    /\bfunction\s+([A-Za-z0-9_$]+)\s*\(/g,
    /\bconst\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g,
    /\bconst\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?function\s*[A-Za-z0-9_$]*\s*\(/g
  ];
  for (const re of MAU) {
    for (const m of sach.matchAll(re)) {
      const mo = sach.indexOf('(', m.index + m[0].length - 1);
      let sau = 0, j = mo;
      for (; j < sach.length; j++) {
        if (sach[j] === '(') sau++;
        else if (sach[j] === ')') { sau--; if (!sau) break; }
      }
      const { so, rest } = demDoiSo(sach.slice(mo + 1, j));
      const cu = arity.get(m[1]);
      if (cu) { cu.nhieu = true; if (so > cu.so) cu.so = so; if (rest) cu.rest = true; }
      else arity.set(m[1], { so, rest, dong: viTriDong(m.index) });
    }
  }

  /* Tên được khai nhiều hơn một lần dưới BẤT KỲ dạng nào (kể cả làm tham số)
     thì mỗi chỗ gọi là một phạm vi khác — không kết luận. */
  for (const [ten, v] of arity) {
    const re = new RegExp(
      `\\b(?:const|let|var)\\s+${ten}\\b|\\bfunction\\s+${ten}\\s*\\(|[(,]\\s*${ten}\\s*[,)=]`, 'g');
    if ((sach.match(re) || []).length > 1) v.nhieu = true;
  }

  /* ---- ② Chỗ gọi ---- */
  const TU_KHOA = ['function', 'if', 'for', 'while', 'switch', 'catch', 'return',
                   'typeof', 'await', 'new', 'delete', 'void', 'do', 'else'];
  const bao = [];
  for (const m of sach.matchAll(/(?<![.\w$])([A-Za-z0-9_$]+)\s*\(/g)) {
    const ten = m[1];
    const a = arity.get(ten);
    if (!a || a.rest || a.nhieu || TU_KHOA.includes(ten)) continue;
    if (/\b(function|const|let|var)\s+$/.test(sach.slice(Math.max(0, m.index - 12), m.index))) continue;
    const mo = m.index + m[0].length - 1;
    let sau = 0, j = mo;
    for (; j < sach.length; j++) {
      if ('([{'.includes(sach[j])) sau++;
      else if (')]}'.includes(sach[j])) { sau--; if (!sau) break; }
    }
    if (j >= sach.length) continue;
    const { so } = demDoiSo(sach.slice(mo + 1, j));
    if (so > a.so) {
      const ln = viTriDong(m.index);
      bao.push({ ten, ln, truyen: so, nhan: a.so, khaiO: a.dong, ma: (dong[ln - 1] || '').trim().slice(0, 90) });
    }
  }
  return bao;
}
