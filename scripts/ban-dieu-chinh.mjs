/* ==========================================================================
   BÀN NGHIỆM THU TRÊN TRÌNH DUYỆT — MÀN "ĐIỀU CHỈNH TỒN"
   ---------------------------------------------------------------------------
   Chạy:  npm run ban-dieu-chinh            (·  --rong=375 cho điện thoại)

   VÌ SAO PHẢI CÓ. Màn này là ĐƯỜNG RA duy nhất cho ca "nạp nhầm tồn rồi kho
   đã bán mất một phần" (REV-0060 vòng 3 · CHẶN-ⓑ): nút "Gỡ lượt nạp" từ chối
   đúng, và câu từ chối chỉ sang đây. Trước bản vá nó chỉ sang một cái màn
   KHÔNG TỒN TẠI — Sếp kẹt vĩnh viễn, lối duy nhất là mở D1 sửa tay.
   Một đường ra mà chỉ có ở máy chủ thì vẫn là không có đường ra. REV-0038 đã
   bỏ lọt một tính năng CHẾT HOÀN TOÀN qua hai vòng soi vì không vòng nào nạp
   `app.js` trong trình duyệt. Bàn này đi đúng đường ngón tay anh Duy đi:
   bấm tab Điều chỉnh → chọn mã → chọn lô (kể cả lô ÂM) → gõ số đếm được →
   ghi lý do → bấm Lập phiếu → nhìn tồn đổi trên màn.

   MÁY CHỦ Ở ĐÂY LÀ THẬT: `apiRieng` gọi thẳng `src/kho.js` trên một CSDL
   `node:sqlite` dựng từ đúng `migrations/`.

   BA CẢNH:
     ① Lô đang ÂM phải NHÌN THẤY được trong ô chọn lô (lưới `ton > 0` lọc mất
        đúng cái phải sửa)
     ② Lập phiếu kéo lô về đúng số đếm được — tồn trên màn đổi theo
     ③ Không phải quản lý kho thì KHÔNG thấy tab này
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { dungMayGia, moChrome, GOC, TOI_ID } from './lib/ban-do-chrome.mjs';

const kho = await import(new URL('file:///' + path.join(GOC, 'src', 'kho.js').replace(/\\/g, '/')));
/* ⚠️ BỘ CỜ QUYỀN LẤY TỪ CHÍNH `src/quyen.js`, KHÔNG GÕ TAY.
   Bản trước ổ giả `/api/toi-la-ai` gõ tay `{ thao_tac, quan_ly, gia_von }`.
   Ngày 09/09/2026 máy chủ thêm hai cờ `nap_luot` · `dieu_chinh` (Sếp chốt
   C1·C2) — ổ giả thiếu chúng nên giao diện gỡ luôn tab "Điều chỉnh", và bàn đo
   chết ở `document.querySelector(...).click()` với "reading 'click' of null".
   Đỏ vì Ổ GIẢ LỆCH HỢP ĐỒNG MÁY CHỦ, không vì sản phẩm — đúng lớp lỗi Ⓔ mà
   `do-man-mo-ra-xem-duoc` sinh ra để canh. Hỏi thẳng `quyenKho()` thì không
   bao giờ lệch được nữa. */
const quyen = await import(new URL('file:///' + path.join(GOC, 'src', 'quyen.js').replace(/\\/g, '/')));

let dat = 0, truot = 0; const hong = [];
/* Mốc chia luồng "đi đúng đường" và luồng "cố tình bấm sai" cho chốt console. */
let consoleSachTruoc = 0;
function ok(ten, dung, ct = '') {
  if (dung) { dat++; console.log(`  ✓ ${ten}${ct ? ' — ' + ct : ''}`); }
  else { truot++; hong.push(ten + (ct ? ` — ${ct}` : '')); console.log(`  ✗ ${ten}${ct ? ' — ' + ct : ''}`); }
}
const tin = s => console.log('    · ' + s);

function tachCau(sql) {
  const sach = sql.replace(/\r\n?/g, '\n').split('\n').map(d => d.replace(/--.*$/, '')).join('\n');
  const cau = []; let ht = '', than = false;
  for (const mau of sach.split(/(;)/)) {
    ht += mau;
    if (mau !== ';') { if (/\bBEGIN\b/i.test(mau)) than = true; if (/\bEND\b\s*$/i.test(mau.trim())) than = false; continue; }
    if (than) continue; const c = ht.trim(); if (c && c !== ';') cau.push(c); ht = '';
  }
  if (ht.trim()) cau.push(ht.trim());
  return cau;
}
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = OFF;');
for (const t of ['them-kho.sql', 'them-danhmuc-nen.sql', 'them-khoa-danhmuc-nen.sql', 'them-nap-ghep-cot.sql',
                 'them-ly-do-sua.sql', 'them-canhbao-ghi-d1.sql']) {
  for (const c of tachCau(readFileSync(path.join(GOC, 'migrations', t), 'utf8'))) {
    try { db.exec(c); } catch (e) { if (!/duplicate column|no such table|already exists/i.test(e.message)) throw e; }
  }
}
db.exec(`CREATE TABLE IF NOT EXISTS nhan_su (id TEXT PRIMARY KEY, ho_ten TEXT);
         INSERT OR IGNORE INTO nhan_su VALUES ('${TOI_ID}','Bùi Thị Ngọc');`);

const idx = new Map();
const demIdx = b => { if (!idx.has(b)) idx.set(b, Number(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND tbl_name=?`).get(b).n)); return idx.get(b); };
const bangCua = s => { const m = s.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_]+)/i) || s.match(/UPDATE\s+([a-z_]+)/i); return m ? m[1] : null; };
const moi = (sql, tso = []) => ({
  bind: (...a) => moi(sql, a),
  async run() { const k = db.prepare(sql).run(...tso); const b = bangCua(sql), d = Number(k.changes || 0); return { success: true, meta: { rows_written: b ? d * (1 + demIdx(b)) : d } }; },
  async first() { const r = db.prepare(sql).get(...tso); return r === undefined ? null : r; },
  async all() { return { results: db.prepare(sql).all(...tso) }; }
});
const env = { DB: { prepare: s => moi(s), async batch(ds) { const r = []; for (const s of ds) r.push(await s.run()); return r; } } };
const PHIEN = { nhan_su_id: TOI_ID, ho_ten: 'Bùi Thị Ngọc', vai_tro: 'admin' };

/* ---- Dựng đúng cái trạng thái mà CHẶN-ⓐ để lại: một LÔ ÂM ---------------
   Không dựng bằng `huyLuotNap` (bản vá nay chặn đúng nên không tạo ra được
   nữa) mà ghi thẳng vào sổ cái — vì đây là ca "dữ liệu CŨ đã lỡ âm rồi thì
   có sửa được không", chứ không phải ca tạo mới. */
db.prepare(`INSERT INTO san_pham (id, ma_sku, ten, danh_muc, don_vi, theo_doi_hsd, ton_toi_thieu)
            VALUES ('sp_hn','SP-00001','Hạnh nhân Mỹ 500g','Hạt','túi',1,5)`).run();
db.prepare(`INSERT INTO lo_hang (id, san_pham_id, so_lo, han_su_dung)
            VALUES ('lo_a','sp_hn','LO-A','2026-10-01'), ('lo_m','sp_hn','LO-M','2027-10-01')`).run();
db.prepare(`INSERT INTO giao_dich_kho (phieu_id, san_pham_id, lo_hang_id, loai, so_luong, ghi_chu, nguoi_id)
            VALUES ('px_cu','sp_hn','lo_a','xuat',-100,'Xuất bán (lô nạp nhầm đã bị gỡ)','${TOI_ID}'),
                   ('pn_tay','sp_hn','lo_m','nhap',100,'Nhập tay','${TOI_ID}')`).run();

const tonLo = id => Number(db.prepare(
  `SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho WHERE lo_hang_id=?`).get(id).t);
const tonMa = () => Number(db.prepare(
  `SELECT COALESCE(SUM(so_luong),0) AS t FROM giao_dich_kho WHERE san_pham_id='sp_hn'`).get().t);

const RONG = Number((process.argv.find(a => a.startsWith('--rong=')) || '').split('=')[1]) || 1440;
/* `--khong-quan-ly` dựng vai chỉ có `thao_tac` (17 bạn part-time ở kho). */
const KHONG_QL = process.argv.includes('--khong-quan-ly');

async function docThan(req) {
  const cuc = []; for await (const c of req) cuc.push(c);
  return Buffer.concat(cuc).toString('utf8');
}
const apiRieng = (duong, u, traJson, req) => {
  if (duong === '/api/toi-la-ai') {
    traJson({
      ten_dang_nhap: 'ngoc', ho_ten: 'Bùi Thị Ngọc', chuc_danh: 'Giám đốc Vận hành',
      phong_ban: 'Ban Giám đốc', vai_tro: 'admin', phai_doi_mk: 0, anh_dai_dien: null,
      trang_thai: 'dang_lam', nhan_su_id: TOI_ID, id: TOI_ID,
      quyen: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy', 'khovan'],
      kho: quyen.quyenKho({ vai_tro: KHONG_QL ? 'nhan_vien_kho' : 'quan_ly_kho' }),
      san_pham: { sua: !KHONG_QL, khoa: !KHONG_QL }
    });
    return true;
  }
  if (duong === '/api/kho/san-pham') {
    (async () => traJson(await (await kho.danhSachSanPham(env, KHONG_QL
      ? { ...PHIEN, vai_tro: 'nhan_vien_kho' } : PHIEN)).json()))();
    return true;
  }
  if (duong === '/api/kho/lo') {
    (async () => traJson(await (await kho.loTheoSanPham(env, PHIEN,
      u.searchParams.get('san_pham_id'), u.searchParams.get('tat_ca') === '1')).json()))();
    return true;
  }
  if (duong === '/api/kho/dieu-chinh') {
    (async () => {
      const b = JSON.parse(await docThan(req));
      const r = await kho.dieuChinhKho(env, KHONG_QL ? { ...PHIEN, vai_tro: 'nhan_vien_kho' } : PHIEN, b);
      traJson(await r.json(), r.status);
    })();
    return true;
  }
  return false;
};

const may = await dungMayGia({ tatHoatAnh: true, apiRieng });
const trinh = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, cao: 900, doiMs: 2600 });
const { chay, loiConsole, ngoaiLe, dong } = trinh;
const cho = ms => new Promise(r => setTimeout(r, ms));

console.log(`\n══ MÀN ĐIỀU CHỈNH TỒN TRÊN TRÌNH DUYỆT @${RONG}px ` +
            `(vai ${KHONG_QL ? 'part-time kho — KHÔNG quản lý' : 'quản lý kho'}) ══`);
tin(`dựng sẵn: lô LO-A = ${tonLo('lo_a')} (ÂM) · lô LO-M = ${tonLo('lo_m')} · tồn mã = ${tonMa()}`);

try {
  /* ⚠️ `.sb-item[data-tab="khovan"]` — ĐÚNG cái nút thanh bên của ERP.
     Bản trước gõ `.nav-nut[data-tab=…]`, một lớp KHÔNG TỒN TẠI, rồi `?.click()`
     nuốt luôn cái `null`: tab Kho vận CHƯA TỪNG mở ra, `<section id="v-khovan">`
     giữ nguyên thuộc tính `hidden`, và cả màn Điều chỉnh chưa bao giờ được
     trình duyệt dựng hình. Mọi phép đọc bằng JS (`textContent`, `.options`,
     `.click()` trên phần tử) vẫn chạy nên bàn đo vẫn xanh — nhưng mọi phép đo
     HÌNH DẠNG (chiều cao, tràn ngang, chạm 44px, focus được hay không) thì đo
     một khối 0×0. Đúng lớp "mở ra mà không xem được" mà `do-mo-ra-xem-duoc`
     canh, chỉ khác là ở đây chính BÀN ĐO tự bịt mắt mình.
     Nay kiểm luôn: mở không ra thì ĐỎ, không đi tiếp trên một màn vô hình. */
  const moTab = await chay(`(() => {
    const tab = document.querySelector('.sb-item[data-tab="khovan"]');
    if (!tab) return 'không thấy tab khovan ở thanh bên';
    tab.click();
    const v = document.getElementById('v-khovan');
    if (!v) return 'không thấy khối màn Kho vận';
    return v.hidden ? 'tab Kho vận bấm rồi vẫn ẩn' : 'OK';
  })()`);
  await cho(900);
  ok('Mở được tab Kho vận và khối màn hiện ra thật (không phải bấm vào chỗ trống)',
     moTab === 'OK', String(moTab));

  const coTab = await chay(`!!document.querySelector('#kvSeg .seg-nut[data-kv="dieuchinh"]')`);
  if (KHONG_QL) {
    ok('Không phải quản lý kho thì KHÔNG thấy tab Điều chỉnh', coTab === false, String(coTab));
  } else {
    ok('Quản lý kho thấy tab Điều chỉnh trong Kho vận', coTab === true, String(coTab));

    await chay(`document.querySelector('#kvSeg .seg-nut[data-kv="dieuchinh"]').click()`);
    await cho(400);
    ok('Bấm vào là màn hiện ra (không phải nút chết)',
       (await chay(`!document.getElementById('kv-pane-dieuchinh').hidden`)) === true);

    /* Chọn mã hàng qua đúng combobox dùng chung, không đặt .value bằng tay. */
    await chay(`document.getElementById('kvDcSPHienThi').click()`);
    await cho(300);
    await chay(`document.querySelector('#kvDcSPGoiY .ql-goiy-item[data-gt="sp_hn"]').click()`);
    await cho(700);

    const dsLo = await chay(`Array.from(document.getElementById('kvDcLo').options).map(o => o.textContent)`);
    tin(`ô chọn lô hiện: ${JSON.stringify(dsLo)}`);
    ok('Lô đang ÂM HIỆN RA trong ô chọn lô (lưới `ton > 0` sẽ lọc mất đúng nó)',
       dsLo.some(t => /LO-A/.test(t) && /ÂM/.test(t)), JSON.stringify(dsLo).slice(0, 120));

    await chay(`(() => { const s = document.getElementById('kvDcLo');
                         s.value = 'lo_a'; s.dispatchEvent(new Event('change')); })()`);
    await cho(300);
    ok('Chọn lô âm thì màn nói rõ nó đang âm và Xuất kho không nhìn thấy nó',
       /ÂM/.test(await chay(`document.getElementById('kvDcTonNhac').textContent`)),
       String(await chay(`document.getElementById('kvDcTonNhac').textContent`)).slice(0, 90));

    /* Gõ số đếm được + lý do rồi bấm — đúng đường ngón tay. */
    await chay(`(() => { const t = document.getElementById('kvDcTonThuc');
                         t.value = '0'; t.dispatchEvent(new Event('input'));
                         const l = document.getElementById('kvDcLyDo');
                         l.value = 'kiểm kê 07/09: lô LO-A nạp nhầm, ngoài kho không còn cái nào';
                         l.dispatchEvent(new Event('input')); })()`);
    await chay(`document.getElementById('kvNutDieuChinh').click()`);
    await cho(1400);

    const cau = await chay(`document.getElementById('kvOkDieuChinh').hidden
                            ? ('LỖI: ' + document.getElementById('kvLoiDieuChinh').textContent)
                            : document.getElementById('kvOkDieuChinh').textContent`);
    tin(`màn báo: ${String(cau).slice(0, 140)}`);
    ok('Lập được phiếu ngay trên màn, và màn nói rõ đã kéo từ đâu về đâu',
       /Đã lập phiếu điều chỉnh/.test(cau) && /-100/.test(cau), String(cau).slice(0, 110));
    ok('Sổ cái đổi thật: lô âm về 0, tồn mã không còn ảo',
       tonLo('lo_a') === 0 && tonMa() === 100, `LO-A=${tonLo('lo_a')} · tồn mã=${tonMa()}`);
    ok('Và phiếu vào sổ đúng loại “dieu_chinh”, có lý do người viết',
       Number(db.prepare(`SELECT COUNT(*) AS n FROM giao_dich_kho
                           WHERE loai='dieu_chinh' AND ghi_chu LIKE '%kiểm kê 07/09%'`).get().n) === 1);

    /* Bảng tồn kho phải tự vẽ lại — không bắt Sếp F5. */
    await cho(500);
    ok('Bảng tồn kho tự nạp lại sau khi lập phiếu (không phải bấm F5)',
       /100/.test(await chay(`document.querySelector('#kv-ton-bang')?.textContent || ''`)));

    /* ---- ĐƯỜNG NGÓN TAY CỦA REV-0060 VÒNG 4 · CHẶN-① --------------------
       Chọn mã có lô rồi BỎ TRỐNG ô lô mà bấm. Máy chủ chặn (đo ở
       `do-lo-dieuchinh`), nhưng ở đây phải đo cái Sếp NHÌN THẤY: một câu
       tiếng người, không phải một cú bấm không có gì xảy ra. `required` một
       mình là chốt CÂM khi trình duyệt không focus được ô. */
    /* Từ đây trở xuống là những lượt bấm CỐ TÌNH SAI, nên máy chủ trả 400 và
       Chrome ghi một dòng "Failed to load resource… 400" vào console. Đó là
       hành vi ĐÚNG, không phải lỗi — chốt "không lỗi console" chấm phần TRƯỚC
       đoạn này, phần sau chấm riêng và chỉ tha đúng dòng 400 ấy. */
    consoleSachTruoc = loiConsole.length;
    const soPhieuTruoc = () => Number(db.prepare(
      `SELECT COUNT(*) AS n FROM giao_dich_kho WHERE loai='dieu_chinh'`).get().n);
    const truocBoTrong = soPhieuTruoc();
    await chay(`document.getElementById('kvDcSPHienThi').click()`); await cho(300);
    await chay(`document.querySelector('#kvDcSPGoiY .ql-goiy-item[data-gt="sp_hn"]').click()`);
    await cho(800);
    ok('Ô lô mang `required` khi mã theo dõi HSD',
       (await chay(`document.getElementById('kvDcLo').required`)) === true);
    await chay(`(() => { const t = document.getElementById('kvDcTonThuc');
                         t.value = '50'; t.dispatchEvent(new Event('input'));
                         const l = document.getElementById('kvDcLyDo');
                         l.value = 'kiểm kê 07/09: đếm ngoài kho được 50 túi';
                         l.dispatchEvent(new Event('input')); })()`);
    await chay(`document.getElementById('kvNutDieuChinh').click()`);
    await cho(900);
    const cauTrong = await chay(`document.getElementById('kvLoiDieuChinh').textContent`);
    ok('Bỏ trống ô lô rồi bấm: màn NÓI RA một câu, không im lặng',
       /chọn LÔ HÀNG/i.test(String(cauTrong)), String(cauTrong).slice(0, 100));
    ok('…và KHÔNG có phiếu nào vào sổ cái',
       soPhieuTruoc() === truocBoTrong, `${truocBoTrong} → ${soPhieuTruoc()}`);

    /* Và ô số: “12.5” kg phải bị từ chối tại chỗ, không lặng lẽ thành 125. */
    await chay(`(() => { const s = document.getElementById('kvDcLo');
                         s.value = 'lo_m'; s.dispatchEvent(new Event('change'));
                         const t = document.getElementById('kvDcTonThuc');
                         t.value = '12.5'; t.dispatchEvent(new Event('input')); })()`);
    await chay(`document.getElementById('kvNutDieuChinh').click()`);
    await cho(1200);
    const cauTP = await chay(`document.getElementById('kvOkDieuChinh').hidden
                              ? document.getElementById('kvLoiDieuChinh').textContent
                              : 'ĐÃ GHI: ' + document.getElementById('kvOkDieuChinh').textContent`);
    ok('“12.5” bị từ chối trên màn, sổ KHÔNG ghi 125',
       /SỐ NGUYÊN/.test(String(cauTP)) && tonLo('lo_m') === 100,
       `${String(cauTP).slice(0, 80)} · lô M = ${tonLo('lo_m')}`);

    /* ---- THẤP-① VÒNG 4: “vừa một màn ở 375px” --------------------------
       Sếp dặn hai lần. Đo THẬT: chiều cao trang so với chiều cao màn, với
       màn Điều chỉnh đang mở và ô lô đã bung ra (trạng thái cao nhất). */
    await cho(300);
    const cao = await chay(`(() => {
        const h = e => e ? Math.round(e.getBoundingClientRect().height) : 0;
        const p = document.getElementById('kv-pane-dieuchinh');
        return {
          man: window.innerHeight,
          trang: document.documentElement.scrollHeight,
          pane: h(p),
          /* Chiều cao phần LÀM VIỆC: giới thiệu + biểu mẫu + đầu bảng, KHÔNG
             tính hộp báo lỗi/báo xong. Hai hộp ấy chỉ hiện sau khi bấm và cao
             bao nhiêu là tuỳ câu báo dài ngắn — đo lẫn vào thì con số nhảy
             theo nội dung câu chữ chứ không theo bố cục. */
          lamViec: h(p) - h(document.getElementById('kvLoiDieuChinh'))
                        - h(document.getElementById('kvOkDieuChinh')),
          /* Phần KHUNG dùng chung của cả tab Kho vận — 9 màn con đều gánh,
             không thuộc phạm vi REV-0060. Tách ra để không đổ oan cho màn
             Điều chỉnh, cũng không giấu đi. */
          the: h(document.getElementById('kv-the')),
          seg: h(document.getElementById('kvSeg')),
          phan: [...p.querySelectorAll(':scope > .panel > .panel-body > *')]
                  .map(e => (e.id || e.tagName) + '=' + h(e)).join(' · ')
        };
      })()`);
    tin(`chi tiết màn Điều chỉnh: ${cao.phan}`);
    tin(`khung chung của tab Kho vận: thẻ số ${cao.the}px · thanh 9 nút ${cao.seg}px`);
    tin(`@${RONG}px · màn ${cao.man}px · trang ${cao.trang}px · màn Điều chỉnh ${cao.pane}px ` +
        `(phần làm việc ${cao.lamViec}px)`);
    if (RONG <= 420) {
      /* Chốt ở PHẦN LÀM VIỆC của màn Điều chỉnh, không ở chiều cao cả trang.
         Lý do viết ra để lần sau không ai tưởng đây là nới tay: trang @375px
         cao hơn khung nhìn CHỦ YẾU vì khung dùng chung của tab Kho vận —
         riêng khối 4 thẻ số `#kv-the` đã ~439px trên một khung nhìn 812px.
         Khối ấy do 9 màn con của Kho vận cùng gánh, có từ trước nhánh này, và
         sửa nó là đổi bố cục cả tab — không phải việc của REV-0060. Cái nhánh
         này CHỊU TRÁCH NHIỆM là màn Điều chỉnh: nó phải vừa MỘT khung nhìn
         375×812 để anh Duy không vừa cuộn vừa nhớ mình đang gõ ô nào. */
      ok('THẤP-① Phần làm việc của màn Điều chỉnh vừa một khung nhìn 375×812',
         cao.lamViec <= 812, `${cao.lamViec}px`);
    }
  }

  /* Không được đẻ thanh kéo ngang — luật màn hẹp 375px. */
  const keo = await chay(`(() => { const p = document.getElementById('kv-pane-dieuchinh');
      return { body: Math.max(0, document.body.scrollWidth - document.body.clientWidth),
               pane: p ? Math.max(0, p.scrollWidth - p.clientWidth) : 0 }; })()`);
  ok(`Màn điều chỉnh không đẻ thanh kéo ngang @${RONG}px`,
     keo.body === 0 && keo.pane === 0, JSON.stringify(keo));

  ok('Không lỗi console trong luồng đi ĐÚNG đường',
     loiConsole.slice(0, consoleSachTruoc).length === 0,
     JSON.stringify(loiConsole.slice(0, consoleSachTruoc)).slice(0, 200));
  /* Phần cố tình bấm sai: chỉ được phép có đúng dòng "400" của cửa từ chối.
     Bất kỳ dòng nào khác — nhất là "not focusable" — là chốt CÂM quay lại. */
  const conLai = loiConsole.slice(consoleSachTruoc);
  ok('Lượt bấm SAI chỉ đẻ ra đúng dòng 400 của cửa từ chối, không dòng lạ nào',
     conLai.every(d => /status of 4\d\d/.test(String(d))),
     JSON.stringify(conLai).slice(0, 200));
  ok('Không ngoại lệ chưa bắt', ngoaiLe.length === 0, JSON.stringify(ngoaiLe).slice(0, 200));
} finally {
  await dong();
  may.dong();
}

console.log('\n' + '='.repeat(70));
console.log(`ĐẠT ${dat} · TRƯỢT ${truot}`);
if (truot) {
  console.log('\nCHỖ TRƯỢT:');
  hong.forEach(h => console.log('  ✗ ' + h));
  console.log('\n❌ ĐỎ');
  process.exit(1);
}
console.log('✅ XANH');
