/* ==========================================================================
   ẢNH DÙNG CHUNG — nén ở MÁY trước khi gửi  ·  CTL-0011 → CTL-0026
   ---------------------------------------------------------------------------
   Hai hàm này trước nằm trong `app.js` (dòng ~1200). CTL-0026 dựng Kho tài
   liệu thành MODULE RIÊNG (`quet-tai-lieu.js`), mà module riêng thì không
   import ngược được vào `app.js` — cửa vào của cả trang — nếu không muốn vòng
   lặp import.

   Nên tách ra đây, KHÔNG chép lại. Hiến pháp Rule 5 và CTL-0026 Mục 6 nói
   thẳng: "ERP đang có 3 hàm nén ảnh — dùng lại MỘT hàm, đừng viết hàm thứ
   tư". CTL-0011 đã gộp 3 hàm cũ về 1; đợt này chỉ DỜI CHỖ của đúng hàm đó,
   nội dung giữ nguyên từng chữ. `app.js` nay import từ đây.

   Ai dùng: ảnh đại diện nhân sự · ảnh góp ý · ảnh dán vào chat · trang quét
   trong Kho tài liệu.
   ========================================================================== */

/* Số byte THẬT của ảnh sau khi giải mã base64 — đúng cách backend đo
   (`atob(raw).length` trong gopYGui), để frontend không đoán sai rồi bị
   backend trả 413. */
export function coByteCuaDataUrl(dataUrl) {
  const s = String(dataUrl || '');
  const b64 = s.slice(s.indexOf(',') + 1);
  const demDauBang = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor(b64.length * 3 / 4) - demDauBang;
}

/* Nén ảnh bằng canvas — MỘT hàm cho mọi chỗ trong ERP. Luôn trả về data URL
   JPEG (máy chủ chỉ lưu base64/nhị phân thẳng vào D1, không tự nén được).

   tuyChon:
   - `cheDo`        'vua-khung' (mặc định) giữ nguyên tỉ lệ, CHỈ co lại chứ
                    không phóng to · 'vuong' cắt giữa thành ảnh vuông đúng
                    `canhToiDa`×`canhToiDa` (ảnh đại diện — phải đủ nét ở mọi
                    kích thước hiển thị nên cho phép phóng to ảnh nhỏ).
   - `canhToiDa`    cạnh dài nhất (px).
   - `chatLuong`    chất lượng JPEG lượt vẽ đầu (0–1).
   - `gioiHanByte`  > 0 thì nén cho tới khi LỌT giới hạn của backend: hạ chất
                    lượng trước (chữ trong ảnh chụp màn hình còn đọc được),
                    hết nấc mới thu nhỏ kích thước. Rule 12 (Human Cost) —
                    người dùng dán ảnh to thì máy tự lo, không bắt họ mở phần
                    mềm khác cắt/nén rồi quay lại.

   Luôn tô NỀN TRẮNG trước khi vẽ: JPEG không có kênh trong suốt, không tô
   thì ảnh PNG trong suốt ra nền ĐEN, người dùng tưởng ảnh hỏng. */
export function nenAnhChung(file, tuyChon = {}) {
  const {
    cheDo = 'vua-khung',
    canhToiDa = 1600,
    chatLuong = 0.8,
    gioiHanByte = 0,
    nacChatLuong = [0.7, 0.6, 0.5],
    soLanThuNho = 6
  } = tuyChon;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');

      const ve = (tiLe, cl) => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (cheDo === 'vuong') {
          const canh = Math.min(img.width, img.height);
          sx = (img.width - canh) / 2; sy = (img.height - canh) / 2;
          sw = canh; sh = canh;
          canvas.width = canvas.height = Math.max(1, Math.round(canhToiDa * tiLe));
        } else {
          canvas.width = Math.max(1, Math.round(img.width * tiLe));
          canvas.height = Math.max(1, Math.round(img.height * tiLe));
        }
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', cl);
      };

      let ti = cheDo === 'vuong'
        ? 1
        : Math.min(1, canhToiDa / Math.max(img.width, img.height));

      let kq = ve(ti, chatLuong);
      if (gioiHanByte > 0) {
        for (const cl of nacChatLuong) {
          if (coByteCuaDataUrl(kq) <= gioiHanByte) break;
          kq = ve(ti, cl);
        }
        // Vẫn nặng (ảnh chụp màn hình 4K nhiều chi tiết) → thu nhỏ dần.
        const clCuoi = nacChatLuong.length ? nacChatLuong[nacChatLuong.length - 1] : chatLuong;
        for (let i = 0; i < soLanThuNho && coByteCuaDataUrl(kq) > gioiHanByte; i++) {
          ti *= 0.8;
          kq = ve(ti, clCuoi);
        }
      }
      resolve(kq);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này')); };
    img.src = url;
  });
}
