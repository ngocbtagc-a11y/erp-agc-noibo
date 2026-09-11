/* ==========================================================================
   BÀN ĐO BIÊN CHẾ VĂN PHÒNG ẢO — ai hiện, ai nhận câu hỏi, ai lên bảng
   ---------------------------------------------------------------------------
   Chạy:  npm run do-bien-che      (node scripts/do-bien-che-vp.mjs)

   Chốt 11/09/2026 (bảng kiểm kê VAN-PHONG-AO-ALPHAGREEN): giữ Doanh, Tuấn sang
   đội xây dựng, tạm tắt Nhã/Khang/Toán, cho nghỉ Nhân/Minh/Hà/Luật/Mây. Bàn này
   đi qua đúng bộ định tuyến và đăng nhập thật của Worker trên SQLite bộ nhớ, và
   khoá bốn điều: mặt bằng chỉ còn người trong biên chế · quầy Mây cất đi ·
   bảng Năng suất chỉ đo người đang làm · nhắc việc tự động KHÔNG bị tắt theo.
   ========================================================================== */

import { dungDB, dungEnv, taoPhienThat, goiAPI, ok, tongKet } from './ban-thu-d1.mjs';
import { AGENTS, MAY, BIEN_CHE, hienTrenMatBang, nhanCauHoi } from '../src/agents-vp.js';
import { readFileSync } from 'node:fs';

const worker = (await import('../src/index.js')).default;
const { db, d1 } = dungDB();
const env = dungEnv(d1);

db.prepare(`INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, quan_ly_id, dang_lam)
            VALUES ('ns_gd', 'Phó Giám đốc', 'PG', 'Phó Giám đốc', 'BGĐ', NULL, 1)`).run();
db.prepare(`INSERT INTO tai_khoan (nhan_su_id, ten_dang_nhap, mat_khau_hash, vai_tro, kich_hoat)
            VALUES ('ns_gd', 'tk_gd', 'x', 'admin', 1)`).run();
const token = await taoPhienThat(env, db.prepare(`SELECT id FROM tai_khoan WHERE ten_dang_nhap = 'tk_gd'`).get().id);

/* ---- ① Bảng biên chế ---------------------------------------------------- */
console.log('\n① Bảng biên chế');
ok('mọi trợ lý và Mây đều có dòng trong BIEN_CHE (không ai rơi vào mặc định)',
  [...AGENTS, MAY].every(a => a.id in BIEN_CHE), [...AGENTS, MAY].filter(a => !(a.id in BIEN_CHE)).map(a => a.id).join(','));
ok('chỉ Doanh nhận câu hỏi', AGENTS.filter(nhanCauHoi).map(a => a.id).join(',') === 'kinhdoanh',
  AGENTS.filter(nhanCauHoi).map(a => a.id).join(','));
ok('Mây không hiện', hienTrenMatBang(MAY) === false);

/* ---- ② Mặt bằng --------------------------------------------------------- */
console.log('\n② Mặt bằng');
const tq = await goiAPI(worker, env, '/api/van-phong/tong-quan', token);
ok('GET /api/van-phong/tong-quan → 200', tq.status === 200, 'nhận ' + tq.status);
const ids = (tq.than?.agent || []).map(a => a.id).sort().join(',');
ok('mặt bằng chỉ còn Doanh và Tuấn', ids === 'it,kinhdoanh', 'nhận ' + ids);
ok('Doanh nhận câu hỏi, Tuấn thì không',
  tq.than?.agent?.find(a => a.id === 'kinhdoanh')?.nhan_cau_hoi === true
  && tq.than?.agent?.find(a => a.id === 'it')?.nhan_cau_hoi === false);
ok('quầy Mây cất đi (may = null)', tq.than?.may === null, JSON.stringify(tq.than?.may)?.slice(0, 80));
ok('chú giải "chờ xét" có Nhã, Khang, Toán',
  ['Nhã', 'Khang', 'Toán'].every(t => (tq.than?.cho_xet || []).includes(t)), JSON.stringify(tq.than?.cho_xet));

/* ---- ③ Bảng Năng suất --------------------------------------------------- */
console.log('\n③ Bảng Năng suất');
const ns = await goiAPI(worker, env, '/api/van-phong/nang-suat', token);
ok('GET /api/van-phong/nang-suat → 200', ns.status === 200, 'nhận ' + ns.status);
const dong = (ns.than?.dong || []).map(r => r.id).join(',');
ok('chỉ Doanh lên bảng — Tuấn (đội xây dựng) và người nghỉ không lên', dong === 'kinhdoanh', 'nhận ' + dong);

/* ---- ④ Mạch hội thoại --------------------------------------------------- */
console.log('\n④ Ô hỏi');
const ht = await goiAPI(worker, env, '/api/van-phong/hoi-thoai', token);
ok('GET /api/van-phong/hoi-thoai → 200', ht.status === 200, 'nhận ' + ht.status);
ok('lời chào lấy của Doanh khi Mây nghỉ', ht.than?.may === null && ht.than?.le_tan?.ten === 'Doanh',
  JSON.stringify({ may: ht.than?.may, le_tan: ht.than?.le_tan?.ten }));

/* ---- ⑤ Nhắc việc tự động KHÔNG đi theo biên chế ------------------------- */
console.log('\n⑤ Nhắc việc tự động');
const nguon = readFileSync(new URL('../src/vanphong.js', import.meta.url), 'utf8');
const qnv = nguon.slice(nguon.indexOf('export async function quetNhacViec'));
ok('quetNhacViec không lọc theo biên chế (cảnh báo hàng cận hạn vẫn chạy)',
  !/BIEN_CHE|bienCheCua|nhanCauHoi|hienTrenMatBang/.test(qnv.slice(0, qnv.indexOf('\nexport ', 10) > 0 ? qnv.indexOf('\nexport ', 10) : qnv.length)));

tongKet();
