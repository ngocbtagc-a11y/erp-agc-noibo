/* ==========================================================================
   ĐO SỐ ĐỎ TRÊN BIỂU TƯỢNG ERP (thanh tác vụ Windows, kiểu Zalo)
   ---------------------------------------------------------------------------
   Chạy:  node scripts/do-so-do-bieu-tuong.mjs        (npm run do-so-do)

   YÊU CẦU GỐC — Sếp Ngọc 29/08/2026, chỉ vào biểu tượng Zalo có số đỏ trên
   thanh tác vụ: *"Nếu tao dùng desktop thì hiện thông báo như này nè, để không
   bị miss tin nhắn"*.

   ĐO THẬT, KHÔNG KHỚP CHUỖI (BH-34). Bàn này KHÔNG chép lại logic rồi tự khen:
     · nạp CHÍNH `public/assets/js/so-do-bieu-tuong.js` mà `app.js` đang dùng;
     · nạp CHÍNH `public/sw.js` đang chạy thật, bằng cách dựng một bề mặt
       `self` giả rồi cho tệp đó tự đăng ký handler của nó — tức là đo đúng mã
       sẽ chạy trên máy chị Lan, không phải một bản tóm tắt.

   ĐO NHỮNG GÌ (đúng danh sách Sếp giao)
     A. Con số: 0 · 1 · 5 · 99 · HƠN 99 — số trên biểu tượng KHỚP số đỏ trong ERP.
     B. Đọc xong thì XOÁ số (mở cửa sổ chat = đang đọc = 0).
     C. Nhận tin đẩy khi ERP ĐÓNG HẲN → số đỏ hiện đúng số chưa đọc THẬT.
     D. ERP đang mở → SW KHÔNG gọi máy chủ (0 lượt đọc D1 thừa, 1 chỗ ghi số).
     E. Trình duyệt/máy KHÔNG hỗ trợ → 0 lỗi console, 0 promise văng ra.
     F. Dải nhắc cài: 1 lần · bỏ qua là thôi hẳn · điện thoại không hiện.

   CA ĐỐI CHỨNG (BH-16) — mỗi phép đo có một bản BỊ GỠ CƠ HỌC phải TRƯỢT:
     ① bản QUÊN XOÁ SỐ khi đã đọc          → phép đo B phải bắt được
     ② bản GỠ chốt "không hỗ trợ"          → phép đo E phải bắt được
     ③ bản GỠ chốt "đã bỏ qua"             → phép đo F phải bắt được
     ④ bản GỠ chốt "ERP đang mở" trong SW  → phép đo D phải bắt được
   Bản gỡ mà vẫn "đạt" thì phép đo là đồ trang trí.
   ========================================================================== */

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON = path.join(GOC, 'public', 'assets', 'js', 'so-do-bieu-tuong.js');
const SW = path.join(GOC, 'public', 'sw.js');
const APP_JS = path.join(GOC, 'public', 'assets', 'js', 'app.js');
const APP_HTML = path.join(GOC, 'public', 'app.html');

let dat = 0, truot = 0;
function ok(ten, dung, chiTiet = '') {
  if (dung) { dat++; console.log(`  ✅ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
  else { truot++; console.log(`  ❌ ${ten}${chiTiet ? ' — ' + chiTiet : ''}`); }
}

const nap = (duong) => import('file://' + duong.replace(/\\/g, '/') + '?v=' + Date.now());

/* ---- Bề mặt `navigator` giả: đúng những gì Badging API có ---------------- */
function navGia({ coApi = true, nem = false, tuChoi = false } = {}) {
  const nhatKy = [];
  if (!coApi) return { nhatKy };
  return {
    nhatKy,
    setAppBadge(n) {
      nhatKy.push(['dat', n]);
      if (nem) throw new Error('Edge cũ: chưa cài app');
      return tuChoi ? Promise.reject(new Error('hệ điều hành từ chối')) : Promise.resolve();
    },
    clearAppBadge() {
      nhatKy.push(['xoa', null]);
      if (nem) throw new Error('Edge cũ: chưa cài app');
      return tuChoi ? Promise.reject(new Error('hệ điều hành từ chối')) : Promise.resolve();
    }
  };
}

/* ---- Nạp CHÍNH `public/sw.js` với một bề mặt trình duyệt giả -------------
   Tệp thật tự gọi `self.addEventListener(...)` lúc nạp; ta thu lại handler và
   trả luôn `datSoDoBieuTuong` để gọi thẳng. Không sửa một ký tự nào của nó. */
function napSW(maSW, { navigator: nv, tabs = [], traLoi = { ok: true, so_luong: 0 } } = {}) {
  const nhatKyFetch = [];
  const tb = [];   // thông báo đã hiện
  const self_ = {
    navigator: nv,
    addEventListener(ten, fn) { (self_._h ||= {})[ten] = fn; },
    clients: {
      matchAll: async () => tabs.map((u) => ({ url: u, focus: async () => {}, postMessage() {} })),
      claim: async () => {}, openWindow: async () => {}
    },
    registration: {
      showNotification: async (t, o) => { tb.push([t, o]); }
    },
    skipWaiting() {}
  };
  const fetchGia = async (u, o) => {
    nhatKyFetch.push([u, o]);
    return {
      ok: traLoi.ok !== false,
      status: traLoi.ok === false ? 401 : 200,
      json: async () => ({ so_luong: traLoi.so_luong })
    };
  };
  const caches_ = { keys: async () => [], delete: async () => {} };
  // eslint-disable-next-line no-new-func
  const tao = new Function('self', 'fetch', 'caches',
    maSW + '\n; return { datSoDoBieuTuong, _h: self._h };');
  const r = tao(self_, fetchGia, caches_);
  return { ...r, nhatKyFetch, tb, self_ };
}

/* ĐỌC MÃ NGUỒN LUÔN QUY VỀ `\n` — 29/08/2026, lượt gộp `main` vào
   feature/ctl-0026-kho-tai-lieu.
   Máy này để `core.autocrlf=true`, nên MỌI tệp git lấy ra đều mang `\r\n`.
   Ca đối chứng ② tìm bằng `/\n  \}\n/` — trên `\r\n` thì KHÔNG KHỚP, phép gỡ
   không gỡ được gì, và bàn đo tự khai TRƯỢT 1. Đã chứng minh: nội dung tệp
   trên ổ đĩa giống HỆT blob `origin/main` sau khi bỏ `\r` — sai lệch DUY
   NHẤT là ký tự xuống dòng, không phải mã.
   Đây là lỗi của PHÉP ĐO, không phải của mã: bất kỳ ai `git clone` trên
   Windows cũng gặp. Quy về `\n` ngay tại chỗ đọc để mọi regex phía sau chỉ
   phải biết một dạng xuống dòng. */
const docMa = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

async function chay() {
  const M = await nap(NGUON);
  const maSW = docMa(SW);
  const maApp = docMa(APP_JS);
  const html = docMa(APP_HTML);

  /* ==== A · CON SỐ — số trên biểu tượng KHỚP số đỏ trong ERP ============== */
  console.log('\nA · CON SỐ TRÊN BIỂU TƯỢNG KHỚP SỐ ĐỎ TRONG ERP');
  const CA_SO = [
    // [chưa đọc, đang mở chat, số đưa cho biểu tượng, chữ trong huy hiệu ERP]
    [0, false, 0, ''],
    [1, false, 1, '1'],
    [5, false, 5, '5'],
    [99, false, 99, '99'],
    [100, false, 100, '99+'],
    [250, false, 250, '99+']
  ];
  for (const [n, mo, mongSo, mongChu] of CA_SO) {
    const so = M.soDoHienThi(n, mo);
    const chu = M.chuHuyHieu(so);
    ok(`chưa đọc ${n} → biểu tượng ${mongSo}, huy hiệu "${mongChu}"`,
      so === mongSo && chu === mongChu, `được ${so} / "${chu}"`);
  }
  ok('HƠN 99: biểu tượng nhận SỐ THẬT (trình duyệt tự cắt), KHÔNG bị ta bóp về 99',
    M.soDoHienThi(250, false) === 250);
  ok('rác (null / NaN / âm) → 0, không ném',
    M.soDoHienThi(null) === 0 && M.soDoHienThi(NaN) === 0 && M.soDoHienThi(-3) === 0);

  /* ==== B · ĐỌC XONG LÀ XOÁ ============================================== */
  console.log('\nB · ĐỌC XONG → SỐ VỀ 0 VÀ BIẾN MẤT');
  ok('mở cửa sổ chat (đang đọc) → 0 dù máy chủ còn báo 7 chưa đọc',
    M.soDoHienThi(7, true) === 0);
  {
    const nv = navGia();
    M.datSoDo(M.soDoHienThi(7, true), nv);
    ok('… và lệnh phát ra là XOÁ, không phải đặt số 0',
      nv.nhatKy.length === 1 && nv.nhatKy[0][0] === 'xoa', JSON.stringify(nv.nhatKy));
  }
  {
    const nv = navGia();
    M.datSoDo(M.soDoHienThi(5, false), nv);
    ok('còn 5 chưa đọc, chat đóng → ĐẶT số 5',
      nv.nhatKy.length === 1 && nv.nhatKy[0][0] === 'dat' && nv.nhatKy[0][1] === 5,
      JSON.stringify(nv.nhatKy));
  }

  /* ==== C+D · SERVICE WORKER: ERP ĐÓNG HẲN / ĐANG MỞ ===================== */
  console.log('\nC · NHẬN TIN ĐẨY KHI ERP ĐÓNG HẲN → SỐ ĐỎ ĐÚNG SỐ CHƯA ĐỌC');
  for (const n of [0, 1, 5, 99, 150]) {
    const nv = navGia();
    const sw = napSW(maSW, { navigator: nv, tabs: [], traLoi: { so_luong: n } });
    await sw.datSoDoBieuTuong();
    const mong = n > 0 ? [['dat', n]] : [['xoa', null]];
    ok(`ERP đóng · máy chủ báo ${n} chưa đọc → ${n > 0 ? 'đặt ' + n : 'xoá số'}`,
      JSON.stringify(nv.nhatKy) === JSON.stringify(mong), JSON.stringify(nv.nhatKy));
  }
  {
    const nv = navGia();
    const sw = napSW(maSW, { navigator: nv, tabs: [], traLoi: { so_luong: 3 } });
    await sw.datSoDoBieuTuong();
    ok('SW hỏi ĐÚNG `/api/chat/chua-doc` (cùng nguồn số với huy hiệu ERP — không đếm riêng)',
      sw.nhatKyFetch.length === 1 && sw.nhatKyFetch[0][0] === '/api/chat/chua-doc');
    ok('… và đính cookie phiên (`credentials: same-origin`)',
      sw.nhatKyFetch[0][1]?.credentials === 'same-origin');
  }
  {
    const nv = navGia();
    const sw = napSW(maSW, { navigator: nv, tabs: [], traLoi: { ok: false } });
    await sw.datSoDoBieuTuong();
    ok('hết phiên (401) → KHÔNG đoán bừa một con số lên biểu tượng',
      nv.nhatKy.length === 0);
  }
  {
    // Cú push thật: cả thông báo LẪN số đỏ, không cái nào nuốt cái nào.
    const nv = navGia();
    const sw = napSW(maSW, { navigator: nv, tabs: [], traLoi: { so_luong: 4 } });
    let cho = null;
    await sw._h.push({
      data: { json: () => ({ tieu_de: '💬 Anh Duy', than: 'Gửi bạn một tin nhắn mới', loai: 'chat', nguoi_gui_id: 'nsduy' }) },
      waitUntil: (p) => { cho = p; }
    });
    await cho;
    ok('một cú PUSH → vừa hiện thông báo VỪA đặt số đỏ',
      sw.tb.length === 1 && JSON.stringify(nv.nhatKy) === JSON.stringify([['dat', 4]]),
      `${sw.tb.length} thông báo · ${JSON.stringify(nv.nhatKy)}`);
  }

  console.log('\nD · ERP ĐANG MỞ → SW KHÔNG ĐẺ THÊM LƯỢT ĐỌC D1');
  {
    const nv = navGia();
    const sw = napSW(maSW, { navigator: nv, tabs: ['https://erp/app.html'], traLoi: { so_luong: 9 } });
    await sw.datSoDoBieuTuong();
    ok('có tab /app.html đang mở → 0 lượt gọi máy chủ (app.js đã lo, 1 chỗ ghi số duy nhất)',
      sw.nhatKyFetch.length === 0, `${sw.nhatKyFetch.length} lượt`);
  }
  {
    const nv = navGia({ coApi: false });
    const sw = napSW(maSW, { navigator: nv, tabs: [], traLoi: { so_luong: 9 } });
    await sw.datSoDoBieuTuong();
    ok('trình duyệt không có Badging API → 0 lượt gọi máy chủ (không tốn hạn mức vô ích)',
      sw.nhatKyFetch.length === 0);
  }

  /* ==== E · HỎNG ÊM — CỔNG KHÓI PHẢI XANH ================================ */
  console.log('\nE · KHÔNG HỖ TRỢ → HỎNG ÊM, 0 LỖI CONSOLE');
  {
    const loi = [];
    const cuE = console.error, cuW = console.warn;
    console.error = (...a) => loi.push(a.join(' '));
    console.warn = (...a) => loi.push(a.join(' '));
    const vangRa = [];
    const bat = (e) => vangRa.push(String(e?.reason || e));
    process.on('unhandledRejection', bat);
    let ketQua = [];
    try {
      ketQua = [
        M.datSoDo(5, navGia({ coApi: false })),      // Firefox / Safari / chưa cài app
        M.datSoDo(0, navGia({ coApi: false })),
        M.datSoDo(5, null),                          // không có navigator (SSR, test)
        M.datSoDo(5, navGia({ nem: true })),         // Edge cũ ném đồng bộ
        M.datSoDo(5, navGia({ tuChoi: true }))       // hệ điều hành từ chối vẽ (Promise reject)
      ];
      await new Promise((r) => setImmediate(r));      // cho promise kịp văng nếu có
    } finally {
      console.error = cuE; console.warn = cuW;
      process.off('unhandledRejection', bat);
    }
    ok('không hỗ trợ / ném / bị từ chối → KHÔNG ném ra ngoài, trả {lam:false} hoặc bắt gọn',
      ketQua.length === 5 && ketQua[0].lam === false && ketQua[0].ly_do === 'khong_ho_tro' &&
      ketQua[2].lam === false && ketQua[3].lam === false && ketQua[3].ly_do === 'nem_loi');
    ok('0 dòng console.error / console.warn (cổng khói coi 1 dòng là TRƯỢT)',
      loi.length === 0, loi.join(' | '));
    ok('0 promise văng ra không ai bắt', vangRa.length === 0, vangRa.join(' | '));
  }
  {
    const nv = navGia({ coApi: false });
    const sw = napSW(maSW, { navigator: nv, tabs: [] });
    let nem = null;
    try { await sw.datSoDoBieuTuong(); } catch (e) { nem = e; }
    ok('SW trên máy không hỗ trợ → không ném', nem === null);
  }

  /* ==== F · DẢI NHẮC CÀI ERP LÊN MÁY ===================================== */
  console.log('\nF · DẢI NHẮC CÀI ERP LÊN MÁY');
  const CA_NHAC = [
    ['máy tính · cài được · chưa bỏ qua → HIỆN',
      { coSuKienCai: true }, true],
    ['bấm "Bỏ qua" rồi → KHÔNG hỏi lại',
      { coSuKienCai: true, daBoQua: true }, false],
    ['ĐIỆN THOẠI → không hiện (ở đó đã có thông báo đẩy)',
      { coSuKienCai: true, laDienThoai: true }, false],
    ['đã cài ERP rồi → không hiện',
      { coSuKienCai: true, daCaiRoi: true }, false],
    ['trình duyệt không cài được (Firefox/Safari) → không hiện',
      { coSuKienCai: false }, false]
  ];
  for (const [ten, mt, mong] of CA_NHAC) {
    const r = M.nenNhacCai(mt);
    ok(ten, r.hien === mong, r.ly_do);
  }
  ok('câu chữ nói ĐÚNG cái được lợi ("số tin mới ngay trên biểu tượng"), không phải "cài ứng dụng" chung chung',
    /số tin mới/i.test(M.CHU_NHAC_CAI) && /biểu tượng/i.test(M.CHU_NHAC_CAI) &&
    !/^Cài ứng dụng/i.test(M.CHU_NHAC_CAI), M.CHU_NHAC_CAI);
  ok('dải có mặt trong app.html, mặc định `hidden`, có nút "Bỏ qua"',
    /id="daiCaiMay"[^>]*hidden/.test(html) && /id="daiCaiMayBoQua"/.test(html));
  ok('bấm "Bỏ qua" ghi nhớ vào localStorage → tải lại trang cũng không hỏi lại',
    new RegExp(`localStorage\\.setItem\\(KHOA_BO_QUA`).test(maApp));

  /* ==== G · MỘT NGUỒN SỐ DUY NHẤT (soi mã thật) ========================== */
  console.log('\nG · MỘT NGUỒN SỐ DUY NHẤT');
  // Chỉ đếm LỆNH GỌI THẬT (`.setAppBadge(`), không đếm chữ trong chú thích.
  const soLanGoiTrongApp = (maApp.match(/\.\s*(setAppBadge|clearAppBadge)\s*\(/g) || []).length;
  ok('`app.js` KHÔNG tự gọi setAppBadge ở đâu cả — chỉ đi qua `datSoDo()` trong `veBadge()`',
    soLanGoiTrongApp === 0, `${soLanGoiTrongApp} lần gọi thẳng`);
  ok('`veBadge()` lấy số từ `soDoHienThi` và vẽ chữ bằng `chuHuyHieu` (một gốc số)',
    /function veBadge\(\)[\s\S]{0,400}soDoHienThi\(chuaDoc, dangMo\)[\s\S]{0,400}chuHuyHieu\(so\)[\s\S]{0,200}datSoDo\(so\)/.test(maApp));
  ok('`sw.js` KHÔNG tự cộng dồn / không nhớ số riêng (không dùng IndexedDB, không biến đếm)',
    !/indexedDB|badgeDem|soDem\s*\+\+/.test(maSW));

  /* ==== BH-16 · CA ĐỐI CHỨNG ============================================= */
  console.log('\nBH-16 · CA ĐỐI CHỨNG — bản BỊ GỠ phải TRƯỢT');
  await doiChungModule(M);
  await doiChungSW(maSW);

  console.log('\n' + '='.repeat(72));
  console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
  return truot === 0;
}

/* ---- Ba bản gỡ cơ học của `so-do-bieu-tuong.js` -------------------------- */
async function doiChungModule(M) {
  const goc = docMa(NGUON);      /* quy về `\n` — xem chú thích ở `docMa` */

  const BAN = [
    {
      ten: '① QUÊN XOÁ SỐ khi đã đọc (chỉ đặt, không bao giờ gọi clearAppBadge)',
      sua: (s) => s.replace(
        'const p = n > 0 ? mt.setAppBadge(n) : mt.clearAppBadge();',
        'const p = n > 0 ? mt.setAppBadge(n) : undefined;   /* GỠ CỐ Ý */'),
      do: (K) => {
        const nv = navGia();
        K.datSoDo(K.soDoHienThi(7, true), nv);           // đã đọc → phải XOÁ
        return nv.nhatKy.some(([v]) => v === 'xoa');     // bản gỡ: false = bắt được
      }
    },
    {
      /* HAI lớp chắn độc lập giữ cho hàm này im: (a) chốt "không hỗ trợ" ở
         đầu, (b) try/catch bọc lệnh gọi. Gỡ MỘT lớp thì lớp kia vẫn đỡ — nên
         ca đối chứng phải gỡ CẢ HAI, không thì nó chỉ chứng minh được là mã
         thừa an toàn chứ không chứng minh phép đo nhạy. */
      ten: '② GỠ CẢ HAI lớp chắn im lặng (chốt "không hỗ trợ" + try/catch)',
      sua: (s) => s
        .replace(/  if \(!mt \|\| typeof mt\.setAppBadge[\s\S]*?\n  \}\n/,
          '  /* GỠ CỐ Ý: không kiểm tra gì cả */\n')
        .replace('  try {\n', '  {\n')
        // Giữ lại dấu `}` đóng khối, chỉ cắt nhánh `catch` — cắt cả hai là vỡ cú pháp.
        .replace(/\n  \} catch \{[\s\S]*?\n  \}\n/, '\n  }\n'),
      do: (K) => {
        try { K.datSoDo(5, navGia({ coApi: false })); return true; }
        catch { return false; }                           // bản gỡ: ném = bắt được
      }
    },
    {
      ten: '②b GỠ `p?.catch` (promise bị từ chối văng ra, cổng khói đỏ oan)',
      sua: (s) => s.replace(
        /    p\?\.catch\?\.\(\(\) => \{[^\n]*\n/, '    /* GỠ CỐ Ý */\n'),
      do: (K) => {
        const vangRa = [];
        const bat = (e) => vangRa.push(String(e));
        process.on('unhandledRejection', bat);
        K.datSoDo(5, navGia({ tuChoi: true }));
        // Trả hàm kiểm tra chậm — đọc kết quả sau khi microtask đã chạy.
        return { chosau: () => { process.off('unhandledRejection', bat); return vangRa.length === 0; } };
      }
    },
    {
      ten: '③ GỠ chốt "đã bỏ qua" (dải mời hỏi lại mãi mãi)',
      sua: (s) => s.replace(
        "if (daBoQua) return { hien: false, ly_do: 'da_bo_qua' };",
        '  /* GỠ CỐ Ý */'),
      do: (K) => K.nenNhacCai({ coSuKienCai: true, daBoQua: true }).hien === false
    }
  ];

  for (const b of BAN) {
    const duongTam = path.join(path.dirname(NGUON), '_doichung_sodo.js');
    const ma = b.sua(goc);
    if (ma === goc) { ok(`ĐỐI CHỨNG ${b.ten}`, false, 'không gỡ được gì — regex lệch với mã thật'); continue; }
    writeFileSync(duongTam, ma, 'utf8');
    try {
      const K = await nap(duongTam);
      /* Vài phép đo (promise văng ra) chỉ đọc được SAU khi microtask chạy —
         chúng trả `{chosau}` thay vì trả thẳng kết quả. */
      const doMot = async (fn) => {
        const r = fn();
        if (r && typeof r.chosau === 'function') {
          await new Promise((res) => setImmediate(res));
          return r.chosau();
        }
        return r;
      };
      const banGoiOnDinh = await doMot(() => b.do(M));   // bản THẬT phải đạt
      const banGoTruot = !(await doMot(() => b.do(K)));  // bản GỠ phải trượt
      ok(`ĐỐI CHỨNG ${b.ten}`, banGoiOnDinh && banGoTruot,
        `bản thật ${banGoiOnDinh ? 'đạt' : 'TRƯỢT'} · bản gỡ ${banGoTruot ? 'trượt (tốt)' : 'VẪN ĐẠT — phép đo mù'}`);
    } finally {
      try { unlinkSync(duongTam); } catch { /* đã xoá */ }
    }
  }
}

/* ---- Bản gỡ của `sw.js`: bỏ chốt "ERP đang mở" --------------------------- */
function doiChungSW(maSW) {
  const gay = maSW.replace(
    /if \(tabs\.some\(\(t\) => t\.url\.includes\('\/app\.html'\)\)\) return;.*/,
    '/* GỠ CỐ Ý: không né tab đang mở */');
  if (gay === maSW) { ok('ĐỐI CHỨNG ④ GỠ chốt "ERP đang mở" trong sw.js', false, 'regex lệch với mã thật'); return; }
  const nv = navGia();
  const sw = napSW(gay, { navigator: nv, tabs: ['https://erp/app.html'], traLoi: { so_luong: 9 } });
  return sw.datSoDoBieuTuong().then(() => {
    ok('ĐỐI CHỨNG ④ GỠ chốt "ERP đang mở" trong sw.js → bản gỡ ĐẺ RA lượt đọc D1 thừa',
      sw.nhatKyFetch.length === 1, `${sw.nhatKyFetch.length} lượt (bản thật: 0)`);
  });
}

chay()
  .then((d) => process.exit(d ? 0 : 1))
  .catch((e) => { console.error('\nBÀN ĐO HỎNG:', e.stack || e.message); process.exit(2); });
