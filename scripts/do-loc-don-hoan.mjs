/* Thử bộ lọc locDonHoanCanGhi — trọng tâm: KHÔNG ĐƯỢC BỎ SÓT CẬP NHẬT.
   Dùng database giả lập để chạy được ngoài Worker, kiểm đúng phần logic. */
import { locDonHoanCanGhi } from '../src/chi-ghi-khi-doi.js';

function dbGia(dangCo, { loi = false } = {}) {
  return {
    prepare() {
      return {
        bind(...rsn) {
          return {
            async all() {
              if (loi) throw new Error('database hỏng');
              return { results: dangCo.filter(r => rsn.includes(r.return_sn)) };
            }
          };
        }
      };
    }
  };
}

let dat = 0, hong = 0;
function kiem(ten, thuc, mong) {
  const ok = JSON.stringify(thuc) === JSON.stringify(mong);
  console.log((ok ? '  ĐẠT  ' : '  HỎNG ') + ten);
  if (!ok) console.log('        mong ' + JSON.stringify(mong) + ' nhưng ra ' + JSON.stringify(thuc));
  ok ? dat++ : hong++;
}

const dangCo = [
  { return_sn: 'R1', cap_nhat_shopee: '1000', trang_thai: 'PROCESSING' },
  { return_sn: 'R2', cap_nhat_shopee: '2000', trang_thai: 'BUYER_SHIPPED_ITEM' },
  { return_sn: 'R3', cap_nhat_shopee: null,   trang_thai: null }
];

console.log('\n=== Bộ lọc phải GIỮ LẠI đơn không đổi, và LUÔN cho qua đơn có thay đổi ===\n');

kiem('đơn y hệt đang có → bỏ qua',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [{ rsn: 'R1', up: '1000', st: 'PROCESSING' }]),
  [false]);

kiem('đơn CHƯA CÓ trong database → phải ghi',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [{ rsn: 'R9', up: '5000', st: 'PROCESSING' }]),
  [true]);

kiem('đổi update_time → phải ghi',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [{ rsn: 'R1', up: '1001', st: 'PROCESSING' }]),
  [true]);

kiem('đổi TRẠNG THÁI (mốc 12h của Kho vận) → phải ghi',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [{ rsn: 'R1', up: '1000', st: 'BUYER_SHIPPED_ITEM' }]),
  [true]);

kiem('đơn đang lưu NULL, sàn trả NULL → bỏ qua',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [{ rsn: 'R3', up: null, st: null }]),
  [false]);

kiem('đơn đang lưu NULL, sàn trả có giá trị → phải ghi',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [{ rsn: 'R3', up: '77', st: 'PROCESSING' }]),
  [true]);

kiem('batLoc = false (nút bấm tay / quét đối soát) → ghi tất',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [
    { rsn: 'R1', up: '1000', st: 'PROCESSING' },
    { rsn: 'R2', up: '2000', st: 'BUYER_SHIPPED_ITEM' }
  ], { batLoc: false }),
  [true, true]);

kiem('database ĐỌC LỖI → ghi tất, tuyệt đối không bỏ sót',
  await locDonHoanCanGhi({ DB: dbGia(dangCo, { loi: true }) }, [
    { rsn: 'R1', up: '1000', st: 'PROCESSING' },
    { rsn: 'R2', up: '2000', st: 'BUYER_SHIPPED_ITEM' }
  ]),
  [true, true]);

kiem('lô trộn: giữ đúng thứ tự từng đơn',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, [
    { rsn: 'R1', up: '1000', st: 'PROCESSING' },          // không đổi
    { rsn: 'R2', up: '2001', st: 'BUYER_SHIPPED_ITEM' },  // đổi giờ
    { rsn: 'R9', up: '1',    st: 'NEW' }                  // đơn mới
  ]),
  [false, true, true]);

kiem('danh sách rỗng → không nổ',
  await locDonHoanCanGhi({ DB: dbGia(dangCo) }, []),
  []);

console.log('\n' + (hong === 0
  ? `TẤT CẢ ${dat} phép thử đều đạt.`
  : `${dat} đạt, ${hong} HỎNG.`) + '\n');
process.exit(hong === 0 ? 0 : 1);
