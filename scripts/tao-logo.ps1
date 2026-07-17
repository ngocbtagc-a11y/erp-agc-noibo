# ============================================================================
#  Tạo các phiên bản logo dùng cho CRM từ logo_trans.png
#  - logo.png        : logo ngang đầy đủ (dùng ở màn đăng nhập)
#  - logo-mark.png   : chỉ 2 chiếc lá, vuông (dùng ở thanh bên + favicon)
#  - favicon-32.png  : biểu tượng tab trình duyệt
#  - apple-touch.png : biểu tượng khi lưu ra màn hình chính điện thoại
#  Chạy: powershell -File scripts/tao-logo.ps1
# ============================================================================

Add-Type -AssemblyName System.Drawing

$nguon = "C:\Users\Admin\Desktop\AI\logo_trans.png"
$dich  = "C:\Users\Admin\Desktop\AI\crm-agc\public\assets\img"

New-Item -ItemType Directory -Force -Path $dich | Out-Null

$goc = [System.Drawing.Bitmap]::FromFile($nguon)
Write-Output "Logo goc: $($goc.Width) x $($goc.Height)"

# ---- Dò vùng chứa lá -------------------------------------------------------
# Lá nằm nửa trên, chữ nằm nửa dưới. Quét từng dòng để lấy đúng khung bao
# của lá thay vì cắt áng chừng.
#
# Đã quét thực tế trên logo_trans.png (1109x376):
#   y 0..180  → chỉ có lá, x nằm trong 278..697
#   y 195     → chữ "Alpha" bắt đầu, x tụt về 86
# Nên cắt ở 188. Lấy 195 thì đỉnh các chữ A/l/h lọt vào, kéo khung bao rộng ra
# làm lá bị lệch và co nhỏ lại.
$ranhGioiY = 188
$ranhGioiX = 250          # chặn thêm bên trái cho chắc

$minX = $goc.Width; $maxX = 0; $minY = $goc.Height; $maxY = 0

for ($y = 0; $y -lt $ranhGioiY; $y++) {
  for ($x = $ranhGioiX; $x -lt $goc.Width; $x++) {
    if ($goc.GetPixel($x, $y).A -gt 20) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

$rongLa = $maxX - $minX + 1
$caoLa  = $maxY - $minY + 1
Write-Output "Vung la tim duoc: x $minX..$maxX, y $minY..$maxY  ($rongLa x $caoLa)"

# ---- Cắt lá ra khung vuông -------------------------------------------------
$canh = [Math]::Max($rongLa, $caoLa)
$dem  = [int]($canh * 0.10)          # chừa lề 10% cho thoáng
$canhVuong = $canh + $dem * 2

$mark = New-Object System.Drawing.Bitmap($canhVuong, $canhVuong)
$g = [System.Drawing.Graphics]::FromImage($mark)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)

# Căn giữa phần lá trong khung vuông
$datX = [int](($canhVuong - $rongLa) / 2)
$datY = [int](($canhVuong - $caoLa) / 2)
$g.DrawImage($goc,
  (New-Object System.Drawing.Rectangle($datX, $datY, $rongLa, $caoLa)),
  (New-Object System.Drawing.Rectangle($minX, $minY, $rongLa, $caoLa)),
  [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# ---- Xuất các cỡ -----------------------------------------------------------
function Luu-CoAnh($anh, $canh, $duongDan) {
  $ra = New-Object System.Drawing.Bitmap($canh, $canh)
  $gg = [System.Drawing.Graphics]::FromImage($ra)
  $gg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gg.Clear([System.Drawing.Color]::Transparent)
  $gg.DrawImage($anh, 0, 0, $canh, $canh)
  $gg.Dispose()
  $ra.Save($duongDan, [System.Drawing.Imaging.ImageFormat]::Png)
  $ra.Dispose()
  Write-Output "  -> $duongDan ($canh x $canh)"
}

Luu-CoAnh $mark 512 "$dich\logo-mark.png"
Luu-CoAnh $mark 32  "$dich\favicon-32.png"
Luu-CoAnh $mark 180 "$dich\apple-touch.png"

# Logo ngang đầy đủ — giữ nguyên tỉ lệ
Copy-Item $nguon "$dich\logo.png" -Force
Write-Output "  -> $dich\logo.png (nguyen ban $($goc.Width) x $($goc.Height))"

$mark.Dispose()
$goc.Dispose()

Write-Output "`nXong."
