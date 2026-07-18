# ============================================================================
#  Tạo icon cho app điện thoại (PWA) từ logo-mark.png
#  ---------------------------------------------------------------------------
#  Icon app KHÁC favicon: phải có NỀN ĐẶC (icon trong suốt bị iOS tô đen),
#  và để lá vào giữa ~62% khung để khi hệ điều hành bo tròn/cắt góc (maskable)
#  không cắt mất lá.
#  Chạy: powershell -File scripts/tao-icon-app.ps1
# ============================================================================

Add-Type -AssemblyName System.Drawing

$nguon = "C:\Users\Admin\Desktop\AI\crm-agc\public\assets\img\logo-mark.png"
$dich  = "C:\Users\Admin\Desktop\AI\crm-agc\public\assets\img"

$goc = [System.Drawing.Bitmap]::FromFile($nguon)

# Nền trắng cho khớp với cách logo vốn hiển thị (lá xanh/cam trên nền trắng)
$nenR = 255; $nenG = 255; $nenB = 255
$tyLeLa = 0.62      # lá chiếm 62% khung — chừa lề an toàn cho maskable

function Tao-Icon($canh, $duongDan) {
  $bmp = New-Object System.Drawing.Bitmap($canh, $canh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Nền đặc
  $g.Clear([System.Drawing.Color]::FromArgb(255, $nenR, $nenG, $nenB))

  # Lá căn giữa, chiếm tyLeLa khung
  $co = [int]($canh * $tyLeLa)
  $x = [int](($canh - $co) / 2)
  $g.DrawImage($goc, $x, $x, $co, $co)
  $g.Dispose()

  $bmp.Save($duongDan, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "  -> $duongDan ($canh x $canh)"
}

Tao-Icon 192 "$dich\pwa-192.png"
Tao-Icon 512 "$dich\pwa-512.png"
Tao-Icon 180 "$dich\apple-touch-180.png"

$goc.Dispose()
Write-Output "Xong."
