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
    /* `tag` gộp ở tầng HỆ ĐIỀU HÀNH: tin sau từ cùng một người THAY THẾ tin
       trước trên màn hình khoá thay vì xếp chồng thành một cột dài. Đây là lớp
       gộp thứ hai, sau lớp gộp 60 giây ở máy chủ (`src/day-thong-bao.js`). */
    tag: d.loai === 'chat' ? 'chat' : (d.loai || 'chung'),
    renotify: false,
    // Rung nhẹ hai nhịp. Android nghe theo; iOS bỏ qua trường này, không lỗi.
    vibrate: [80, 40, 80],
    data: { duong_dan: d.duong_dan || '/app.html' }
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
  const duongDan = (e.notification.data && e.notification.data.duong_dan) || '/app.html';
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const t of tabs) {
      if (t.url.includes('/app.html')) {
        await t.focus();
        // Báo cho trang đang mở biết phải bật cửa sổ chat lên.
        try { t.postMessage({ kieu: 'mo-thong-bao', duong_dan: duongDan }); } catch { /* tab quá cũ */ }
        return;
      }
    }
    await self.clients.openWindow(duongDan);
  })());
});
