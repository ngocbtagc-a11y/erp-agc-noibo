/* ==========================================================================
   Service Worker — giúp ERP cài được vào màn hình chính và mở nhanh
   ---------------------------------------------------------------------------
   NGUYÊN TẮC BẢO MẬT QUAN TRỌNG:
   TUYỆT ĐỐI KHÔNG lưu (cache) bất kỳ phản hồi nào từ /api/.
   Dữ liệu API là riêng của từng người (lương, công nợ…) — lưu lại là để
   dữ liệu người này còn nằm trên máy sau khi đăng xuất, hoặc lộ cho người
   dùng chung máy. Ở đây chỉ lưu phần KHUNG TĨNH: giao diện, logo, phông chữ.

   Dùng "mạng trước, không có mạng mới dùng bản lưu" (network-first) cho khung
   tĩnh, để sau mỗi lần cập nhật web, người dùng luôn nhận bản mới nhất.
   ========================================================================== */

const TEN_KHO = 'agc-crm-v4';

/* Phần khung tĩnh — nạp sẵn để lần mở sau nhanh và mở được cả khi mạng chập chờn */
const KHUNG_TINH = [
  '/index.html',
  '/app.html',
  '/assets/css/style.css',
  '/assets/js/api.js',
  '/assets/js/app.js',
  '/assets/js/data.js',
  '/assets/img/logo.png',
  '/assets/img/logo-mark.png',
  '/assets/img/favicon-32.png',
  '/assets/img/pwa-192.png',
  '/assets/img/pwa-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(TEN_KHO)
      .then((kho) => kho.addAll(KHUNG_TINH))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  // Xoá kho cũ của phiên bản trước
  e.waitUntil(
    caches.keys()
      .then((ten) => Promise.all(ten.filter((t) => t !== TEN_KHO).map((t) => caches.delete(t))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Dữ liệu API và mọi thứ khác tên miền: KHÔNG đụng tới, để trình duyệt
  //    tự lo. Không lưu, không xen vào.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Chỉ xử lý GET (không đụng POST đăng nhập/đổi mật khẩu)
  if (e.request.method !== 'GET') return;

  // 3. Khung tĩnh: mạng trước, hỏng mạng mới lấy bản lưu
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Lưu lại bản mới nhất để lần sau offline vẫn có
        const ban = res.clone();
        caches.open(TEN_KHO).then((kho) => kho.put(e.request, ban));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/app.html')))
  );
});
