/* ==========================================================================
   HỒ LY VÒNG 2 — DC-J CÓ MẮC ĐÚNG CÁI BẪY DC-I VỪA THOÁT KHÔNG?
   ---------------------------------------------------------------------------
   Khỉ Đột tự rút ra: "phép đo bắt được lỗi bằng lý do sai thì cũng vô dụng
   như phép đo không bắt được." Nó sửa DC-I. Câu hỏi: DC-J thì sao?

   Bộ dò của DC-J:
       vet.luc   ← worker ghi qua VỎ D1  → `thayDongHo()` thay 'now' bằng
                   ĐỒNG HỒ ĐÓNG BĂNG (datDongHo)          = 10:00:00 VN
       mocVN     ← đọc qua `db.prepare` RAW của node:sqlite → KHÔNG bị thay,
                   nên là ĐỒNG HỒ THẬT của máy            = giờ chạy bàn đo
       bắt lỗi   ← |vet.luc − mocVN| > 1 tiếng

   Hai vế DÙNG HAI ĐỒNG HỒ KHÁC NHAU. Nên kết quả phụ thuộc GIỜ CHẠY BÀN ĐO,
   không phụ thuộc mã đúng hay sai. Bàn đo này chứng minh điều đó bằng cách
   chạy CHÍNH bộ dò ấy trên bản `src` LÀNH LẶN (không tiêm gì).

   Chạy: node scripts/holy-vong2-dcj.mjs
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dungDB, dungEnv, taoPhienThat, goiAPI, datDongHo, ok, tongKet } from './ban-thu-d1.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(GOC, 'src');

/* Bộ dò của DC-J, chép NGUYÊN VĂN từ scripts/do-tach-vai-tro.mjs */
async function boDoCuaDCJ() {
  const { db, d1 } = dungDB();
  db.exec('DELETE FROM phien; DELETE FROM tai_khoan; DELETE FROM nhan_su;');
  db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)')
    .run('SEP', 'Bùi Thị Ngọc', 'BN', 'CEO', 'BGĐ');
  db.prepare('INSERT INTO nhan_su (id, ho_ten, viet_tat, chuc_vu, bo_phan, dang_lam) VALUES (?,?,?,?,?,1)')
    .run('DUY', 'Phạm Khương Duy', 'PD', 'TP Kho', 'Kho vận');
  db.prepare(`INSERT INTO tai_khoan (id,nhan_su_id,ten_dang_nhap,mat_khau_hash,vai_tro,kich_hoat,phai_doi_mk)
              VALUES (1,'SEP','tksep','pbkdf2$1$x$x','admin',1,0)`).run();
  db.prepare(`INSERT INTO tai_khoan (id,nhan_su_id,ten_dang_nhap,mat_khau_hash,vai_tro,kich_hoat,phai_doi_mk)
              VALUES (2,'DUY','tkduy','pbkdf2$1$x$x','nguoi_dung',1,0)`).run();
  const env = dungEnv(d1);
  const worker = (await import(pathToFileURL(path.join(SRC, 'index.js')).href + `?v=${Math.random()}`)).default;
  const token = await taoPhienThat(env, 1);
  await goiAPI(worker, env, '/api/quan-tri/sua-vai-tro', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tai_khoan_id: 2, vi_tri_cong_viec: 'nhan_vien_kho' }) });
  const vet = db.prepare(
    "SELECT luc FROM nhan_su_lich_su WHERE loai_su_kien='doi_vai_tro' ORDER BY id DESC LIMIT 1").get();
  const mocVN = db.prepare("SELECT datetime('now','+7 hours') AS t").get().t;
  db.close?.();
  if (!vet) return { bat: false, vet: null, mocVN };
  const lech = Math.abs(new Date(vet.luc + 'Z') - new Date(mocVN + 'Z'));
  return { bat: lech > 3600 * 1000, vet: vet.luc, mocVN, lechPhut: Math.round(lech / 60000) };
}

console.log('\n=== BỘ DÒ CỦA DC-J CHẠY TRÊN BẢN `src` LÀNH LẶN ===================');
console.log('   (bản KHÔNG tiêm khiếm khuyết — bộ dò PHẢI trả false)\n');

/* Ca 1 — đúng đồng hồ do-tach-vai-tro.mjs đang dùng */
datDongHo('2026-09-04T03:00:00Z');
const a = await boDoCuaDCJ();
console.log(`   Đồng hồ băng 03:00Z (= 10:00 VN)`);
console.log(`     dòng ghi vết : ${a.vet}`);
console.log(`     mốc so sánh  : ${a.mocVN}   ← ĐỒNG HỒ THẬT, không bị đóng băng`);
console.log(`     lệch         : ${a.lechPhut} phút → bộ dò trả ${a.bat}`);

/* Ca 2 — CÙNG mã lành lặn, chỉ đổi giờ đóng băng (tương đương chạy bàn đo
   vào một giờ khác trong ngày) */
datDongHo('2026-09-04T20:00:00Z');
const b = await boDoCuaDCJ();
console.log(`\n   Đồng hồ băng 20:00Z (= 03:00 VN hôm sau)`);
console.log(`     dòng ghi vết : ${b.vet}`);
console.log(`     mốc so sánh  : ${b.mocVN}`);
console.log(`     lệch         : ${b.lechPhut} phút → bộ dò trả ${b.bat}`);

console.log('\n=== KẾT LUẬN ======================================================\n');
ok('DC-J trên mã LÀNH: bộ dò trả false ở giờ chạy hiện tại (may, không phải thiết kế)',
   a.bat === false, `lệch ${a.lechPhut} phút`);
ok('DC-J LÀ PHÉP ĐO RỖNG khi bàn đo chạy lệch giờ — bắt "được" cả mã LÀNH',
   b.bat === true,
   b.bat ? 'mã LÀNH mà bộ dò vẫn kêu BẮT ĐƯỢC ⇒ DC-J xanh vì lý do sai'
         : 'không tái hiện được');

console.log(`
   Ý nghĩa: DC-J so DÒNG GHI VẾT (đồng hồ ĐÓNG BĂNG 10:00 VN) với
   datetime('now','+7 hours') đọc qua handle RAW (ĐỒNG HỒ THẬT của máy).
   Hai đồng hồ khác nhau ⇒ ngưỡng "lệch > 1 tiếng" chỉ đúng khi bàn đo được
   chạy trong khoảng 09:00–11:00 giờ VN. Ngoài khoảng đó, DC-J báo BẮT ĐƯỢC
   dù mã đúng hay sai — đúng cái bẫy DC-I vừa thoát.

   Sửa: lấy mốc so sánh QUA VỎ D1 (d1.prepare) để cả hai vế cùng một đồng hồ,
   hoặc so thẳng vet.luc với mốc đóng băng + 7 tiếng.`);

process.exit(tongKet() ? 0 : 1);
