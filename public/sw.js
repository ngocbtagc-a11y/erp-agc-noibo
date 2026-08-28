/* ==========================================================================
   Service Worker — PWA + NHẬN THÔNG BÁO ĐẨY khi ERP đã đóng hẳn.
   ---------------------------------------------------------------------------
   KHÔNG cache/lưu bất cứ thứ gì. Trước đây SW lưu app.html + app.js, khi đổi
   bản dễ kẹt "app.html mới + app.js cũ" -> giao diện vỡ. Giờ luôn lấy bản mới
   nhất từ mạng (header đã must-revalidate) nên KHÔNG BAO GIỜ lệch bản nữa.
   Đổi bản này là tự xoá SẠCH mọi cache cũ trên máy người dùng.

   CTL-0014 — trước bản này file chỉ có install/activate/fetch, KHÔNG có
   handler `push`. Đó chính là lý do đóng ERP ra là điếc hoàn toàn, và là điều
   chị Phạm Thị Lan báo: "Không hiện thông báo khi có tin nhắn đến". Hai
   handler ở cuối file là phần vá.
   ========================================================================== */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ten) => Promise.all(ten.map((t) => caches.delete(t))))   // xoá sạch cache cũ
      .then(() => self.clients.claim())
  );
});

/* Có 1 fetch handler (dù rỗng) là đủ để Chrome cho phép "Cài đặt" PWA.
   Không gọi respondWith -> để trình duyệt tự tải bình thường (luôn mới). */
self.addEventListener('fetch', () => { /* để trình duyệt tự lo, không cache */ });

/* ---- Thông báo đẩy (CTL-0014) ------------------------------------------- */

/* Máy chủ đẩy giao gói tin ĐÃ MÃ HOÁ; chỉ máy này giải ra được (RFC 8291), nên
   Google/Apple chuyển hộ mà không đọc được nội dung.

   BẮT BUỘC gọi showNotification trên MỌI nhánh — Chrome phạt service worker
   nào nhận push rồi im lặng bằng cách tự hiện "Trang này đang chạy nền", còn
   xấu hơn không có thông báo. Vì thế nhánh hỏng vẫn hiện một tin tối thiểu. */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }

  const tieuDe = d.tieu_de || 'ERP Alpha Green';
  const tuyChon = {
    body: d.than || 'Bạn có thông báo mới',
    icon: '/assets/img/pwa-192.png',
    badge: '/assets/img/pwa-192.png',
    /* `tag` gộp ở tầng HỆ ĐIỀU HÀNH: tin sau từ CÙNG MỘT NGƯỜI thay thế tin
       trước trên màn hình khoá thay vì xếp chồng thành một cột dài. Đây là lớp
       gộp thứ hai, sau lớp gộp 60 giây ở máy chủ (`src/day-thong-bao.js`).

       REV-0028 M1 — trước bản vá nhãn là hằng số `'chat'` cho MỌI người gửi,
       nên tin anh Duy THAY THẾ tin chị Hằng và (vì `renotify:false`) không kêu
       lại lần nào: chị Lan nhìn thấy một dòng và tưởng chỉ một người nhắn. Nhãn
       phải theo TỪNG NGƯỜI GỬI; `renotify:true` để lượt sau của cùng người vẫn
       kêu chứ không âm thầm tráo chữ. Trần 12 thông báo/ngày ở máy chủ vẫn là
       thứ giữ cho nó không thành ồn. */
    tag: d.loai === 'chat' ? ('chat:' + (d.nguoi_gui_id || 'khong-ro')) : (d.loai || 'chung'),
    renotify: true,
    // Rung nhẹ hai nhịp. Android nghe theo; iOS bỏ qua trường này, không lỗi.
    vibrate: [80, 40, 80],
    data: {
      duong_dan: d.duong_dan || '/app.html',
      // REV-0028 M3 — mang theo người gửi để cú bấm mở ĐÚNG đoạn chat đó.
      nguoi_gui_id: d.nguoi_gui_id || null,
      nguoi_gui_ten: d.nguoi_gui_ten || null
    }
  };

  e.waitUntil(
    self.registration.showNotification(tieuDe, tuyChon).catch(() =>
      self.registration.showNotification('ERP Alpha Green', { body: 'Bạn có thông báo mới' })
    )
  );
});

/* Bấm vào thông báo: ERP đang mở sẵn ở tab nào thì ĐƯA TAB ĐÓ LÊN (không mở
   thêm tab thứ hai chồng chất); chưa mở thì mở mới đúng đường dẫn kèm theo.
   Mở trang chủ rồi bắt người ta tự đi tìm là vứt mất nửa giá trị thông báo. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const dl = (e.notification.data || {});
  const duongDan = dl.duong_dan || '/app.html';
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const t of tabs) {
      if (t.url.includes('/app.html')) {
        await t.focus();
        /* Báo cho trang đang mở biết phải bật ĐÚNG đoạn chat của người gửi đó
           (REV-0028 M3) — trước bản vá chỉ mở kênh chung, chị Lan biết "anh Duy
           nhắn" rồi vẫn phải tự đi tìm. */
        try {
          t.postMessage({
            kieu: 'mo-thong-bao',
            duong_dan: duongDan,
            nguoi_gui_id: dl.nguoi_gui_id || null,
            nguoi_gui_ten: dl.nguoi_gui_ten || null
          });
        } catch { /* tab quá cũ */ }
        return;
      }
    }
    // Chưa mở tab nào: `duong_dan` đã mang sẵn `#chat=<id người gửi>`.
    await self.clients.openWindow(duongDan);
  })());
});
