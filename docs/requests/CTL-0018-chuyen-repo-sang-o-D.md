# CTL-0018 — Chuyển toàn bộ ERP sang ổ D

- **Requester**: ERP Owner — Sếp Bùi Thị Ngọc, 2026-08-27
- **Category**: `OPS` (hạ tầng máy, không phải tính năng ERP)
- **Priority**: **P2** — Sếp muốn về lâu về dài
- **Risk**: **MEDIUM** — 7 cây làm việc + 5 nhánh chưa merge đang trỏ đường dẫn tuyệt đối
- **Status**: `BLOCKED` — chờ 2 việc đang chạy xong
- **Owner**: GẠO tự làm, không cần Agent

---

## 1. Yêu cầu

> *"chuyển toàn bộ dữ liệu về erp sang ổ D được không, ổ C của tao sắp đầy rồi,
> mà code như này nặng quá"* · *"chuyển đi, tao cần chuyển về lâu về dài thì phải làm"*

Sếp đã tái khẳng định. **Làm.**

## 2. Số đo — ghi lại cho đúng sự thật

| | |
|---|---|
| Ổ C | dùng 105 GB · **còn trống 159 GB** |
| Ổ D | dùng 0,1 GB · **trống 199,9 GB** |
| Repo ERP | **189 MB** |
| ↳ `node_modules` | 165,6 MB *(thư viện tải về, xoá lúc nào cũng được)* |
| ↳ `.wrangler` | 10,6 MB *(bộ nhớ tạm)* |
| ↳ `.git` | 6,5 MB |
| ↳ **code + tài liệu thật** | **~3 MB** |
| Ngốn ổ C thật sự | **`AppData` — 31,66 GB** |

Ổ C **không sắp đầy**, và ERP **không nặng** — nhưng đó không phải lý do để không
chuyển. Ổ D đang trống 200 GB không dùng gì; để code ở đó **gọn hơn về lâu dài**
và tách khỏi thư mục hệ thống. Quyết định của Sếp hợp lý.

## 3. Vì sao KHÔNG chuyển ngay bây giờ

`git worktree list` cho ra **7 cây làm việc**, đều trỏ **đường dẫn tuyệt đối**:

```
C:/Users/Admin/Desktop/AI/crm-agc              ← repo chính
C:/Users/Admin/Desktop/AI/wt-spec0007          ← hợp đồng (đã vá, chờ soi)
C:/Users/Admin/Desktop/AI/wt-spec0007-dot234   ← năng lực/JD/sinh nhật (đang soi)
.../Temp/claude/agc-ctl0002a                   ← runner
.../Temp/claude/agc-saoluu-p1                  ← sao lưu (đang soi)
.../Temp/claude/agc-saoluu · agc-ship
```

Và **5 nhánh chưa merge** đang giữ việc thật:
runner · sao lưu · hợp đồng · năng lực/JD/sinh nhật · dán ảnh.

**Di chuyển thư mục lúc này = phá toàn bộ metadata worktree**, và **2 Agent đang
soi dở sẽ mất việc** — đúng cái đã xảy ra lúc cháy hạn mức sáng nay.

## 4. Kế hoạch — 7 bước, làm khi hàng đợi trống

1. **Chờ 2 việc đang soi xong.** Ghép hoặc đẩy những gì đạt.
2. **Commit hết** việc còn dở ở mọi cây làm việc. Không để dòng nào chưa lưu.
3. **Gỡ sạch worktree**: `git worktree remove` từng cái + `git worktree prune`.
4. **Chuyển thư mục** `Desktop\AI\crm-agc` → `D:\ERP\crm-agc`.
   *(Không dùng `Move-Item` khi còn tiến trình mở file — đóng hết trước.)*
5. **Sửa đường dẫn trong tài liệu.** `grep -rl "C:\\\\Users\\\\Admin\\\\Desktop\\\\AI\\\\crm-agc" docs/`
   — nhiều bản giao việc, ADR, hướng dẫn đang ghi cứng đường dẫn cũ.
6. **Kiểm lại**: `git status` · `git log` · `npm ci` · `npx wrangler d1 execute --remote`
   *(chỉ lệnh đọc)* · chạy thử một bàn thử.
7. **Dọn phần cũ**: xoá `C:\Users\Admin\ERP` (biển chỉ đường, đã hết vai trò —
   xem ADR-0004) và `node_modules` 256 MB lạc ở `Desktop\AI`.

## 5. Rủi ro và cách phòng

| Rủi ro | Phòng |
|---|---|
| Mất việc chưa commit | Bước 2 bắt buộc, kiểm `git status` sạch ở **mọi** cây |
| Worktree hỏng sau khi chuyển | Bước 3 gỡ sạch **trước** khi chuyển, dựng lại sau |
| Tài liệu trỏ đường dẫn chết | Bước 5, quét cả `docs/` |
| Phiên Claude Code đang mở trỏ đường cũ | Sau khi chuyển, Sếp mở phiên mới từ `D:\ERP\crm-agc` |
| Chuyển nửa chừng mất điện | **Sao chép trước, xoá sau** — không dùng lệnh cắt-dán |

## 6. Lưu ý

- **`node_modules` không cần chép** — chuyển xong chạy `npm ci` là có lại.
  Bớt được 165 MB thời gian sao chép.
- Đường dẫn mới đề xuất: **`D:\ERP\crm-agc`** — ngắn, không dấu cách, không
  nằm trong Desktop hay OneDrive.
- Không đụng gì trên GitHub — repo trên mạng không liên quan đường dẫn máy.

## 7. History

| from | to | by | at | note |
|---|---|---|---|---|
| — | `NEW` | ERP Owner | 2026-08-27 | Chuyển ERP sang ổ D |
| `NEW` | `BLOCKED` | GẠO | 2026-08-27 | Đo: ổ C còn 159 GB, repo chỉ 189 MB (code thật ~3 MB), thủ phạm ngốn ổ C là `AppData` 31,66 GB. Sếp tái khẳng định vẫn chuyển → làm. Chặn bởi **7 worktree + 5 nhánh chưa merge**; chuyển lúc này là phá việc của 2 Agent đang chạy |
