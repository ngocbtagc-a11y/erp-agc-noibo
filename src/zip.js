/* ==========================================================================
   src/zip.js — Máy nén ZIP kiểu "vừa chảy vừa gói"
   ---------------------------------------------------------------------------
   VÌ SAO PHẢI TỰ VIẾT (không thêm thư viện — SPEC-0005 Mục 11 cấm):

   Bản sao lưu hằng tháng phải là MỘT file .zip đưa tận tay Sếp (ADR-0013).
   Nhưng Cloudflare Workers gói miễn phí chỉ cho 10 ms CPU mỗi lượt cron, mà
   nén/tính mã kiểm 22 MB trong một lượt thì mất hàng trăm ms — vượt xa.

   Cách giải: ZIP cho phép ghi mã kiểm CRC32 SAU phần dữ liệu (cờ bit 3,
   "data descriptor"). Nhờ vậy ta gói được theo từng mẩu nhỏ, mỗi lượt cron
   một mẩu ~256 KB, cộng dồn CRC32 qua các lượt — CPU mỗi lượt dưới 2 ms.

   ZIP ở đây dùng phương thức STORE (không nén). Đúng ý đồ: CSV nén được nhiều
   nhưng nén tốn CPU — mà CPU mới là thứ hiếm, còn dung lượng thì Drive dư.

   KHÔNG dùng Zip64 — bản sao lưu vài chục MB, còn xa trần 4 GB.
   ========================================================================== */

/* ---- CRC32 ------------------------------------------------------------- */
/* Bảng tra 256 ô, dựng một lần khi mô-đun được nạp (không tốn CPU mỗi lượt). */
const BANG_CRC = (() => {
  const b = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    b[i] = c >>> 0;
  }
  return b;
})();

/** Cộng dồn CRC32. Gọi lần đầu với `truoc = 0`, lần sau truyền lại kết quả cũ. */
export function crc32(bytes, truoc = 0) {
  let c = (~truoc) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = (BANG_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
  return (~c) >>> 0;
}

/* ---- Tiện ích ghi số ---------------------------------------------------- */
function ghi(bytes, viTri, giaTri, soByte) {
  for (let i = 0; i < soByte; i++) bytes[viTri + i] = (giaTri >>> (i * 8)) & 0xFF;
}

/** Đổi mốc thời gian sang định dạng ngày/giờ kiểu MS-DOS mà ZIP dùng. */
function gioDos(d) {
  const gio = ((d.getUTCHours() & 31) << 11) | ((d.getUTCMinutes() & 63) << 5) | ((d.getUTCSeconds() >> 1) & 31);
  const ngay = (((d.getUTCFullYear() - 1980) & 127) << 9) | (((d.getUTCMonth() + 1) & 15) << 5) | (d.getUTCDate() & 31);
  return { gio, ngay };
}

const BO_MA = new TextEncoder();

/* ---- Ba mẩu byte của một file trong ZIP --------------------------------- */

/**
 * Phần đầu của một file trong ZIP. Gọi TRƯỚC khi đẩy byte nội dung.
 * @param {string} ten  tên file bên trong zip (UTF-8, có dấu được)
 * @param {Date}   luc  thời điểm hiển thị trong zip
 */
export function dauTep(ten, luc = new Date()) {
  const tenBytes = BO_MA.encode(ten);
  const { gio, ngay } = gioDos(luc);
  const out = new Uint8Array(30 + tenBytes.length);
  ghi(out, 0, 0x04034b50, 4);   // chữ ký "PK\3\4"
  ghi(out, 4, 20, 2);           // cần phiên bản 2.0 để giải nén
  ghi(out, 6, 0x0808, 2);       // cờ: bit 3 = có data descriptor · bit 11 = tên UTF-8
  ghi(out, 8, 0, 2);            // phương thức 0 = STORE (không nén)
  ghi(out, 10, gio, 2);
  ghi(out, 12, ngay, 2);
  ghi(out, 14, 0, 4);           // CRC32  → để 0, ghi thật ở data descriptor
  ghi(out, 18, 0, 4);           // cỡ nén → nt
  ghi(out, 22, 0, 4);           // cỡ gốc → nt
  ghi(out, 26, tenBytes.length, 2);
  ghi(out, 28, 0, 2);           // không có trường phụ
  out.set(tenBytes, 30);
  return out;
}

/** Phần đuôi của một file trong ZIP. Gọi SAU khi đẩy hết byte nội dung. */
export function cuoiTep(crc, coByte) {
  const out = new Uint8Array(16);
  ghi(out, 0, 0x08074b50, 4);
  ghi(out, 4, crc, 4);
  ghi(out, 8, coByte, 4);       // cỡ nén  (STORE nên bằng cỡ gốc)
  ghi(out, 12, coByte, 4);      // cỡ gốc
  return out;
}

/**
 * Mục lục trung tâm + đuôi ZIP. Gọi MỘT LẦN, sau khi hết mọi file.
 * @param {Array} muc  [{ten, crc, coByte, viTriDau, luc}] theo đúng thứ tự đã ghi
 * @param {number} tongDaGhi  tổng số byte đã đẩy lên (chỗ mục lục bắt đầu)
 */
export function mucLuc(muc, tongDaGhi) {
  const phan = muc.map(m => {
    const tenBytes = BO_MA.encode(m.ten);
    const { gio, ngay } = gioDos(new Date(m.luc || Date.now()));
    const out = new Uint8Array(46 + tenBytes.length);
    ghi(out, 0, 0x02014b50, 4);  // chữ ký "PK\1\2"
    ghi(out, 4, 20, 2);          // phiên bản tạo ra
    ghi(out, 6, 20, 2);          // phiên bản cần để giải nén
    ghi(out, 8, 0x0808, 2);
    ghi(out, 10, 0, 2);
    ghi(out, 12, gio, 2);
    ghi(out, 14, ngay, 2);
    ghi(out, 16, m.crc, 4);
    ghi(out, 20, m.coByte, 4);
    ghi(out, 24, m.coByte, 4);
    ghi(out, 28, tenBytes.length, 2);
    ghi(out, 30, 0, 2);          // trường phụ
    ghi(out, 32, 0, 2);          // chú thích
    ghi(out, 34, 0, 2);          // số đĩa
    ghi(out, 36, 0, 2);          // thuộc tính trong
    ghi(out, 38, 0, 4);          // thuộc tính ngoài
    ghi(out, 42, m.viTriDau, 4); // vị trí phần đầu của file này
    out.set(tenBytes, 46);
    return out;
  });

  const coMucLuc = phan.reduce((t, p) => t + p.length, 0);
  const duoi = new Uint8Array(22);
  ghi(duoi, 0, 0x06054b50, 4);   // chữ ký "PK\5\6"
  ghi(duoi, 4, 0, 2);
  ghi(duoi, 6, 0, 2);
  ghi(duoi, 8, muc.length, 2);
  ghi(duoi, 10, muc.length, 2);
  ghi(duoi, 12, coMucLuc, 4);
  ghi(duoi, 16, tongDaGhi, 4);
  ghi(duoi, 20, 0, 2);

  const tong = new Uint8Array(coMucLuc + 22);
  let v = 0;
  for (const p of phan) { tong.set(p, v); v += p.length; }
  tong.set(duoi, v);
  return tong;
}
