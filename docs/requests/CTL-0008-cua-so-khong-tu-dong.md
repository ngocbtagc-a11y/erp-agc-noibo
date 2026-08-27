# CTL-0008 — Cửa sổ bung ra không tự đóng sau khi lưu

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc
- **Ngày nhận**: 2026-08-27
- **Category**: `BUG` + `UX_IMPROVEMENT`
- **Priority**: **P2** (cản trở thao tác hằng ngày, nhiều người gặp)
- **Risk**: MEDIUM (nếu phải sửa ở tầng dùng chung thì đụng toàn bộ ERP)
- **Status**: `READY_QUEUE` — xếp ngay sau GY-0001
- **Current Owner**: GẠO → **Next Owner**: KHỈ ĐỘT (điều tra + sửa) → HỒ LY (rà toàn ERP)

---

## 1. Yêu cầu gốc

> *"cửa sổ này cứ bung ra như này rất khó làm việc nhé, đổi trạng thái xong phải
> đóng lại, rà xem có chỗ nào bị lỗi như vậy nữa không"*

Sếp gửi kèm ảnh: popover **"Trạng thái của tôi"** ở Sidebar (Trạng thái · Ghi chú ·
Thời hạn · nút Lưu) — mở ra rồi nằm lì, che mất chỗ làm việc.

Hai phần việc:
1. Sửa cái popover Trạng thái hiện diện.
2. **Rà toàn ERP** xem còn cửa sổ nào cùng lỗi.

## 2. GẠO ĐÃ ĐIỀU TRA — đừng vá kiểu "thêm dòng đóng lại"

Đọc `public/assets/js/app.js:994-1013`. **Code ĐÃ CÓ lệnh đóng sau khi lưu:**

```js
$('#thdLuu').addEventListener('click', async () => {
  ...
  try {
    await API.nsTrangThaiHD(ma, ghiChu, thoiHan);
    ...
    $('#thdPanel').hidden = true;        // ← ĐÃ đóng ở đây
    ...
  } catch (err) {
    alert(err.message || 'Không đổi được trạng thái, thử lại nhé.');
                                          // ← nhánh LỖI: KHÔNG đóng
  } finally { nutLuu.disabled = false; }
});
document.addEventListener('click', () => { $('#thdPanel').hidden = true; });
```

Nghĩa là giả thuyết đơn giản nhất ("quên viết lệnh đóng") **SAI**. Đừng sửa theo
hướng đó, sẽ tốn một vòng vô ích.

**Bốn giả thuyết cần loại trừ bằng bằng chứng, không đoán:**

| # | Giả thuyết | Cách kiểm |
|---|---|---|
| 1 | **API lưu đang lỗi** → rơi vào `catch`, popover ở lại. Sếp có thể thấy `alert` rồi bỏ qua, hoặc alert bị chặn | Mở DevTools Network/Console lúc bấm Lưu; kiểm `API.nsTrangThaiHD` và endpoint backend |
| 2 | **Trên điện thoại/cảm ứng**: `document.addEventListener('click')` không bắn đúng với thao tác chạm | Thử ở khổ mobile, thêm `touchstart`/`pointerdown` nếu đúng |
| 3 | **Bản đang chạy thật khác bản trong repo** — deploy chưa lên, hoặc trình duyệt cache Service Worker của PWA | So mã đang chạy trên production với `git show HEAD:public/assets/js/app.js`; kiểm chiến lược cache của PWA |
| 4 | Sếp mở ra rồi bấm ra ngoài mà **click rơi trúng vùng panel** (`stopPropagation` chặn) nên không đóng | Kiểm vùng phủ của panel, thêm nút X và phím `Esc` |

**Bắt buộc: xác định nguyên nhân thật trước khi sửa, ghi lại trong Handoff.**

## 3. Phần rà toàn ERP — giao HỒ LY (QA/Red Team)

`public/app.html` có **trên 40 modal/panel/popup**. Cần rà có hệ thống,
không đọc lướt.

Với **mỗi** cửa sổ, kiểm đủ 5 điều:

1. Lưu **thành công** → có tự đóng không?
2. Lưu **thất bại** → có báo lỗi rõ và giữ lại dữ liệu người dùng vừa nhập không?
   (Đóng luôn khi lỗi là sai — mất công người ta gõ lại.)
3. Bấm **ra ngoài** có đóng không?
4. Phím **Esc** có đóng không?
5. Trên **điện thoại** có đóng được không? (ERP là PWA, kho dùng điện thoại là chính)

Xuất ra bảng: tên cửa sổ · dòng code · đạt/không đạt từng mục · mức nghiêm trọng.
Ghi vào `docs/reviews/REV-0001-ra-soat-dong-cua-so.md`.

**Nếu phát hiện lỗi lặp ở nhiều chỗ** → đề xuất **một hàm dùng chung**
(mở/đóng/Esc/click-ra-ngoài/xử lý lỗi) thay vì vá từng chỗ — Hiến pháp Rule 5.
Nhưng hàm dùng chung là `CORE_CHANGE`: **STOP, trình Sếp duyệt trước khi code**,
theo `docs/CORE-CHANGE-POLICY.md`.

Tham khảo `docs/LIST_UX_AUDIT.md` và `docs/UX_ENGINEERING_STANDARD.md` — đã có
khuôn rà UX, dùng lại, đừng bịa khuôn mới.

## 4. Vì sao xếp hàng chứ không làm ngay

Khỉ Đột đang build **GY-0001** trong cùng file `public/assets/js/app.js`.
Hai người cùng sửa một file trên hai nhánh → xung đột merge (Hiến pháp Rule 13 —
One Writer Per Area).

Rủi ro lớn hơn: nếu bản rà soát kết luận cần **hàm đóng cửa sổ dùng chung**, nó
sẽ đụng **mọi** modal — kể cả ô góp ý Khỉ Đột đang sửa dở. Làm song song chắc
chắn hỏng.

→ GY-0001 xong trước, rồi tới việc này. Cùng một Agent, cùng vùng, làm nối tiếp.

## 5. Ràng buộc

- Không đóng cửa sổ khi lưu **thất bại** — giữ nguyên dữ liệu người dùng đã nhập.
- Không tự đẻ class CSS mới nếu cái sẵn có dùng được.
- Hàm dùng chung = `CORE_CHANGE` → phải Sếp duyệt trước.
- Nhánh riêng, không merge vào `main`, không deploy.

## 6. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Popover Trạng thái của tôi không tự đóng |
| `NEW` | `TRIAGE` | GẠO | 2026-08-27 | Đọc code: lệnh đóng ĐÃ có ở nhánh thành công → loại giả thuyết "quên viết". Nêu 4 giả thuyết cần kiểm. |
| `TRIAGE` | `READY_QUEUE` | GẠO | 2026-08-27 | Xung đột vùng code với GY-0001 đang chạy → xếp nối tiếp, không song song |
