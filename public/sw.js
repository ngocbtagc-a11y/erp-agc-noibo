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
       kêu chứ không âm thầm tráo chữ.

       ĐÍNH CHÍNH (REV-0031 · Việc 3). Vòng trước khai rằng 5 tin liên tiếp của
       CÙNG một người chỉ kêu MỘT lần nhờ `tag` — đúng kết quả, SAI nguyên nhân.
       `renotify: true` đúng nghĩa của nó là KÊU LẠI mỗi lần thay thế cùng nhãn;
       `tag` chỉ gộp phần HIỂN THỊ (một dòng), không dập tiếng. Thứ giữ cho nó
       kêu một lần là LỚP GỘP 60 GIÂY Ở MÁY CHỦ (`GOP_GIAY`,
       src/day-thong-bao.js): gói tin thứ 2..5 KHÔNG BAO GIỜ được gửi đi.
       Ghi đúng chỗ này mới là quan trọng: ai đọc nhầm rồi đi sửa `renotify` sẽ
       không đổi được gì, còn ai đụng vào `GOP_GIAY` thì làm điện thoại kêu liên
       hồi mà không hiểu vì sao. Trần 12 thông báo/ngày (`TRAN_NGAY`) là lớp
       chặn thứ ba, tính theo NGÀY chứ không theo phút. */
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

  e.waitUntil(Promise.all([
    self.registration.showNotification(tieuDe, tuyChon).catch(() =>
      self.registration.showNotification('ERP Alpha Green', { body: 'Bạn có thông báo mới' })
    ),
    datSoDoBieuTuong()
  ]));
});

/* ---- SỐ ĐỎ TRÊN BIỂU TƯỢNG (29/08/2026) ---------------------------------
   Sếp Ngọc: *"Nếu tao dùng desktop thì hiện thông báo như này nè, để không bị
   miss tin nhắn"* — số đỏ trên biểu tượng thanh tác vụ, kiểu Zalo. Đây là
   đường QUAN TRỌNG NHẤT vì nó chạy khi ERP đã ĐÓNG HẲN; lúc đó `app.js` không
   tồn tại, chỉ service worker này còn sống.

   MỘT NGUỒN SỐ DUY NHẤT (`so-do-bieu-tuong.js` luật ①). SW này KHÔNG tự đếm,
   KHÔNG cộng dồn, KHÔNG nhớ gì cả — nó hỏi ĐÚNG `/api/chat/chua-doc`, đúng cái
   API mà huy hiệu trong ERP đang dùng, nên hai con số không thể lệch. Tự cộng
   dồn trong SW là cách chắc chắn để lệch: một tin đọc trên điện thoại là số
   trên máy tính sai vĩnh viễn.
     · Phiên đăng nhập là cookie HttpOnly same-origin → `credentials:'same-origin'`
       từ SW vẫn đính đúng cookie, không cần token, không cần đụng gì thêm.

   SỔ SÁCH D1 (hạn mức vừa vá 29/08). Nếu ERP đang mở ở tab nào thì SW KHÔNG
   gọi gì cả — `veBadge()` trong `app.js` đã đặt số mỗi 6 giây rồi, gọi thêm là
   lượt đọc thừa VÀ là chỗ ghi thứ hai. Chỉ khi ERP đóng hẳn mới có một lượt
   SELECT, mà lượt đẩy đã bị chặn bởi gộp 60 giây và trần 12 tin/ngày
   (`TRAN_NGAY`, src/day-thong-bao.js) → tối đa 12 lượt đọc/người/ngày. So với
   14.400 lượt/ngày của một tab đang mở thì đây là số làm tròn thành 0.

   HỎNG ÊM: Firefox/Safari và mọi máy CHƯA CÀI ERP không có `setAppBadge` —
   hàm này lặng lẽ về, không ném, không log. */
async function datSoDoBieuTuong() {
  try {
    if (typeof self.navigator?.setAppBadge !== 'function') return;
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (tabs.some((t) => t.url.includes('/app.html'))) return;   // app.js đang lo, đừng chen

    const res = await fetch('/api/chat/chua-doc', { credentials: 'same-origin' });
    if (!res.ok) return;                       // hết phiên (401) → không đoán bừa một con số
    const { so_luong } = await res.json();
    const n = Number(so_luong);
    if (!Number.isFinite(n) || n <= 0) await self.navigator.clearAppBadge();
    else await self.navigator.setAppBadge(Math.floor(n));
  } catch { /* mất mạng / không hỗ trợ / hệ điều hành từ chối — im lặng đúng luật ② */ }
}

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
