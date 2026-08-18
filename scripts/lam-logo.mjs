/* Lắp logo mới (LOGO mini.png) vào ERP: cắt gọn viền trắng cho bản hiển thị
   + tạo các cỡ icon (favicon / apple-touch / PWA). Chạy: node scripts/lam-logo.mjs */
import sharp from 'sharp';

const SRC = 'C:/Users/Admin/Desktop/LOGO mini.png';
const OUT = 'public/assets/img/';

// Bản hiển thị (sidebar + login): cắt bớt viền trắng thừa cho logo to, rõ.
const meta = await sharp(SRC).trim({ threshold: 12 }).toFile(OUT + 'logo-ag.png');
console.log('logo-ag.png (da cat vien):', meta.width + 'x' + meta.height);

// Các icon vuông — lấy nguyên bản vuông (đã có nền trắng), thu nhỏ.
const icons = [
  ['favicon-32.png', 32],
  ['apple-touch-180.png', 180],
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['logo-mark.png', 512]
];
for (const [name, size] of icons) {
  const pad = Math.round(size * 0.12);          // chừa lề an toàn cho icon bo góc
  const inner = size - pad * 2;
  await sharp(OUT + 'logo-ag.png')              // dùng bản đã cắt viền cho logo to, rõ
    .resize(inner, inner, { fit: 'contain', background: '#ffffff' })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(OUT + name);
  console.log('  ' + name + ' (' + size + 'x' + size + ') OK');
}
console.log('XONG.');
