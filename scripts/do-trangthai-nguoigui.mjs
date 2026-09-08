/* ==========================================================================
   BÀN ĐO: NGƯỜI GỬI PHẢI THẤY GÓP Ý CỦA MÌNH ĐANG Ở ĐÂU
   ---------------------------------------------------------------------------
   VÌ SAO CÓ FILE NÀY. 29/08/2026 Sếp Bùi Thị Ngọc gửi ảnh danh sách Góp ý ERP:
     "của tao thì đã hiện trạng thái hoàn thành rồi, sao của nhân viên mày
      không cho người ta nhìn thấy trạng thái"

   GIẢ THUYẾT BAN ĐẦU (LỆCH CỘT) LÀ SAI — bàn đo này chứng minh điều đó và giữ
   luôn phép chứng minh: đếm ô tiêu đề HIỆN so với ô thân, cho cả ba vai, ở mọi
   bề ngang. Bản trước bản vá: 7 = 7 (nhân viên) · 7 = 7 (quản lý) · 8 = 8
   (Sếp). Không lệch một ô nào.

   NGUYÊN NHÂN THẬT — CỘT TRẠNG THÁI NẰM NGOÀI KHUNG NHÌN.
   Đo bằng Chrome thật, đăng nhập bằng phiên thật của một nhân viên kho:
     · máy 900px → khung `.table-wrap` chỉ còn 594px (thanh bên ăn 232px)
     · bảng góp ý rộng 932px → CUỘN NGANG
     · mép phải cột "Trạng thái" ở 681px  → NẰM NGOÀI 594px, không thấy
     · thứ người gửi thấy ngay trước mép lại là cột "Rủi ro" TOÀN DẤU GẠCH:
       máy chủ đã cắt `risk`/`de_xuat_risk` của người gửi (REV-0020), nên với
       họ đó là một cột chết chiếm 82px và đẩy Trạng thái ra ngoài.
   Mốc chuyển sang THẺ khi ấy là 720px — tức là khoảng 720–1100px không có
   thẻ mà bảng cũng chưa vừa. Đúng khoảng máy tính xách tay / máy bảng /
   cửa sổ không mở hết.

   BẢN VÁ ĐO Ở ĐÂY:
     ① Trạng thái + Đang chờ ai dời lên NGAY SAU Tiêu đề.
     ② Cột Người gửi và cột Rủi ro chỉ hiện KHI CÓ DỮ LIỆU THẬT (cùng một
        biểu thức quyết định cả <th> lẫn <td>, nên không thể lệch).
     ③ Mốc chuyển thẻ 720px → 1100px.
     ④ Người gửi thấy thêm "đã N ngày" (`so_ngay_cho`) và LÝ DO khi bị dừng
        (`ly_do_tu_choi`) — hai trường máy chủ đã trả sẵn mà giao diện không dùng.
     ⑤ RANH GIỚI GIỮ NGUYÊN: mức rủi ro nội bộ, link PR/commit, ghi chú riêng
        của quản lý vẫn KHÔNG được gửi cho người gửi (arm D soi thẳng JSON).

   CÁC ARM:
     A. Đếm ô tiêu đề HIỆN vs ô thân — 3 vai × 6 bề ngang. Phải bằng nhau.
     B. Trạng thái phải ĐỌC ĐƯỢC: hoặc bảng hiện và cột Trạng thái nằm TRỌN
        trong khung, hoặc đang dùng thẻ và thẻ có nhãn trạng thái.
     C. Thẻ 375px của người gửi phải trả lời đủ: trạng thái · ai giữ · bao lâu
        · lý do nếu bị dừng.
     D. Ruột nội bộ không lộ — gọi /api/gop-y bằng phiên NGƯỜI GỬI, soi JSON,
        0 khoá nhạy cảm, 0 chuỗi bí mật.
     E. QUÉT CẢ LỚP — mọi chỗ trong app.js vẽ `<td>` CÓ ĐIỀU KIỆN. Mỗi chỗ
        như vậy phải có đúng một <th> bật/tắt được đi kèm. Số chỗ tìm thấy
        được chốt cứng: thêm một chỗ mới mà không khai ở đây là ĐỎ.

   BH-16 — CA ĐỐI CHỨNG:
     node scripts/do-trangthai-nguoigui.mjs --commit 7c4c5c7
        → cây TRƯỚC bản vá, arm B phải ĐỎ (Trạng thái ngoài khung ở 900px).
     node scripts/do-trangthai-nguoigui.mjs --tu-kiem
        → chèn THÊM một <td> vào thân bảng góp ý. Arm A phải ĐỎ. Đây đúng là
          bệnh "lệch cột" mà giả thuyết ban đầu nghi ngờ: bàn đo không bắt
          được nó thì bàn đo mới là thứ hỏng.
   MÃ THOÁT: 0 = xanh, 1 = đỏ.
   ========================================================================== */

import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';
import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dso = process.argv;
const lay = (co, mac) => { const i = dso.indexOf(co); return i > 0 ? dso[i + 1] : mac; };
const COMMIT = lay('--commit', null);
const TU_KIEM = dso.includes('--tu-kiem');
const CHUP = dso.includes('--chup') ? lay('--chup', null) : null;
const RONGS = [375, 768, 900, 1024, 1280, 1440];

datDongHo('2026-08-29T03:00:00Z');            // 10:00 giờ VN

/* ---- Mồi dữ liệu thật ---------------------------------------------------
   AN là nhân viên kho, quản lý cấp 1 là anh Duy, Sếp Ngọc là admin. Năm góp ý
   phủ đúng các chặng người gửi cần đọc được: chờ duyệt · chờ quyết định ·
   đang làm · bị từ chối (có lý do) · hoàn thành. */
const NGUOI = [
  ['SEP',  'Bùi Thị Ngọc',    'Ban giám đốc', null,  'admin',         1],
  ['DUY',  'Phạm Khương Duy', 'Kho vận',      'SEP', 'quan_ly_kho',   0],
  ['AN',   'Nguyễn Văn An',   'Kho vận',      'DUY', 'nhan_vien_kho', 0]
];
const BIMAT = { risk: 'HIGH', pr: 'https://github.com/agc/erp/pull/42-LINKPR-BIMAT',
                lyDoNoiBo: 'DEXUATLYDO-NOIBO', spec: 'DEXUATSPEC-NOIBO' };
const LY_DO_CONG_KHAI = 'Việc này đụng chính sách giá, chưa làm được.';

function moi(db) {
  db.exec('DELETE FROM gop_y_lich_su; DELETE FROM gop_y; DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam) VALUES (?,?,?,?,?,?,1)');
  const tk = db.prepare('INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk, duyet_gopy) VALUES (?,?,?,?,?,1,0,?)');
  NGUOI.forEach(([id, ten, bp, ql, vt, cd], i) => {
    ns.run(id, ten, id.slice(0, 2), 'NV', bp, ql);
    tk.run(i + 1, id, 'tk' + id, 'pbkdf2$1$x$x', vt, cd);
  });
  const g = db.prepare(`INSERT INTO gop_y
    (id, nguoi_gui_id, tieu_de, boi_canh, vuong_o_dau, mong_muon, trang_thai,
     current_owner, next_owner, de_xuat_risk, de_xuat_ly_do, de_xuat_spec,
     risk, bang_chung_url, ly_do_tu_choi, tao_luc, cap_nhat_luc)
    VALUES (?,?,?,'bc','vd','mm',?,?,?,?,?,?,?,?,?,?,?)`);
  g.run(1, 'AN', 'Máy in tem hay kẹt', 'moi', 'NGUOI_GUI', 'QL_CAP1',
        'MEDIUM', BIMAT.lyDoNoiBo, BIMAT.spec, null, null, null, '2026-08-27 09:00:00', '2026-08-27 09:00:00');
  g.run(2, 'AN', 'Quét QR chậm', 'dang_lam', 'KHIDOT', 'KHIDOT',
        'MEDIUM', BIMAT.lyDoNoiBo, BIMAT.spec, 'MEDIUM', null, null, '2026-08-25 09:00:00', '2026-08-26 09:00:00');
  g.run(3, 'AN', 'Đổi công thức tính tồn', 'hoan_thanh', 'NONE', 'NONE',
        'HIGH', BIMAT.lyDoNoiBo, BIMAT.spec, BIMAT.risk, BIMAT.pr, null, '2026-08-20 09:00:00', '2026-08-28 09:00:00');
  g.run(4, 'AN', 'Cho phép sửa giá bán tay', 'bi_tu_choi', 'NGUOI_GUI', 'NGUOI_GUI',
        'LOW', BIMAT.lyDoNoiBo, BIMAT.spec, 'LOW', null, LY_DO_CONG_KHAI, '2026-08-24 09:00:00', '2026-08-26 09:00:00');
  g.run(5, 'AN', 'Cảnh báo hàng cận date', 'cho_quyet_dinh', 'OWNER', 'OWNER',
        'HIGH', BIMAT.lyDoNoiBo, BIMAT.spec, null, null, null, '2026-08-22 09:00:00', '2026-08-22 09:00:00');
}

/* ---- Lấy JSON THẬT của cả ba vai từ worker thật ------------------------- */
const { db, d1 } = dungDB();
moi(db);
const env = dungEnv(d1);
const worker = (await import(pathToFileURL(path.join(GOC, 'src/index.js')).href)).default;
const phien = {};
for (let i = 0; i < NGUOI.length; i++) phien[NGUOI[i][0]] = await taoPhienThat(env, i + 1);
const JSON_VAI = {};
for (const ai of ['AN', 'DUY', 'SEP']) JSON_VAI[ai] = await goiAPI(worker, env, '/api/gop-y', phien[ai]);

/* ======================================================================== *
   ARM D — RUỘT NỘI BỘ KHÔNG ĐƯỢC LỘ CHO NGƯỜI GỬI
   Soi THẲNG JSON, không nhìn màn hình: che ở giao diện không phải phân quyền.
 * ======================================================================== */
const RUOT = ['risk', 'bang_chung_url', 'de_xuat_loai', 'de_xuat_risk',
              'de_xuat_trang_thai', 'de_xuat_ly_do', 'de_xuat_spec'];
{
  const than = JSON_VAI.AN.than || JSON_VAI.AN;
  const ds = than.gop_y || [];
  ok('D1 · người gửi vẫn nhận đủ 5 góp ý của mình', ds.length === 5, `nhận ${ds.length}`);
  const loKhoa = [];
  for (const g of ds) for (const k of RUOT) if (k in g) loKhoa.push(`GY-${g.id}.${k}`);
  ok('D2 · 0 khoá ruột nội bộ trong JSON người gửi', loKhoa.length === 0, loKhoa.join(', '));
  const tho = JSON.stringify(than);
  for (const [ten, chuoi] of Object.entries(BIMAT))
    ok(`D3.${ten} · chuỗi bí mật không có trong JSON người gửi`, !tho.includes(chuoi));
  // Chiều ngược lại — cắt quá tay cũng là lỗi: thứ người gửi CẦN phải còn.
  const canCo = ['trang_thai', 'next_owner', 'quan_ly_cap1_ten', 'so_ngay_cho'];
  for (const k of canCo) ok(`D4.${k} · người gửi vẫn nhận được`, ds.every(g => k in g));
  ok('D5 · lý do công khai vẫn tới tay người gửi',
     ds.some(g => g.ly_do_tu_choi === LY_DO_CONG_KHAI));
}

/* ======================================================================== *
   ARM E — QUÉT CẢ LỚP: mọi chỗ vẽ <td> CÓ ĐIỀU KIỆN
   Mỗi ô thân vẽ có điều kiện phải có một <th> bật/tắt được đi kèm, nếu không
   thì tiêu đề và thân đếm khác nhau → lệch cột toàn bảng.
 * ======================================================================== */
{
  const js = readFileSync(path.join(GOC, 'public/assets/js/app.js'), 'utf8');
  const html = readFileSync(path.join(GOC, 'public/app.html'), 'utf8');
  // Ô thân vẽ có điều kiện: `(<đk> ? `<td...` : '')`
  const oCoDieuKien = (js.match(/\?\s*`<td[\s>]/g) || []).length;
  // <th> bật/tắt được: khai `hidden` trong HTML, hoặc bị remove() trong JS.
  const thAnHien = (html.match(/<th[^>]*\bid="[^"]+"[^>]*\bhidden\b/g) || []).length;
  const thGoBo = (js.match(/\$\('#[a-zA-Z0-9-]*[Tt]h[A-Za-z]*'\)[^\n]*\.remove\(\)/g) || []).length;
  /* SÁU chỗ, đã soi từng chỗ 29/08/2026 — không chỗ nào lệch ô:
       1. #ns-bang    · cột Lương        ← `<th id="ns-thLuong">` bị .remove()
       2. #gy-bang    · cột Người gửi    ← `<th id="gy-cot-nguoigui" hidden>`
       3. #gy-bang    · cột Rủi ro       ← `<th id="gy-cot-ruiro" hidden>`
       4. #kd-dhh-bang· cột Mã vận đơn   ← `<th id="kd-dhh-th-mavandon" hidden>`
       5. #kv-ton-bang· cột Giá trị tồn  ← `<th id="kv-thGiaTri">` bị .remove()
       6. #dh-bang    · ô "kho nhận"     ← hai NHÁNH, cả hai đều đúng 1 ô, nên
                                           không cần <th> bật/tắt.
     Thêm chỗ thứ bảy mà không khai ở đây thì bàn đo ĐỎ — đó là mục đích. */
  const KHAI = 6;
  ok(`E1 · số chỗ vẽ <td> có điều kiện đúng bằng số đã khai (${KHAI})`,
     oCoDieuKien === KHAI, `đếm được ${oCoDieuKien}`);
  ok(`E2 · mỗi ô có điều kiện có một <th> bật/tắt được đi kèm`,
     thAnHien + thGoBo >= oCoDieuKien - 1,      // khoTd của #dh-bang: hai nhánh, đều 1 ô
     `<th hidden>=${thAnHien} · th.remove()=${thGoBo} · ô=${oCoDieuKien}`);
}

/* ======================================================================== *
   ARM A + B + C — ĐO TRÊN CHROME THẬT, PHIÊN THẬT CỦA TỪNG VAI
 * ======================================================================== */

/* MẪU HỎNG GIẢ (--tu-kiem): chèn THÊM một <td> vào thân bảng góp ý, không
   thêm <th> nào. Đây đúng bệnh "lệch cột". Arm A phải bắt được. */
const suaTep = TU_KIEM
  ? (s, ten) => (ten === 'assets/js/app.js'
      ? s.replace('`<td><button type="button" class="btn-nho" data-gyxem="${g.id}">Xem</button></td></tr>`',
                  '`<td class="mau-hong">✗</td><td><button type="button" class="btn-nho" data-gyxem="${g.id}">Xem</button></td></tr>`')
      : s)
  : null;

const DO_TRONG_TRANG = `(function(){
  const q = s => document.querySelector(s);
  const bang = q('#v-gopy .gy-chi-may');
  const khung = q('#v-gopy .table-wrap');
  const dungBang = bang && getComputedStyle(bang).display !== 'none';
  const ths = [...document.querySelectorAll('#v-gopy thead th')];
  const thHien = ths.filter(t => getComputedStyle(t).display !== 'none');
  const tr = q('#gy-bang tr');
  let cotTT = null;
  if (dungBang && khung) {
    const i = thHien.findIndex(t => t.textContent.trim() === 'Trạng thái');
    const o = i >= 0 && tr ? tr.children[i] : null;
    if (o) {
      const r = o.getBoundingClientRect(), k = khung.getBoundingClientRect();
      cotTT = { phai: Math.round(r.right - k.left), khung: khung.clientWidth,
                trongKhung: (r.right - k.left) <= khung.clientWidth + 1 };
    }
  }
  const the = q('#gy-the-ds .gy-the');
  return {
    dungBang,
    soThHien: thHien.length,
    soO: tr ? tr.children.length : null,
    tenThHien: thHien.map(t => t.textContent.trim()),
    cotTT,
    cuonNgang: khung ? khung.scrollWidth > khung.clientWidth + 1 : null,
    theChu: the ? the.innerText : null,
    theCoNhan: !!(the && the.querySelector('.tag')),
    tatCaThe: [...document.querySelectorAll('#gy-the-ds .gy-the')].map(x => x.innerText)
  };
})()`;

for (const VAI of ['AN', 'DUY', 'SEP']) {
  const than = JSON_VAI[VAI].than || JSON_VAI[VAI];
  const ho = NGUOI.find(n => n[0] === VAI);
  const may = await dungMayGia({
    commit: COMMIT, tatHoatAnh: true, suaTep,
    apiRieng(duong, u, traJson) {
      if (duong === '/api/toi-la-ai') {
        traJson({ ten_dang_nhap: 'tk' + VAI, ho_ten: ho[1], chuc_danh: 'Nhân viên',
          phong_ban: ho[2], vai_tro: ho[4], phai_doi_mk: 0, anh_dai_dien: null,
          trang_thai: 'dang_lam', nhan_su_id: VAI, id: VAI,
          quyen: ['tongquan', 'lichsuviec', 'danhba', 'chat', 'gopy'] });
        return true;
      }
      if (duong === '/api/gop-y') { traJson(than); return true; }
      return false;
    }
  });

  for (const RONG of RONGS) {
    const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: RONG, doiMs: 2600 });
    await cr.chay(`(function(){const b=[...document.querySelectorAll('[data-tab]')].find(x=>x.getAttribute('data-tab')==='gopy'); if(b) b.click(); return !!b;})()`);
    await cr.doi(900);
    const d = await cr.chay(DO_TRONG_TRANG);

    /* ---- A. Đếm ô: tiêu đề HIỆN phải bằng ô thân ---- */
    ok(`A · ${VAI} @${RONG}px · ô tiêu đề (${d.soThHien}) = ô thân (${d.soO})`,
       d.soO != null && d.soThHien === d.soO, d.tenThHien.join(' | '));

    /* ---- B. Trạng thái phải ĐỌC ĐƯỢC, không phải kéo ngang mới thấy ---- */
    if (d.dungBang) {
      ok(`B · ${VAI} @${RONG}px · cột Trạng thái nằm trọn trong khung nhìn`,
         !!(d.cotTT && d.cotTT.trongKhung),
         d.cotTT ? `mép phải ${d.cotTT.phai}px / khung ${d.cotTT.khung}px` : 'không tìm thấy cột');
    } else {
      ok(`B · ${VAI} @${RONG}px · đang dùng thẻ, thẻ có nhãn trạng thái`, d.theCoNhan);
    }

    /* ---- C. Thẻ trên điện thoại phải trả lời đủ ba câu + lý do ---- */
    if (RONG === 375) {
      const het = (d.tatCaThe || []).join('\n');
      ok(`C1 · ${VAI} @375px · thẻ có nhãn trạng thái`, d.theCoNhan);
      ok(`C2 · ${VAI} @375px · thẻ nói ai đang giữ`, /Chờ:/.test(het));
      ok(`C3 · ${VAI} @375px · thẻ nói đã chờ bao lâu`, /(đã \d+ ngày|từ hôm nay)/.test(het));
      ok(`C4 · ${VAI} @375px · thẻ nói lý do khi bị dừng`, het.includes(LY_DO_CONG_KHAI));
      if (VAI === 'AN')
        ok('C5 · @375px · thẻ người gửi KHÔNG lộ link PR / mức rủi ro nội bộ',
           !het.includes(BIMAT.pr) && !/Rủi ro đã chốt/.test(het));
    }

    ok(`Z · ${VAI} @${RONG}px · 0 lỗi console, 0 ngoại lệ`,
       cr.loiConsole.length === 0 && cr.ngoaiLe.length === 0,
       [...cr.loiConsole, ...cr.ngoaiLe].join(' | '));

    if (CHUP) {
      mkdirSync(CHUP, { recursive: true });
      const a = await cr.goi('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, cr.sessionId);
      writeFileSync(path.join(CHUP, `gopy-${VAI}-${RONG}.png`), Buffer.from(a.data, 'base64'));
    }
    cr.dong();
  }
  may.dong();
}

process.exit(tongKet() ? 0 : 1);
