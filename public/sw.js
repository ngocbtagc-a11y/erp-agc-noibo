/* ==========================================================================
   Service Worker — CHỈ để ERP cài được vào màn hình chính (PWA).
   ---------------------------------------------------------------------------
   KHÔNG cache/lưu bất cứ thứ gì. Trước đây SW lưu app.html + app.js, khi đổi
   bản dễ kẹt "app.html mới + app.js cũ" -> giao diện vỡ. Giờ luôn lấy bản mới
   nhất từ mạng (header đã must-revalidate) nên KHÔNG BAO GIỜ lệch bản nữa.
   Đổi bản này là tự xoá SẠCH mọi cache cũ trên máy người dùng.
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
