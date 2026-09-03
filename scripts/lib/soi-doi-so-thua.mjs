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

/** Bóc chú thích + chuỗi thành khoảng trắng, giữ nguyên số dòng. */
export function lamSachMa(s) {
  let r = '', i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i], c2 = s[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && s[i] !== '\n') { r += ' '; i++; } continue; }
    if (c === '/' && c2 === '*') {
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) { r += s[i] === '\n' ? '\n' : ' '; i++; }
      r += '  '; i += 2; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; r += ' '; i++;
      while (i < n && s[i] !== q) {
        if (s[i] === '\\') { r += '  '; i += 2; continue; }
        r += s[i] === '\n' ? '\n' : ' '; i++;
      }
      r += ' '; i++; continue;
    }
    r += c; i++;
  }
  return r;
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
