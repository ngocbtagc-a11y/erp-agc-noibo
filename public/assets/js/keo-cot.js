/* ==========================================================================
   THANH KÉO ĐỔI BỀ NGANG — dùng chung
   ---------------------------------------------------------------------------
   Repo này từng có ba hàm nén ảnh gần trùng nhau rồi phải gộp lại một lần
   (CTL-0011). Đừng lặp lại chuyện đó với thanh kéo: tách phần chung ngay từ
   cái thứ hai, chứ không đợi tới cái thứ tư.

   Phần chung là toàn bộ những chỗ dễ làm sai:
     · bắt chuột bằng pointer capture, không thì rê nhanh là tuột tay
     · khoá chọn chữ toàn trang trong lúc kéo, không thì rê qua chữ là bôi đen
     · chặn hai đầu, không thì kéo được tới mức giao diện vô dụng
     · nhớ theo máy, và bấm đúp để về mặc định khi lỡ tay
   Phần riêng chỉ còn: đọc toạ độ chuột ra một con số, và ghi con số đó đi đâu.
   ========================================================================== */

export function ganThanhKeo({ tay, tinhTuChuot, dat, khoaLuu, veMacDinh }) {
  if (!tay || typeof tinhTuChuot !== 'function' || typeof dat !== 'function') return;

  // Nhớ theo máy — mở lại vẫn đúng bề ngang mình đã chỉnh
  if (khoaLuu) {
    try {
      const cu = parseInt(localStorage.getItem(khoaLuu) || '', 10);
      if (cu > 0) dat(cu);
    } catch (e) { /* trình duyệt chặn localStorage thì dùng mặc định, không sao */ }
  }

  let dangKeo = false;

  tay.addEventListener('pointerdown', e => {
    dangKeo = true;
    try { tay.setPointerCapture(e.pointerId); } catch (err) {}
    tay.classList.add('dang-keo');
    document.body.classList.add('vp-dang-keo');
    e.preventDefault();
  });

  tay.addEventListener('pointermove', e => {
    if (!dangKeo) return;
    dat(tinhTuChuot(e));
  });

  const thoi = e => {
    if (!dangKeo) return;
    dangKeo = false;
    try { tay.releasePointerCapture(e.pointerId); } catch (err) {}
    tay.classList.remove('dang-keo');
    document.body.classList.remove('vp-dang-keo');
    if (khoaLuu) {
      try {
        const px = dat();                       // gọi không tham số = đọc giá trị hiện tại
        if (px > 0) localStorage.setItem(khoaLuu, px);
      } catch (err) {}
    }
  };
  tay.addEventListener('pointerup', thoi);
  tay.addEventListener('pointercancel', thoi);

  /* Bấm đúp về mặc định — kéo lỡ tay thành hẹp quá thì không phải mò lại */
  tay.addEventListener('dblclick', () => {
    if (typeof veMacDinh === 'function') veMacDinh();
    if (khoaLuu) { try { localStorage.removeItem(khoaLuu); } catch (e) {} }
  });
}

/* Ép một con số vào khoảng cho phép. Tách riêng vì đây là chỗ dễ viết ngược
   dấu, mà viết ngược thì kéo được tới mức giao diện không dùng nổi. */
export function kep(px, min, max) {
  return Math.round(Math.min(max, Math.max(min, px)));
}
