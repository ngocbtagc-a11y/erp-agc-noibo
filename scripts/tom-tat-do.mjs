/* Gom kết quả `do-chat-noibo.mjs` thành một dòng đọc được. Chỉ là bộ lọc cho
   người đọc — mọi con số vẫn do bàn đo sinh ra, file này không tự tính gì. */
let s = '';
process.stdin.on('data', d => (s += d)).on('end', () => {
  const k = JSON.parse(s);
  const n = o => JSON.stringify(o);
  console.log(
    `bản=${k.css} rộng=${k.rong} hỏng-lần-đầu=${k.hong_lan_dau}\n` +
    `  moChatVoi=${k.co_moChatVoi} · bấm ${k.bam} → mở ${k.mo}\n` +
    `  danh sách: ${n(k.danh_sach)}\n` +
    `  vùng đọc tin: ${k.vung_doc.khung_cao}px = ${k.vung_doc.ti_le_man}% màn ` +
      `(${k.vung_doc.man_rong}×${k.vung_doc.man_cao}), popup ${k.vung_doc.popup_rong}×${k.vung_doc.popup_cao}\n` +
    `  tin cũ hơn: ${n(k.xem_tin_cu)}\n` +
    `  nút trong cửa sổ: ${n(k.do_nut)}\n` +
    `  nút ngoài: ${n(k.do_nut_ngoai)}\n` +
    `  chạm 44px "Chat ngay": ${n(k.cham_44)} · dòng Danh bạ: ${n(k.dong_danhba)}\n` +
    `  bong bóng đè nút: ${n(k.chong_lan)}\n` +
    `  lỗi console: ${n(k.loi_console)}`);
});
