# แปลงไฟล์โลโก้ต้นฉบับ (JPG พื้นเทา) เป็น PNG พื้นหลังโปร่งใส + ครอปขอบ
param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutDir
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($InputPath)
$w = $src.Width
$h = $src.Height

$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.DrawImage($src, 0, 0, $w, $h)
$gfx.Dispose()
$src.Dispose()

$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$len = $stride * $h
$buf = New-Object byte[] $len
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $len)

# โลโก้เป็นสีฟ้าอมเขียว (B มากกว่า R ชัดเจน) ส่วนพื้นหลังเป็นเทากลาง (R=G=B)
$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + ($x * 4)
    $b = [int]$buf[$i]
    $r = [int]$buf[$i + 2]
    $a = ($b - $r - 6) * 10
    if ($a -lt 0) { $a = 0 } elseif ($a -gt 255) { $a = 255 }
    $buf[$i + 3] = [byte]$a
    if ($a -gt 40) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $len)
$bmp.UnlockBits($data)

if ($maxX -lt 0) { throw 'ไม่พบพิกเซลของโลโก้ในภาพต้นฉบับ' }

# ครอปตามกรอบจริงของโลโก้ แล้ววางกลางผืนจัตุรัสพร้อมระยะขอบ
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$side = [Math]::Max($cropW, $cropH)
$canvas = [int]($side * 1.12)

$square = New-Object System.Drawing.Bitmap $canvas, $canvas, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($square)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage(
  $bmp,
  (New-Object System.Drawing.Rectangle ([int](($canvas - $cropW) / 2)), ([int](($canvas - $cropH) / 2)), $cropW, $cropH),
  $minX, $minY, $cropW, $cropH,
  [System.Drawing.GraphicsUnit]::Pixel
)
$g2.Dispose()
$bmp.Dispose()

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

function Save-Resized([System.Drawing.Bitmap]$source, [int]$size, [string]$path, [string]$background) {
  $out = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if ($background) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($background))
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()
  }
  $g.DrawImage($source, 0, 0, $size, $size)
  $g.Dispose()
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Host "wrote $path"
}

Save-Resized $square 512 (Join-Path $OutDir 'logo.png') $null
Save-Resized $square 196 (Join-Path $OutDir 'favicon.png') $null
Save-Resized $square 1024 (Join-Path $OutDir 'icon.png') '#ffffff'
Save-Resized $square 1024 (Join-Path $OutDir 'adaptive-icon.png') $null

$square.Dispose()
Write-Host "crop box: $minX,$minY $cropW x $cropH"
