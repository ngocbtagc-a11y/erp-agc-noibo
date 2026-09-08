# Audit kiến trúc ERP Alpha Green Commerce
**Ngày:** 2026-08-20 · **Phạm vi:** repo `erp-agc-noibo` (Cloudflare Workers + D1) · **Trạng thái:** Phase 0 — chỉ phân tích, chưa sửa code

---

## A. EXECUTIVE SUMMARY

**Codebase đang ở mức nào?** Đây là một **prototype chạy thật rất tốt cho quy mô hiện tại** (15-20 người), được xây bằng tay, tốc độ nhanh, phản ứng sát nhu cầu thực tế hàng ngày. Nhiều quyết định kỹ thuật nền tảng (bảo mật mật khẩu, sổ cái kho theo dạng ledger, ẩn cột lương ở tầng SQL) làm **đúng ngay từ đầu** — tốt hơn nhiều hệ thống "chuyên nghiệp" tôi từng thấy. Nhưng nó được xây theo lối **"thêm tính năng khi phát sinh nhu cầu"** liên tục trong ~1 tháng (70+ commit), không có lớp kiến trúc dùng chung đứng giữa các phòng ban — nên đang bắt đầu lộ đúng những triệu chứng "ốc đảo phòng ban" mà bản brief của Sếp mô tả.

**Có cần refactor lớn không?** **Chưa cần đập đi xây lại.** Cần một đợt **củng cố nền (Phase 2 trong roadmap ở mục K)** tập trung vào đúng 3 chỗ đang đau nhất, không phải tái cấu trúc toàn bộ 27 bảng.

**3 rủi ro lớn nhất, xếp theo mức độ cấp bách:**

1. **Không có cơ chế theo dõi migration đã chạy hay chưa.** 27 file SQL rời rạc, chạy tay từng lệnh `wrangler d1 execute --remote`, không bảng nào ghi lại "đã chạy file nào". Hệ quả: đã xảy ra **2 sự cố thật trong chính phiên làm việc này** — "vỡ bảng Đơn hoàn vì thiếu cột", "Trạm Mục Tiêu trắng trơn vì thiếu bảng". Đây không phải rủi ro lý thuyết, nó đã xảy ra và sẽ tiếp tục xảy ra nếu không sửa quy trình.
2. **Bảng `don_hoan` đã trở thành "God Table".** Một bảng duy nhất đang gánh: dữ liệu đơn hoàn gốc + trạng thái quy trình 3 chặng (Kho→Vận hành sàn→Kế toán) + audit trail (7 cặp cột `..._luc`/`..._boi`) + cờ cảnh báo + phân loại hàng hỏng + khiếu nại. 12 migration khác nhau đã ALTER vào bảng này. Đây đúng là triệu chứng silo mà mục 6 trong brief mô tả: *"Nhiều hệ trạng thái giống nhau nhưng không liên kết"*, *"Logic approval nằm rải rác"*.
3. **Không có Order Core.** `don_hoan` (đơn hoàn) và `don_hang` (đơn hàng, vừa thêm) là hai bảng **độc lập hoàn toàn**, nối với nhau bằng `order_sn` dạng TEXT tự do — không phải khóa ngoại. Đúng triệu chứng mục 6: *"Quan hệ dữ liệu chỉ tồn tại bằng text/name thay vì ID/FK"*.

Tin tốt: cả 3 vấn đề này đều **sửa được từng phần, không phải sửa hết một lần**, và không đụng tới phần đang chạy tốt (Kho, Auth, Nhân sự).

---

## B. CURRENT ARCHITECTURE MAP (dạng text)

```
┌─────────────────────────────────────────────────────────────────┐
│  CLOUDFLARE WORKERS (1 Worker duy nhất, tên "erp-agc")           │
│                                                                   │
│  public/  (tĩnh, trình duyệt tải được — coi như công khai)       │
│    index.html        — màn đăng nhập                            │
│    app.html          — 1 file HTML chứa TẤT CẢ các tab (ẩn/hiện)│
│    assets/js/app.js  — 2572 dòng, 1 file JS chứa TẤT CẢ UI logic│
│    assets/js/api.js  — lớp gọi fetch() tới API                  │
│    assets/js/data.js — dữ liệu mẫu còn sót cho vài panel cũ     │
│    sw.js             — service worker (cache giao diện, PWA)    │
│                                                                   │
│  src/  (chạy trên máy chủ, bí mật)                               │
│    index.js   (1936 dòng) ── ĐIỂM VÀO DUY NHẤT + ROUTER          │
│         │        chứa TRỰC TIẾP business logic của:              │
│         │        đăng nhập·danh bạ·nhân sự·chat·quản trị·        │
│         │        vinh danh·công việc·mục tiêu·thông báo·         │
│         │        kinh doanh(đối soát 3 chặng)·kế toán·hàng hỏng  │
│         │                                                        │
│         ├── auth.js     (mật khẩu, phiên, cookie)      [tách rời, SẠCH]│
│         ├── mat-khau.js (chính sách mật khẩu)          [tách rời, SẠCH]│
│         ├── quyen.js    (bảng phân quyền theo vai_tro) [tách rời, TỐT]│
│         ├── kho.js      (Xuất/Nhập/Tồn, sổ cái, FEFO)  [tách rời, TỐT]│
│         ├── nhansu.js   (OCR CCCD, hồ sơ mới)          [tách rời]│
│         ├── shopee.js   (OAuth + đồng bộ Shopee)  ──┐             │
│         └── tiktok.js   (OAuth + đồng bộ TikTok)  ──┴─► ghi THẲNG│
│                                                        vào don_hoan/│
│                                                        don_hang    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              CLOUDFLARE D1 (SQLite) — 1 database "crm-agc"
     schema.sql (nền) + 27 file migrations/*.sql (chạy tay, không tracking)
                              │
                              ▼
        Cloudflare Workers AI (@cf/meta/llama-4-scout-17b-16e — đọc ảnh)

┌─ CI/CD ───────────────────────────────────────────────────────────┐
│ GitHub Actions (.github/workflows/deploy.yml)                     │
│ push → main  ⇒  tự động `wrangler deploy` (CHỈ CODE, KHÔNG MIGRATE DB)│
│ Cron nội bộ Worker (*/5 phút): đồng bộ Shopee/TikTok + cảnh báo    │
└─────────────────────────────────────────────────────────────────┘
```

**Nhận xét kiến trúc:** Đây là **"1-file monolith"**, không phải "modular monolith" như mục tiêu ở brief (mục 39). Ranh giới module hiện tại chỉ tồn tại trong đầu người viết code (comment `/* ===== TÊN MODULE ===== */` ngăn cách các đoạn), chứ chưa tồn tại về mặt cấu trúc thư mục/import. `kho.js`, `shopee.js`, `tiktok.js`, `nhansu.js`, `auth.js`, `quyen.js` là các module TÁCH RIÊNG đúng nghĩa — đây là nền tảng tốt để mở rộng thành modular monomith thật sự.

---

## C. EXISTING MODULES (theo cách tổ chức code hiện tại)

| Module | File | Domain | Trạng thái |
|---|---|---|---|
| Auth & Session | `src/auth.js` | Core | Tách riêng, chất lượng cao |
| Permission | `src/quyen.js` | Core | Tách riêng, nhưng hard-code trong source, không ở DB |
| Nhân sự (Employee) | `src/nhansu.js` + phần trong `index.js` | Core | Tách một phần |
| Danh bạ | trong `index.js` | Core | Chưa tách file |
| Chat nội bộ | trong `index.js` | Cross-cutting | Chưa tách file |
| Kho (Xuất/Nhập/Tồn) | `src/kho.js` | Domain | Tách riêng, kiến trúc TỐT (ledger) |
| Đơn hoàn + đối soát 3 chặng | trong `index.js` (phần lớn nhất) | Domain | Chưa tách, đang là silo (mục E) |
| Đơn hàng/doanh thu | trong `index.js` + `shopee.js`/`tiktok.js` | Domain | Mới, sơ khai |
| Kế toán tra soát | trong `index.js` | Domain | Chưa tách |
| Vinh danh | trong `index.js` | Cross-cutting nhỏ | Chưa tách |
| Trạm Mục Tiêu (Task) | trong `index.js` | Core (nên là) | Chưa tách, nhưng đã tổng quát hoá tốt |
| Mục tiêu (MBOs) | trong `index.js` | Core (nên là) | Mới, sơ khai |
| Thông báo | trong `index.js` | Core | Chưa tách file nhưng đã là bảng dùng chung — TỐT |
| Shopee/TikTok integration | `src/shopee.js`, `src/tiktok.js` | External Integration | Tách riêng nhưng ghi thẳng vào bảng nghiệp vụ |
| Quản trị tài khoản | trong `index.js` | Core | Chưa tách |

---

## D. EXISTING CORE ENTITIES (những gì có thể coi là Core ngay bây giờ)

Đã có và **dùng đúng như Core** (một nguồn sự thật, nhiều module cùng dùng):

- **`nhan_su`** (Employee) — 1 nguồn duy nhất. TỐT.
- **`tai_khoan`** (User/Auth) — 1:1 với `nhan_su`, 1 nguồn duy nhất. TỐT.
- **`phien`** (Session) — Core, tách riêng đúng.
- **`thong_bao`** (Notification) — 1 bảng dùng chung cho Công việc, Kế toán, Kho, Kinh doanh. Đúng tinh thần mục 18.
- **`cong_viec`** (Task) — 1 bảng dùng chung cho MỌI phòng ban, mở cho mọi vai trò. Đây là bước khởi đầu tốt nhất hướng tới Task Core (mục 14), chỉ thiếu vài trường chuẩn hoá (xem mục F).
- **`muc_tieu`** (Goal) — vừa thêm, đã phân cấp Công ty/Phòng ban đúng tinh thần MBOs (mục 30).
- **`san_pham` / `lo_hang` / `giao_dich_kho`** — Master data sản phẩm + sổ cái kho. Đây chính là **Inventory Ledger đúng chuẩn mục 27 của brief** — không sửa gì thêm ở phần lõi này.

**Core còn thiếu hẳn** (chưa tồn tại entity nào, kể cả sơ khai):
- Audit Log chung (đang bị thay thế bằng các cặp cột `_luc`/`_boi` lặp lại thủ công trên từng bảng).
- Permission ở dạng dữ liệu (RBAC `resource.action`) — hiện là hard-code trong `quyen.js`.
- Approval Core.
- Process/Workflow Core tổng quát (hiện có 1 workflow viết tay cho riêng đơn hoàn).
- Employment Type / Work Pattern / Schedule / Shift / PT Registration — **chưa có gì**, đúng như brief đã tự nhận định doanh nghiệp chưa có sẵn.
- Skill Core — chưa có gì.
- Order Core hợp nhất (đang có 2 bảng rời: `don_hoan`, `don_hang`).

---

## E. DUPLICATION / SILO REPORT — "ốc đảo phòng ban" đã phát hiện

### 🔴 Silo #1: `don_hoan` — God Table của quy trình đơn hoàn
Một bảng, khởi tạo bởi `them-shopee.sql` (9 cột), sau đó **12 migration khác** lần lượt ALTER thêm cột vào, đến nay đã gánh **4 vai trò khác nhau trong 1 bảng**:

| Vai trò | Các cột minh chứng | Đáng lẽ nên ở đâu |
|---|---|---|
| Dữ liệu đơn hoàn gốc từ sàn | `return_sn, order_sn, so_tien, san_pham_ten...` | Order/Return Core |
| Trạng thái quy trình 3 chặng | `dang_cho` (kho→van_hanh→ke_toan) | Process/Workflow Core |
| Audit "ai làm gì lúc nào" — lặp lại 7 lần | `kho_nhan_luc/boi`, `doi_soat_luc/boi`, `ke_toan_luc/boi`, `khieu_nai_luc/boi`, `phan_loai_luc/boi`, `bien_ban_luc/boi`, `tinh_trang_luc/boi` | Audit Log dùng chung |
| Cờ cảnh báo hệ thống | `da_canh_bao`, `da_canh_bao_nghiem_trong` | Notification Core (đã có `thong_bao`, lẽ ra nên bắn thẳng vào đó) |

→ Đây **chính xác** là triệu chứng mục 6 brief mô tả: *"Nhiều hệ trạng thái giống nhau nhưng không liên kết"*.

### 🔴 Silo #2: Không có Order Core — `don_hoan` và `don_hang` tách rời
`don_hang.order_sn` và `don_hoan.order_sn` đều là TEXT tự do, không FK, không bảng `don_hang_goc` trung tâm. Muốn biết "đơn X có bị hoàn không, hoàn bao nhiêu %" phải tự JOIN bằng tay qua chuỗi text — dễ lệch khi 1 bên đổi định dạng mã đơn.

### 🟡 Silo #3: External API ghi thẳng vào bảng nghiệp vụ
`shopee.js`/`tiktok.js` gọi API sàn rồi `INSERT`/`UPDATE` thẳng vào `don_hoan`/`don_hang` trong cùng 1 hàm — không có lớp Raw/Staging. Không phá vỡ gì ngay bây giờ, nhưng nghĩa là: Shopee đổi tên field → phải sửa code nghiệp vụ; muốn xem "log thô sàn trả về hôm đó" để debug → không có, phải đọc lại `du_lieu_json` (may mắn là họ CÓ lưu JSON gốc — điểm cộng, giảm nhẹ rủi ro này).

### 🟡 Silo #4: Audit trail tự chế, lặp lại thủ công
Không chỉ `don_hoan` — `muc_tieu` cũng có `chot_boi/chot_luc`, `cong_viec` có `cap_nhat_luc`. Mỗi lần cần "ai/khi nào" là thêm 2 cột mới vào đúng bảng đó, thay vì ghi 1 dòng vào Audit Log chung. Không sai về mặt chức năng (vẫn trả lời được câu hỏi), nhưng là duplicate pattern — 27 migration một phần lớn là vì lặp lại cách làm này.

### 🟡 Silo #5: Permission hard-code, phân tán
`quyen.js` là single-source (điểm cộng lớn — KHÔNG có permission hard-code rải rác trong từng trang như brief lo ngại ở mục 6). Nhưng nó là **object JavaScript tĩnh trong source code**, không phải dữ liệu trong DB. Muốn đổi quyền 1 vai trò → phải sửa code, tạo PR, deploy — không thể tự cấu hình qua UI.

### 🟢 Không phải silo (dù trông giống): `sku_map`
Bảng ánh xạ "tên sản phẩm sàn trả về" → SKU kho nội bộ. Đây **là cách làm đúng** khi hai hệ thống có định danh khác nhau (channel mapping) — nên giữ nguyên, không phải thứ cần dọn.

### 🟢 Không có silo Employee/Product
Đã kiểm tra kỹ: không có `employee_hr`, `warehouse_employee`, `accounting_employee`, không có bảng Product/SKU thứ hai nào. **Đây là điểm mạnh nhất của codebase hiện tại** — kỷ luật dùng chung `nhan_su`/`san_pham` được giữ tốt suốt quá trình phát triển nhanh.

---

## F. TARGET ARCHITECTURE (đề xuất)

Giữ nguyên tech stack (Cloudflare Workers + D1) — **không có lý do kỹ thuật nào để đổi**, chi phí thấp, đủ sức cho quy mô SME này nhiều năm tới. Việc cần làm là tổ chức lại **thư mục + Core entities**, không phải đổi công nghệ.

```
src/
  core/                    ← Core: MỌI module khác được phép phụ thuộc vào đây
    auth.js                (giữ nguyên, đã tốt)
    quyen.js  → dần chuyển permission sang bảng DB (Phase sau)
    organization.js         Company/Department/Employee (từ index.js tách ra)
    task.js                  Task Core tổng quát (nâng cấp cong_viec)
    notification.js          (tách thong_bao ra khỏi index.js)
    audit.js                 MỚI — audit log dùng chung
    master-data.js           Product/SKU/Supplier (tách khỏi kho.js nếu cần)

  domain/
    warehouse/    (đổi tên từ kho.js — GIỮ NGUYÊN logic, chỉ tổ chức lại thư mục)
    returns/       ← domain "Đơn hoàn + đối soát 3 chặng" tách khỏi index.js
    orders/        ← domain "Đơn hàng/doanh thu"
    accounting/    ← "Kế toán tra soát"
    marketplace/    ← shopee.js, tiktok.js (integration layer, KHÔNG ghi thẳng DB nữa)
    hr/             ← nhansu.js + phần tuyển dụng/onboarding sau này
    okr/            ← muc_tieu.js (MBOs)

  index.js          ← CHỈ còn router (map URL → handler), không chứa business logic
```

Đây không phải đổi framework hay viết lại — là **di chuyển các đoạn code đã có trong `index.js` sang đúng file/thư mục của nó**, giữ nguyên logic, giữ nguyên API contract với frontend. Rủi ro thấp, có thể làm từng module một.

---

## G. CORE vs DOMAIN — phân loại rõ

**CORE (dùng chung toàn công ty, chỉ Core Maintainer được sửa):**
`nhan_su`, `tai_khoan`, `phien`, `quyen.js` (permission), `thong_bao`, `cong_viec` (Task), `muc_tieu` (Goal/OKR), `san_pham` (Master Data), Audit Log (mới), Organization (Company/Department — hiện đang là field text `bo_phan` trên `nhan_su`, đủ dùng ở quy mô này, **chưa cần tách bảng riêng**).

**DOMAIN MODULE (thuộc nghiệp vụ cụ thể, Module Contributor được sửa trong phạm vi):**
- **Warehouse**: `lo_hang`, `giao_dich_kho`, luồng picking/packing.
- **Returns** (Đơn hoàn): `don_hoan`, luồng 3 chặng, đối soát, khiếu nại, hàng hỏng.
- **Orders**: `don_hang`, doanh thu.
- **Accounting**: tra soát, biên bản.
- **Marketplace Ops** (Shopee/TikTok): `shopee_ket_noi`, `tiktok_ket_noi`, `sku_map`, logic đồng bộ.
- **HR**: hồ sơ mở rộng, CCCD, sao/vinh danh.
- **Chat**: `tin_nhan_chat`.

Ranh giới then chốt (đúng mục 21 brief): **Task = Core. Nhưng "đối soát Shopee" là logic nghiệp vụ của domain Accounting/Marketplace, không phải Core.** Hiện tại luồng đối soát 3 chặng đang bị lẫn vào chung với dữ liệu đơn hoàn gốc trong cùng 1 bảng — đây là việc cần tách ở Phase 2.

---

## H. DATABASE MIGRATION PLAN

| Bảng/thành phần | Hành động | Vì sao |
|---|---|---|
| `nhan_su`, `tai_khoan`, `phien`, `lan_dang_nhap_hong` | **KEEP** | Đúng chuẩn, không đụng |
| `san_pham`, `lo_hang`, `giao_dich_kho` | **KEEP** | Ledger đúng chuẩn, đây là mẫu để các domain khác học theo |
| `thong_bao` | **KEEP**, mở rộng dần | Đã là Core tốt |
| `cong_viec` | **REFACTOR** (thêm cột, không đổi cột cũ) | Thêm `task_type`, `module`, `reference_type/reference_id` để dùng được cho Kho/Kế toán/CSKH thay vì chỉ "giao việc" tự do |
| `muc_tieu` | **KEEP** | Mới, đã đúng hướng |
| `don_hoan` | **REFACTOR + MERGE dần** | Tách audit (7 cặp `_luc/_boi`) ra Audit Log; tách trạng thái `dang_cho` ra một bảng `quy_trinh_trang_thai` nhỏ nếu sau này có thêm quy trình thứ 2 tương tự. **Không xoá cột nào ngay** — thêm bảng mới, đồng bộ dữ liệu, rồi mới deprecate cột cũ |
| `don_hoan` ↔ `don_hang` | **MIGRATE** | Thêm FK thật `don_hang_id` vào `don_hoan` khi có đủ dữ liệu khớp mã đơn |
| `sku_map` | **KEEP** | Đúng pattern channel-mapping |
| `shopee_ket_noi`, `tiktok_ket_noi` | **KEEP** | Hạ tầng kết nối OK |
| (chưa có) Audit Log | **CREATE MỚI** | `audit_log(actor_id, action, entity_type, entity_id, old_value, new_value, tao_luc)` |
| (chưa có) `schema_migrations` | **CREATE MỚI, ưu tiên cao nhất** | Bảng 1 cột `filename` ghi migration đã chạy — chặn đứng lớp sự cố đã xảy ra 2 lần |
| `data.js` (frontend, dữ liệu mẫu) | **DELETE LATER** | Sau khi Kinh doanh/Kế toán nối xong dữ liệu thật hoàn toàn |

**Không có gì trong danh sách này là DEPRECATE ngay** — đúng nguyên tắc "không phá dữ liệu cũ, không xoá chức năng đang chạy" của brief.

---

## I. DEVELOPMENT GOVERNANCE (để nhân viên phòng ban dùng AI/Claude Code sau này mà không phá Core)

Đề xuất áp dụng ngay, chi phí gần bằng 0:

1. **Thư mục `core/` có file `CLAUDE.md` riêng** ghi rõ: *"File trong thư mục này chỉ sửa khi có xác nhận của Sếp/Core Maintainer. Nếu AI được yêu cầu sửa file ở đây, phải dừng lại và hỏi trước."* Claude Code tự động đọc `CLAUDE.md` gần nhất — đây là cách "phân quyền code" rẻ và hiệu quả nhất ở giai đoạn này, không cần xây hệ thống permission-cho-Git phức tạp.
2. **Bắt buộc mọi PR/commit đụng tới `core/` phải nêu lý do trong message** — đã có thói quen tốt sẵn (commit message hiện tại đã rất chi tiết, có ngày tháng, có tên người chốt quyết định — giữ nguyên thói quen này).
3. **Checklist trước khi tạo bảng mới** (áp dụng mục 37 của brief): *"Field này thêm được vào entity Core sẵn có không? Nếu có thể, không tạo bảng mới."*
4. **`schema_migrations` bắt buộc** — mọi file migration mới phải tự ghi tên mình vào bảng này khi chạy xong, và có 1 lệnh `npm run kiem-tra-migration` báo "còn N file chưa chạy trên remote".
5. Về lâu dài (Phase 4+): tách `quyen.js` từ hard-code sang bảng `permissions` trong DB, để sau này thêm quyền không cần deploy code.

---

## J. MOBILE PLAN

**Đánh giá hiện tại: khá tốt, không cần sửa gấp.**
- Đã là PWA thật (manifest, service worker, "Thêm vào màn hình chính").
- Giao diện dùng pattern `seg`/`kv-pane` (thanh chuyển màn kiểu pill) — gọn, ít click, đúng tinh thần mobile-first của brief.
- Nút to, ít field thừa ở các form đã xem (Nhập/Xuất kho, Giao việc).
- Chưa thấy tích hợp quét mã vạch/QR camera thật cho Kho (mục 32 brief đề cập) — có `html5-qrcode.min.js` cho quét mã đơn hoàn, nhưng Kho (Nhập/Xuất) chưa có scan-to-fill. Đây là điểm cải thiện tốt cho Phase Warehouse pilot.

---

## K. PRIORITY ROADMAP

### Phase 0 — Audit *(đã xong, chính là tài liệu này)*
Không sửa code.

### Phase 1 — Protect *(1-2 ngày, làm trước mọi thứ khác)*
- **Goal**: chặn đứng lớp sự cố "thiếu migration → vỡ tính năng" đã xảy ra 2 lần.
- **What changes**: tạo bảng `schema_migrations`; viết 1 script nhỏ đối chiếu file trong `migrations/` với bảng đó, cảnh báo file chưa chạy trên remote; ghi lại đúng 27 file hiện tại là "đã chạy" (baseline).
- **Risks**: thấp — chỉ thêm, không đổi gì đang chạy.
- **Dependencies**: không.
- **Acceptance**: chạy `wrangler d1 execute --remote` xong 1 migration mới, script tự nhận ra và không cảnh báo nhầm.

### Phase 2 — Core foundation *(1-2 tuần, làm khi rảnh, không gấp)*
- **Goal**: tách `index.js` (1936 dòng) thành `core/` + `domain/` theo sơ đồ mục F, KHÔNG đổi API/DB.
- **What changes**: di chuyển code, không viết lại logic.
- **Risks**: trung bình nếu làm vội — nên làm từng module 1, test kỹ (đăng nhập → nhân sự → kho → ... ) sau mỗi lần di chuyển.
- **Dependencies**: Phase 1 xong trước (để lỡ có sự cố còn biết migration nào đã chạy).
- **Acceptance**: mọi tính năng hiện tại chạy y hệt, `index.js` chỉ còn router.

### Phase 3 — Audit Log Core *(vài ngày)*
- **Goal**: có 1 bảng `audit_log` dùng chung, bắt đầu dùng cho các thao tác quan trọng nhất (đối soát, khoá mục tiêu, đổi quyền).
- **What changes**: bảng mới + vài dòng ghi log ở các điểm quan trọng — KHÔNG xoá các cặp cột `_luc/_boi` cũ ngay.
- **Risks**: thấp.
- **Acceptance**: xem lại lịch sử 1 đơn hoàn qua Audit Log, khớp với cột `_luc/_boi` cũ.

### Phase 4 — Order Core *(khi có thời gian, không gấp)*
- **Goal**: nối `don_hoan` ↔ `don_hang` bằng FK thật.
- **Risks**: trung bình — cần đối chiếu dữ liệu cũ (mã đơn có khớp định dạng không).
- **Acceptance**: 1 đơn hàng tra ra được tất cả lần hoàn liên quan qua JOIN, không qua so sánh text.

### Phase 5 — Pilot Workforce (Work Pattern/Schedule/PT)
- Chỉ bắt đầu **khi doanh nghiệp đã chốt xong quy trình** (đúng mục 50 brief) — ví dụ chốt xong cách kho xoay ca 7/7. Đề xuất pilot ở **Kho** trước (đúng gợi ý brief) vì dữ liệu vận hành dễ quan sát nhất.

**Không đưa Skill Core, Approval Core, Workflow Engine tổng quát vào roadmap gần** — doanh nghiệp chưa có nhu cầu thật rõ ràng cho những phần này (đúng nguyên tắc chống over-engineer, mục 43-44). Khi có nhu cầu thật (ví dụ 2-3 phòng ban cùng cần "duyệt" một thứ), quay lại xây Approval Core lúc đó.

---

## L. QUESTIONS FOR SẾP (chỉ hỏi những gì không suy ra được từ code)

1. **Ai sẽ là "Core Maintainer"** — người duy nhất được duyệt thay đổi vào `core/` sau này? (Sếp Ngọc? Anh Duy? Cả hai?) Việc này quyết định cách tổ chức file `CLAUDE.md` phân quyền ở mục I.
2. **`don_hoan` đang là bảng lớn nhất, nhiều người sửa nhất.** Sếp có kế hoạch tuyển thêm/đổi vai trò xử lý quy trình 3 chặng này trong 3-6 tháng tới không? (Ảnh hưởng tới việc có đáng tách Process Core ngay hay để sau).
3. **Về Work Pattern/Schedule (mục 9-13 brief)**: hiện kho đã thực sự xoay ca 7/7 chưa, hay đây là mục tiêu Sếp muốn ERP hỗ trợ khi triển khai? Nếu quy trình xoay ca **chưa chốt trong thực tế**, tôi đề xuất chưa code phần này (đúng nguyên tắc mục 50) — cần biết hiện trạng thật.
4. **Mức độ ưu tiên Phase 2 (tách `index.js`) so với việc tiếp tục thêm tính năng mới** — Sếp muốn dừng thêm feature mới để dọn nền trước, hay vừa dọn vừa thêm song song? (Ảnh hưởng tốc độ nhưng không ảnh hưởng tính đúng đắn).
5. Repo hiện **không có test tự động nào** (`package.json` không có script test). Với tốc độ thay đổi hiện tại (nhiều người cùng code, auto-deploy khi push), Sếp có muốn ưu tiên thêm test cho riêng phần lõi (đăng nhập, phân quyền, sổ cái kho) trước khi mở rộng thêm người code không?

---

*Hết Phase 0. Không tự ý bắt đầu Phase 1 cho tới khi Sếp xác nhận.*

---

## CẬP NHẬT SAU KHI SẾP DUYỆT (21/08/2026)

Sếp đã trả lời 5 câu hỏi (mục L) và giao thêm các nguyên tắc điều chỉnh (Task=Core không phải MBO, Workforce Core đưa lên sớm hơn sau khi Core ổn định, don_hoan không mở rộng thêm cột tuỳ tiện, governance CLAUDE.md + CODEOWNERS...). **Phase 1 (Migration Safety) đã triển khai và xác minh xong** trên cả máy lẫn database thật — xem `migrations/them-schema-migrations.sql`, `scripts/chay-migration.mjs`, `scripts/kiem-tra-migration.mjs`. Roadmap Phase 2+ giữ nguyên theo đề xuất của Sếp, chờ lệnh bắt đầu Phase 2.
