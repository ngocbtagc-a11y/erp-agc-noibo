# File LÙI — không bao giờ chạy tự động

Bốn file trong thư mục này là **nút hoàn tác**. Chúng `DROP TABLE`,
`DROP COLUMN`, và `DELETE FROM schema_migrations`. Chạy nhầm một file ở đây
là **mất dữ liệu thật**, không phải lỗi cấu hình.

## Vì sao phải nằm riêng một thư mục

Máy nạp CSDL tự động (`scripts/tu-nap-db.mjs`) quét **mọi** file `.sql` nằm
thẳng trong `migrations/`, coi file nào chưa có tên trong sổ `schema_migrations`
là **file còn thiếu**, rồi chạy nó. File lùi chưa bao giờ có tên trong sổ —
nên nó luôn bị coi là "còn thiếu".

Nếu bốn file này còn nằm ở `migrations/`, lần deploy đầu tiên sau khi bật máy
nạp tự động sẽ chạy cả bốn, và **xoá sạch cổng duyệt góp ý**: bảng
`gop_y_lich_su` bị `DROP`, cột `duyet_gopy` của `tai_khoan` bị gỡ, 15 cột cổng
duyệt của `gop_y` biến mất.

`readdirSync('migrations')` không đọc thư mục con, nên đặt ở đây là hết đường
chạy nhầm — không cần thêm một dòng mã chặn nào.

## Chạy tay khi thật sự cần lùi

```
npx wrangler d1 execute crm-agc --remote --file=migrations/lui/<tên-file>.sql
```

**Trước khi chạy: deploy lại mã cũ trước.** Mã mới đọc các cột này; gỡ cột ra
trong khi mã mới đang chạy là ERP hỏng ngay lập tức.

## Luật cho file mới

File lùi **luôn** đặt tên `lui-*.sql` và **luôn** nằm trong `migrations/lui/`.
Không có ngoại lệ.
