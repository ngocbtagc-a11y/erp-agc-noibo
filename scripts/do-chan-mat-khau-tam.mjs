/* ==========================================================================
   ĐO: "MẬT KHẨU TẠM PHẢI ĐỔI NGAY" — CHẶN Ở MÁY CHỦ, KHÔNG CHỈ Ở TRÌNH DUYỆT
   ---------------------------------------------------------------------------
   Chỗ hở (trước bản vá): luật chỉ nằm ở public/assets/js/app.js — thấy
   `phai_doi_mk` thì chuyển trang. Máy chủ KHÔNG kiểm cờ, nên người cầm mật
   khẩu tạm (gửi qua Zalo, tồn tại mãi) gọi thẳng API làm được mọi việc.

   Bản vá: batBuocDangNhap() ở src/index.js chặn phiên `phai_doi_mk = 1` bằng
   403 `PHAI_DOI_MAT_KHAU` trên MỌI đường, trừ DANH SÁCH TRẮNG
   `DUONG_CHO_PHEP_KHI_PHAI_DOI_MK`.

   CÁCH ĐO (BH-34): SQLite THẬT (`scripts/ban-thu-d1.mjs`, schema.sql + toàn
   bộ migrations), gọi `worker.fetch()` NGUYÊN BẢN qua bộ định tuyến, cookie
   phiên thật. Mạng ra ngoài bị chặn cứng (trừ Telegram đã giả sẵn).

   CA ĐỐI CHỨNG (BH-16) — chạy cùng bộ phép đo trên bản `src` LÀM HỎNG CỐ Ý,
   bàn đo PHẢI bắt được từng ca:
     DC-A  gỡ phép chặn                       → mật khẩu tạm lọt vào nghiệp vụ
     DC-B  viết lại thành DANH SÁCH ĐEN        → đường API mới thêm lọt
     DC-C  đổi mật khẩu mà quên hạ cờ về 0    → người dùng bị nhốt sau khi đổi
     DC-D  thiếu cột mà hỏng theo chiều ĐÓNG  → khoá cả công ty vì một cột
     DC-E  đọc cờ không phòng thủ              → thiếu cột là 500 toàn hệ thống

   SÀN SỐ PHÉP: bàn đo ĐẾM số phép đã chạy và đòi đủ sàn. "Trượt = 0" mà không
   phép nào chạy KHÔNG được ra exit 0.

   ĐO TRƯỚC BẢN VÁ — dùng SỐ HIỆU COMMIT CHẾT, không dùng tên nhánh:
     node scripts/do-chan-mat-khau-tam.mjs --truoc ba93bac
   (chỉ chạy bảng đo chính trên cây cũ, in số trượt; KHÔNG chấm đạt/trượt.)

   Chạy:  node scripts/do-chan-mat-khau-tam.mjs
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, TELEGRAM } from './ban-thu-d1.mjs';
import { bamMatKhau, TEN_COOKIE } from '../src/auth.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');
const MA = 'PHAI_DOI_MAT_KHAU';

/* Chặn cứng mạng ra ngoài (Shopee/TikTok/Google…) — lượt quét toàn bộ đường
   bên dưới gọi cả những đường KHÔNG qua cửa phiên. ban-thu-d1 đã bọc fetch
   cho Telegram; bọc thêm một lớp ngoài: chỉ Telegram được đi tiếp. */
const fetchBanThu = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.telegram.org')) return fetchBanThu(url, init);
  return new Response('{"loi":"bàn đo chặn mạng"}', { status: 599 });
};

datDongHo('2026-09-21T03:00:00Z');   // 10:00 giờ VN

/* ---- Đếm phép + sàn ----------------------------------------------------- */

let soPhep = 0, soDat = 0, soTruot = 0;
function ok(nhan, dieuKien, chiTiet = '') {
  soPhep++;
  if (dieuKien) soDat++; else soTruot++;
  console.log(`  ${dieuKien ? '✅' : '❌'} ${nhan}${chiTiet ? ' — ' + chiTiet : ''}`);
  return !!dieuKien;
}

/* ---- Mồi dữ liệu -------------------------------------------------------- */

const MK_TAM = 'Zalo-Tam-7kQ4';           // mật khẩu tạm "đã gửi qua Zalo"
const MK_MOI = 'Kho-Onfod-Moi-2026!';     // mật khẩu người dùng tự đặt
const NGUOI = [
  // id tk, mã NS,  họ tên,                 tên đăng nhập, vai trò,          phải đổi MK
  [1, 'SEP',  'Bùi Thị Ngọc',            '0900000001',  'admin',          0],
  [2, 'TAM',  'Nguyễn Thị Bán Thời Gian', '0900000002',  'nhan_vien_kho',  1],
  [3, 'THUONG','Trần Văn Kho',           '0900000003',  'nhan_vien_kho',  0]
];

async function moi(db) {
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  const ns = db.prepare(
    'INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam, loai_lao_dong) VALUES (?,?,?,?,?,?,1,?)');
  const tk = db.prepare(
    'INSERT INTO tai_khoan (id, nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat, phai_doi_mk) VALUES (?,?,?,?,?,1,?)');
  const hashTam = await bamMatKhau(MK_TAM);
  const hashThuong = await bamMatKhau('Mat-Khau-Cu-Cua-Kho-9');
  for (const [id, ma, ten, dn, vt, doi] of NGUOI) {
    // Hai bạn kho là bán thời gian — đúng nhóm sắp tự đăng ký ca.
    ns.run(ma, ten, ma.slice(0, 2), 'NV', 'Kho vận', null, ma === 'SEP' ? 'toan_thoi_gian' : 'ban_thoi_gian');
    tk.run(id, ma, dn, doi ? hashTam : hashThuong, vt, doi);
  }
}

const JSONH = { 'Content-Type': 'application/json' };
const post = (worker, env, duong, token, than = {}) =>
  goiAPI(worker, env, duong, token, { method: 'POST', headers: JSONH, body: JSON.stringify(than) });

/* Đường nghiệp vụ dùng để đo — đủ cả ĐỌC lẫn GHI. */
const DUONG_NGHIEP_VU = [
  ['GET',  '/api/gop-y'],             // danh sách góp ý
  ['POST', '/api/ca/dang-ky'],        // đăng ký ca — đúng việc các bạn bán thời gian sắp làm
  ['GET',  '/api/danh-ba'],
  ['GET',  '/api/thong-bao'],
  ['POST', '/api/gop-y']              // gửi góp ý (GHI)
];
const goi = (worker, env, [m, d], token) =>
  m === 'GET' ? goiAPI(worker, env, d, token)
              : post(worker, env, d, token, d === '/api/gop-y'
                  ? { tieu_de: 'Máy in tem kẹt', boi_canh: 'bc', vuong_o_dau: 'vd', mong_muon: 'mm' }
                  : { ca_mo_id: 1 });

/* Đọc bảng định tuyến THẬT ra khỏi mã nguồn (không gõ tay danh sách). */
function cacDuongTrongRouter(thuMucSrc) {
  const s = readFileSync(path.join(thuMucSrc, 'index.js'), 'utf8');
  const dau = s.indexOf('const DUONG_DAN = {');
  const cuoi = s.indexOf('\n};', dau);
  const khoi = s.slice(dau, cuoi);
  return [...khoi.matchAll(/^\s*'((?:GET |POST) \/api\/[^']*)'\s*:/gm)].map(m => m[1]);
}

/* Đọc DANH SÁCH TRẮNG thật ra khỏi mã nguồn — không gõ tay lại ở đây. */
function danhSachTrang(thuMucSrc) {
  const s = readFileSync(path.join(thuMucSrc, 'index.js'), 'utf8');
  const dau = s.indexOf('const DUONG_CHO_PHEP_KHI_PHAI_DOI_MK = Object.freeze({');
  if (dau < 0) return [];
  const khoi = s.slice(dau, s.indexOf('});', dau));
  return [...khoi.matchAll(/^\s*'((?:GET |POST) \/api\/[^']*)'\s*:/gm)].map(m => m[1]);
}

/* ---- Một vòng đo trên MỘT bản src --------------------------------------- */

async function napWorker(thuMucSrc) {
  const url = pathToFileURL(path.join(thuMucSrc, 'index.js')).href + `?v=${Math.random()}`;
  return (await import(url)).default;
}

async function doChinh(thuMucSrc, { quet = true } = {}) {
  const { db, d1 } = dungDB();
  await moi(db);
  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);
  const tokTam = await taoPhienThat(env, 2);
  const tokThuong = await taoPhienThat(env, 3);
  const kq = { tam: {}, thuong: {} };

  // ① Tài khoản mật khẩu tạm gọi thẳng đường nghiệp vụ
  const soGopYTruoc = db.prepare('SELECT COUNT(*) AS n FROM gop_y').get().n;
  for (const d of DUONG_NGHIEP_VU) kq.tam[d.join(' ')] = await goi(worker, env, d, tokTam);
  kq.gopYTamGhiDuoc = db.prepare('SELECT COUNT(*) AS n FROM gop_y').get().n - soGopYTruoc;

  // ② Tài khoản thường — cùng các đường đó
  for (const d of DUONG_NGHIEP_VU) kq.thuong[d.join(' ')] = await goi(worker, env, d, tokThuong);
  kq.thuongToiLaAi = await goiAPI(worker, env, '/api/toi-la-ai', tokThuong);

  /* ②b Ba đường nạp file đọc KHUNG BYTE trước rồi mới hỏi phiên — lượt quét
     với thân rỗng chỉ ra 400 ở bước đọc khung. Gửi một khung HỢP LỆ để chứng
     minh tới lượt hỏi phiên thì vẫn bị chặn. */
  const moTa = new TextEncoder().encode(JSON.stringify({ dich: 'ton_kho', ten_tep: 'ton.csv' }));
  const byte = new TextEncoder().encode('ma_sku,so_luong\nONF-HAT-DIEU-500G,10\n');
  const khung = new Uint8Array(4 + moTa.length + byte.length);
  new DataView(khung.buffer).setUint32(0, moTa.length, false);
  khung.set(moTa, 4); khung.set(byte, 4 + moTa.length);
  kq.nap = {};
  for (const d of ['/api/kho/nap-mo', '/api/kho/nap-xem', '/api/kho/nap-ghi'])
    kq.nap[d] = await goiAPI(worker, env, d, tokTam,
      { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: khung });

  // ③ Danh sách trắng: tôi là ai
  kq.tamToiLaAi = await goiAPI(worker, env, '/api/toi-la-ai', tokTam);

  // ④ Đường API MỚI thêm vào router (chỉ có ở bản dựng kèm đường giả)
  kq.tamDuongMoi = await goiAPI(worker, env, '/api/duong-gia-moi', tokTam);
  kq.thuongDuongMoi = await goiAPI(worker, env, '/api/duong-gia-moi', tokThuong);

  // ⑤ Quét TOÀN BỘ router bằng phiên mật khẩu tạm (trước khi đổi mật khẩu)
  if (quet) {
    const cac = cacDuongTrongRouter(thuMucSrc);
    const trang = danhSachTrang(thuMucSrc);
    kq.quet = { tong: cac.length, chan: [], khongChan: [], trangDuocDi: [] };
    const tokRac = 'khong-phai-phien-that';
    for (const k of cac) {
      const [m, d] = k.split(/\s+/);
      if (d === '/api/dang-xuat' || d === '/api/doi-mat-khau') continue;   // đo riêng bên dưới
      const r = m === 'GET' ? await goiAPI(worker, env, d, tokTam) : await post(worker, env, d, tokTam);
      if (r.status === 403 && r.than?.ma === MA) { kq.quet.chan.push(k); continue; }
      if (trang.includes(k)) { kq.quet.trangDuocDi.push(k); continue; }
      // Không bị chặn: phải là đường KHÔNG dùng phiên — người lạ gọi cũng ra đúng mã đó.
      const rLa = m === 'GET' ? await goiAPI(worker, env, d, tokRac) : await post(worker, env, d, tokRac);
      kq.quet.khongChan.push({ k, ma: r.status, maNguoiLa: rLa.status });
    }
    // Tài khoản thường: KHÔNG đường nào được trả mã PHAI_DOI_MAT_KHAU
    kq.quetThuong = [];
    for (const k of cac) {
      const [m, d] = k.split(/\s+/);
      if (m !== 'GET') continue;           // chỉ quét đường ĐỌC, tránh ghi lung tung dữ liệu mồi
      const r = await goiAPI(worker, env, d, tokThuong);
      if (r.than?.ma === MA) kq.quetThuong.push(k);
    }
    kq.quetThuongTong = cac.filter(k => k.startsWith('GET')).length;
  }

  // ⑥ Đổi mật khẩu bằng chính phiên mật khẩu tạm
  const tkTruoc = db.prepare('SELECT mat_khau_hash, phai_doi_mk FROM tai_khoan WHERE id = 2').get();
  kq.doiMk = await post(worker, env, '/api/doi-mat-khau', tokTam, { mat_khau_cu: MK_TAM, mat_khau_moi: MK_MOI });
  const tkSau = db.prepare('SELECT mat_khau_hash, phai_doi_mk FROM tai_khoan WHERE id = 2').get();
  kq.coSauDoi = tkSau.phai_doi_mk;
  kq.hashDoi = tkSau.mat_khau_hash !== tkTruoc.mat_khau_hash;
  kq.phienCuSauDoi = await goiAPI(worker, env, '/api/toi-la-ai', tokTam);

  // ⑦ Đăng nhập lại bằng mật khẩu mới → gọi lại đường nghiệp vụ
  const reqDn = new Request('https://erp.test/api/dang-nhap', {
    method: 'POST', headers: JSONH, body: JSON.stringify({ ten_dang_nhap: '0900000002', mat_khau: MK_MOI })
  });
  const resDn = await worker.fetch(reqDn, env);
  kq.dangNhapLai = resDn.status;
  const m = (resDn.headers.get('Set-Cookie') || '').match(new RegExp(TEN_COOKIE + '=([^;]+)'));
  const tokMoi = m ? m[1] : null;
  kq.sauDoi = {};
  for (const d of DUONG_NGHIEP_VU) kq.sauDoi[d.join(' ')] = tokMoi ? await goi(worker, env, d, tokMoi) : { status: 0 };

  // ⑧ Đăng xuất bằng một phiên mật khẩu tạm KHÁC (đặt cờ lại để đo)
  db.prepare('UPDATE tai_khoan SET phai_doi_mk = 1 WHERE id = 2').run();
  const tokTam2 = await taoPhienThat(env, 2);
  kq.tamDangXuat = await post(worker, env, '/api/dang-xuat', tokTam2);
  kq.phienSauDangXuat = await goiAPI(worker, env, '/api/toi-la-ai', tokTam2);

  db.close?.();
  return kq;
}

/* ---- Thiếu cột phai_doi_mk (deploy code trước, CSDL sau) ---------------- */

async function doThieuCot(thuMucSrc) {
  const { db, d1 } = dungDB();
  await moi(db);
  const env = dungEnv(d1);
  const worker = await napWorker(thuMucSrc);
  const tokThuong = await taoPhienThat(env, 3), tokSep = await taoPhienThat(env, 1);
  db.exec('ALTER TABLE tai_khoan DROP COLUMN phai_doi_mk');
  const r = { conCot: db.prepare("SELECT name FROM pragma_table_info('tai_khoan')").all().map(x => x.name) };
  const tgTruoc = TELEGRAM.length;
  const canhBao = [];
  const warnCu = console.warn, errCu = console.error;
  console.warn = (...a) => canhBao.push(a.join(' '));
  console.error = () => {};      // ca DC-E cố ý ném 500 — không cần in 8 vết ngăn xếp
  try {
    r.ma = [];
    for (const d of ['/api/toi-la-ai', '/api/gop-y', '/api/danh-ba', '/api/thong-bao']) {
      r.ma.push((await goiAPI(worker, env, d, tokThuong)).status);
      r.ma.push((await goiAPI(worker, env, d, tokSep)).status);
    }
  } finally { console.warn = warnCu; console.error = errCu; }
  r.warn = canhBao.filter(s => /phai_doi_mk/.test(s)).length;
  r.telegram = TELEGRAM.slice(tgTruoc).filter(s => /phai_doi_mk/.test(s)).length;
  db.close?.();
  return r;
}

/* ---- Chấm một bản đo: trả danh sách phép trượt (không in) ---------------- */

function cham(k, { coDuongMoi }) {
  const t = [];
  const la403 = (r) => r?.status === 403 && r?.than?.ma === MA;
  for (const d of DUONG_NGHIEP_VU) if (!la403(k.tam[d.join(' ')])) t.push('tam-lot:' + d.join(' '));
  if (k.gopYTamGhiDuoc !== 0) t.push('tam-ghi-duoc');
  for (const d of DUONG_NGHIEP_VU) if (k.thuong[d.join(' ')]?.than?.ma === MA) t.push('thuong-bi-chan:' + d.join(' '));
  if (k.tamToiLaAi.status !== 200 || k.tamToiLaAi.than?.phai_doi_mk !== true) t.push('toi-la-ai');
  if (coDuongMoi && !la403(k.tamDuongMoi)) t.push('duong-moi-lot');
  if (coDuongMoi && k.thuongDuongMoi.status !== 200) t.push('duong-moi-thuong');
  if (k.doiMk.status !== 200) t.push('doi-mk');
  if (k.coSauDoi !== 0) t.push('co-chua-ve-0');
  if (k.dangNhapLai !== 200) t.push('dang-nhap-lai');
  for (const d of DUONG_NGHIEP_VU) if (la403(k.sauDoi[d.join(' ')])) t.push('sau-doi-van-chan:' + d.join(' '));
  return t;
}

/* ---- Dựng bản src (thật + đường giả, hoặc làm hỏng cố ý) ----------------- */

const THU_MUC_TAM = mkdtempSync(path.join(tmpdir(), 'do-mk-tam-'));
let soBan = 0;
function banSrc(ten, tuSrc, sua) {
  const thuMuc = path.join(THU_MUC_TAM, `${++soBan}-${ten}`);
  mkdirSync(thuMuc, { recursive: true });
  for (const f of readdirSync(tuSrc)) {
    let noi = readFileSync(path.join(tuSrc, f), 'utf8');
    const moiNoi = sua(f, noi);
    writeFileSync(path.join(thuMuc, f), moiNoi, 'utf8');
  }
  return thuMuc;
}
/* Thay chuỗi và ĐÒI phải thay được — thay trượt mà im lặng thì ca đối chứng
   đo lại đúng bản thật và "bắt được" bằng may mắn (BH-16). */
function thay(noi, cu, moi, ten) {
  if (!noi.includes(cu)) throw new Error(`[${ten}] không tìm thấy chuỗi cần thay: ${cu.slice(0, 60)}`);
  return noi.replace(cu, moi);
}
const THEM_DUONG_GIA = (f, s) => f !== 'index.js' ? s : thay(s,
  `  'POST /api/doi-mat-khau':  doiMatKhau,`,
  `  'POST /api/doi-mat-khau':  doiMatKhau,` +
  ` 'GET  /api/duong-gia-moi': async (req, env) => { const { loi: l } = await batBuocDangNhap(req, env); ` +
  `if (l) return l; return json({ ok: true }); },`, 'đường giả');

/* ==========================================================================
   CHẾ ĐỘ ĐO TRƯỚC: --truoc <commit>
   ========================================================================== */

const iTruoc = process.argv.indexOf('--truoc');
if (iTruoc > 0) {
  const commit = process.argv[iTruoc + 1];
  if (!/^[0-9a-f]{7,40}$/.test(commit || ''))
    throw new Error('--truoc phải là SỐ HIỆU COMMIT (vd ba93bac), không nhận tên nhánh — tên nhánh trôi theo thời gian.');
  const thuMuc = path.join(THU_MUC_TAM, 'truoc-' + commit);
  mkdirSync(thuMuc, { recursive: true });
  const tep = execFileSync('git', ['ls-tree', '--name-only', commit, 'src/'], { cwd: GOC, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  for (const f of tep)
    writeFileSync(path.join(thuMuc, path.basename(f)),
      execFileSync('git', ['show', `${commit}:${f}`], { cwd: GOC, encoding: 'utf8', maxBuffer: 64 << 20 }), 'utf8');
  const banTruoc = banSrc('truoc-duong-gia', thuMuc, THEM_DUONG_GIA);
  const k = await doChinh(banTruoc, { quet: false });
  const tr = cham(k, { coDuongMoi: true });
  console.log(`\nĐO TRƯỚC trên commit ${commit}: ${tr.length} phép trượt`);
  for (const x of tr) console.log('  ❌ ' + x);
  rmSync(THU_MUC_TAM, { recursive: true, force: true });
  process.exit(0);
}

/* ==========================================================================
   BẢN THẬT
   ========================================================================== */

console.log('\n=== BẢN THẬT (kèm một đường API giả mới thêm vào router) ===\n');
const banThat = banSrc('that-duong-gia', SRC, THEM_DUONG_GIA);
const k = await doChinh(banThat);

console.log('— Tài khoản mật khẩu tạm gọi thẳng đường nghiệp vụ —');
for (const d of DUONG_NGHIEP_VU) {
  const r = k.tam[d.join(' ')];
  ok(`${d.join(' ')} → 403 + mã ${MA}`, r.status === 403 && r.than?.ma === MA,
     `HTTP ${r.status} · ma=${r.than?.ma}`);
}
ok('Câu báo lỗi là tiếng Việt rõ ràng', /mật khẩu tạm/i.test(k.tam['GET /api/gop-y'].than?.loi || ''),
   JSON.stringify(k.tam['GET /api/gop-y'].than?.loi));
for (const [d, r] of Object.entries(k.nap))
  ok(`POST ${d} với khung file HỢP LỆ → 403 + mã (đọc khung trước, vẫn chặn ở cửa phiên)`,
     r.status === 403 && r.than?.ma === MA, `HTTP ${r.status} · ma=${r.than?.ma}`);
ok('Gửi góp ý bằng mật khẩu tạm KHÔNG ghi được dòng nào', k.gopYTamGhiDuoc === 0, `+${k.gopYTamGhiDuoc} dòng gop_y`);

console.log('\n— Danh sách trắng —');
ok('GET /api/toi-la-ai → 200 và báo phai_doi_mk = true',
   k.tamToiLaAi.status === 200 && k.tamToiLaAi.than?.phai_doi_mk === true,
   `HTTP ${k.tamToiLaAi.status} · phai_doi_mk=${k.tamToiLaAi.than?.phai_doi_mk}`);
ok('toi-la-ai vẫn trả độ dài mật khẩu tối thiểu cho màn đổi mật khẩu',
   Number.isInteger(k.tamToiLaAi.than?.mat_khau_dai_toi_thieu), String(k.tamToiLaAi.than?.mat_khau_dai_toi_thieu));
ok('POST /api/doi-mat-khau → 200', k.doiMk.status === 200, 'HTTP ' + k.doiMk.status);
ok('Đổi xong: cờ phai_doi_mk về 0 và mật khẩu đổi — cùng một lượt ghi', k.coSauDoi === 0 && k.hashDoi,
   `phai_doi_mk=${k.coSauDoi} · hash đổi=${k.hashDoi}`);
ok('Phiên mật khẩu tạm cũ bị huỷ sau khi đổi (401)', k.phienCuSauDoi.status === 401, 'HTTP ' + k.phienCuSauDoi.status);
ok('Đăng nhập lại bằng mật khẩu mới → 200', k.dangNhapLai === 200, 'HTTP ' + k.dangNhapLai);
for (const d of DUONG_NGHIEP_VU) {
  const r = k.sauDoi[d.join(' ')];
  ok(`Sau khi đổi: ${d.join(' ')} đi vào tới nghiệp vụ (không 401/403)`,
     r.status !== 0 && r.status !== 401 && r.status !== 403,
     `HTTP ${r.status}${r.than?.loi ? ' · ' + r.than.loi : ''}`);
}
ok('Sau khi đổi: GET /api/gop-y → 200', k.sauDoi['GET /api/gop-y'].status === 200, 'HTTP ' + k.sauDoi['GET /api/gop-y'].status);
ok('POST /api/dang-xuat bằng phiên mật khẩu tạm → 200, phiên hết hiệu lực',
   k.tamDangXuat.status === 200 && k.phienSauDangXuat.status === 401,
   `đăng xuất ${k.tamDangXuat.status} · gọi lại ${k.phienSauDangXuat.status}`);

console.log('\n— Tài khoản thường KHÔNG bị ảnh hưởng —');
for (const d of DUONG_NGHIEP_VU) {
  const r = k.thuong[d.join(' ')];
  ok(`${d.join(' ')} đi vào tới nghiệp vụ (không 401/403)`,
     r.status !== 401 && r.status !== 403, `HTTP ${r.status}${r.than?.loi ? ' · ' + r.than.loi : ''}`);
}
ok('GET /api/gop-y → 200', k.thuong['GET /api/gop-y'].status === 200, 'HTTP ' + k.thuong['GET /api/gop-y'].status);
ok('GET /api/danh-ba → 200', k.thuong['GET /api/danh-ba'].status === 200, 'HTTP ' + k.thuong['GET /api/danh-ba'].status);
ok('GET /api/toi-la-ai → 200, phai_doi_mk = false',
   k.thuongToiLaAi.status === 200 && k.thuongToiLaAi.than?.phai_doi_mk === false, 'HTTP ' + k.thuongToiLaAi.status);
ok(`Quét ${k.quetThuongTong} đường GET: KHÔNG đường nào trả ${MA} cho tài khoản thường`,
   k.quetThuongTong >= 80 && k.quetThuong.length === 0,
   k.quetThuong.length ? 'bị chặn nhầm: ' + k.quetThuong.join(', ') : `${k.quetThuongTong} đường sạch`);

console.log('\n— Đường API MỚI thêm vào router: bị chặn theo MẶC ĐỊNH —');
ok('GET /api/duong-gia-moi (không nằm ở danh sách nào) → 403 + mã',
   k.tamDuongMoi.status === 403 && k.tamDuongMoi.than?.ma === MA, 'HTTP ' + k.tamDuongMoi.status);
ok('Cùng đường đó, tài khoản thường → 200', k.thuongDuongMoi.status === 200, 'HTTP ' + k.thuongDuongMoi.status);

console.log('\n— Quét TOÀN BỘ router bằng phiên mật khẩu tạm —');
const q = k.quet;
const trangThat = danhSachTrang(SRC);
const routerThat = cacDuongTrongRouter(SRC);
ok('Danh sách trắng đúng 3 đường: đổi mật khẩu · tôi là ai · đăng xuất',
   JSON.stringify([...trangThat].sort()) ===
   JSON.stringify(['GET  /api/toi-la-ai', 'POST /api/dang-xuat', 'POST /api/doi-mat-khau']),
   trangThat.join(' | '));
ok('Mỗi khoá trong danh sách trắng có THẬT trong router (không gõ sai dấu cách)',
   trangThat.length > 0 && trangThat.every(x => routerThat.includes(x)),
   trangThat.filter(x => !routerThat.includes(x)).join(', ') || 'khớp cả 3');
ok('Lượt quét: đường trắng duy nhất được đi (ngoài 2 đường đo riêng) là toi-la-ai',
   JSON.stringify(q.trangDuocDi) === JSON.stringify(['GET  /api/toi-la-ai']), q.trangDuocDi.join(', '));
ok(`Đọc được bảng định tuyến thật (${q.tong} đường)`, q.tong >= 200, q.tong + ' đường');
ok(`${q.chan.length} đường bị chặn bằng ${MA}`, q.chan.length >= 200, q.chan.length + ' đường');
const lotPhien = q.khongChan.filter(x => x.ma !== x.maNguoiLa);
ok('Mọi đường KHÔNG bị chặn đều là đường không dùng phiên (người lạ gọi cũng ra đúng mã đó)',
   lotPhien.length === 0,
   lotPhien.length ? 'LỌT: ' + lotPhien.map(x => `${x.k} (${x.ma} vs lạ ${x.maNguoiLa})`).join(', ')
                   : q.khongChan.map(x => `${x.k.replace(/\s+/, ' ')}→${x.ma}`).join(' · '));

/* ---- Thiếu cột ------------------------------------------------------------ */

console.log('\n=== THIẾU CỘT tai_khoan.phai_doi_mk (deploy code trước, CSDL sau) ===\n');
const tc = await doThieuCot(SRC);
ok('Đã dựng đúng ca: cột phai_doi_mk KHÔNG còn trong CSDL', !tc.conCot.includes('phai_doi_mk'));
ok('8 lượt gọi (4 đường × 2 phiên) đều 200 — KHÔNG khoá cả hệ thống, KHÔNG 500',
   tc.ma.length === 8 && tc.ma.every(x => x === 200), tc.ma.join(','));
ok('Có console.warn nói rõ thiếu cột', tc.warn > 0, tc.warn + ' dòng');
ok('Có đúng 1 tin Telegram cảnh báo (một lần/ngày)', tc.telegram === 1, tc.telegram + ' tin');

/* ==========================================================================
   CA ĐỐI CHỨNG — src LÀM HỎNG CỐ Ý, bàn đo PHẢI bắt được
   ========================================================================== */

console.log('\n=== CA ĐỐI CHỨNG (BH-16) ===\n');

const CHOT_CHAN = 'if (phien.phai_doi_mk && !Object.hasOwn(DUONG_CHO_PHEP_KHI_PHAI_DOI_MK, khoaDuong(req))) {';

// DC-A: gỡ phép chặn
{
  const b = banSrc('dc-a', banThat, (f, s) => f !== 'index.js' ? s : thay(s, CHOT_CHAN, 'if (false) {', 'DC-A'));
  const tr = cham(await doChinh(b, { quet: false }), { coDuongMoi: true });
  ok('DC-A gỡ phép chặn → bàn đo bắt được mật khẩu tạm lọt vào nghiệp vụ',
     tr.some(x => x.startsWith('tam-lot:')) && tr.includes('duong-moi-lot'), tr.join(', ') || 'KHÔNG bắt được');
}

// DC-B: viết lại thành DANH SÁCH ĐEN liệt kê đúng các đường nghiệp vụ đang biết
{
  const den = DUONG_NGHIEP_VU.map(([m, d]) => `'${m.padEnd(4)} ${d}'`).join(', ');
  const b = banSrc('dc-b', banThat, (f, s) => f !== 'index.js' ? s : thay(s, CHOT_CHAN,
    `if (phien.phai_doi_mk && [${den}].includes(khoaDuong(req))) {`, 'DC-B'));
  const tr = cham(await doChinh(b, { quet: false }), { coDuongMoi: true });
  ok('DC-B danh sách đen → các đường đã biết vẫn chặn, NHƯNG đường mới lọt và bàn đo bắt được',
     tr.length === 1 && tr[0] === 'duong-moi-lot', tr.join(', ') || 'KHÔNG bắt được');
}

// DC-C: đổi mật khẩu mà quên hạ cờ
{
  const b = banSrc('dc-c', banThat, (f, s) => f !== 'index.js' ? s : thay(s,
    "'UPDATE tai_khoan SET mat_khau_hash = ?, phai_doi_mk = 0 WHERE id = ?'",
    "'UPDATE tai_khoan SET mat_khau_hash = ? WHERE id = ?'", 'DC-C'));
  const tr = cham(await doChinh(b, { quet: false }), { coDuongMoi: true });
  ok('DC-C quên hạ cờ khi đổi mật khẩu → bàn đo bắt được người dùng bị nhốt',
     tr.includes('co-chua-ve-0') && tr.some(x => x.startsWith('sau-doi-van-chan:')), tr.join(', ') || 'KHÔNG bắt được');
}

// DC-D: thiếu cột mà hỏng theo chiều ĐÓNG (coi như ai cũng phải đổi)
{
  const b = banSrc('dc-d', SRC, (f, s) => f !== 'auth.js' ? s : thay(s,
    "coDoiMk ? 't.phai_doi_mk' : '0 AS phai_doi_mk'", "coDoiMk ? 't.phai_doi_mk' : '1 AS phai_doi_mk'", 'DC-D'));
  const r = await doThieuCot(b);
  ok('DC-D thiếu cột hỏng theo chiều đóng → bàn đo bắt được cả công ty bị khoá',
     !r.ma.every(x => x === 200), r.ma.join(','));
}

// DC-E: đọc cờ không phòng thủ (bỏ nhánh bắt lỗi thiếu cột)
{
  const b = banSrc('dc-e', SRC, (f, s) => f !== 'auth.js' ? s : thay(s,
    'if (coDoiMk && /phai_doi_mk/i.test(tin)) {', 'if (false) {', 'DC-E'));
  const r = await doThieuCot(b);
  ok('DC-E đọc cờ không phòng thủ → bàn đo bắt được 500 toàn hệ thống',
     r.ma.some(x => x === 500), r.ma.join(','));
}

rmSync(THU_MUC_TAM, { recursive: true, force: true });

/* ---- Tổng kết + SÀN ------------------------------------------------------ */

const SAN = 45;   // bản 21/09/2026 chạy ra 49 phép — sàn thấp hơn một chút cho phép gọt phép thừa, không cho mất cả khối
console.log(`\n${'='.repeat(72)}\nĐÃ CHẠY ${soPhep} phép (sàn ${SAN}) · ĐẠT ${soDat} · TRƯỢT ${soTruot}`);
if (soPhep < SAN) {
  console.log(`❌ Chỉ chạy ${soPhep} phép, dưới sàn ${SAN} — bàn đo KHÔNG được coi là xanh.`);
  process.exit(1);
}
process.exit(soTruot === 0 ? 0 : 1);
