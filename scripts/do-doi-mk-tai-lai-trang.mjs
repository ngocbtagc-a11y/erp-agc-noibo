/* ==========================================================================
   ĐO: ĐỔI MẬT KHẨU LẦN ĐẦU SAU KHI TẢI LẠI TRANG
   ---------------------------------------------------------------------------
   Lỗi 21/09/2026: người dùng mật khẩu tạm TẢI LẠI TRANG khi đang ở màn đổi
   mật khẩu → ô số điện thoại trên trang trống → đổi mật khẩu THÀNH CÔNG mà
   bước tự đăng nhập lại gửi số điện thoại rỗng, hỏng, và màn báo lỗi. Người
   dùng tưởng đổi hỏng, thử đổi lại bằng mật khẩu cũ (đã hết hiệu lực), rối
   thêm một vòng. Rơi đúng vào 10 bạn bán thời gian đăng nhập lần đầu trên
   điện thoại, ba ngày trước tuần làm thật đầu tiên.

   CÁCH ĐO: chạy NGUYÊN khối <script type="module"> của public/index.html —
   không chép lại logic ra đây — với một `document` và một `API` giả tối
   thiểu. Giả đúng hoàn cảnh tải lại trang: ô #tenDangNhap RỖNG, máy chủ báo
   phiên này đang phải đổi mật khẩu.

   HAI TÌNH HUỐNG:
     ① tự đăng nhập lại được   → dangNhap() phải nhận ĐÚNG số điện thoại, không rỗng
     ② tự đăng nhập lại hỏng   → màn KHÔNG được báo như đổi hỏng; phải hiện
                                 khung đăng nhập, điền sẵn số, nói "đã đổi thành công"

   ĐỎ TRƯỚC (luật giao việc từ 21/09/2026): chạy với `--truoc <số hiệu>` để đo
   bản CŨ — phải trượt. Số hiệu chết, không dùng tên nhánh.
     node scripts/do-doi-mk-tai-lai-trang.mjs --truoc bb53e55
     node scripts/do-doi-mk-tai-lai-trang.mjs
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iTruoc = process.argv.indexOf('--truoc');
const SO_HIEU_TRUOC = iTruoc > 0 ? process.argv[iTruoc + 1] : null;
if (SO_HIEU_TRUOC && !/^[0-9a-f]{7,40}$/.test(SO_HIEU_TRUOC)) {
  console.error('--truoc phải là SỐ HIỆU commit (7–40 ký tự hex), không nhận tên nhánh — tên nhánh di chuyển.');
  process.exit(2);
}

const html = SO_HIEU_TRUOC
  ? execFileSync('git', ['show', `${SO_HIEU_TRUOC}:public/index.html`], { cwd: GOC, encoding: 'utf8' })
  : readFileSync(path.join(GOC, 'public/index.html'), 'utf8');

/* Lấy nguyên khối module, bỏ dòng import (thay bằng API giả). */
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error('Không thấy khối <script type="module"> trong index.html'); process.exit(2); }
const THAN = m[1].replace(/^\s*import\s+\{\s*API\s*\}\s+from\s+['"][^'"]+['"];?\s*$/m, '');

const SDT = '0900000002';

/* ---- document giả tối thiểu: đủ những gì trang đụng tới ---------------- */
function dungTrang() {
  const nut = new Map();
  const phanTu = (id) => {
    if (!nut.has(id)) {
      const o = {
        id, value: '', hidden: false, textContent: '', disabled: false, minLength: 0,
        _nghe: {},
        classList: { add() {}, remove() {} },
        addEventListener(loai, fn) { this._nghe[loai] = fn; },
        focus() {}
      };
      nut.set(id, o);
    }
    return nut.get(id);
  };
  // Trạng thái ĐÚNG lúc tải lại trang: khối đăng nhập hiện, khối đổi ẩn,
  // mọi ô nhập RỖNG — kể cả ô số điện thoại.
  phanTu('#khoiDangNhap').hidden = false;
  phanTu('#khoiDoiMatKhau').hidden = true;
  /* querySelectorAll trả rỗng: trang chỉ dùng nó để gắn nút "hiện mật khẩu"
     cho các ô mật khẩu — không dính tới luồng đang đo. */
  const document = { querySelector: (s) => phanTu(s), querySelectorAll: () => [] };
  return { document, phanTu };
}

async function chay({ dangNhapHong }) {
  const { document, phanTu } = dungTrang();
  const goi = { dangNhap: [] };
  const API = {
    toiLaAi: async () => ({ phai_doi_mk: true, ten_dang_nhap: SDT, mat_khau_dai_toi_thieu: 8 }),
    doiMatKhau: async () => ({ ok: true }),
    dangNhap: async (ten, mk) => {
      goi.dangNhap.push(ten);
      if (dangNhapHong || !ten) throw new Error('Sai số điện thoại hoặc mật khẩu');
      return { ok: true };
    }
  };
  let chuyenTrang = null;
  const window = { location: { replace: (u) => { chuyenTrang = u; } }, addEventListener() {} };
  const navigator = {};

  const fn = new Function('document', 'API', 'window', 'navigator',
    `return (async () => { ${THAN} })();`);
  await fn(document, API, window, navigator);

  // Người dùng gõ mật khẩu cũ + mật khẩu mới, bấm Đổi.
  phanTu('#mkCu').value = 'Zalo-Tam-7kQ4';
  phanTu('#mkMoi').value = 'Kho-Onfod-Moi-2026!';
  phanTu('#mkMoi2').value = 'Kho-Onfod-Moi-2026!';
  await phanTu('#formDoiMatKhau')._nghe.submit({ preventDefault() {} });

  return {
    goiDangNhapVoi: goi.dangNhap.at(-1),
    chuyenTrang,
    loiDoi: phanTu('#loiDoi').textContent,
    loi: phanTu('#loi').textContent,
    khoiDangNhapHien: phanTu('#khoiDangNhap').hidden === false,
    khoiDoiAn: phanTu('#khoiDoiMatKhau').hidden === true,
    sdtDienSan: phanTu('#tenDangNhap').value
  };
}

/* ---- Chấm ----------------------------------------------------------------- */
let soPhep = 0, soTruot = 0;
const ok = (nhan, dk, ct = '') => {
  soPhep++; if (!dk) soTruot++;
  console.log(`  ${dk ? '✅' : '❌'} ${nhan}${ct ? ' — ' + ct : ''}`);
};

console.log(`\nĐỔI MẬT KHẨU SAU KHI TẢI LẠI TRANG — ${SO_HIEU_TRUOC ? 'bản CŨ ' + SO_HIEU_TRUOC : 'bản hiện tại'}\n`);

console.log('① Tự đăng nhập lại chạy được');
const a = await chay({ dangNhapHong: false });
ok('dangNhap() nhận ĐÚNG số điện thoại, không phải chuỗi rỗng', a.goiDangNhapVoi === SDT, JSON.stringify(a.goiDangNhapVoi));
ok('vào thẳng ERP sau khi đổi', a.chuyenTrang === 'app.html', String(a.chuyenTrang));
ok('không báo lỗi ở màn đổi mật khẩu', !a.loiDoi, a.loiDoi || '(trống)');

console.log('\n② Tự đăng nhập lại HỎNG — nhưng mật khẩu ĐÃ đổi xong');
const b = await chay({ dangNhapHong: true });
ok('KHÔNG báo lỗi ở màn đổi mật khẩu (việc đổi đã thành công)', !b.loiDoi, b.loiDoi || '(trống)');
ok('nói thẳng "đã đổi thành công"', /đã đổi mật khẩu thành công/i.test(b.loi), b.loi || '(trống)');
ok('khung đăng nhập HIỆN ra (không phải màn trắng)', b.khoiDangNhapHien && b.khoiDoiAn,
   `khoiDangNhap hiện=${b.khoiDangNhapHien} · khoiDoiMatKhau ẩn=${b.khoiDoiAn}`);
ok('số điện thoại được điền sẵn', b.sdtDienSan === SDT, JSON.stringify(b.sdtDienSan));

const SAN = 7;
console.log(`\nĐÃ CHẠY ${soPhep} phép (sàn ${SAN}) · TRƯỢT ${soTruot}`);
if (soPhep < SAN) { console.log('❌ Dưới sàn — bàn đo KHÔNG được coi là xanh.'); process.exit(1); }
if (SO_HIEU_TRUOC) {
  console.log(soTruot > 0
    ? `✓ Bản cũ TRƯỢT ${soTruot} phép — phép thử có mắt, lỗi là có thật.`
    : '✗ Bản cũ KHÔNG trượt phép nào — phép thử không bắt được lỗi, bàn đo hỏng.');
  process.exit(soTruot > 0 ? 0 : 1);
}
process.exit(soTruot ? 1 : 0);
