/* ==========================================================================
   BÀN ĐO MÓC NỐI GIỮA CÁC MÔ-ĐUN (REV-0038 · L3)
   ---------------------------------------------------------------------------
   Câu hỏi: `window.CAI_GI_DO?.()` NUỐT LỖI — hàm không tồn tại thì cú bấm
   "không làm gì cả", không lỗi, không chữ, không dấu vết. Đó đúng là thứ đã
   để chat chết nhiều tuần mà không ai biết.
   Bản vá thay 3 chỗ đó bằng `goiMocNoi(ten, quyenCan, ...)`. Bàn đo này hỏi
   ba câu, và có CA ĐỐI CHỨNG để chứng minh phép đo nhạy thật:

     ① Có quyền + móc nối VẮNG  → phải HÉT LÊN (console.error nêu đúng tên).
     ② KHÔNG quyền + móc nối vắng → phải IM (mô-đun cố ý không nạp, hét là
        BÁO OAN — và sẽ làm cổng khói đỏ oan).
     ③ Móc nối CÓ MẶT → phải gọi đúng, truyền đủ tham số, không lỗi.
     ④ ĐỐI CHỨNG: chính ca ① viết bằng `?.` kiểu cũ → phải IM RE. Ca này mà
        cũng hét thì phép đo đang đọc nhầm chỗ.

   Chạy:  node scripts/do-moc-noi.mjs        (mã thoát 0 = đạt)
   ========================================================================== */

import { dungMayGia, moChrome } from './lib/ban-do-chrome.mjs';

/* Nối thêm một cửa thử vào BẢN TẠM của app.js (không đụng repo). Nhờ nằm
   trong cùng mô-đun, nó gọi được `goiMocNoi` và sửa được `TOI.quyen`. */
const CUA_THU = `
window.__DO_MOC_NOI = (ca) => {
  const quyenGoc = TOI.quyen;
  try {
    if (ca === 'co-quyen-vang-moc') {
      delete window.moChatVoi;
      TOI.quyen = ['chat', 'danhba', 'nhansu'];
      return goiMocNoi('moChatVoi', 'chat', 'NS-DUY', 'Phạm Khương Duy', 'KD');
    }
    if (ca === 'khong-quyen-vang-moc') {
      delete window.moChatVoi;
      TOI.quyen = ['tongquan'];
      return goiMocNoi('moChatVoi', 'chat', 'NS-DUY', 'Phạm Khương Duy', 'KD');
    }
    if (ca === 'co-moc') {
      TOI.quyen = ['chat'];
      window.moChatVoi = (...t) => 'GỌI ĐƯỢC:' + t.join('|');
      return goiMocNoi('moChatVoi', 'chat', 'NS-DUY', 'Phạm Khương Duy', 'KD');
    }
    if (ca === 'doi-chung-dau-cham-hoi') {
      delete window.moChatVoi;
      TOI.quyen = ['chat'];
      return window.moChatVoi?.('NS-DUY', 'Phạm Khương Duy', 'KD');   // kiểu CŨ
    }
    if (ca === 'hoso-nhansu-vang') {
      delete window.LAM_MOI_HOSO_NHANSU;
      TOI.quyen = ['nhansu'];
      return goiMocNoi('LAM_MOI_HOSO_NHANSU', 'nhansu');
    }
    if (ca === 'trangthai-danhba-vang') {
      delete window.LAM_MOI_TRANGTHAI_DANHBA;
      TOI.quyen = ['danhba'];
      return goiMocNoi('LAM_MOI_TRANGTHAI_DANHBA', 'danhba', 'NS-NGOC', 'ban', null);
    }
    /* ---- layMocNoi: LẤY hàm thay vì GỌI nó (thêm 29/08/2026, màn việc gộp).
       Chỗ vẽ nút cho từng dòng bảng cần CÙNG một hàm 300 lần; dùng goiMocNoi ở
       đó là 300 dòng console.error giống hệt nhau khi móc nối vắng, tức che
       mất mọi lỗi khác. Nhưng "báo ít đi" rất dễ trượt thành "im luôn" —
       nên hợp đồng hét/im phải đo y như goiMocNoi. */
    if (ca === 'lay-co-quyen-vang-moc') {
      delete window.CV_HTML_NUT_DONG;
      TOI.quyen = ['congviec'];
      return layMocNoi('CV_HTML_NUT_DONG', 'congviec');
    }
    if (ca === 'lay-khong-quyen-vang-moc') {
      delete window.CV_HTML_NUT_DONG;
      TOI.quyen = ['tongquan'];
      return layMocNoi('CV_HTML_NUT_DONG', 'congviec');
    }
    if (ca === 'lay-co-moc') {
      TOI.quyen = ['congviec'];
      window.CV_HTML_NUT_DONG = (r, loai) => 'NÚT:' + loai + ':' + r.id;
      const f = layMocNoi('CV_HTML_NUT_DONG', 'congviec');
      return typeof f === 'function' ? f({ id: 7 }, 'giao') : 'KHÔNG PHẢI HÀM';
    }
  } finally { TOI.quyen = quyenGoc; }
};
`;

const may = await dungMayGia({
  suaTep: (s, ten) => (ten === 'assets/js/app.js' ? s + CUA_THU : s)
});
const cr = await moChrome({ url: `http://127.0.0.1:${may.cong}/app.html`, rong: 1440, doiMs: 3000 });

const kq = [];
let dat = 0, truot = 0;
function ok(ten, dung, ghi = '') {
  (dung ? dat++ : truot++);
  kq.push({ ten, dung, ghi });
  console.log(`  ${dung ? '✅' : '❌'} ${ten}${ghi ? ' — ' + ghi : ''}`);
}

async function ca(ten) {
  const truocSo = cr.loiConsole.length;
  const tra = await cr.chay(`window.__DO_MOC_NOI(${JSON.stringify(ten)})`);
  await cr.doi(120);
  return { tra, loiMoi: cr.loiConsole.slice(truocSo) };
}

console.log('\n═══ MÓC NỐI GIỮA CÁC MÔ-ĐUN — hỏng thì có NÓI RA không? ═══\n');

for (const [ten, moc] of [['co-quyen-vang-moc', 'moChatVoi'],
                          ['hoso-nhansu-vang', 'LAM_MOI_HOSO_NHANSU'],
                          ['trangthai-danhba-vang', 'LAM_MOI_TRANGTHAI_DANHBA']]) {
  const r = await ca(ten);
  ok(`① có quyền + móc nối "${moc}" VẮNG → hét lên`,
    r.loiMoi.length === 1 && r.loiMoi[0].includes(moc),
    r.loiMoi.length ? r.loiMoi[0].slice(0, 70) : 'IM RE — nuốt lỗi y như cũ');
}

{
  const r = await ca('khong-quyen-vang-moc');
  ok('② KHÔNG có quyền + móc nối vắng → IM (không báo oan)',
    r.loiMoi.length === 0, r.loiMoi.length ? 'hét oan: ' + r.loiMoi[0].slice(0, 60) : 'im đúng');
}
{
  const r = await ca('co-moc');
  ok('③ móc nối CÓ MẶT → gọi đúng, đủ tham số, không lỗi',
    r.tra === 'GỌI ĐƯỢC:NS-DUY|Phạm Khương Duy|KD' && r.loiMoi.length === 0, String(r.tra));
}
{
  const r = await ca('lay-co-quyen-vang-moc');
  ok('⑤ layMocNoi · có quyền + móc nối VẮNG → hét lên (giống goiMocNoi)',
    r.loiMoi.length === 1 && r.loiMoi[0].includes('CV_HTML_NUT_DONG') && r.tra === null,
    r.loiMoi.length ? r.loiMoi[0].slice(0, 70) : 'IM RE — nuốt lỗi y như `?.`');
}
{
  const r = await ca('lay-khong-quyen-vang-moc');
  ok('⑤ layMocNoi · KHÔNG quyền + móc nối vắng → IM (không báo oan)',
    r.loiMoi.length === 0 && r.tra === null, r.loiMoi.length ? 'hét oan' : 'im đúng');
}
{
  const r = await ca('lay-co-moc');
  ok('⑤ layMocNoi · móc nối CÓ MẶT → trả về CHÍNH HÀM, gọi được',
    r.tra === 'NÚT:giao:7' && r.loiMoi.length === 0, String(r.tra));
}
{
  const r = await ca('doi-chung-dau-cham-hoi');
  ok('④ ĐỐI CHỨNG · cùng ca ① viết bằng `?.` kiểu CŨ → IM RE (phép đo nhạy thật)',
    r.loiMoi.length === 0 && r.tra === undefined,
    'trả về undefined, console không một chữ — đúng cái bẫy đã vá');
}

cr.dong(); may.dong();
console.log(`\n══════════════════════════════════════════\nĐẠT ${dat} · TRƯỢT ${truot}\n`);
process.exit(truot ? 1 : 0);
